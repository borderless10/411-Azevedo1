/**
 * Serviço para gerenciar notificações
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

/**
 * Configurar comportamento padrão das notificações
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Solicitar permissões de notificação
 */
export const requestNotificationPermissions = async (): Promise<boolean> => {
  try {
    if (!Device.isDevice) {
      console.log('Notificações só funcionam em dispositivos físicos');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Permissão de notificação negada');
      return false;
    }

    // Configurar canal de notificação para Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return true;
  } catch (error) {
    console.error('Erro ao solicitar permissões de notificação:', error);
    return false;
  }
};

/**
 * Agendar notificação para uma data específica
 */
export const scheduleBillNotification = async (
  billId: string,
  title: string,
  amount: number,
  dueDate: Date
): Promise<string | null> => {
  try {
    // Cancelar notificação anterior se existir
    await cancelBillNotification(billId);

    // Agendar notificação para às 9h do dia de vencimento
    const notificationDate = new Date(dueDate);
    notificationDate.setHours(9, 0, 0, 0);

    // Se a data já passou, não agendar
    if (notificationDate < new Date()) {
      console.log('⚠️ Data de vencimento já passou, notificação não agendada');
      return null;
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '💰 Conta a vencer hoje!',
        body: `${title} - R$ ${amount.toFixed(2)}`,
        data: { billId, type: 'bill_due' },
        sound: true,
      },
      trigger: {
        date: notificationDate,
      },
    });

    console.log(`✅ Notificação agendada para ${notificationDate.toLocaleString('pt-BR')}`);
    console.log(`   Conta: ${title} - R$ ${amount.toFixed(2)}`);
    console.log(`   ID: ${notificationId}`);

    return notificationId;
  } catch (error) {
    console.error('❌ Erro ao agendar notificação de conta:', error);
    return null;
  }
};

/**
 * Cancelar notificação de uma conta
 */
export const cancelBillNotification = async (billId: string): Promise<void> => {
  try {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    
    for (const notification of scheduledNotifications) {
      if (notification.content.data?.billId === billId) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
  } catch (error) {
    console.error('Erro ao cancelar notificação:', error);
  }
};

/**
 * Agendar notificação diária para lembrar de registrar gastos (21h)
 */
export const scheduleDailyExpenseReminder = async (): Promise<string | null> => {
  try {
    // Cancelar lembretes anteriores
    await cancelDailyExpenseReminder();

    // Calcular próxima ocorrência das 21h
    const now = new Date();
    const trigger = new Date();
    trigger.setHours(21, 0, 0, 0);

    // Se já passou das 21h hoje, agendar para amanhã
    if (trigger <= now) {
      trigger.setDate(trigger.getDate() + 1);
    }

    // Agendar notificação diária às 21h
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '📝 Lembrete de Gastos',
        body: 'Não se esqueça de registrar seus gastos do dia!',
        data: { type: 'daily_expense_reminder' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 21,
        minute: 0,
      },
    });

    console.log('✅ Lembrete diário agendado para 21h (todos os dias)');
    console.log(`   Próxima notificação: ${trigger.toLocaleString('pt-BR')}`);
    console.log(`   ID: ${notificationId}`);

    return notificationId;
  } catch (error) {
    console.error('❌ Erro ao agendar lembrete diário:', error);
    return null;
  }
};

/**
 * Cancelar lembrete diário de gastos
 */
export const cancelDailyExpenseReminder = async (): Promise<void> => {
  try {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    
    let cancelled = false;
    for (const notification of scheduledNotifications) {
      if (notification.content.data?.type === 'daily_expense_reminder') {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        cancelled = true;
      }
    }

    if (cancelled) {
      console.log('🔕 Lembrete diário cancelado (gasto registrado)');
    }
  } catch (error) {
    console.error('❌ Erro ao cancelar lembrete diário:', error);
  }
};

/**
 * Enviar notificação imediata (para testes)
 */
export const sendImmediateNotification = async (
  title: string,
  body: string
): Promise<void> => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
      },
      trigger: null, // Imediata
    });
  } catch (error) {
    console.error('Erro ao enviar notificação imediata:', error);
  }
};

/**
 * Verificar se já registrou gasto hoje
 */
export const shouldSendDailyReminder = async (
  hasExpenseToday: boolean
): Promise<boolean> => {
  // Se já registrou gasto hoje, não enviar lembrete
  if (hasExpenseToday) {
    return false;
  }

  // Verificar se já enviou lembrete hoje
  const today = new Date();
  const hour = today.getHours();
  
  // Só enviar após as 21h
  return hour >= 21;
};

/**
 * Listar todas as notificações agendadas (debug)
 */
export const listScheduledNotifications = async (): Promise<void> => {
  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    console.log('📅 Notificações agendadas:', notifications.length);
    notifications.forEach((notification) => {
      console.log('  -', notification.content.title, '|', notification.trigger);
    });
  } catch (error) {
    console.error('Erro ao listar notificações:', error);
  }
};
