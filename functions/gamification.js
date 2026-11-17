import { FieldValue } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import {
  buildSeasonPodiums,
  displayNameForUser,
  isAdminUserData,
  userParticipates,
} from "./rankingSeason.js";
import {
  decideBadgeRemoval,
  grantDocId,
  resolveActiveBorderAfterRevoke,
  validateBadgeDefinitionInput,
} from "./badgeRules.js";
import {
  remainingSeasonCounter,
  resolvePurgeTargets,
  seasonPeriodLabel,
} from "./rankingPurge.js";
import {
  backfillPublicGamificationProfiles as runPublicProfileBackfill,
  ensurePublicGamificationProfile as runEnsurePublicProfile,
  recordClosedSeason,
  syncPublicGamificationProfile,
} from "./publicGamificationProfileSync.js";

const todayKey = () => {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

const requireAuth = (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Faça login.");
  return request.auth.uid;
};

const requireAdmin = async (db, uid) => {
  const snap = await db.doc(`users/${uid}`).get();
  if (!isAdminUserData(snap.data())) {
    throw new HttpsError("permission-denied", "Apenas administradores.");
  }
};

export const createGamificationHandlers = (db) => ({
  async closeRankingSeason(request) {
    const adminUid = requireAuth(request);
    await requireAdmin(db, adminUid);
    const idempotencyKey = String(request.data?.idempotencyKey || "").replace(
      /[^a-zA-Z0-9_-]/g,
      "",
    );

    const result = await db.runTransaction(async (tx) => {
      if (idempotencyKey) {
        const existing = await tx.get(
          db.doc(`rankingSeasons/by-key-${idempotencyKey}`),
        );
        if (existing.exists) {
          return {
            seasonNumber: existing.data().seasonNumber,
            duplicated: true,
            profileCandidates: [],
          };
        }
      }

      const configRef = db.doc("appConfig/ranking");
      const configSnap = await tx.get(configRef);
      const config = configSnap.data() || {};
      const seasonNumber = Number(config.seasonCounter || 0) + 1;
      const seasonRef = db.doc(`rankingSeasons/${seasonNumber}`);

      const [snapshotDocs, userDocs] = await Promise.all([
        tx.get(db.collection("rankingSnapshots")),
        tx.get(db.collection("users")),
      ]);

      const byUser = new Map();
      snapshotDocs.forEach((docSnap) => {
        const data = docSnap.data() || {};
        byUser.set(docSnap.id, {
          userId: docSnap.id,
          displayName: String(data.displayName || docSnap.id),
          rankingPoints: Number(data.rankingPoints) || 0,
          league: data.league === "couple" ? "couple" : "individual",
          photoUrl: typeof data.photoUrl === "string" ? data.photoUrl : null,
        });
      });
      userDocs.forEach((docSnap) => {
        const data = docSnap.data() || {};
        if (!userParticipates(data) || byUser.has(docSnap.id)) return;
        byUser.set(docSnap.id, {
          userId: docSnap.id,
          displayName: displayNameForUser(docSnap.id, data),
          rankingPoints: 0,
          league: data.accountType === "couple" ? "couple" : "individual",
          photoUrl: typeof data.photoUrl === "string" ? data.photoUrl : null,
        });
      });

      const podiums = buildSeasonPodiums([...byUser.values()]);
      const cutoffDateKey = todayKey();
      const seasonData = {
        seasonNumber,
        previousCutoffDateKey: config.cutoffDateKey || null,
        cutoffDateKey,
        endedAt: FieldValue.serverTimestamp(),
        resetBy: adminUid,
        podiums,
        ...(idempotencyKey ? { idempotencyKey } : {}),
      };
      tx.set(seasonRef, seasonData);
      if (idempotencyKey) {
        tx.set(db.doc(`rankingSeasons/by-key-${idempotencyKey}`), {
          seasonNumber,
          createdAt: FieldValue.serverTimestamp(),
        });
      }
      tx.set(
        configRef,
        {
          cutoffDateKey,
          resetAt: FieldValue.serverTimestamp(),
          resetBy: adminUid,
          seasonCounter: seasonNumber,
        },
        { merge: true },
      );
      snapshotDocs.forEach((docSnap) => {
        tx.update(docSnap.ref, {
          rankingPoints: 0,
          updatedAt: FieldValue.serverTimestamp(),
        });
      });
      return {
        seasonNumber,
        duplicated: false,
        podiums,
        profileCandidates: [...byUser.values()],
      };
    });
    if (!result.duplicated) {
      await Promise.all(
        result.profileCandidates.map(async (candidate) => {
          await syncPublicGamificationProfile(db, candidate.userId);
          await recordClosedSeason(
            db,
            candidate,
            result.seasonNumber,
            result.podiums,
          );
        }),
      );
    }
    const { profileCandidates, ...response } = result;
    return response;
  },

  /**
   * Apaga edições encerradas (pódios/histórico) e, opcionalmente, zera
   * o ranking atual. Não mexe em insígnias nem concessões.
   */
  async purgeRankingHistory(request) {
    const adminUid = requireAuth(request);
    await requireAdmin(db, adminUid);

    const deleteAll = request.data?.deleteAll === true;
    const wipeCurrent = request.data?.wipeCurrent === true;
    const seasonNumbers = Array.isArray(request.data?.seasonNumbers)
      ? request.data.seasonNumbers
      : [];

    if (!deleteAll && seasonNumbers.length === 0 && !wipeCurrent) {
      throw new HttpsError(
        "invalid-argument",
        "Selecione edições para apagar ou marque zerar ranking atual.",
      );
    }

    const seasonsSnap = await db.collection("rankingSeasons").get();
    const seasonDocs = seasonsSnap.docs.filter(
      (docSnap) => !docSnap.id.startsWith("by-key-"),
    );
    const seasons = seasonDocs.map((docSnap) => ({
      id: docSnap.id,
      ref: docSnap.ref,
      ...(docSnap.data() || {}),
    }));
    const { targets, missing } = resolvePurgeTargets({
      seasons,
      seasonNumbers,
      deleteAll,
    });
    if (missing.length) {
      throw new HttpsError(
        "not-found",
        `Edição(ões) não encontrada(s): ${missing.join(", ")}`,
      );
    }
    if (!targets.length && !wipeCurrent) {
      throw new HttpsError(
        "failed-precondition",
        "Nenhuma edição selecionada para apagar.",
      );
    }

    const deletedNumbers = targets.map((season) => Number(season.seasonNumber));
    const deletedSet = new Set(deletedNumbers);
    const keyDocs = seasonsSnap.docs.filter((docSnap) => {
      if (!docSnap.id.startsWith("by-key-")) return false;
      const number = Number(docSnap.data()?.seasonNumber) || 0;
      return deletedSet.has(number);
    });

    const refsToDelete = [
      ...targets.map((season) => season.ref),
      ...keyDocs.map((docSnap) => docSnap.ref),
    ];

    for (let index = 0; index < refsToDelete.length; index += 400) {
      const batch = db.batch();
      refsToDelete.slice(index, index + 400).forEach((ref) => batch.delete(ref));
      await batch.commit();
    }

    const configRef = db.doc("appConfig/ranking");
    const nextCounter = remainingSeasonCounter(seasons, deletedNumbers);
    const configUpdate = {
      seasonCounter: nextCounter,
      updatedAt: FieldValue.serverTimestamp(),
      lastPurgeAt: FieldValue.serverTimestamp(),
      lastPurgeBy: adminUid,
    };

    if (wipeCurrent) {
      const snapshotsSnap = await db.collection("rankingSnapshots").get();
      for (let index = 0; index < snapshotsSnap.docs.length; index += 400) {
        const batch = db.batch();
        snapshotsSnap.docs.slice(index, index + 400).forEach((docSnap) => {
          batch.update(docSnap.ref, {
            rankingPoints: 0,
            updatedAt: FieldValue.serverTimestamp(),
          });
        });
        await batch.commit();
      }
      configUpdate.cutoffDateKey = todayKey();
      configUpdate.resetAt = FieldValue.serverTimestamp();
      configUpdate.resetBy = adminUid;
    }

    await configRef.set(configUpdate, { merge: true });

    // Reconstrói coroas/pódios públicos a partir das edições restantes.
    // Insígnias continuam intactas (activeBadgeIds vem dos grants).
    await runPublicProfileBackfill(db);

    return {
      deletedSeasonNumbers: deletedNumbers,
      deletedLabels: targets.map((season) => seasonPeriodLabel(season)),
      wipeCurrent,
      seasonCounter: nextCounter,
    };
  },

  async ensurePublicGamificationProfile(request) {
    requireAuth(request);
    const userId = String(request.data?.userId || request.auth.uid).trim();
    if (!userId) {
      throw new HttpsError("invalid-argument", "userId obrigatório");
    }
    // Admin SDK ignora rules: a garantia só materializa o perfil se o
    // usuário alvo participa publicamente. hidden/view_only/unset/staff
    // retornam unavailable e sync remove eventual doc obsoleto.
    const profile = await runEnsurePublicProfile(db, userId);
    if (!profile) return { status: "unavailable" };
    return { status: "available", profile };
  },

  async backfillPublicGamificationProfiles(request) {
    const adminUid = requireAuth(request);
    await requireAdmin(db, adminUid);
    return runPublicProfileBackfill(db);
  },

  async upsertBadgeDefinition(request) {
    const adminUid = requireAuth(request);
    await requireAdmin(db, adminUid);
    const input = request.data?.definition || {};
    const validation = validateBadgeDefinitionInput(input);
    if (!validation.valid) {
      throw new HttpsError("invalid-argument", validation.errors.join("; "));
    }
    const ref = db.doc(`badgeDefinitions/${input.id}`);
    const existing = await ref.get();
    await ref.set(
      {
        name: String(input.name).trim(),
        meaning: String(input.meaning).trim(),
        description: String(input.description).trim(),
        icon: input.icon,
        primaryColor: input.primaryColor,
        secondaryColor: input.secondaryColor,
        borderPreset: input.borderPreset,
        isOfficial: existing.exists ? existing.data().isOfficial === true : false,
        isActive: existing.exists ? existing.data().isActive !== false : true,
        updatedBy: adminUid,
        updatedAt: FieldValue.serverTimestamp(),
        ...(existing.exists
          ? {}
          : { createdBy: adminUid, createdAt: FieldValue.serverTimestamp() }),
      },
      { merge: true },
    );
    return { badgeId: input.id };
  },

  async setBadgeDefinitionActive(request) {
    const adminUid = requireAuth(request);
    await requireAdmin(db, adminUid);
    const badgeId = String(request.data?.badgeId || "");
    if (!badgeId) throw new HttpsError("invalid-argument", "badgeId obrigatório");
    const ref = db.doc(`badgeDefinitions/${badgeId}`);
    if (!(await ref.get()).exists) throw new HttpsError("not-found", "Insígnia não encontrada");
    await ref.update({
      isActive: request.data?.isActive === true,
      updatedBy: adminUid,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { badgeId };
  },

  async deleteBadgeDefinition(request) {
    const adminUid = requireAuth(request);
    await requireAdmin(db, adminUid);
    const badgeId = String(request.data?.badgeId || "");
    const ref = db.doc(`badgeDefinitions/${badgeId}`);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError("not-found", "Insígnia não encontrada");
    const history = await db
      .collection("userBadgeGrants")
      .where("badgeId", "==", badgeId)
      .limit(1)
      .get();
    const action = decideBadgeRemoval({
      isOfficial: snap.data().isOfficial === true,
      hasGrantHistory: !history.empty,
    });
    if (action === "reject") {
      throw new HttpsError("failed-precondition", "Insígnia oficial não pode ser excluída");
    }
    if (action === "archive") {
      await ref.update({
        isActive: false,
        updatedBy: adminUid,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { badgeId, archived: true, deleted: false };
    }
    await ref.delete();
    return { badgeId, archived: false, deleted: true };
  },

  async grantBadge(request) {
    const adminUid = requireAuth(request);
    await requireAdmin(db, adminUid);
    const userId = String(request.data?.userId || "");
    const badgeId = String(request.data?.badgeId || "");
    if (!userId || !badgeId) throw new HttpsError("invalid-argument", "userId e badgeId obrigatórios");
    const [userSnap, badgeSnap] = await Promise.all([
      db.doc(`users/${userId}`).get(),
      db.doc(`badgeDefinitions/${badgeId}`).get(),
    ]);
    if (!userSnap.exists) throw new HttpsError("not-found", "Usuário não encontrado");
    if (!badgeSnap.exists || badgeSnap.data().isActive === false) {
      throw new HttpsError("failed-precondition", "Insígnia inexistente ou desativada");
    }
    await db.doc(`userBadgeGrants/${grantDocId(userId, badgeId)}`).set(
      {
        userId,
        badgeId,
        status: "active",
        grantedBy: adminUid,
        grantedAt: FieldValue.serverTimestamp(),
        revokedBy: null,
        revokedAt: null,
      },
      { merge: true },
    );
    await syncPublicGamificationProfile(db, userId);
    return { grantId: grantDocId(userId, badgeId) };
  },

  async revokeBadge(request) {
    const adminUid = requireAuth(request);
    await requireAdmin(db, adminUid);
    const userId = String(request.data?.userId || "");
    const badgeId = String(request.data?.badgeId || "");
    if (!userId || !badgeId) throw new HttpsError("invalid-argument", "userId e badgeId obrigatórios");
    await db.runTransaction(async (tx) => {
      const grantRef = db.doc(`userBadgeGrants/${grantDocId(userId, badgeId)}`);
      const userRef = db.doc(`users/${userId}`);
      const [grantSnap, userSnap] = await Promise.all([tx.get(grantRef), tx.get(userRef)]);
      if (!grantSnap.exists) throw new HttpsError("not-found", "Concessão não encontrada");
      tx.update(grantRef, {
        status: "revoked",
        revokedBy: adminUid,
        revokedAt: FieldValue.serverTimestamp(),
      });
      const nextBorder = resolveActiveBorderAfterRevoke(
        userSnap.data()?.activeBadgeBorderId,
        badgeId,
      );
      if (nextBorder === null && userSnap.data()?.activeBadgeBorderId) {
        tx.update(userRef, { activeBadgeBorderId: null });
      }
    });
    await syncPublicGamificationProfile(db, userId);
    return { grantId: grantDocId(userId, badgeId) };
  },

  async selectBadgeBorder(request) {
    const uid = requireAuth(request);
    const userId = String(request.data?.userId || uid);
    const badgeId = request.data?.badgeId ? String(request.data.badgeId) : null;
    if (userId !== uid) await requireAdmin(db, uid);
    const userRef = db.doc(`users/${userId}`);
    if (badgeId) {
      const grant = await db.doc(`userBadgeGrants/${grantDocId(userId, badgeId)}`).get();
      if (!grant.exists || grant.data().status !== "active") {
        throw new HttpsError("permission-denied", "Você não possui esta insígnia");
      }
    }
    await userRef.update({ activeBadgeBorderId: badgeId });
    await syncPublicGamificationProfile(db, userId);
    return { userId, badgeId };
  },
});
