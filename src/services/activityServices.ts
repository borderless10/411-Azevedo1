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
} from 'firebase/firestore';
import {
  getActivitiesCollection,
  convertActivityFromFirestore,
  getDocData,
} from '../lib/firestore';
import {
  Activity,
  CreateActivityData,
} from '../types/activity';

/**
 * Serviço de Atividades
 */
export const activityServices = {
  /**
   * Criar uma nova atividade
   */
  async createActivity(
    userId: string,
    data: CreateActivityData
  ): Promise<Activity> {
    console.log('📝 [ACTIVITY SERVICE] Criando atividade...');
    console.log('📝 [ACTIVITY SERVICE] Type:', data.type);
    console.log('📝 [ACTIVITY SERVICE] Title:', data.title);

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

      console.log('📝 [ACTIVITY SERVICE] Dados a serem salvos:', activityData);
      
      const docRef = await addDoc(getActivitiesCollection(), activityData);
      console.log('✅ [ACTIVITY SERVICE] Atividade criada com ID:', docRef.id);

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
      console.error('❌ [ACTIVITY SERVICE] Erro ao criar atividade:', error);
      // Não lançar erro - atividades são secundárias
      throw error;
    }
  },

  /**
   * Buscar atividades do usuário
   */
  async getActivities(
    userId: string,
    limitCount: number = 50
  ): Promise<Activity[]> {
    console.log('📝 [ACTIVITY SERVICE] Buscando atividades para userId:', userId);

    try {
      // Tentar com índice primeiro (query otimizada)
      const q = query(
        getActivitiesCollection(),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      console.log('📝 [ACTIVITY SERVICE] Executando query com índice...');
      const snapshot = await getDocs(q);
      
      console.log('📝 [ACTIVITY SERVICE] Snapshot size:', snapshot.size);
      
      const activities = snapshot.docs.map((doc) =>
        convertActivityFromFirestore(getDocData(doc))
      );

      console.log('✅ [ACTIVITY SERVICE] Atividades encontradas:', activities.length);
      
      if (activities.length > 0) {
        console.log('📝 [ACTIVITY SERVICE] Primeira atividade:', activities[0]);
      }
      
      return activities;
    } catch (error: any) {
      console.error('❌ [ACTIVITY SERVICE] Erro ao buscar atividades:', error);
      console.error('❌ [ACTIVITY SERVICE] Error code:', error?.code);
      
      // Se for erro de índice, tentar buscar sem orderBy (mais lento, mas funciona)
      if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
        console.warn('⚠️ [ACTIVITY SERVICE] Índice não encontrado. Buscando sem ordenação...');
        console.warn('⚠️ [ACTIVITY SERVICE] CRIE O ÍNDICE para melhor performance!');
        console.warn('⚠️ [ACTIVITY SERVICE] Coleção: activities | Campos: userId (Asc), createdAt (Desc)');
        
        try {
          // Query simplificada sem orderBy (não precisa de índice)
          const simpleQuery = query(
            getActivitiesCollection(),
            where('userId', '==', userId)
          );
          
          const snapshot = await getDocs(simpleQuery);
          let activities = snapshot.docs.map((doc) =>
            convertActivityFromFirestore(getDocData(doc))
          );
          
          // Ordenar no cliente
          activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          
          // Limitar no cliente
          activities = activities.slice(0, limitCount);
          
          console.log('✅ [ACTIVITY SERVICE] Atividades encontradas (sem índice):', activities.length);
          return activities;
        } catch (fallbackError) {
          console.error('❌ [ACTIVITY SERVICE] Erro na busca alternativa:', fallbackError);
          return [];
        }
      }
      
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
  async logActivity(
    userId: string,
    data: CreateActivityData
  ): Promise<void> {
    try {
      await this.createActivity(userId, data);
    } catch (error) {
      // Silenciosamente falhar - atividades não devem quebrar o app
      console.error('❌ [ACTIVITY SERVICE] Erro ao registrar atividade (ignorado):', error);
    }
  },
};

export default activityServices;
