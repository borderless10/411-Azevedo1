import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_PREFIX = "@411:cycleConsultationReminder:";

export const wasCycleConsultationReminderSent = async (
  reminderKey: string,
): Promise<boolean> => {
  if (!reminderKey) return true;
  const stored = await AsyncStorage.getItem(`${STORAGE_PREFIX}${reminderKey}`);
  return stored === "1";
};

export const markCycleConsultationReminderSent = async (
  reminderKey: string,
): Promise<void> => {
  if (!reminderKey) return;
  await AsyncStorage.setItem(`${STORAGE_PREFIX}${reminderKey}`, "1");
};
