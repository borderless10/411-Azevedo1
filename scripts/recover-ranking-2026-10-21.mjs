/**
 * Recuperação pontual do reset de 21/10/2026.
 *
 * O reset daquele dia foi executado por um cliente antigo, que só zerou
 * os resumos e gravou o corte em appConfig/ranking, sem criar a
 * temporada com o Pódio Anterior e sem seasonCounter. Este script:
 * 1. Reconstrói rankingSeasons/1 somando rankingPlanilhaEntries dos
 *    orçamentos com dateKey até o corte (2026-10-21), mesmo critério do
 *    servidor (buildSeasonPodiums em functions/rankingSeason.js).
 * 2. Grava seasonCounter: 1 em appConfig/ranking para o próximo reset
 *    via closeRankingSeason criar a temporada 2.
 * 3. Migra fotos que estão só em photoBase64 (invisíveis nas telas
 *    leves) para o Firebase Storage, gravando photoUrl no usuário e no
 *    resumo do ranking, sem apagar o photoBase64.
 *
 * Uso: node scripts/recover-ranking-2026-10-21.mjs
 */
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";

const PROJECT_ID = "visao-cce8f";
const STORAGE_BUCKET = "visao-cce8f.firebasestorage.app";
const CUTOFF = "2026-10-21";

const require = createRequire(new URL("../functions/package.json", import.meta.url));
const admin = require("firebase-admin");

// Credencial da conta dona do projeto via login do Firebase CLI local,
// convertida para ADC (authorized_user), que o Admin SDK atual aceita.
const cliConfig = JSON.parse(
  readFileSync(
    path.join(os.homedir(), ".config/configstore/firebase-tools.json"),
    "utf8",
  ),
);
const adcPath = path.join(os.tmpdir(), "visao-adc-authorized-user.json");
writeFileSync(
  adcPath,
  JSON.stringify({
    client_id:
      "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com",
    client_secret: "j9iVZfS8kkCEFUPaAeJV0sAi",
    refresh_token: cliConfig.tokens.refresh_token,
    type: "authorized_user",
  }),
  { mode: 0o600 },
);
process.env.GOOGLE_APPLICATION_CREDENTIALS = adcPath;

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: PROJECT_ID,
  storageBucket: STORAGE_BUCKET,
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

const isStaff = (data) =>
  data?.isAdmin === true ||
  data?.role === "admin" ||
  data?.role === "consultor" ||
  data?.role === "supervisor";

const userParticipates = (data) =>
  Boolean(data) &&
  data.isActive !== false &&
  !isStaff(data) &&
  data.rankingPreference === "participate";

const displayNameForUser = (userId, data) => {
  if (data?.accountType === "couple") {
    const first = String(data.coupleMember1Name || "").trim();
    const second = String(data.coupleMember2Name || "").trim();
    if (first && second) return `${first} & ${second}`;
    if (first || second) return first || second;
  }
  return String(
    data?.nickname || data?.username || data?.name || data?.email || userId,
  );
};

const compareCandidates = (a, b) =>
  b.rankingPoints - a.rankingPoints ||
  String(a.displayName).localeCompare(String(b.displayName), "pt-BR") ||
  String(a.userId).localeCompare(String(b.userId));

const buildLeaguePodium = (candidates, league) =>
  candidates
    .filter((entry) => entry.league === league)
    .sort(compareCandidates)
    .slice(0, 3)
    .map((entry, index) => ({
      position: index + 1,
      userId: entry.userId,
      displayName: entry.displayName,
      rankingPoints: entry.rankingPoints,
      league,
      photoUrl: entry.photoUrl || null,
    }));

const main = async () => {
  const configRef = db.doc("appConfig/ranking");
  const configSnap = await configRef.get();
  const config = configSnap.data() || {};
  if (config.cutoffDateKey !== CUTOFF) {
    throw new Error(`Corte inesperado em appConfig/ranking: ${config.cutoffDateKey}`);
  }

  const [budgetSnap, userSnap, snapshotSnap, seasonSnap] = await Promise.all([
    db.collection("budgets").get(),
    db.collection("users").get(),
    db.collection("rankingSnapshots").get(),
    db.doc("rankingSeasons/1").get(),
  ]);

  // Pontos da temporada encerrada: tudo até o corte (corte anterior nulo).
  const pointsByUser = new Map();
  budgetSnap.forEach((docSnap) => {
    const data = docSnap.data() || {};
    const userId = String(data.userId || "");
    if (!userId) return;
    let sum = pointsByUser.get(userId) || 0;
    (data.rankingPlanilhaEntries || []).forEach((entry) => {
      if (entry?.dateKey && entry.dateKey <= CUTOFF) {
        sum += Number(entry.points) || 0;
      }
    });
    pointsByUser.set(userId, sum);
  });

  const usersById = new Map();
  userSnap.forEach((docSnap) => usersById.set(docSnap.id, docSnap.data() || {}));

  const snapshotsById = new Map();
  snapshotSnap.forEach((docSnap) => snapshotsById.set(docSnap.id, docSnap.data() || {}));

  if (!seasonSnap.exists && !config.seasonCounter) {
    const byUser = new Map();
    snapshotsById.forEach((data, userId) => {
      const user = usersById.get(userId) || {};
      byUser.set(userId, {
        userId,
        displayName: String(data.displayName || displayNameForUser(userId, user)),
        rankingPoints: pointsByUser.get(userId) || 0,
        league: data.league === "couple" ? "couple" : "individual",
        photoUrl: user.photoUrl || data.photoUrl || null,
      });
    });
    usersById.forEach((data, userId) => {
      if (!userParticipates(data) || byUser.has(userId)) return;
      byUser.set(userId, {
        userId,
        displayName: displayNameForUser(userId, data),
        rankingPoints: pointsByUser.get(userId) || 0,
        league: data.accountType === "couple" ? "couple" : "individual",
        photoUrl: data.photoUrl || null,
      });
    });

    const candidates = [...byUser.values()];
    const podiums = {
      individual: buildLeaguePodium(candidates, "individual"),
      couple: buildLeaguePodium(candidates, "couple"),
    };

    await db.doc("rankingSeasons/1").set({
      seasonNumber: 1,
      previousCutoffDateKey: null,
      cutoffDateKey: CUTOFF,
      endedAt: config.resetAt || admin.firestore.FieldValue.serverTimestamp(),
      resetBy: config.resetBy || "",
      podiums,
      recoveredAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await configRef.set({ seasonCounter: 1 }, { merge: true });
    console.log("Temporada 1 criada:", JSON.stringify(podiums, null, 2));
  } else {
    console.log("Temporada 1 já existia ou seasonCounter presente. Nada a recuperar.");
  }

  // Migração de fotos: photoBase64 sem photoUrl não aparece nas telas leves.
  let migrated = 0;
  for (const [userId, data] of usersById) {
    const raw = String(data.photoBase64 || "").trim();
    if (!raw || data.photoUrl) continue;
    const clean = raw.includes(",") ? raw.split(",").pop() : raw;
    if (!clean || clean.length < 100) continue;
    try {
      const isPng = clean.startsWith("iVBOR");
      const ext = isPng ? "png" : "jpg";
      const filePath = `users/${userId}/avatar.${ext}`;
      const downloadToken = randomUUID();
      await bucket.file(filePath).save(Buffer.from(clean, "base64"), {
        contentType: isPng ? "image/png" : "image/jpeg",
        metadata: { metadata: { firebaseStorageDownloadTokens: downloadToken } },
      });
      const url = `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodeURIComponent(filePath)}?alt=media&token=${downloadToken}`;
      await db.doc(`users/${userId}`).set(
        { photoUrl: url, photoStoragePath: filePath },
        { merge: true },
      );
      if (snapshotsById.has(userId)) {
        await db.doc(`rankingSnapshots/${userId}`).set(
          { photoUrl: url },
          { merge: true },
        );
      }
      migrated += 1;
      console.log(`Foto migrada: ${displayNameForUser(userId, data)} (${userId})`);
    } catch (error) {
      console.error(`Falha ao migrar foto de ${userId}:`, error.message || error);
    }
  }
  console.log(`Fotos migradas: ${migrated}`);
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    try {
      unlinkSync(adcPath);
    } catch {
      // Arquivo temporário já removido.
    }
  });
