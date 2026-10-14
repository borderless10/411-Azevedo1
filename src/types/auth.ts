export type RankingPreference =
  | "participate"
  | "view_only"
  | "hidden"
  | "unset";

export type AccountType = "individual" | "couple";
export type CoupleMember = 1 | 2;

export interface User {
  id: string;
  name: string;
  nickname?: string;
  email: string;
  username?: string;
  bio?: string;
  phone?: string;
  role?: "admin" | "consultor" | "supervisor" | "user" | "cliente_premium";
  consultantId?: string; // id do consultor responsável (se houver)
  isAdmin?: boolean;
  isActive?: boolean;
  currency?: string;
  showInRanking?: boolean;
  rankingPreference?: RankingPreference;
  photoBase64?: string;
  accountType?: AccountType;
  coupleMember1Name?: string;
  coupleMember2Name?: string;
  /** Link de agendamento de consultoria definido pelo admin/consultor */
  consultationSchedulingUrl?: string;
  /** Melhor dia do mês para consultoria (1–31, armazenado como string) */
  consultationPreferredDate?: string;
  /** Dia (1–31) que o cliente confirmou ter agendado neste ciclo */
  consultationBookedDay?: string;
  /** Início do ciclo ao qual a confirmação de agendamento pertence */
  consultationBookedCycleStartedAt?: string;
  consultationSchedulingRequestPending?: boolean;
  consultationSchedulingRequestedAt?: Date;
  expoPushToken?: string;
  activeChatId?: string | null;
  presenceState?: "foreground" | "background";
  presenceUpdatedAt?: Date;
  expenseReminderEnabled?: boolean;
  expenseReminderHour?: number;
  expenseReminderMinute?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface authState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  name: string;
  displayName?: string;
  password: string;
  confirmPassword: string;
}
