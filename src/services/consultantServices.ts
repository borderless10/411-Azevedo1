import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../lib/firestore'
import type { User } from '../types/auth'

/**
 * Retorna a lista de usuários que têm `consultantId === consultantId`.
 * Faz filtragem simples por nome/email no cliente (client-side) quando `term` informado.
 */
export async function getClientsByConsultant(consultantId: string, term?: string): Promise<User[]> {
  const usersRef = collection(db, 'users')
  const q = query(usersRef, where('consultantId', '==', consultantId))
  const snap = await getDocs(q)
  const results = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as User[]
  if (!term) return results
  const t = term.trim().toLowerCase()
  return results.filter(u => {
    const name = (u.displayName || u.name || '').toString().toLowerCase()
    const email = (u.email || '').toString().toLowerCase()
    return name.includes(t) || email.includes(t)
  })
}

export default { getClientsByConsultant }
