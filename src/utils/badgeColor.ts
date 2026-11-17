export type Hsv = {
  h: number;
  s: number;
  v: number;
};

export const THUMB_SIZE = 22;

const clamp01 = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
};

const expandHex = (digits: string): string => {
  const full =
    digits.length === 3
      ? digits
          .split("")
          .map((char) => char + char)
          .join("")
      : digits;
  return `#${full.toUpperCase()}`;
};

const hexDigits = (input: string): string | null => {
  const raw = input.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(raw)) return null;
  return raw;
};

export const parseHex = (input: string): string | null => {
  const digits = hexDigits(input);
  if (!digits) return null;
  return expandHex(digits);
};

export const parseFullHex = (input: string): string | null => {
  const digits = hexDigits(input);
  if (!digits || digits.length !== 6) return null;
  return expandHex(digits);
};

const channel = (value: number): string =>
  Math.min(255, Math.max(0, Math.round(value)))
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();

export const hsvToHex = (hsv: Hsv): string => {
  const h = ((hsv.h % 360) + 360) % 360;
  const s = clamp01(hsv.s);
  const v = clamp01(hsv.v);
  const chroma = v * s;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - chroma;
  const [r, g, b] =
    h < 60
      ? [chroma, x, 0]
      : h < 120
        ? [x, chroma, 0]
        : h < 180
          ? [0, chroma, x]
          : h < 240
            ? [0, x, chroma]
            : h < 300
              ? [x, 0, chroma]
              : [chroma, 0, x];
  return `#${channel((r + m) * 255)}${channel((g + m) * 255)}${channel((b + m) * 255)}`;
};

export const hexToHsv = (input: string): Hsv | null => {
  const hex = parseHex(input);
  if (!hex) return null;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : delta / max, v: max };
};

export const brightnessPercent = (input: string): number | null => {
  const hsv = hexToHsv(input);
  if (!hsv) return null;
  return Math.round(hsv.v * 100);
};

export const ratioAlong = (
  position: number,
  length: number,
  thumb = THUMB_SIZE,
): number => {
  if (length <= thumb) return 0;
  return clamp01((position - thumb / 2) / (length - thumb));
};

export const thumbOffset = (
  ratio: number,
  length: number,
  thumb = THUMB_SIZE,
): number => clamp01(ratio) * Math.max(0, length - thumb);
