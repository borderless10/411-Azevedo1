/**
 * Estado do trilho da sidebar desktop entre remounts de tela.
 * Mantém aberta ao trocar de seção sem tirar o mouse.
 */
let pinnedOpen = false;
const listeners = new Set<() => void>();

export const getDesktopSidebarRailPinned = () => pinnedOpen;

export const setDesktopSidebarRailPinned = (next: boolean) => {
  if (pinnedOpen === next) return;
  pinnedOpen = next;
  listeners.forEach((listener) => listener());
};

export const subscribeDesktopSidebarRail = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
