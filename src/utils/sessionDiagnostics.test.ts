import assert from "node:assert/strict";
import test from "node:test";
import {
  BREADCRUMB_LIMIT,
  attachReportUser,
  classifyPreviousSession,
  pushBreadcrumb,
  reportReadyToSend,
  sameReport,
  sanitizeDiagnosticText,
  type PendingSessionReport,
} from "./sessionDiagnostics.ts";

const report = (
  overrides: Partial<PendingSessionReport> = {},
): PendingSessionReport => ({
  startedAt: 1_000,
  lastHeartbeatAt: 61_000,
  lastScreen: "Ranking",
  userId: null,
  appState: "active",
  breadcrumbs: [],
  jsError: null,
  renderError: null,
  ...overrides,
});

test("falha sem autenticação preserva o relatório e não envia", () => {
  const pending = attachReportUser(report(), null);
  assert.equal(reportReadyToSend(pending), false);
  assert.equal(pending?.lastScreen, "Ranking");
});

test("depois da autenticação envia uma vez e só apaga na confirmação", () => {
  const pending = attachReportUser(report(), "user-1");
  assert.equal(reportReadyToSend(pending), true);
  assert.equal(sameReport(pending, pending), true);
  const failed = pending;
  assert.equal(reportReadyToSend(failed), true);
  assert.equal(sameReport(failed, pending), true);
});

test("breadcrumbs respeitam o limite e removem os mais antigos", () => {
  let crumbs = [] as ReturnType<typeof pushBreadcrumb>;
  for (let index = 0; index < BREADCRUMB_LIMIT + 5; index += 1) {
    crumbs = pushBreadcrumb(crumbs, {
      at: index,
      screen: `Tela${index}`,
      appState: "active",
      operation: "nav",
    });
  }
  assert.equal(crumbs.length, BREADCRUMB_LIMIT);
  assert.equal(crumbs[0]?.screen, "Tela5");
  assert.equal(crumbs.at(-1)?.screen, `Tela${BREADCRUMB_LIMIT + 4}`);
});

test("classifica saída ativa, segundo plano e erros sem conteúdo sensível", () => {
  assert.equal(classifyPreviousSession(report()), "active-exit");
  assert.equal(
    classifyPreviousSession(report({ appState: "background" })),
    "background-exit",
  );
  assert.equal(
    classifyPreviousSession(report({ jsError: "TypeError" })),
    "js-error",
  );
  assert.equal(
    classifyPreviousSession(
      report({ jsError: "TypeError", renderError: "Render" }),
    ),
    "render-error",
  );
  const sanitized = sanitizeDiagnosticText(
    "falha de ana@visao.com bearer secreto.token eyJhbGciOiJIUzI1NiJ9.abc.def no chat",
  );
  assert.equal(sanitized.includes("ana@visao.com"), false);
  assert.equal(sanitized.includes("secreto.token"), false);
  assert.equal(sanitized.includes("eyJhbGci"), false);
});
