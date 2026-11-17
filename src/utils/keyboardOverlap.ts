/**
 * Quanto o teclado ainda cobre a janela.
 * No Android com edge-to-edge, `endCoordinates.height` chega 0 e a
 * janela não encolhe. A posição do topo do teclado (`screenY`) é a
 * medida que sobra. Se a janela já encolheu, esse tanto é descontado
 * para o campo não subir duas vezes.
 */
export const keyboardOverlap = (params: {
  frameHeight: number;
  frameScreenY: number;
  screenHeight: number;
  windowHeightBefore: number;
  windowHeightNow: number;
}): number => {
  const reported = Math.max(0, params.frameHeight || 0);
  const fromScreen = Math.max(0, params.screenHeight - params.frameScreenY);
  const raw = Math.max(reported, fromScreen);
  const resizedBy = Math.max(
    0,
    params.windowHeightBefore - params.windowHeightNow,
  );
  return Math.max(0, Math.round(raw - resizedBy));
};
