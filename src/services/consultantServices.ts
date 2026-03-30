import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { User } from "../types/auth";

/**
 * Retorna a lista de usuários que têm `consultantId === consultantId`.
 * Faz filtragem simples por nome/email no cliente (client-side) quando `term` informado.
 */
export async function getClientsByConsultant(
  consultantId: string,
  term?: string,
): Promise<User[]> {
  console.log(
    "[CONSULTANT SERVICE] getClientsByConsultant called with consultantId:",
    consultantId,
  );
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("consultantId", "==", consultantId));
  const snap = await getDocs(q);
  const results = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as any),
  })) as User[];
  console.log(
    "[CONSULTANT SERVICE] Query results:",
    results.length,
    "clientes encontrados",
  );
  if (results.length === 0) {
    console.warn(
      "[CONSULTANT SERVICE] Nenhum cliente encontrado com consultantId:",
      consultantId,
    );
    console.warn(
      "[CONSULTANT SERVICE] Verificando se consultantId existe no Firestore...",
    );
    // Fallback: buscar TODOS os usuários com role === 'user' para diagnóstico
    const allUsersQ = query(usersRef, where("role", "==", "user"));
    const allSnap = await getDocs(allUsersQ);
    const allUsers = allSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as any),
    })) as User[];
    console.warn(
      "[CONSULTANT SERVICE] Total de usuários com role=user:",
      allUsers.length,
    );
    console.warn(
      "[CONSULTANT SERVICE] Consultando usuários com consultantId definido:",
      allUsers.filter((u) => (u as any).consultantId).length,
    );
  }
  if (!term) return results;
  const t = term.trim().toLowerCase();
  return results.filter((u) => {
    const name = (u.displayName || u.name || "").toString().toLowerCase();
    const email = (u.email || "").toString().toLowerCase();
    return name.includes(t) || email.includes(t);
  });
}

export default { getClientsByConsultant };
