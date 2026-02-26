/**
 * Serviço para gerenciar Planning criado por consultores
 */

import { doc, getDoc, setDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  Planning,
  CreatePlanningData,
  UpdatePlanningData,
  PlanningFirestore,
} from "../types/planning";
import { userService } from "./userServices";
import { activityServices } from "./activityServices";

const getUserPlanningDoc = (userId: string) =>
  doc(db, "users", userId, "planning", "current");

export const planningServices = {
  async getPlanning(userId: string): Promise<Planning | null> {
    try {
      const docRef = getUserPlanningDoc(userId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return null;

      const data = snap.data() as PlanningFirestore;
      return {
        id: snap.id,
        consultantId: data.consultantId,
        monthlyIncome: data.monthlyIncome,
        plannedByCategory: data.plannedByCategory,
        modules: data.modules,
        notes: data.notes,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      } as Planning;
    } catch (error) {
      console.error("❌ [PLANNING SERVICE] Erro ao buscar planning:", error);
      throw error;
    }
  },

  async savePlanning(
    consultantId: string,
    userId: string,
    data: CreatePlanningData,
  ): Promise<Planning> {
    try {
      // checar se consultantId tem role de consultor (ou admin)
      const consultant = await userService.getUserById(consultantId);
      if (
        !consultant ||
        (consultant.role !== "consultor" && consultant.role !== "admin")
      ) {
        throw new Error("Usuário não autorizado a criar planejamento");
      }

      const now = Timestamp.now();
      const docRef = getUserPlanningDoc(userId);
      const payload: PlanningFirestore = {
        consultantId: data.consultantId,
        monthlyIncome: data.monthlyIncome,
        plannedByCategory: data.plannedByCategory,
        modules: data.modules,
        notes: data.notes,
        createdAt: now,
        updatedAt: now,
      } as PlanningFirestore;

      await setDoc(docRef, payload);

      // Registrar atividade para o cliente (in-app)
      try {
        await activityServices.logActivity(userId, {
          type: "plan_created",
          title: "Novo planejamento financeiro disponível",
          description:
            "Seu consultor criou um planejamento financeiro. Abra para ver os detalhes.",
          metadata: { consultantId: payload.consultantId },
        });
      } catch (e) {
        console.warn(
          "⚠️ [PLANNING SERVICE] Falha ao registrar atividade de criação:",
          e,
        );
      }

      return {
        consultantId: payload.consultantId,
        monthlyIncome: payload.monthlyIncome,
        plannedByCategory: payload.plannedByCategory,
        modules: payload.modules,
        notes: payload.notes,
        createdAt: now.toDate(),
        updatedAt: now.toDate(),
      } as Planning;
    } catch (error) {
      console.error("❌ [PLANNING SERVICE] Erro ao salvar planning:", error);
      throw error;
    }
  },

  async updatePlanning(
    consultantId: string,
    userId: string,
    data: UpdatePlanningData,
  ): Promise<Planning | null> {
    try {
      const consultant = await userService.getUserById(consultantId);
      if (
        !consultant ||
        (consultant.role !== "consultor" && consultant.role !== "admin")
      ) {
        throw new Error("Usuário não autorizado a atualizar planejamento");
      }

      const docRef = getUserPlanningDoc(userId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        throw new Error("Planning não encontrado para este usuário");
      }

      const now = Timestamp.now();
      const updatePayload: any = {
        updatedAt: now,
      };

      if (data.monthlyIncome !== undefined)
        updatePayload.monthlyIncome = data.monthlyIncome;
      if (data.plannedByCategory !== undefined)
        updatePayload.plannedByCategory = data.plannedByCategory;
      if (data.modules !== undefined) updatePayload.modules = data.modules;
      if (data.notes !== undefined) updatePayload.notes = data.notes;

      await updateDoc(docRef, updatePayload);

      const updatedSnap = await getDoc(docRef);
      const updatedData = updatedSnap.data() as PlanningFirestore;

      // Registrar atividade de atualização no feed do cliente
      try {
        await activityServices.logActivity(userId, {
          type: "plan_updated",
          title: "Planejamento atualizado",
          description:
            "Seu consultor atualizou o planejamento financeiro. Abra para ver as alterações.",
          metadata: { consultantId: consultantId },
        });
      } catch (e) {
        console.warn(
          "⚠️ [PLANNING SERVICE] Falha ao registrar atividade de atualização:",
          e,
        );
      }

      return {
        id: updatedSnap.id,
        consultantId: updatedData.consultantId,
        monthlyIncome: updatedData.monthlyIncome,
        plannedByCategory: updatedData.plannedByCategory,
        modules: updatedData.modules,
        notes: updatedData.notes,
        createdAt: updatedData.createdAt.toDate(),
        updatedAt: updatedData.updatedAt.toDate(),
      } as Planning;
    } catch (error) {
      console.error("❌ [PLANNING SERVICE] Erro ao atualizar planning:", error);
      throw error;
    }
  },
};

export default planningServices;
