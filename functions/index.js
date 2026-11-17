import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import {
  onDocumentCreated,
  onDocumentWritten,
} from "firebase-functions/v2/firestore";
import { onCall } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { createGamificationHandlers } from "./gamification.js";
import { createAdminUserHandlers } from "./adminUsers.js";
import { getAuth } from "firebase-admin/auth";
import { syncPublicGamificationProfile } from "./publicGamificationProfileSync.js";
import { Expo } from "expo-server-sdk";
import {
  buildChatPushMessages,
  isActivelyViewingChat,
  resolveChatRecipientIds,
} from "./chatPushPayload.js";

initializeApp();

const db = getFirestore();
const expo = new Expo({
  ...(process.env.EXPO_ACCESS_TOKEN
    ? { accessToken: process.env.EXPO_ACCESS_TOKEN }
    : {}),
});

const mentionIdsFrom = (mentions) =>
  Array.isArray(mentions)
    ? mentions
        .map((mention) =>
          typeof mention === "string" ? mention : String(mention?.userId || ""),
        )
        .filter(Boolean)
    : [];

export const sendChatMessagePush = onDocumentCreated(
  {
    document: "chats/{chatId}/messages/{messageId}",
    region: "southamerica-east1",
    retry: true,
  },
  async (event) => {
    const message = event.data?.data();
    if (!message) return;

    const { chatId, messageId } = event.params;
    const senderId = String(message.senderId || "");
    if (!senderId || message.kind === "reaction") return;

    const chatSnapshot = await db.doc(`chats/${chatId}`).get();
    if (!chatSnapshot.exists) {
      logger.warn("Chat ausente para push", { chatId, messageId });
      return;
    }

    const chat = chatSnapshot.data() || {};
    const mentionUserIds = mentionIdsFrom(message.mentions);
    const recipientIds = resolveChatRecipientIds({
      chatType: chat.type,
      participantIds: chat.participants,
      senderId,
      mentionUserIds,
    });
    if (!recipientIds.length) return;

    const [senderSnapshot, ...recipientSnapshots] = await db.getAll(
      db.doc(`users/${senderId}`),
      ...recipientIds.map((id) => db.doc(`users/${id}`)),
    );
    const sender = senderSnapshot.data() || {};
    const senderName =
      String(sender.nickname || sender.name || "").trim() || "Nova mensagem";
    const now = Date.now();
    const recipients = recipientSnapshots
      .map((snapshot, index) => ({
        userId: recipientIds[index],
        expoPushToken: String(snapshot.data()?.expoPushToken || "").trim(),
        presence: snapshot.data() || {},
      }))
      .filter((item) => !isActivelyViewingChat(item.presence, chatId, now));

    const messages = buildChatPushMessages({
      recipients,
      senderId,
      senderName,
      chatId,
      messageId,
      text: message.text,
      mentionUserIds,
    });
    if (!messages.length) {
      logger.warn("Nenhum token Expo válido para push", {
        chatId,
        messageId,
        recipientIds,
      });
      return;
    }

    for (const chunk of expo.chunkPushNotifications(messages)) {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      const invalidTokenWrites = tickets.flatMap((ticket, index) => {
        if (ticket.status === "error") {
          logger.error("Ticket Expo com erro", {
            chatId,
            messageId,
            message: ticket.message,
            error: ticket.details?.error,
            to: String(chunk[index]?.to || "").slice(0, 32),
          });
        }
        if (
          ticket.status !== "error" ||
          ticket.details?.error !== "DeviceNotRegistered"
        ) {
          return [];
        }
        const token = String(chunk[index]?.to || "");
        const recipient = recipients.find(
          (item) => item.expoPushToken === token,
        );
        return recipient
          ? [
              db.doc(`users/${recipient.userId}`).update({
                expoPushToken: "",
                updatedAt: FieldValue.serverTimestamp(),
              }),
            ]
          : [];
      });
      await Promise.all(invalidTokenWrites);

      logger.info("Push de chat enviado", {
        chatId,
        messageId,
        tickets: tickets.map((ticket) => ({
          status: ticket.status,
          ...(ticket.status === "error"
            ? { error: ticket.details?.error, message: ticket.message }
            : { id: ticket.id }),
        })),
      });
    }
  },
);

const gamification = createGamificationHandlers(db);
const callOpts = { region: "southamerica-east1" };

export const closeRankingSeason = onCall(callOpts, (request) =>
  gamification.closeRankingSeason(request),
);
export const purgeRankingHistory = onCall(callOpts, (request) =>
  gamification.purgeRankingHistory(request),
);
export const upsertBadgeDefinition = onCall(callOpts, (request) =>
  gamification.upsertBadgeDefinition(request),
);
export const setBadgeDefinitionActive = onCall(callOpts, (request) =>
  gamification.setBadgeDefinitionActive(request),
);
export const deleteBadgeDefinition = onCall(callOpts, (request) =>
  gamification.deleteBadgeDefinition(request),
);
export const grantBadge = onCall(callOpts, (request) =>
  gamification.grantBadge(request),
);
export const revokeBadge = onCall(callOpts, (request) =>
  gamification.revokeBadge(request),
);
export const selectBadgeBorder = onCall(callOpts, (request) =>
  gamification.selectBadgeBorder(request),
);
export const backfillPublicGamificationProfiles = onCall(callOpts, (request) =>
  gamification.backfillPublicGamificationProfiles(request),
);
export const ensurePublicGamificationProfile = onCall(callOpts, (request) =>
  gamification.ensurePublicGamificationProfile(request),
);

const syncPublicProfile = async (event) => {
  await syncPublicGamificationProfile(db, String(event.params.userId || ""));
};

export const syncPublicProfileFromUser = onDocumentWritten(
  {
    document: "users/{userId}",
    region: "southamerica-east1",
  },
  syncPublicProfile,
);

export const syncPublicProfileFromRanking = onDocumentWritten(
  {
    document: "rankingSnapshots/{userId}",
    region: "southamerica-east1",
  },
  syncPublicProfile,
);

export const syncPublicProfileFromBadgeGrant = onDocumentWritten(
  {
    document: "userBadgeGrants/{grantId}",
    region: "southamerica-east1",
  },
  async (event) => {
    const grant = event.data?.after.data() || event.data?.before.data();
    const userId = String(grant?.userId || "");
    if (userId) await syncPublicGamificationProfile(db, userId);
  },
);

const adminUsers = createAdminUserHandlers(db, getAuth());

export const adminUpdateUserCredentials = onCall(callOpts, (request) =>
  adminUsers.adminUpdateUserCredentials(request),
);
