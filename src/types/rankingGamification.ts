export type RankingLeagueId = "individual" | "couple";

export type HistoricalPodiumEntry = {
  position: number;
  userId: string;
  displayName: string;
  rankingPoints: number;
  league: RankingLeagueId;
  photoUrl: string | null;
};

export type RankingSeason = {
  seasonNumber: number;
  previousCutoffDateKey: string | null;
  cutoffDateKey: string;
  endedAt: Date | null;
  resetBy: string;
  podiums: Record<RankingLeagueId, HistoricalPodiumEntry[]>;
};

export const BADGE_BORDER_PRESETS = [
  "double-violet",
  "split-violet-blue",
  "metal-corners",
  "asymmetric-spark",
  "cold-metal",
  "halo-beacon",
  "gold-legacy",
  "solid-violet",
  "solid-gold",
  "solid-silver",
  "solid-turquoise",
  "solid-coral",
] as const;

export type BadgeBorderPreset = (typeof BADGE_BORDER_PRESETS)[number];

export const BADGE_ICONS = [
  "shield-checkmark",
  "scale",
  "lock-closed",
  "key",
  "diamond",
  "flashlight",
  "eye",
  "trophy",
  "medal",
  "flame",
  "star",
  "ribbon",
  "sparkles",
  "heart",
] as const;

export type BadgeIcon = (typeof BADGE_ICONS)[number];

export type BadgeDefinition = {
  id: string;
  name: string;
  meaning: string;
  description: string;
  icon: BadgeIcon;
  primaryColor: string;
  secondaryColor: string;
  borderPreset: BadgeBorderPreset;
  isOfficial: boolean;
  isActive: boolean;
  createdBy?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
};

export type UserBadgeGrant = {
  id: string;
  userId: string;
  badgeId: string;
  status: "active" | "revoked";
  grantedBy: string;
  grantedAt: Date | null;
  revokedBy?: string | null;
  revokedAt?: Date | null;
};

export type BadgeDefinitionInput = {
  id: string;
  name: string;
  meaning: string;
  description: string;
  icon: string;
  primaryColor: string;
  secondaryColor: string;
  borderPreset: string;
};

export const OFFICIAL_BADGES: BadgeDefinition[] = [
  {
    id: "guardiao-do-zero",
    name: "Guardião do Zero",
    meaning: "Constância nos dias sem gastos",
    description: "Disciplina para proteger cada escolha financeira.",
    icon: "shield-checkmark",
    primaryColor: "#8c52ff",
    secondaryColor: "#c0c6d4",
    borderPreset: "double-violet",
    isOfficial: true,
    isActive: true,
  },
  {
    id: "mestre-consumo-moderado",
    name: "Mestre do Consumo Moderado",
    meaning: "Equilíbrio recorrente dentro do planejamento",
    description: "Equilíbrio entre aproveitar hoje e construir amanhã.",
    icon: "scale",
    primaryColor: "#8c52ff",
    secondaryColor: "#4f8ff7",
    borderPreset: "split-violet-blue",
    isOfficial: true,
    isActive: true,
  },
  {
    id: "arquiteto-da-reserva",
    name: "Arquiteto da Reserva",
    meaning: "Organização e construção de segurança",
    description: "Cada decisão vira estrutura para o futuro.",
    icon: "lock-closed",
    primaryColor: "#1f3a93",
    secondaryColor: "#e7b958",
    borderPreset: "metal-corners",
    isOfficial: true,
    isActive: true,
  },
  {
    id: "virada-de-chave",
    name: "Virada de Chave",
    meaning: "Evolução marcante nos hábitos financeiros",
    description: "Uma mudança de atitude que transformou o caminho.",
    icon: "key",
    primaryColor: "#ff6b5e",
    secondaryColor: "#8c52ff",
    borderPreset: "asymmetric-spark",
    isOfficial: true,
    isActive: true,
  },
  {
    id: "disciplina-de-aco",
    name: "Disciplina de Aço",
    meaning: "Consistência excepcional ao longo do ciclo",
    description: "Constância que permanece mesmo nos dias difíceis.",
    icon: "diamond",
    primaryColor: "#4b5563",
    secondaryColor: "#d7dde8",
    borderPreset: "cold-metal",
    isOfficial: true,
    isActive: true,
  },
  {
    id: "farol-da-comunidade",
    name: "Farol da Comunidade",
    meaning: "Inspiração e apoio a outros participantes",
    description: "Sua jornada também ilumina o caminho de outras pessoas.",
    icon: "flashlight",
    primaryColor: "#16b8a6",
    secondaryColor: "#f2d38a",
    borderPreset: "halo-beacon",
    isOfficial: true,
    isActive: true,
  },
  {
    id: "legado-visao",
    name: "Legado Visão",
    meaning: "Impacto duradouro na comunidade",
    description: "Uma trajetória que representa a essência da comunidade Visão.",
    icon: "eye",
    primaryColor: "#e7b958",
    secondaryColor: "#8c52ff",
    borderPreset: "gold-legacy",
    isOfficial: true,
    isActive: true,
  },
];
