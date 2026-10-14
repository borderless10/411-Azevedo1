import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { User } from "../types/auth";
import { mapUserDocument } from "./userServices";

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
  const results = snap.docs.map((d) => mapUserDocument(d.id, d.data()));
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
    const name = (u.nickname || u.name || "").toString().toLowerCase();
    const email = (u.email || "").toString().toLowerCase();
    return name.includes(t) || email.includes(t);
  });
}

export async function getAllClients(term?: string): Promise<User[]> {
  const usersRef = collection(db, "users");
  const [commonSnap, premiumSnap, legacySnap] = await Promise.all([
    getDocs(query(usersRef, where("role", "==", "user"))),
    getDocs(query(usersRef, where("role", "==", "cliente_premium"))),
    getDocs(query(usersRef, where("role", "==", "cliente"))),
  ]);
  const byId = new Map<string, User>();
  [...commonSnap.docs, ...premiumSnap.docs, ...legacySnap.docs].forEach((item) => {
    byId.set(item.id, mapUserDocument(item.id, item.data()));
  });
  const results = Array.from(byId.values());
  if (!term) return results;
  const normalized = term.trim().toLowerCase();
  return results.filter((person) => {
    const name = (person.nickname || person.name || "").toString().toLowerCase();
    const email = (person.email || "").toString().toLowerCase();
    return name.includes(normalized) || email.includes(normalized);
  });
}

export default { getClientsByConsultant, getAllClients };
