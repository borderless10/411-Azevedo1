/**
 * Chave estável para cache de URLs do Firebase Storage.
 * Tokens (?token=) mudam e quebram o cache se a chave for a URL inteira.
 */
export function stableRemoteCacheKey(uri: string): string {
  const value = String(uri || "").trim();
  if (!value) return "";
  try {
    const parsed = new URL(value);
    const objectMatch = parsed.pathname.match(/\/o\/(.+)$/);
    if (objectMatch?.[1]) {
      return decodeURIComponent(objectMatch[1]);
    }
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return value.split("?")[0];
  }
}

export function isRemoteHttpUri(uri?: string | null): boolean {
  const value = String(uri || "").trim();
  return value.startsWith("http://") || value.startsWith("https://");
}

export function remoteImageSource(uri: string) {
  if (!isRemoteHttpUri(uri)) {
    return { uri };
  }
  return {
    uri,
    cacheKey: stableRemoteCacheKey(uri),
  };
}

/** Prefetch em paralelo; falhas isoladas não derrubam o lote. */
export async function prefetchRemoteImages(
  uris: Array<string | null | undefined>,
): Promise<void> {
  const unique = Array.from(
    new Set(
      uris
        .map((uri) => String(uri || "").trim())
        .filter((uri) => isRemoteHttpUri(uri)),
    ),
  );
  if (!unique.length) return;

  const { Image } = await import("expo-image");
  const chunkSize = 12;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map((uri) =>
        Image.prefetch(uri, "memory-disk").catch(() => false),
      ),
    );
  }
}
