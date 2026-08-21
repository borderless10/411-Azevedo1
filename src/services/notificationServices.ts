/**
 * Serviço para gerenciar notificações
 */

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { AppState, Platform } from "react-native";

const canUseNativeNotifications = Platform.OS !== "web";

/** Canal padrão Android — obrigatório para aparecer na bandeja fora do app. */
export const NOTIFICATION_CHANNEL_DEFAULT = "default";
export const NOTIFICATION_CHANNEL_CHAT = "chat_messages";
export const NOTIFICATION_CHANNEL_REMINDERS = "reminders";

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
 * Configurar comportamento padrão das notificações (foreground).
 * shouldShowBanner/shouldShowList são obrigatórios no SDK 54+.
 */
if (canUseNativeNotifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

const ensureAndroidChannels = async (): Promise<void> => {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_DEFAULT, {
    name: "Geral",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#8c52ff",
    sound: "default",
    enableVibrate: true,
    showBadge: true,
  });

  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_CHAT, {
    name: "Mensagens",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#8c52ff",
    sound: "default",
    enableVibrate: true,
    showBadge: true,
  });

  await Notifications.setNotificationChannelAsync(
    NOTIFICATION_CHANNEL_REMINDERS,
    {
      name: "Lembretes",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#8c52ff",
      sound: "default",
      enableVibrate: true,
      showBadge: true,
    },
  );
};

/**
 * Solicitar permissões de notificação
 *
 * No Android 13+, o prompt do SO só aparece depois de criar ao menos um canal.
 */
export const requestNotificationPermissions = async (): Promise<boolean> => {
  try {
    if (!canUseNativeNotifications || !Device.isDevice) {
      return false;
    }

    // Canal ANTES da permissão (requisito Android 13+)
    await ensureAndroidChannels();

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Permissão de notificação negada");
      return false;
    }

    return true;
  } catch (error) {
    console.error("Erro ao solicitar permissões de notificação:", error);
    return false;
  }
};

const withChannel = (
  content: Notifications.NotificationContentInput,
  channelId: string,
): Notifications.NotificationContentInput => {
  if (Platform.OS !== "android") return content;
  return { ...content, channelId };
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
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return null;

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
        content: withChannel(
          {
            title: reminder.titleText,
            body: reminder.bodyText,
            data: {
              billId,
              type: "bill_due_reminder",
              stage: reminder.stage,
            },
            sound: true,
          },
          NOTIFICATION_CHANNEL_REMINDERS,
        ),
        trigger: {
          date: triggerDate,
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          channelId: NOTIFICATION_CHANNEL_REMINDERS,
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
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return null;

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
      content: withChannel(
        {
          title: "💵 Renda prevista para hoje",
          body: `${source} está prevista para hoje. Confirme o recebimento no app.`,
          data: {
            userId,
            incomeId,
            type: "income_expected_day",
          },
          sound: true,
        },
        NOTIFICATION_CHANNEL_REMINDERS,
      ),
      trigger: {
        date: triggerDate,
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        channelId: NOTIFICATION_CHANNEL_REMINDERS,
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
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return null;

    await cancelDailyExpenseReminder();

    const now = new Date();
    const trigger = new Date();
    trigger.setHours(21, 0, 0, 0);

    if (trigger <= now) {
      trigger.setDate(trigger.getDate() + 1);
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: withChannel(
        {
          title: "📝 Lembrete de Gastos",
          body: "Não se esqueça de registrar seus gastos do dia!",
          data: { type: "daily_expense_reminder" },
          sound: true,
        },
        NOTIFICATION_CHANNEL_REMINDERS,
      ),
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 21,
        minute: 0,
        channelId: NOTIFICATION_CHANNEL_REMINDERS,
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
 * Enviar notificação imediata (ou com atraso em segundos, para testar fora do app)
 */
export const sendImmediateNotification = async (
  title: string,
  body: string,
  data?: Record<string, unknown>,
  options?: { channelId?: string; delaySeconds?: number },
): Promise<void> => {
  if (!canUseNativeNotifications) {
    return;
  }

  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.warn("⚠️ Notificação ignorada: sem permissão do sistema");
      return;
    }

    const channelId = options?.channelId || NOTIFICATION_CHANNEL_DEFAULT;
    const delaySeconds = options?.delaySeconds ?? 0;

    await Notifications.scheduleNotificationAsync({
      content: withChannel(
        {
          title,
          body,
          sound: true,
          data,
        },
        channelId,
      ),
      trigger:
        delaySeconds > 0
          ? {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: delaySeconds,
              channelId,
            }
          : null,
    });
  } catch (error) {
    console.error("Erro ao enviar notificação imediata:", error);
  }
};

/**
 * Notificação de nova mensagem de chat.
 * Em foreground: o banner in-app cobre a UX.
 * Em background: dispara notificação do sistema na bandeja.
 */
export const showChatMessageNotification = async (
  senderName: string,
  messageText: string,
  chatId: string,
): Promise<void> => {
  const preview = String(messageText || "").trim();
  if (!preview) return;

  // App aberto: banner in-app já avisa; evita duplicar na bandeja.
  if (AppState.currentState === "active") {
    return;
  }

  const body =
    preview.length > 120 ? `${preview.slice(0, 117)}...` : preview;

  await sendImmediateNotification(`💬 ${senderName}`, body, {
    type: "chat_message",
    chatId,
  }, { channelId: NOTIFICATION_CHANNEL_CHAT });
};

/**
 * Verificar se já registrou gasto hoje
 */
export const shouldSendDailyReminder = async (
  hasExpenseToday: boolean,
): Promise<boolean> => {
  if (hasExpenseToday) {
    return false;
  }

  const today = new Date();
  const hour = today.getHours();

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
