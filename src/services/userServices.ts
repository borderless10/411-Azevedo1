import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  Timestamp,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { RankingPreference, User } from "../types/auth";
import { resolveAccountType } from "../utils/coupleAccount";

const resolveRankingPreference = (data: any): RankingPreference => {
  const pref = data?.rankingPreference;
  if (
    pref === "participate" ||
    pref === "view_only" ||
    pref === "hidden" ||
    pref === "unset"
  ) {
    return pref;
  }

  if (data?.showInRanking === true) {
    return "participate";
  }

  if (data?.showInRanking === false) {
    return "view_only";
  }

  return "unset";
};

export const resolveRankingPreferenceFromData = resolveRankingPreference;

const toDateValue = (value: any, fallback = new Date()): Date => {
  if (!value) return fallback;
  if (value.toDate && typeof value.toDate === "function") return value.toDate();
  if (value instanceof Date) return value;
  if (value.seconds) return new Date(value.seconds * 1000);
  return new Date(value);
};

export const mapUserDocument = (id: string, data: any): User => ({
  id,
  name: data?.name || "",
  nickname: data?.nickname || "",
  consultantId: data?.consultantId || undefined,
  photoBase64: data?.photoBase64 || "",
  email: data?.email || "",
  username: data?.username || "",
  bio: data?.bio || "",
  phone: data?.phone || "",
  role: data?.role || "user",
  isAdmin: data?.isAdmin === true || data?.role === "admin",
  isActive: data?.isActive === undefined ? true : data?.isActive === true,
  currency: data?.currency || "BRL",
  showInRanking:
    data?.showInRanking === undefined ? undefined : data?.showInRanking === true,
  rankingPreference: resolveRankingPreference(data),
  accountType: resolveAccountType(data?.accountType),
  coupleMember1Name: data?.coupleMember1Name || "",
  coupleMember2Name: data?.coupleMember2Name || "",
  createdAt: toDateValue(data?.createdAt),
  updatedAt: toDateValue(data?.updatedAt),
});

export const userParticipatesInRanking = (user: User | null): boolean => {
  if (!user || user.isActive === false) return false;
  if (user.isAdmin || user.role === "admin" || user.role === "consultor") {
    return false;
  }
  return user.rankingPreference === "participate";
};

export const userService = {
  // Buscar dados de um usuário por ID
  async getUserById(userId: string): Promise<User | null> {
    try {
      const userDoc = await getDoc(doc(db, "users", userId));
      if (!userDoc.exists()) {
        console.log("Documento não existe para userId:", userId);
        return null;
      }

      const userData = userDoc.data();
      console.log("Dados do usuário encontrados:", userData);
      return mapUserDocument(userDoc.id, userData);
    } catch (error) {
      console.error("Erro ao buscar usuário:", error);
      console.error("userId tentado:", userId);
      throw error;
    }
  },

  /**
   * Marcar um usuário como consultor
   */
  async setUserAsConsultor(userId: string): Promise<void> {
    try {
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);
      const now = Timestamp.now();

      if (userDoc.exists()) {
        await updateDoc(userRef, {
          role: "consultor",
          isAdmin: false,
          isActive: true,
          updatedAt: now,
        });
        console.log("✅ Usuário atualizado para consultor");
      } else {
        // criar documento caso não exista
        const authUser = auth.currentUser;
        await setDoc(userRef, {
          name: authUser?.displayName || "",
          email: authUser?.email || "",
          role: "consultor",
          isAdmin: false,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
        console.log("✅ Documento de usuário criado como consultor");
      }
    } catch (error) {
      console.error("❌ Erro ao atualizar usuário para consultor:", error);
      throw error;
    }
  },

  /**
   * Atribuir um consultor a um cliente (vincular consultantId)
   */
  async assignConsultantToUser(
    userId: string,
    consultantId: string,
  ): Promise<void> {
    try {
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);
      const now = Timestamp.now();

      if (!userDoc.exists()) {
        throw new Error("Usuário não encontrado");
      }

      await updateDoc(userRef, {
        consultantId,
        updatedAt: now,
      });

      console.log(
        `✅ Consultor ${consultantId} atribuído ao usuário ${userId}`,
      );
    } catch (error) {
      console.error("❌ Erro ao atribuir consultor ao usuário:", error);
      throw error;
    }
  },

  /**
   * Atualizar usuário para admin
   */
  async setUserAsAdmin(userId: string): Promise<void> {
    try {
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);
      const now = Timestamp.now();

      if (userDoc.exists()) {
        // Atualizar documento existente
        await updateDoc(userRef, {
          role: "admin",
          isAdmin: true,
          isActive: true,
          updatedAt: now,
        });
        console.log("✅ Usuário atualizado para admin");
      } else {
        // Criar documento se não existir
        const authUser = auth.currentUser;
        await setDoc(userRef, {
          name: authUser?.displayName || "",
          email: authUser?.email || "",
          role: "admin",
          isAdmin: true,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
        console.log("✅ Documento de usuário criado como admin");
      }
    } catch (error) {
      console.error("❌ Erro ao atualizar usuário para admin:", error);
      throw error;
    }
  },

  /**
   * Atualizar usuário para usuário normal (remover admin)
   */
  async setUserAsNormal(userId: string): Promise<void> {
    try {
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);
      const now = Timestamp.now();

      if (userDoc.exists()) {
        // Atualizar documento existente
        await updateDoc(userRef, {
          role: "user",
          isAdmin: false,
          updatedAt: now,
        });
        console.log("✅ Usuário atualizado para usuário normal");
      } else {
        console.log("⚠️ Documento não existe para userId:", userId);
      }
    } catch (error) {
      console.error("❌ Erro ao atualizar usuário para normal:", error);
      throw error;
    }
  },

  /**
   * Buscar usuário por email e atualizar para usuário normal
   */
  async setUserAsNormalByEmail(email: string): Promise<void> {
    try {
      // Buscar usuário no Firestore pelo email
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        await this.setUserAsNormal(userDoc.id);
        console.log(`✅ Usuário ${email} atualizado para usuário normal`);
      } else {
        console.log(`⚠️ Nenhum usuário encontrado com email: ${email}`);
      }
    } catch (error) {
      console.error("❌ Erro ao buscar e atualizar usuário por email:", error);
      throw error;
    }
  },

  /**
   * Atualizar preferências do usuário (currency, showInRanking, etc.)
   */
  async updateUserPreferences(
    userId: string,
    prefs: {
      currency?: string;
      showInRanking?: boolean;
      rankingPreference?: RankingPreference;
    },
  ): Promise<void> {
    try {
      const userRef = doc(db, "users", userId);
      const now = Timestamp.now();
      const updatePayload: any = { updatedAt: now };

      if (prefs.currency !== undefined) updatePayload.currency = prefs.currency;
      if (prefs.showInRanking !== undefined)
        updatePayload.showInRanking = prefs.showInRanking;
      if (prefs.rankingPreference !== undefined) {
        updatePayload.rankingPreference = prefs.rankingPreference;
        updatePayload.showInRanking = prefs.rankingPreference === "participate";
      }

      await updateDoc(userRef, updatePayload);
      console.log("✅ Preferências do usuário atualizadas", userId, prefs);
    } catch (error) {
      console.error("❌ Erro ao atualizar preferências do usuário:", error);
      throw error;
    }
  },

  /**
   * Criar documento de usuário normal no Firestore
   */
  async createUserDocument(
    userId: string,
    userData: {
      name: string;
      email: string;
      phone?: string;
      nickname?: string;
      photoBase64?: string;
      role?: string;
    },
  ): Promise<void> {
    try {
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);
      const now = Timestamp.now();

      if (!userDoc.exists()) {
        // Criar documento como usuário normal (não admin)
        await setDoc(userRef, {
          name: userData.name,
          nickname: userData.nickname || "",
          photoBase64: userData.photoBase64 || "",
          email: userData.email,
          phone: userData.phone || "",
          role: userData.role || "user", // Use provided role or default to user
          isAdmin: false, // Garantir que não é admin
          isActive: true, // Conta ativa por padrão
          accountType: "individual",
          createdAt: now,
          updatedAt: now,
        });
        console.log("✅ Documento de usuário criado como usuário normal");
        return;
      }

      // Doc já existe: nunca apagar consultantId nem reescrever cadastro admin.
    } catch (error) {
      console.error("❌ Erro ao criar documento de usuário:", error);
      throw error;
    }
  },
  /**
   * Toggle ativo/inativo de um usuário
   */
  async setUserActive(userId: string, active: boolean): Promise<void> {
    try {
      const userRef = doc(db, "users", userId);
      const now = Timestamp.now();
      await updateDoc(userRef, {
        isActive: active,
        updatedAt: now,
      });
      console.log(`✅ Usuário ${userId} atualizado isActive=${active}`);
    } catch (error) {
      console.error("❌ Erro ao atualizar isActive do usuário:", error);
      throw error;
    }
  },

  /**
   * Buscar todos os usuários
   */
  async getAllUsers(): Promise<User[]> {
    try {
      const usersRef = collection(db, "users");
      const snapshot = await getDocs(usersRef);
      const results: User[] = [];
      snapshot.forEach((docSnap) => {
        results.push(mapUserDocument(docSnap.id, docSnap.data()));
      });
      return results;
    } catch (error) {
      console.error("❌ Erro ao buscar todos os usuários:", error);
      throw error;
    }
  },
  /**
   * Buscar usuários por role (ex: 'user')
   */
  async getUsersByRole(role: string): Promise<User[]> {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("role", "==", role));
      const snapshot = await getDocs(q);
      console.log(
        `[USER SERVICE] getUsersByRole('${role}'): ${snapshot.size} resultados encontrados`,
      );
      const results: User[] = [];
      snapshot.forEach((docSnap) => {
        results.push(mapUserDocument(docSnap.id, docSnap.data()));
      });
      return results;
    } catch (error) {
      console.error("❌ Erro ao buscar usuários por role:", error);
      throw error;
    }
  },
  /**
   * Buscar usuário pelo email (retorna o primeiro que encontrar)
   */
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", email));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      const docSnap = snapshot.docs[0];
      return mapUserDocument(docSnap.id, docSnap.data());
    } catch (error) {
      console.error("❌ Erro ao buscar usuário por email:", error);
      throw error;
    }
  },
  /**
   * Atualizar campos básicos do usuário (name, phone, role, isAdmin)
   */
  async updateUser(
    userId: string,
    payload: {
      name?: string;
      nickname?: string;
      phone?: string;
      photoBase64?: string | null;
      role?: string;
      isAdmin?: boolean;
      consultantId?: string | null;
      accountType?: "individual" | "couple";
      coupleMember1Name?: string;
      coupleMember2Name?: string;
    },
  ): Promise<void> {
    try {
      const userRef = doc(db, "users", userId);
      const now = Timestamp.now();
      const updatePayload: any = { updatedAt: now };
      if (payload.name !== undefined) updatePayload.name = payload.name;
      if (payload.nickname !== undefined)
        updatePayload.nickname = payload.nickname;
      if (payload.photoBase64 !== undefined)
        updatePayload.photoBase64 = payload.photoBase64;
      if (payload.phone !== undefined) updatePayload.phone = payload.phone;
      if (payload.role !== undefined) updatePayload.role = payload.role;
      if (payload.isAdmin !== undefined)
        updatePayload.isAdmin = payload.isAdmin;
      if (payload.consultantId !== undefined)
        updatePayload.consultantId = payload.consultantId;
      if (payload.accountType !== undefined)
        updatePayload.accountType = payload.accountType;
      if (payload.coupleMember1Name !== undefined)
        updatePayload.coupleMember1Name = payload.coupleMember1Name;
      if (payload.coupleMember2Name !== undefined)
        updatePayload.coupleMember2Name = payload.coupleMember2Name;
      await updateDoc(userRef, updatePayload);
      console.log(`✅ Usuário ${userId} atualizado`, updatePayload);
    } catch (error) {
      console.error("❌ Erro ao atualizar usuário:", error);
      throw error;
    }
  },
};
