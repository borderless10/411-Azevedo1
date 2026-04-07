/**
 * Serviço para gerenciar Atividades do Usuário (Timeline)
 */

import {
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";
import {
  getActivitiesCollection,
  convertActivityFromFirestore,
  getDocData,
} from "../lib/firestore";
import { Activity, CreateActivityData } from "../types/activity";

/**
 * Serviço de Atividades
 */
export const activityServices = {
  /**
   * Criar uma nova atividade
   */
  async createActivity(
    userId: string,
    data: CreateActivityData,
  ): Promise<Activity> {
    if (__DEV__) console.log("📝 [ACTIVITY SERVICE] Criando atividade...");
    if (__DEV__) console.log("📝 [ACTIVITY SERVICE] Type:", data.type);
    if (__DEV__) console.log("📝 [ACTIVITY SERVICE] Title:", data.title);

    try {
      const now = new Date();
      const activityData: any = {
        userId,
        type: data.type,
        title: data.title,
        createdAt: Timestamp.fromDate(now),
      };

      // Adicionar campos opcionais apenas se existirem
      if (data.description) {
        activityData.description = data.description;
      }

      if (data.metadata) {
        activityData.metadata = data.metadata;
      }

      if (__DEV__)
        console.log(
          "📝 [ACTIVITY SERVICE] Dados a serem salvos:",
          activityData,
        );

      const docRef = await addDoc(getActivitiesCollection(), activityData);
      if (__DEV__)
        console.log(
          "✅ [ACTIVITY SERVICE] Atividade criada com ID:",
          docRef.id,
        );

      const activity: Activity = {
        id: docRef.id,
        userId,
        type: data.type,
        title: data.title,
        description: data.description,
        metadata: data.metadata,
        createdAt: now,
      };

      return activity;
    } catch (error) {
      console.error("❌ [ACTIVITY SERVICE] Erro ao criar atividade:", error);
      // Não lançar erro - atividades são secundárias
      throw error;
    }
  },

  /**
   * Buscar atividades do usuário
   */
  async getActivities(
    userId: string,
    limitCount: number = 50,
  ): Promise<Activity[]> {
    if (__DEV__)
      console.log(
        "📝 [ACTIVITY SERVICE] Buscando atividades para userId:",
        userId,
      );

    try {
      // Tentar com índice primeiro (query otimizada)
      const q = query(
        getActivitiesCollection(),
        where("userId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(limitCount),
      );

      if (__DEV__)
        console.log("📝 [ACTIVITY SERVICE] Executando query com índice...");
      const snapshot = await getDocs(q);

      if (__DEV__)
        console.log("📝 [ACTIVITY SERVICE] Snapshot size:", snapshot.size);

      const activities = snapshot.docs.map((doc) =>
        convertActivityFromFirestore(getDocData(doc)),
      );

      if (__DEV__)
        console.log(
          "✅ [ACTIVITY SERVICE] Atividades encontradas:",
          activities.length,
        );

      if (activities.length > 0) {
        if (__DEV__)
          console.log(
            "📝 [ACTIVITY SERVICE] Primeira atividade:",
            activities[0],
          );
      }

      return activities;
    } catch (error: any) {
      const isIndexError =
        error?.code === "failed-precondition" ||
        error?.message?.toLowerCase?.().includes("index");

      // Se for erro de índice, tentar buscar sem orderBy (mais lento, mas funciona)
      if (isIndexError) {
        console.warn(
          "⚠️ [ACTIVITY SERVICE] Índice não encontrado. Buscando sem ordenação...",
        );
        console.warn(
          "⚠️ [ACTIVITY SERVICE] CRIE O ÍNDICE para melhor performance!",
        );
        console.warn(
          "⚠️ [ACTIVITY SERVICE] Coleção: activities | Campos: userId (Asc), createdAt (Desc)",
        );

        try {
          // Query simplificada sem orderBy (não precisa de índice)
          const simpleQuery = query(
            getActivitiesCollection(),
            where("userId", "==", userId),
          );

          const snapshot = await getDocs(simpleQuery);
          let activities = snapshot.docs.map((doc) =>
            convertActivityFromFirestore(getDocData(doc)),
          );

          // Ordenar no cliente
          activities.sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
          );

          // Limitar no cliente
          activities = activities.slice(0, limitCount);

          if (__DEV__)
            console.log(
              "✅ [ACTIVITY SERVICE] Atividades encontradas (sem índice):",
              activities.length,
            );
          return activities;
        } catch (fallbackError) {
          console.error(
            "❌ [ACTIVITY SERVICE] Erro na busca alternativa:",
            fallbackError,
          );
          return [];
        }
      }

      console.error("❌ [ACTIVITY SERVICE] Erro ao buscar atividades:", error);
      console.error("❌ [ACTIVITY SERVICE] Error code:", error?.code);

      // Retornar array vazio para outros erros
      return [];
    }
  },

  /**
   * Buscar atividades recentes (últimas 20)
   */
  async getRecentActivities(userId: string): Promise<Activity[]> {
    return this.getActivities(userId, 20);
  },

  /**
   * Criar atividade de forma segura (não lança erro)
   */
  async logActivity(userId: string, data: CreateActivityData): Promise<void> {
    try {
      await this.createActivity(userId, data);
    } catch (error) {
      // Silenciosamente falhar - atividades não devem quebrar o app
      console.error(
        "❌ [ACTIVITY SERVICE] Erro ao registrar atividade (ignorado):",
        error,
      );
    }
  },
};

export default activityServices;
