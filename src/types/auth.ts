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
  /** URL do Firebase Storage. Prioridade sobre photoBase64 quando existir. */
  photoUrl?: string;
  photoStoragePath?: string;
  /** Epoch em milissegundos da última troca de foto. */
  photoUpdatedAt?: number | null;
  /** Insígnia cuja borda está ativa no avatar. Validado por Cloud Function. */
  activeBadgeBorderId?: string | null;
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
  /** Início do ciclo em que o link de agendamento foi aberto */
  consultationSchedulingOpenedCycleStartedAt?: string;
  /** Momento em que o link foi aberto no ciclo atual */
  consultationSchedulingOpenedAt?: Date;
  consultationSchedulingRequestPending?: boolean;
  consultationSchedulingRequestedAt?: Date;
  consultationPreviousBookedDay?: string;
  consultationPreviousBookedCycleStartedAt?: string;
  consultationBookingReleasedAt?: Date;
  consultationBookingReleasedBy?: string | null;
  expoPushToken?: string;
  activeChatId?: string | null;
  presenceState?: "foreground" | "background";
  presenceUpdatedAt?: Date;
  expenseReminderEnabled?: boolean;
  expenseReminderHour?: number;
  expenseReminderMinute?: number;
  /**
   * Registra zero automaticamente nos gastos acompanhados ao responder Não
   * no Consumo Moderado. Padrão: true (ausente no Firestore = ligado).
   */
  autoZeroTrackedExpensesEnabled?: boolean;
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
