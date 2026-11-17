import { FieldValue } from "firebase-admin/firestore";
import {
  buildPublicGamificationProfile,
  mergeSeasonAchievement,
  podiumHistoryFromSeasons,
} from "./publicGamificationProfile.js";

const profileRef = (db, userId) =>
  db.doc(`publicGamificationProfiles/${userId}`);

const activeBadgeIdsForUser = async (db, userId) => {
  const grants = await db
    .collection("userBadgeGrants")
    .where("userId", "==", userId)
    .where("status", "==", "active")
    .get();
  return grants.docs.map((docSnap) => String(docSnap.data().badgeId || ""));
};

export const syncPublicGamificationProfile = async (
  db,
  userId,
  options = {},
) => {
  if (!userId) return null;
  const targetRef = profileRef(db, userId);
  const [userSnap, snapshotSnap, existingSnap, activeBadgeIds] =
    await Promise.all([
      db.doc(`users/${userId}`).get(),
      db.doc(`rankingSnapshots/${userId}`).get(),
      targetRef.get(),
      activeBadgeIdsForUser(db, userId),
    ]);
  if (!userSnap.exists) {
    await targetRef.delete();
    return null;
  }

  const profile = buildPublicGamificationProfile({
    userId,
    user: userSnap.data(),
    snapshot: snapshotSnap.data(),
    activeBadgeIds,
    existing: existingSnap.data(),
    podiumFinishes: options.podiumFinishes,
  });
  if (!profile) {
    await targetRef.delete();
    return null;
  }
  await targetRef.set(
    { ...profile, updatedAt: FieldValue.serverTimestamp() },
  );
  return profile;
};

export const recordClosedSeason = async (
  db,
  candidate,
  seasonNumber,
  podiums,
) => {
  const podium = [...podiums.individual, ...podiums.couple].find(
    (entry) => entry.userId === candidate.userId,
  );
  const targetRef = profileRef(db, candidate.userId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(targetRef);
    if (!snap.exists) return;
    const next = mergeSeasonAchievement(snap.data(), {
      seasonNumber,
      position: podium?.position,
      league: candidate.league,
      rankingPoints: candidate.rankingPoints,
    });
    tx.set(
      targetRef,
      {
        ...next,
        currentRankingPoints: 0,
        maxRankingPointsEver: Math.max(
          Number(next.maxRankingPointsEver) || 0,
          Number(candidate.rankingPoints) || 0,
        ),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });
};

export const ensurePublicGamificationProfile = async (db, userId) => {
  if (!userId) return null;
  const seasonsSnap = await db.collection("rankingSeasons").get();
  const seasons = seasonsSnap.docs
    .filter((docSnap) => !docSnap.id.startsWith("by-key-"))
    .map((docSnap) => docSnap.data());
  return syncPublicGamificationProfile(db, userId, {
    podiumFinishes: podiumHistoryFromSeasons(userId, seasons),
  });
};

export const backfillPublicGamificationProfiles = async (db) => {
  const [usersSnap, snapshotsSnap, seasonsSnap] = await Promise.all([
    db.collection("users").get(),
    db.collection("rankingSnapshots").get(),
    db.collection("rankingSeasons").get(),
  ]);
  const seasons = seasonsSnap.docs
    .filter((docSnap) => !docSnap.id.startsWith("by-key-"))
    .map((docSnap) => docSnap.data());
  const snapshotIds = new Set(snapshotsSnap.docs.map((docSnap) => docSnap.id));
  const userIds = new Set([
    ...usersSnap.docs.map((docSnap) => docSnap.id),
    ...snapshotIds,
  ]);

  let written = 0;
  let removed = 0;
  for (const userId of userIds) {
    const podiumFinishes = podiumHistoryFromSeasons(userId, seasons);
    const result = await syncPublicGamificationProfile(db, userId, {
      podiumFinishes,
    });
    if (result) written += 1;
    else removed += 1;
  }
  return { written, removed };
};
