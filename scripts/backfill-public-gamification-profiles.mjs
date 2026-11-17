/**
 * Backfill único de publicGamificationProfiles/{userId}.
 *
 * Uso: node scripts/backfill-public-gamification-profiles.mjs
 *
 * Autenticação: mesmo padrão de scripts/recover-ranking-2026-10-21.mjs.
 * Converte o login local do Firebase CLI em ADC temporário (0600) e apaga
 * o arquivo ao final. Nenhum token é impresso.
 * A lógica de negócio é a mesma da callable backfillPublicGamificationProfiles
 * (functions/publicGamificationProfileSync.js), executada via Admin SDK.
 */
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

const PROJECT_ID = "visao-cce8f";

const require = createRequire(new URL("../functions/package.json", import.meta.url));
const admin = require("firebase-admin");

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
});

const { backfillPublicGamificationProfiles } = await import(
  "../functions/publicGamificationProfileSync.js"
);

try {
  const result = await backfillPublicGamificationProfiles(admin.firestore());
  console.log(
    `Backfill concluído: ${result.written} perfis gravados, ${result.removed} removidos/sem perfil.`,
  );
} finally {
  try {
    unlinkSync(adcPath);
  } catch {
    // Arquivo temporário já removido.
  }
}
