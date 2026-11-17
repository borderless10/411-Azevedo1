import { HttpsError } from "firebase-functions/v2/https";
import { isAdminUserData } from "./rankingSeason.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateAdminCredentialsInput = ({ email, newPassword }) => {
  const errors = [];
  const payload = {};

  if (email !== undefined && email !== null && String(email).trim() !== "") {
    const normalized = String(email).trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalized)) {
      errors.push("E-mail inválido.");
    } else {
      payload.email = normalized;
    }
  }

  if (newPassword !== undefined && newPassword !== null && String(newPassword) !== "") {
    const password = String(newPassword);
    if (password.length < 6) {
      errors.push("A nova senha precisa de pelo menos 6 caracteres.");
    } else {
      payload.password = password;
    }
  }

  if (!payload.email && !payload.password) {
    errors.push("Informe um novo e-mail ou uma nova senha.");
  }

  return { valid: errors.length === 0, errors, payload };
};

const requireAuth = (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Faça login.");
  return request.auth.uid;
};

const requireAdmin = async (db, uid) => {
  const snap = await db.doc(`users/${uid}`).get();
  if (!isAdminUserData(snap.data())) {
    throw new HttpsError("permission-denied", "Apenas administradores.");
  }
};

export const createAdminUserHandlers = (db, auth) => ({
  /**
   * Admin corrige e-mail e/ou senha de consultores, supervisores e
   * usuários comuns. E-mail e senha vivem no Firebase Auth, então a
   * troca é feita aqui com o Admin SDK e refletida no documento.
   */
  async adminUpdateUserCredentials(request) {
    const adminUid = requireAuth(request);
    await requireAdmin(db, adminUid);

    const userId = String(request.data?.userId || "");
    if (!userId) throw new HttpsError("invalid-argument", "Usuário obrigatório.");

    const userRef = db.doc(`users/${userId}`);
    const userSnap = await userRef.get();
    if (!userSnap.exists) throw new HttpsError("not-found", "Usuário não encontrado.");

    const target = userSnap.data() || {};
    if (isAdminUserData(target)) {
      throw new HttpsError(
        "permission-denied",
        "Credenciais de outro administrador não podem ser alteradas por aqui.",
      );
    }

    const { valid, errors, payload } = validateAdminCredentialsInput({
      email: request.data?.email,
      newPassword: request.data?.newPassword,
    });
    if (!valid) throw new HttpsError("invalid-argument", errors.join(" "));

    try {
      await auth.updateUser(userId, {
        ...(payload.email
          ? { email: payload.email, emailVerified: true }
          : {}),
        ...(payload.password ? { password: payload.password } : {}),
      });
    } catch (error) {
      if (error?.code === "auth/email-already-exists") {
        throw new HttpsError(
          "already-exists",
          "Este e-mail já está em uso por outra conta.",
        );
      }
      if (error?.code === "auth/user-not-found") {
        throw new HttpsError("not-found", "Conta de acesso não encontrada.");
      }
      throw new HttpsError(
        "internal",
        "Não foi possível atualizar o acesso agora.",
      );
    }

    if (payload.password) {
      // Senha trocada pelo admin: derruba sessões antigas do usuário.
      await auth.revokeRefreshTokens(userId);
    }
    if (payload.email) {
      await userRef.update({ email: payload.email });
    }

    return { userId, email: payload.email || target.email || "" };
  },
});
