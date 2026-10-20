const marks = new Map<string, number>();

export function perfMark(name: string): void {
  if (!__DEV__) return;
  marks.set(name, Date.now());
  console.log(`[perf] ${name}`);
}

export function perfMeasure(name: string, startMark: string): number {
  if (!__DEV__) return -1;
  const start = marks.get(startMark);
  const ms = start == null ? -1 : Date.now() - start;
  console.log(`[perf] ${name}: ${ms} ms`);
  return ms;
}
