import {
  addDoc,
  deleteDoc,
  getDocs,
  query,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  convertRecommendationToFirestore,
  convertRecommendationFromFirestore,
  getDocData,
  getRecommendationDoc,
  getRecommendationsCollection,
} from "../lib/firestore";
import {
  Recommendation,
  CreateRecommendationData,
  UpdateRecommendationData,
} from "../types/recommendation";

const normalizeTopics = (topics: string[]): string[] => {
  return topics.map((topic) => topic.trim()).filter(Boolean);
};

export const recommendationServices = {
  async createRecommendation(
    userId: string,
    consultantId: string,
    data: CreateRecommendationData,
  ): Promise<Recommendation> {
    const topics = normalizeTopics(data.topics || []);

    if (!userId) {
      throw new Error("Usuário inválido para recomendação");
    }

    if (!consultantId) {
      throw new Error("Consultor inválido para recomendação");
    }

    if (!data.recommendationDate) {
      throw new Error("Data da recomendação é obrigatória");
    }

    if (topics.length === 0) {
      throw new Error("Informe pelo menos um tópico");
    }

    const now = new Date();
    const payload = {
      userId,
      consultantId,
      recommendationDate: Timestamp.fromDate(data.recommendationDate),
      topics,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    };

    const ref = await addDoc(getRecommendationsCollection(), payload);

    return {
      id: ref.id,
      userId,
      consultantId,
      recommendationDate: data.recommendationDate,
      topics,
      createdAt: now,
      updatedAt: now,
    };
  },

  async getRecommendations(userId: string): Promise<Recommendation[]> {
    if (!userId) return [];

    const q = query(
      getRecommendationsCollection(),
      where("userId", "==", userId),
    );
    const snapshot = await getDocs(q);

    const recommendations = snapshot.docs
      .map((doc) => convertRecommendationFromFirestore(getDocData(doc)))
      .sort(
        (a, b) =>
          b.recommendationDate.getTime() - a.recommendationDate.getTime(),
      );

    return recommendations;
  },

  async updateRecommendation(
    id: string,
    data: UpdateRecommendationData,
  ): Promise<void> {
    const topics = normalizeTopics(data.topics || []);

    if (!id) {
      throw new Error("Recomendação inválida");
    }

    if (!data.recommendationDate) {
      throw new Error("Data da recomendação é obrigatória");
    }

    if (topics.length === 0) {
      throw new Error("Informe pelo menos um tópico");
    }

    const docRef = getRecommendationDoc(id);
    await updateDoc(
      docRef,
      convertRecommendationToFirestore({
        recommendationDate: data.recommendationDate,
        topics,
        updatedAt: new Date(),
      }) as any,
    );
  },

  async deleteRecommendation(id: string): Promise<void> {
    if (!id) {
      throw new Error("Recomendação inválida");
    }

    await deleteDoc(getRecommendationDoc(id));
  },
};
