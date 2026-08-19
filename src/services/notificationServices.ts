/**
 * Serviço para gerenciar notificações
 */

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";

const canUseNativeNotifications = Platform.OS !== "web";

type BillNotificationInput = {
  id: string;
  title: string;
  amount: number;
  dueDate: Date;
  status?: string;
  _isExpectedExpense?: boolean;
};

type ExpectedIncomeNotificationInput = {
  id: string;
  source: string;
  expectedMonth?: string;
};

/**
 * Configurar comportamento padrão das notificações
 */
if (canUseNativeNotifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

/**
 * Solicitar permissões de notificação
 */
export const requestNotificationPermissions = async (): Promise<boolean> => {
  try {
    if (!canUseNativeNotifications || !Device.isDevice) {
      return false;
    }

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Permissão de notificação negada");
      return false;
    }

    // Configurar canal de notificação para Android
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }

    return true;
  } catch (error) {
    console.error("Erro ao solicitar permissões de notificação:", error);
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
  dueDate: Date,
): Promise<string | null> => {
  if (!canUseNativeNotifications) {
    return null;
  }

  try {
    // Cancelar notificação anterior se existir
    await cancelBillNotification(billId);

    const now = new Date();
    const baseDate = new Date(dueDate);
    baseDate.setHours(9, 0, 0, 0);

    const reminders = [
      {
        offsetDays: -3,
        titleText: "⏳ Conta vence em 3 dias",
        bodyText: `${title} vence em 3 dias - R$ ${amount.toFixed(2)}`,
        stage: "due_in_3_days",
      },
      {
        offsetDays: -2,
        titleText: "⏳ Conta vence em 2 dias",
        bodyText: `${title} vence em 2 dias - R$ ${amount.toFixed(2)}`,
        stage: "due_in_2_days",
      },
      {
        offsetDays: 0,
        titleText: "💰 Conta vence hoje",
        bodyText: `${title} vence hoje - R$ ${amount.toFixed(2)}`,
        stage: "due_today",
      },
      {
        offsetDays: 1,
        titleText: "🚨 Conta vencida",
        bodyText: `${title} está vencida - R$ ${amount.toFixed(2)}`,
        stage: "overdue",
      },
    ];

    const scheduledIds: string[] = [];

    for (const reminder of reminders) {
      const triggerDate = new Date(baseDate);
      triggerDate.setDate(triggerDate.getDate() + reminder.offsetDays);
      if (triggerDate <= now) {
        continue;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: reminder.titleText,
          body: reminder.bodyText,
          data: {
            billId,
            type: "bill_due_reminder",
            stage: reminder.stage,
          },
          sound: true,
        },
        trigger: {
          date: triggerDate,
          type: Notifications.SchedulableTriggerInputTypes.DATE,
        },
      });
      scheduledIds.push(notificationId);
    }

    if (scheduledIds.length === 0) {
      return null;
    }

    return scheduledIds[0];
  } catch (error) {
    console.error("❌ Erro ao agendar notificação de conta:", error);
    return null;
  }
};

/**
 * Cancelar notificação de uma conta
 */
export const cancelBillNotification = async (billId: string): Promise<void> => {
  if (!canUseNativeNotifications) {
    return;
  }

  try {
    const targetId = String(billId || "");
    if (!targetId) return;

    const scheduledNotifications =
      await Notifications.getAllScheduledNotificationsAsync();

    for (const notification of scheduledNotifications) {
      const data = notification.content.data || {};
      const notificationBillId = String(data.billId || "");
      const notificationType = String(data.type || "");
      const isBillReminder =
        notificationType === "bill_due" ||
        notificationType === "bill_due_reminder" ||
        notificationType === "";

      if (notificationBillId === targetId && isBillReminder) {
        await Notifications.cancelScheduledNotificationAsync(
          notification.identifier,
        );
      }
    }
  } catch (error) {
    console.error("Erro ao cancelar notificação:", error);
  }
};

const parseExpectedIncomeDate = (expectedMonth?: string): Date | null => {
  if (!expectedMonth) return null;

  const raw = String(expectedMonth).trim();
  if (!raw) return null;

  // DD/MM/YYYY
  let match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) {
    const [, dd, mm, yyyy] = match;
    const parsed = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    if (!isNaN(parsed.getTime())) return parsed;
  }

  // DD/MM (assume ano atual)
  match = raw.match(/^(\d{2})\/(\d{2})$/);
  if (match) {
    const [, dd, mm] = match;
    const now = new Date();
    const parsed = new Date(now.getFullYear(), Number(mm) - 1, Number(dd));
    if (!isNaN(parsed.getTime())) return parsed;
  }

  // Dia do mês (1-31) — assume mês/ano atuais
  match = raw.match(/^(\d{1,2})$/);
  if (match) {
    const day = Number(match[1]);
    if (day >= 1 && day <= 31) {
      const now = new Date();
      const parsed = new Date(now.getFullYear(), now.getMonth(), day);
      if (!isNaN(parsed.getTime())) return parsed;
    }
  }

  // YYYY-MM-DD
  match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, yyyy, mm, dd] = match;
    const parsed = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    if (!isNaN(parsed.getTime())) return parsed;
  }

  return null;
};

export const cancelExpectedIncomeNotification = async (
  incomeId: string,
): Promise<void> => {
  if (!canUseNativeNotifications) {
    return;
  }

  try {
    const scheduledNotifications =
      await Notifications.getAllScheduledNotificationsAsync();

    for (const notification of scheduledNotifications) {
      const data = notification.content.data || {};
      if (data.type === "income_expected_day" && data.incomeId === incomeId) {
        await Notifications.cancelScheduledNotificationAsync(
          notification.identifier,
        );
      }
    }
  } catch (error) {
    console.error("Erro ao cancelar notificação de renda esperada:", error);
  }
};

export const cancelExpectedIncomeNotificationsByUser = async (
  userId: string,
): Promise<void> => {
  if (!canUseNativeNotifications) {
    return;
  }

  try {
    const scheduledNotifications =
      await Notifications.getAllScheduledNotificationsAsync();

    for (const notification of scheduledNotifications) {
      const data = notification.content.data || {};
      if (data.type === "income_expected_day" && data.userId === userId) {
        await Notifications.cancelScheduledNotificationAsync(
          notification.identifier,
        );
      }
    }
  } catch (error) {
    console.error("Erro ao cancelar notificações de renda do usuário:", error);
  }
};

export const scheduleExpectedIncomeNotification = async (
  userId: string,
  incomeId: string,
  source: string,
  expectedMonth?: string,
): Promise<string | null> => {
  if (!canUseNativeNotifications) {
    return null;
  }

  try {
    await cancelExpectedIncomeNotification(incomeId);

    const parsedDate = parseExpectedIncomeDate(expectedMonth);
    if (!parsedDate) return null;

    const now = new Date();
    const triggerDate = new Date(parsedDate);
    triggerDate.setHours(9, 0, 0, 0);

    // Se ainda for hoje mas já passou das 9h, dispara nos próximos 2 minutos.
    const isSameDay =
      parsedDate.getDate() === now.getDate() &&
      parsedDate.getMonth() === now.getMonth() &&
      parsedDate.getFullYear() === now.getFullYear();

    if (triggerDate <= now && !isSameDay) {
      return null;
    }

    if (triggerDate <= now && isSameDay) {
      triggerDate.setTime(now.getTime() + 2 * 60 * 1000);
    }

    return await Notifications.scheduleNotificationAsync({
      content: {
        title: "💵 Renda prevista para hoje",
        body: `${source} está prevista para hoje. Confirme o recebimento no app.`,
        data: {
          userId,
          incomeId,
          type: "income_expected_day",
        },
        sound: true,
      },
      trigger: {
        date: triggerDate,
        type: Notifications.SchedulableTriggerInputTypes.DATE,
      },
    });
  } catch (error) {
    console.error("Erro ao agendar notificação de renda esperada:", error);
    return null;
  }
};

export const syncBillNotifications = async (
  bills: BillNotificationInput[],
): Promise<void> => {
  if (!canUseNativeNotifications) {
    return;
  }

  for (const bill of bills) {
    if (!bill?.id) continue;

    const status = String(bill.status || "")
      .trim()
      .toLowerCase();
    const isPaid = status === "paid" || status === "paga";

    if (isPaid || bill._isExpectedExpense) {
      await cancelBillNotification(bill.id);
      continue;
    }

    await scheduleBillNotification(
      bill.id,
      bill.title,
      Number(bill.amount) || 0,
      new Date(bill.dueDate),
    );
  }
};

export const syncExpectedIncomeNotifications = async (
  userId: string,
  expectedIncomes: ExpectedIncomeNotificationInput[],
): Promise<void> => {
  await cancelExpectedIncomeNotificationsByUser(userId);

  for (const income of expectedIncomes || []) {
    if (!income?.id) continue;
    await scheduleExpectedIncomeNotification(
      userId,
      income.id,
      income.source || "Renda esperada",
      income.expectedMonth,
    );
  }
};

/**
 * Agendar notificação diária para lembrar de registrar gastos (21h)
 */
export const scheduleDailyExpenseReminder = async (): Promise<
  string | null
> => {
  if (!canUseNativeNotifications) {
    return null;
  }

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
        title: "📝 Lembrete de Gastos",
        body: "Não se esqueça de registrar seus gastos do dia!",
        data: { type: "daily_expense_reminder" },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 21,
        minute: 0,
      },
    });

    console.log("✅ Lembrete diário agendado para 21h (todos os dias)");
    console.log(`   Próxima notificação: ${trigger.toLocaleString("pt-BR")}`);
    console.log(`   ID: ${notificationId}`);

    return notificationId;
  } catch (error) {
    console.error("❌ Erro ao agendar lembrete diário:", error);
    return null;
  }
};

/**
 * Cancelar lembrete diário de gastos
 */
export const cancelDailyExpenseReminder = async (): Promise<void> => {
  if (!canUseNativeNotifications) {
    return;
  }

  try {
    const scheduledNotifications =
      await Notifications.getAllScheduledNotificationsAsync();

    let cancelled = false;
    for (const notification of scheduledNotifications) {
      if (notification.content.data?.type === "daily_expense_reminder") {
        await Notifications.cancelScheduledNotificationAsync(
          notification.identifier,
        );
        cancelled = true;
      }
    }

    if (cancelled) {
      console.log("🔕 Lembrete diário cancelado (gasto registrado)");
    }
  } catch (error) {
    console.error("❌ Erro ao cancelar lembrete diário:", error);
  }
};

/**
 * Enviar notificação imediata (para testes)
 */
export const sendImmediateNotification = async (
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> => {
  if (!canUseNativeNotifications) {
    return;
  }

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data,
      },
      trigger: null, // Imediata
    });
  } catch (error) {
    console.error("Erro ao enviar notificação imediata:", error);
  }
};

/**
 * Notificação imediata de nova mensagem de chat.
 */
export const showChatMessageNotification = async (
  senderName: string,
  messageText: string,
  chatId: string,
): Promise<void> => {
  const preview = String(messageText || "").trim();
  if (!preview) return;

  const body =
    preview.length > 120 ? `${preview.slice(0, 117)}...` : preview;

  await sendImmediateNotification(`💬 ${senderName}`, body, {
    type: "chat_message",
    chatId,
  });
};

/**
 * Verificar se já registrou gasto hoje
 */
export const shouldSendDailyReminder = async (
  hasExpenseToday: boolean,
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
  if (!canUseNativeNotifications) {
    return;
  }

  try {
    const notifications =
      await Notifications.getAllScheduledNotificationsAsync();
    console.log("📅 Notificações agendadas:", notifications.length);
    notifications.forEach((notification) => {
      console.log("  -", notification.content.title, "|", notification.trigger);
    });
  } catch (error) {
    console.error("Erro ao listar notificações:", error);
  }
};
