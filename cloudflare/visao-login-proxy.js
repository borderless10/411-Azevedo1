/**
 * Proxy /login (+ assets) → Firebase Hosting, mantendo planejecomvisao.com.br na barra.
 * Rotas CF:
 *   planejecomvisao.com.br/login*
 *   planejecomvisao.com.br/_expo/*
 *   planejecomvisao.com.br/assets/*
 *   planejecomvisao.com.br/favicon.ico
 *   planejecomvisao.com.br/metadata.json
 */
const ORIGIN = "https://visao-cce8f-app.web.app";

function normalizePath(pathname) {
  return pathname.replace(/\/+/g, "/") || "/";
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = normalizePath(url.pathname);
    const targetPath =
      path === "/login" || path === "/login/" ? "/" : path;
    const target = new URL(targetPath + url.search, ORIGIN);

    const headers = new Headers(request.headers);
    headers.set("Host", new URL(ORIGIN).host);

    const response = await fetch(target.toString(), {
      method: request.method,
      headers,
      body:
        request.method === "GET" || request.method === "HEAD"
          ? undefined
          : request.body,
      redirect: "follow",
    });

    const out = new Headers(response.headers);
    out.delete("content-security-policy");
    out.delete("content-security-policy-report-only");
    out.delete("x-frame-options");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: out,
    });
  },
};
