import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User } from '../types/auth';

export const userService = {
  // Buscar dados de um usuário por ID
  async getUserById(userId: string): Promise<User | null> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        console.log('Documento não existe para userId:', userId);
        return null;
      }

      const userData = userDoc.data();
      console.log('Dados do usuário encontrados:', userData);
      
      // Converter datas - pode ser Timestamp do Firestore ou Date do JavaScript
      let createdAt: Date;
      let updatedAt: Date;
      
      if (userData.createdAt) {
        // Se for Timestamp do Firestore
        if (userData.createdAt.toDate && typeof userData.createdAt.toDate === 'function') {
          createdAt = userData.createdAt.toDate();
        } 
        // Se for Date do JavaScript
        else if (userData.createdAt instanceof Date) {
          createdAt = userData.createdAt;
        }
        // Se for Timestamp (objeto com seconds e nanoseconds)
        else if (userData.createdAt.seconds) {
          createdAt = new Date(userData.createdAt.seconds * 1000);
        }
        // Se for string ou número
        else {
          createdAt = new Date(userData.createdAt);
        }
      } else {
        createdAt = new Date();
      }
      
      if (userData.updatedAt) {
        // Se for Timestamp do Firestore
        if (userData.updatedAt.toDate && typeof userData.updatedAt.toDate === 'function') {
          updatedAt = userData.updatedAt.toDate();
        } 
        // Se for Date do JavaScript
        else if (userData.updatedAt instanceof Date) {
          updatedAt = userData.updatedAt;
        }
        // Se for Timestamp (objeto com seconds e nanoseconds)
        else if (userData.updatedAt.seconds) {
          updatedAt = new Date(userData.updatedAt.seconds * 1000);
        }
        // Se for string ou número
        else {
          updatedAt = new Date(userData.updatedAt);
        }
      } else {
        updatedAt = new Date();
      }
      
      return {
        id: userDoc.id,
        name: userData.name || '',
        email: userData.email || '',
        username: userData.username || '',
        bio: userData.bio || '',
        phone: userData.phone || '',
        createdAt,
        updatedAt,
      };
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      console.error('userId tentado:', userId);
      throw error;
    }
  },
};
