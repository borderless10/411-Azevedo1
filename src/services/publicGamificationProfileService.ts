import { getDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import app from "../lib/firebase";
import { getPublicGamificationProfileDoc } from "../lib/firestore";
import type { PublicGamificationProfile } from "../types/publicGamificationProfile";
import {
  mapPublicGamificationProfile,
  parseEnsurePublicProfileOutcome,
} from "../utils/publicGamificationProfile";

export class PublicGamificationProfileUnavailableError extends Error {
  constructor() {
    super("Este perfil de conquistas não está disponível.");
    this.name = "PublicGamificationProfileUnavailableError";
  }
}

export class PublicGamificationProfileLoadError extends Error {
  constructor() {
    super("Não foi possível carregar as conquistas agora. Tente novamente.");
    this.name = "PublicGamificationProfileLoadError";
  }
}

const errorCode = (error: unknown): string =>
  String((error as { code?: unknown })?.code || "");

const ensureProfile = async (
  userId: string,
): Promise<PublicGamificationProfile> => {
  let data: unknown;
  try {
    const callable = httpsCallable(
      getFunctions(app, "southamerica-east1"),
      "ensurePublicGamificationProfile",
    );
    data = (await callable({ userId })).data;
  } catch (error) {
    // Callable ausente (deploy pendente), sem rede ou sem sessão são
    // falhas temporárias, não prova de perfil privado/inexistente.
    console.error("Erro ao garantir perfil público de conquistas", {
      userId,
      code: errorCode(error),
      error,
    });
    throw new PublicGamificationProfileLoadError();
  }
  const outcome = parseEnsurePublicProfileOutcome(data);
  if (!outcome) throw new PublicGamificationProfileLoadError();
  if (outcome.status === "unavailable") {
    throw new PublicGamificationProfileUnavailableError();
  }
  return mapPublicGamificationProfile(userId, outcome.profile);
};

export const publicGamificationProfileService = {
  async getByUserId(userId: string): Promise<PublicGamificationProfile> {
    if (!userId) throw new PublicGamificationProfileUnavailableError();
    let snapshot;
    try {
      snapshot = await getDoc(getPublicGamificationProfileDoc(userId));
    } catch (error) {
      if (errorCode(error).includes("permission-denied")) {
        // Pode ser privacidade real, mas também regra antiga/legado
        // showInRanking. Quem decide é a callable, via Admin SDK.
        return ensureProfile(userId);
      }
      console.error("Erro ao carregar perfil público de conquistas", {
        userId,
        code: errorCode(error),
        error,
      });
      throw new PublicGamificationProfileLoadError();
    }
    if (snapshot.exists()) {
      return mapPublicGamificationProfile(
        snapshot.id,
        snapshot.data() as Record<string, unknown>,
      );
    }
    // Doc agregado ainda não materializado (backfill/triggers pendentes
    // ou usuário recém-participante): gera sob demanda de forma segura.
    return ensureProfile(userId);
  },
};
