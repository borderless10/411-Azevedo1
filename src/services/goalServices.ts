/**
 * Serviço para gerenciar Metas Financeiras
 */

import {
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import {
  getGoalsCollection,
  getGoalDoc,
  convertGoalFromFirestore,
  convertGoalToFirestore,
  getDocData,
} from "../lib/firestore";
import {
  Goal,
  CreateGoalData,
  UpdateGoalData,
  GoalContribution,
  GoalStats,
  GoalStatus,
} from "../types/goal";
import { activityServices } from "./activityServices";
import { formatCurrency } from "../utils/currencyUtils";

/**
 * Validar dados de criação de meta
 */
const validateCreateGoalData = (data: CreateGoalData): string[] => {
  const errors: string[] = [];

  if (!data.title || data.title.trim().length === 0) {
    errors.push("Título é obrigatório");
  }

  if (data.title && data.title.trim().length < 3) {
    errors.push("Título deve ter pelo menos 3 caracteres");
  }

  if (!data.targetAmount || data.targetAmount <= 0) {
    errors.push("Valor da meta deve ser maior que zero");
  }

  if (data.deadline && data.deadline < new Date()) {
    errors.push("Prazo não pode ser no passado");
  }

  return errors;
};

/**
 * Serviço de Metas
 */
export const goalServices = {
  /**
   * Criar uma nova meta
   */
  async createGoal(userId: string, data: CreateGoalData): Promise<Goal> {
    console.log("🎯 [GOAL SERVICE] Criando meta...");
    console.log("🎯 [GOAL SERVICE] Dados:", data);

    // Validar dados
    const errors = validateCreateGoalData(data);
    if (errors.length > 0) {
      console.error("❌ [GOAL SERVICE] Erros de validação:", errors);
      throw new Error(errors.join(", "));
    }

    try {
      const now = new Date();
      const goalData: any = {
        userId,
        title: data.title.trim(),
        description: data.description?.trim() || "",
        targetAmount: data.targetAmount,
        currentAmount: 0,
        category: data.category,
        ...(data.prazo && { prazo: data.prazo }),
        status: "active" as GoalStatus,
        contributions: [],
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
      };

      // Só adicionar deadline se existir (Firestore não aceita undefined)
      if (data.deadline) {
        goalData.deadline = Timestamp.fromDate(data.deadline);
      }

      const docRef = await addDoc(getGoalsCollection(), goalData);
      console.log("✅ [GOAL SERVICE] Meta criada com ID:", docRef.id);

      const goal: Goal = {
        id: docRef.id,
        userId,
        title: data.title.trim(),
        description: data.description?.trim(),
        targetAmount: data.targetAmount,
        currentAmount: 0,
        category: data.category,
        deadline: data.deadline,
        prazo: data.prazo,
        status: "active",
        contributions: [],
        createdAt: now,
        updatedAt: now,
      };

      // Registrar atividade
      await activityServices.logActivity(userId, {
        type: "goal_created",
        title: `Meta criada: ${data.title.trim()}`,
        description: `Meta de ${formatCurrency(data.targetAmount)}`,
        metadata: {
          goalTitle: data.title.trim(),
          amount: data.targetAmount,
          category: data.category,
        },
      });

      return goal;
    } catch (error) {
      console.error("❌ [GOAL SERVICE] Erro ao criar meta:", error);
      throw error;
    }
  },

  /**
   * Buscar metas do usuário
   */
  async getGoals(userId: string, status?: GoalStatus): Promise<Goal[]> {
    console.log("🎯 [GOAL SERVICE] Buscando metas...");

    try {
      let q = query(getGoalsCollection(), where("userId", "==", userId));

      if (status) {
        q = query(q, where("status", "==", status));
      }

      const snapshot = await getDocs(q);
      let goals = snapshot.docs.map((doc) =>
        convertGoalFromFirestore(getDocData(doc)),
      );

      // Ordenar por data de criação (mais recente primeiro)
      goals.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      console.log("🎯 [GOAL SERVICE] Total de metas:", goals.length);
      return goals;
    } catch (error) {
      console.error("❌ [GOAL SERVICE] Erro ao buscar metas:", error);
      throw error;
    }
  },

  /**
   * Buscar meta por ID
   */
  async getGoalById(id: string): Promise<Goal | null> {
    console.log("🎯 [GOAL SERVICE] Buscando meta por ID:", id);

    try {
      const docRef = getGoalDoc(id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        console.log("⚠️ [GOAL SERVICE] Meta não encontrada");
        return null;
      }

      const goal = convertGoalFromFirestore(getDocData(docSnap));
      console.log("✅ [GOAL SERVICE] Meta encontrada:", goal);
      return goal;
    } catch (error) {
      console.error("❌ [GOAL SERVICE] Erro ao buscar meta:", error);
      throw error;
    }
  },

  /**
   * Atualizar meta
   */
  async updateGoal(id: string, data: UpdateGoalData): Promise<Goal> {
    console.log("🎯 [GOAL SERVICE] Atualizando meta:", id);
    console.log("🎯 [GOAL SERVICE] Novos dados:", data);

    try {
      const docRef = getGoalDoc(id);
      const updateData = convertGoalToFirestore({
        ...data,
        updatedAt: new Date(),
      });

      await updateDoc(docRef, updateData);
      console.log("✅ [GOAL SERVICE] Meta atualizada");

      // Buscar meta atualizada
      const updated = await this.getGoalById(id);
      if (!updated) {
        throw new Error("Erro ao buscar meta atualizada");
      }

      return updated;
    } catch (error) {
      console.error("❌ [GOAL SERVICE] Erro ao atualizar meta:", error);
      throw error;
    }
  },

  /**
   * Deletar meta
   */
  async deleteGoal(id: string): Promise<void> {
    console.log("🎯 [GOAL SERVICE] Deletando meta:", id);

    try {
      // Buscar meta antes de deletar para registrar atividade
      const goal = await this.getGoalById(id);

      const docRef = getGoalDoc(id);
      await deleteDoc(docRef);
      console.log("✅ [GOAL SERVICE] Meta deletada");

      // Registrar atividade
      if (goal) {
        await activityServices.logActivity(goal.userId, {
          type: "goal_deleted",
          title: `Meta removida: ${goal.title}`,
          description: `Meta de ${formatCurrency(goal.targetAmount)}`,
          metadata: {
            goalTitle: goal.title,
            amount: goal.targetAmount,
          },
        });
      }
    } catch (error) {
      console.error("❌ [GOAL SERVICE] Erro ao deletar meta:", error);
      throw error;
    }
  },

  /**
   * Adicionar contribuição a uma meta
   */
  async addContribution(
    id: string,
    amount: number,
    note?: string,
  ): Promise<Goal> {
    console.log("🎯 [GOAL SERVICE] Adicionando contribuição à meta:", id);

    if (amount <= 0) {
      throw new Error("Valor da contribuição deve ser maior que zero");
    }

    try {
      const goal = await this.getGoalById(id);
      if (!goal) {
        throw new Error("Meta não encontrada");
      }

      const now = new Date();
      const newContribution: GoalContribution = {
        amount,
        date: now,
        ...(note && { note }),
      };

      const updatedContributions = [...goal.contributions, newContribution];
      const newCurrentAmount = goal.currentAmount + amount;

      // Verificar se atingiu a meta
      const newStatus: GoalStatus =
        newCurrentAmount >= goal.targetAmount ? "completed" : goal.status;

      const updateData: any = {
        contributions: updatedContributions,
        currentAmount: newCurrentAmount,
        status: newStatus,
        updatedAt: now,
      };

      // Se completou, adicionar data de conclusão
      if (newStatus === "completed" && goal.status !== "completed") {
        updateData.completedAt = now;
      }

      const docRef = getGoalDoc(id);
      const firestoreData = convertGoalToFirestore(updateData);

      await updateDoc(docRef, firestoreData);

      console.log("✅ [GOAL SERVICE] Contribuição adicionada");

      // Registrar atividade
      await activityServices.logActivity(goal.userId, {
        type: "goal_contribution",
        title: `Contribuição em ${goal.title}`,
        description: `Adicionado ${formatCurrency(amount)}`,
        metadata: {
          goalTitle: goal.title,
          amount,
          note,
        },
      });

      // Se completou a meta, registrar atividade de conclusão
      if (newStatus === "completed" && goal.status !== "completed") {
        await activityServices.logActivity(goal.userId, {
          type: "goal_completed",
          title: `Meta concluída: ${goal.title}`,
          description: `Meta de ${formatCurrency(goal.targetAmount)} alcançada! 🎉`,
          metadata: {
            goalTitle: goal.title,
            amount: goal.targetAmount,
          },
        });
      }

      // Buscar meta atualizada
      const updated = await this.getGoalById(id);
      if (!updated) {
        throw new Error("Erro ao buscar meta atualizada");
      }

      return updated;
    } catch (error) {
      console.error("❌ [GOAL SERVICE] Erro ao adicionar contribuição:", error);
      throw error;
    }
  },

  /**
   * Remover contribuição de uma meta
   */
  async removeContribution(
    id: string,
    contributionIndex: number,
  ): Promise<Goal> {
    console.log("🎯 [GOAL SERVICE] Removendo contribuição da meta:", id);

    try {
      const goal = await this.getGoalById(id);
      if (!goal) {
        throw new Error("Meta não encontrada");
      }

      if (
        contributionIndex < 0 ||
        contributionIndex >= goal.contributions.length
      ) {
        throw new Error("Índice de contribuição inválido");
      }

      const removedContribution = goal.contributions[contributionIndex];
      const updatedContributions = goal.contributions.filter(
        (_, index) => index !== contributionIndex,
      );
      const newCurrentAmount = goal.currentAmount - removedContribution.amount;

      // Recalcular status
      const newStatus: GoalStatus =
        newCurrentAmount >= goal.targetAmount ? "completed" : "active";

      const updateData: any = {
        contributions: updatedContributions,
        currentAmount: Math.max(0, newCurrentAmount),
        status: newStatus,
        updatedAt: new Date(),
      };

      const docRef = getGoalDoc(id);
      const firestoreData = convertGoalToFirestore(updateData);

      await updateDoc(docRef, firestoreData);

      console.log("✅ [GOAL SERVICE] Contribuição removida");

      // Buscar meta atualizada
      const updated = await this.getGoalById(id);
      if (!updated) {
        throw new Error("Erro ao buscar meta atualizada");
      }

      return updated;
    } catch (error) {
      console.error("❌ [GOAL SERVICE] Erro ao remover contribuição:", error);
      throw error;
    }
  },

  /**
   * Calcular estatísticas das metas
   */
  async getGoalStats(userId: string): Promise<GoalStats> {
    console.log("🎯 [GOAL SERVICE] Calculando estatísticas das metas...");

    try {
      const goals = await this.getGoals(userId);

      const activeGoals = goals.filter((g) => g.status === "active").length;
      const completedGoals = goals.filter(
        (g) => g.status === "completed",
      ).length;
      const totalTargetAmount = goals.reduce(
        (sum, g) => sum + g.targetAmount,
        0,
      );
      const totalCurrentAmount = goals.reduce(
        (sum, g) => sum + g.currentAmount,
        0,
      );
      const totalProgress =
        totalTargetAmount > 0
          ? (totalCurrentAmount / totalTargetAmount) * 100
          : 0;

      const stats: GoalStats = {
        totalGoals: goals.length,
        activeGoals,
        completedGoals,
        totalTargetAmount,
        totalCurrentAmount,
        totalProgress,
      };

      console.log("🎯 [GOAL SERVICE] Estatísticas calculadas:", stats);
      return stats;
    } catch (error) {
      console.error("❌ [GOAL SERVICE] Erro ao calcular estatísticas:", error);
      throw error;
    }
  },

  /**
   * Marcar meta como concluída
   */
  async completeGoal(id: string): Promise<Goal> {
    console.log("🎯 [GOAL SERVICE] Marcando meta como concluída:", id);

    return this.updateGoal(id, {
      status: "completed",
    });
  },

  /**
   * Cancelar meta
   */
  async cancelGoal(id: string): Promise<Goal> {
    console.log("🎯 [GOAL SERVICE] Cancelando meta:", id);

    return this.updateGoal(id, {
      status: "cancelled",
    });
  },

  /**
   * Reativar meta
   */
  async reactivateGoal(id: string): Promise<Goal> {
    console.log("🎯 [GOAL SERVICE] Reativando meta:", id);

    return this.updateGoal(id, {
      status: "active",
    });
  },
};

export default goalServices;
