export const BREADCRUMB_LIMIT = 20;
export const DIAGNOSTIC_TEXT_LIMIT = 180;

export type AppPresence = "active" | "background" | "inactive" | "unknown";

export type ExitKind =
  | "active-exit"
  | "background-exit"
  | "js-error"
  | "render-error"
  | "unclean-exit";

export type Breadcrumb = {
  at: number;
  screen: string;
  appState: AppPresence;
  operation: string;
};

export type PendingSessionReport = {
  startedAt: number;
  lastHeartbeatAt: number;
  lastScreen: string;
  userId: string | null;
  appState: AppPresence;
  breadcrumbs: Breadcrumb[];
  jsError: string | null;
  renderError: string | null;
  maxLagMs?: number;
  lagEvents?: number;
};

export const pushBreadcrumb = (
  current: Breadcrumb[],
  next: Breadcrumb,
): Breadcrumb[] => [...current, next].slice(-BREADCRUMB_LIMIT);

export const sanitizeDiagnosticText = (value: unknown): string =>
  String(value || "")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/bearer\s+\S+/gi, "bearer [token]")
    .replace(/eyJ[A-Za-z0-9_-]{8,}/g, "[token]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, DIAGNOSTIC_TEXT_LIMIT);

export const classifyPreviousSession = (
  report: Pick<PendingSessionReport, "appState" | "jsError" | "renderError">,
): ExitKind => {
  if (report.renderError) return "render-error";
  if (report.jsError) return "js-error";
  if (report.appState === "background" || report.appState === "inactive") {
    return "background-exit";
  }
  if (report.appState === "active") return "active-exit";
  return "unclean-exit";
};

export const attachReportUser = (
  report: PendingSessionReport | null,
  userId: string | null,
): PendingSessionReport | null => {
  if (!report || report.userId || !userId) return report;
  return { ...report, userId };
};

/** Não envia sem usuário e nunca descarta o relatório antes da confirmação. */
export const reportReadyToSend = (
  report: PendingSessionReport | null,
): report is PendingSessionReport => Boolean(report?.userId);

export const sameReport = (
  left: PendingSessionReport | null,
  right: PendingSessionReport | null,
): boolean =>
  Boolean(
    left &&
      right &&
      left.startedAt === right.startedAt &&
      left.lastHeartbeatAt === right.lastHeartbeatAt,
  );
