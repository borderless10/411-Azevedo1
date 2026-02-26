import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { db } from '../lib/firestore'
import type { Planning } from '../types/planning'

type ClientPlanning = {
  userId: string
  planning?: Planning | null
}

/**
 * Lista os planejamentos atuais de todos os clientes atribuídos ao consultor.
 */
export async function listPlanningsForConsultant(consultantId: string): Promise<ClientPlanning[]> {
  const usersRef = collection(db, 'users')
  const q = query(usersRef, where('consultantId', '==', consultantId))
  const snap = await getDocs(q)
  const results: ClientPlanning[] = []
  for (const d of snap.docs) {
    const userId = d.id
    const planDocRef = doc(db, 'users', userId, 'planning', 'current')
    const planSnap = await getDoc(planDocRef)
    results.push({ userId, planning: planSnap.exists() ? (planSnap.data() as Planning) : null })
  }
  return results
}

export default { listPlanningsForConsultant }
