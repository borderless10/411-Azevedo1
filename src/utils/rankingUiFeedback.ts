import { Alert } from "react-native";
import {
  getRankingRegistrationFeedback,
  RankingRegistrationResult,
} from "../services/rankingPlanilhaService";

type PlanilhaKind = "expense" | "zero";

/**
 * Só avisa o usuário quando o registro gerou pontos no ranking.
 * Sem popup para "não pontuou".
 */
export const presentRankingFeedbackIfScored = (
  ranking: RankingRegistrationResult | null | undefined,
  kind: PlanilhaKind,
  options?: { onCelebrate?: () => void },
): boolean => {
  if (!ranking || !(Number(ranking.points) > 0)) return false;
  const feedback = getRankingRegistrationFeedback(ranking, kind);
  if (feedback.celebrate) options?.onCelebrate?.();
  Alert.alert(feedback.title, feedback.message);
  return true;
};
