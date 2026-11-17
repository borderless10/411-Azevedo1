import React, { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type DimensionValue,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  THUMB_SIZE,
  hexToHsv,
  hsvToHex,
  parseFullHex,
  parseHex,
  ratioAlong,
  type Hsv,
} from "../../utils/badgeColor";

const QUICK = [
  "#B900FF",
  "#C084FC",
  "#4F8FF7",
  "#16B8A6",
  "#E7B958",
  "#FF6B5E",
  "#4B5563",
  "#D7DDE8",
  "#1F3A93",
  "#FFFFFF",
];

const HUE_COLORS = [
  "#FF0000",
  "#FFFF00",
  "#00FF00",
  "#00FFFF",
  "#0000FF",
  "#FF00FF",
  "#FF0000",
] as const;

const FALLBACK: Hsv = { h: 262, s: 0.7, v: 1 };

type DragSurfaceProps = {
  label: string;
  xRatio: number;
  yRatio: number;
  thumbColor?: string;
  style: StyleProp<ViewStyle>;
  onPick: (x: number, y: number) => void;
  onDragChange?: (dragging: boolean) => void;
  children: React.ReactNode;
};

const DragSurface = ({
  label,
  xRatio,
  yRatio,
  thumbColor,
  style,
  onPick,
  onDragChange,
  children,
}: DragSurfaceProps) => {
  const size = useRef({ width: 0, height: 0 });
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const onDragChangeRef = useRef(onDragChange);
  onDragChangeRef.current = onDragChange;

  const pick = (event: GestureResponderEvent) => {
    const { width, height } = size.current;
    onPickRef.current(
      ratioAlong(event.nativeEvent.locationX, width),
      ratioAlong(event.nativeEvent.locationY, height),
    );
  };

  const clampRatio = (value: number) => Math.min(1, Math.max(0, value));
  const x = clampRatio(xRatio);
  const y = clampRatio(yRatio);

  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="adjustable"
      collapsable={false}
      pointerEvents="box-only"
      style={style}
      onLayout={(event) => {
        // Só a ref: guardar layout em estado realimentava a renderização
        // a cada medida e podia disparar loop de atualização ao arrastar.
        size.current = {
          width: event.nativeEvent.layout.width,
          height: event.nativeEvent.layout.height,
        };
      }}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onStartShouldSetResponderCapture={() => true}
      onMoveShouldSetResponderCapture={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={(event) => {
        onDragChangeRef.current?.(true);
        pick(event);
      }}
      onResponderMove={pick}
      onResponderRelease={() => onDragChangeRef.current?.(false)}
      onResponderTerminate={() => onDragChangeRef.current?.(false)}
    >
      {children}
      <View
        pointerEvents="none"
        style={[
          styles.thumb,
          thumbColor ? { backgroundColor: thumbColor } : styles.thumbRing,
          {
            left: `${x * 100}%` as DimensionValue,
            top: `${y * 100}%` as DimensionValue,
            transform: [
              { translateX: -THUMB_SIZE * x },
              { translateY: -THUMB_SIZE * y },
            ],
          },
        ]}
      >
        {thumbColor ? null : <View style={styles.thumbHole} />}
      </View>
    </View>
  );
};

export const BadgeColorPicker = ({
  label,
  value,
  onChange,
  expanded,
  onExpandedChange,
  onDragChange,
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  onDragChange?: (dragging: boolean) => void;
}) => {
  const stored = parseHex(value);
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(stored ?? "") ?? FALLBACK);
  const [internalOpen, setInternalOpen] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const draftRef = useRef<string | null>(null);
  const hsvRef = useRef(hsv);
  const emittedRef = useRef<string | null>(stored);
  const onChangeRef = useRef(onChange);
  hsvRef.current = hsv;
  onChangeRef.current = onChange;

  const clearDraft = () => {
    draftRef.current = null;
    setDraft(null);
  };

  const open = expanded ?? internalOpen;
  const liveHex = hsvToHex(hsv);
  const colorHex = stored && stored === emittedRef.current ? stored : liveHex;
  const pureHue = hsvToHex({ h: hsv.h, s: 1, v: 1 });
  const fullBright = hsvToHex({ h: hsv.h, s: hsv.s, v: 1 });
  const brightness = Math.round(Math.min(1, Math.max(0, hsv.v)) * 100);

  useEffect(() => {
    const parsed = parseHex(value);
    if (!parsed || parsed === emittedRef.current) return;
    const next = hexToHsv(parsed);
    if (!next) return;
    hsvRef.current = next;
    setHsv(next);
    emittedRef.current = parsed;
    clearDraft();
  }, [value]);

  useEffect(() => {
    if (open) return;
    clearDraft();
  }, [open]);

  const setOpen = (next: boolean) => {
    if (expanded === undefined) setInternalOpen(next);
    onExpandedChange?.(next);
  };

  const publish = (hex: string, next: Hsv) => {
    hsvRef.current = next;
    setHsv(next);
    if (hex === emittedRef.current) return;
    emittedRef.current = hex;
    onChangeRef.current(hex);
  };

  const applyText = (text: string, allowShort: boolean) => {
    const parsed = allowShort ? parseHex(text) : parseFullHex(text);
    if (!parsed) return;
    const next = hexToHsv(parsed);
    if (!next) return;
    publish(parsed, next);
  };

  // Preto não carrega matiz no hex. O HSV local guarda o matiz enquanto a alça desce.
  const commitHsv = (next: Hsv) => {
    clearDraft();
    publish(hsvToHex(next), next);
  };

  const confirmAndClose = () => {
    if (draftRef.current !== null) applyText(draftRef.current, true);
    clearDraft();
    Keyboard.dismiss();
    setOpen(false);
  };

  return (
    <View style={styles.block}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={open ? `Fechar ${label}` : `Abrir ${label}`}
        onPress={() => setOpen(!open)}
      >
        <Text style={styles.label}>{label}</Text>
      </TouchableOpacity>
      <View style={styles.swatches}>
        {QUICK.map((color) => {
          const selected = colorHex.toLowerCase() === color.toLowerCase();
          return (
            <TouchableOpacity
              key={`${label}-${color}`}
              accessibilityLabel={`${label} ${color}`}
              onPress={() => {
                clearDraft();
                applyText(color, true);
              }}
              style={[styles.swatchHit, selected && styles.swatchHitOn]}
            >
              <View style={[styles.swatch, { backgroundColor: color }]} />
            </TouchableOpacity>
          );
        })}
      </View>
      {open ? (
        <View style={styles.hexRow}>
          <View style={[styles.dot, { backgroundColor: colorHex }]} />
          <TextInput
            accessibilityLabel={`Hexadecimal de ${label}`}
            autoCapitalize="characters"
            autoCorrect={false}
            selectTextOnFocus
            spellCheck={false}
            underlineColorAndroid="transparent"
            value={draft ?? colorHex}
            onBlur={() => {
              if (draftRef.current !== null) applyText(draftRef.current, true);
              clearDraft();
            }}
            onChangeText={(text) => {
              const next = text.slice(0, 16);
              draftRef.current = next;
              setDraft(next);
              applyText(next, false);
            }}
            style={styles.hexInput}
          />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Confirmar ${label} e fechar seletor`}
            hitSlop={8}
            onPress={confirmAndClose}
            style={styles.confirm}
          >
            <Ionicons name="checkmark" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`${label} ${colorHex}. Toque para editar a cor`}
          onPress={() => setOpen(true)}
          style={styles.hexRow}
        >
          <View style={[styles.dot, { backgroundColor: colorHex }]} />
          <Text style={styles.hexText}>{colorHex}</Text>
          <View style={styles.editHint}>
            <Ionicons name="create-outline" size={18} color="#aaa" />
          </View>
        </TouchableOpacity>
      )}
      {open ? (
        <View style={styles.panel}>
          <DragSurface
            label={`Saturação e brilho de ${label}`}
            xRatio={hsv.s}
            yRatio={1 - hsv.v}
            style={styles.satHit}
            onDragChange={onDragChange}
            onPick={(x, y) =>
              commitHsv({ ...hsvRef.current, s: x, v: 1 - y })
            }
          >
            <View pointerEvents="none" style={styles.satClip}>
              <LinearGradient
                pointerEvents="none"
                colors={["#FFFFFF", pureHue] as [string, string]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
              <LinearGradient
                pointerEvents="none"
                colors={["rgba(0,0,0,0)", "#000000"]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </View>
          </DragSurface>
          <DragSurface
            label={`Matiz de ${label}`}
            xRatio={hsv.h / 360}
            yRatio={0.5}
            thumbColor={pureHue}
            style={styles.sliderHit}
            onDragChange={onDragChange}
            onPick={(x) => commitHsv({ ...hsvRef.current, h: x * 360 })}
          >
            <View pointerEvents="none" style={styles.sliderTrack}>
              <LinearGradient
                pointerEvents="none"
                colors={HUE_COLORS}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
            </View>
          </DragSurface>
          <View style={styles.brightRow}>
            <Ionicons name="sunny-outline" size={18} color="#f2f2f2" />
            <DragSurface
              label={`Brilho de ${label}, ${brightness}`}
              xRatio={hsv.v}
              yRatio={0.5}
              style={styles.brightSlider}
              onDragChange={onDragChange}
              onPick={(x) => commitHsv({ ...hsvRef.current, v: x })}
            >
              <View pointerEvents="none" style={styles.sliderTrack}>
                <LinearGradient
                  pointerEvents="none"
                  colors={["#000000", fullBright] as [string, string]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={StyleSheet.absoluteFill}
                />
              </View>
            </DragSurface>
            <View style={styles.brightValue}>
              <Text style={styles.brightText}>{brightness}</Text>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  block: { marginBottom: 12 },
  label: {
    color: "#aaa",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
  },
  swatches: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  swatchHit: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  swatchHitOn: { borderColor: "#fff" },
  swatch: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#3a3a42",
  },
  hexRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#121214",
    borderWidth: 1,
    borderColor: "#34343c",
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#3a3a42",
  },
  hexText: {
    flex: 1,
    color: "#f4f4f5",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
  hexInput: {
    flex: 1,
    color: "#f4f4f5",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.4,
    paddingVertical: 8,
  },
  confirm: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#B900FF",
    alignItems: "center",
    justifyContent: "center",
  },
  editHint: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  panel: { marginTop: 10, gap: 12 },
  satHit: { height: 156 },
  satClip: {
    // No RN atual só existe absoluteFill. absoluteFillObject foi removido
    // e o spread de undefined deixava o painel com tamanho zero.
    ...StyleSheet.absoluteFill,
    borderRadius: 16,
    overflow: "hidden",
  },
  sliderHit: { height: 40, justifyContent: "center" },
  sliderTrack: {
    height: 18,
    borderRadius: 9,
    overflow: "hidden",
  },
  brightRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  brightSlider: { flex: 1, height: 40, justifyContent: "center" },
  brightValue: {
    width: 48,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#121214",
    borderWidth: 1,
    borderColor: "#34343c",
    alignItems: "center",
    justifyContent: "center",
  },
  brightText: { color: "#f4f4f5", fontSize: 15, fontWeight: "700" },
  thumb: {
    position: "absolute",
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    borderWidth: 2,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbRing: { backgroundColor: "transparent" },
  thumbHole: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.45)",
  },
});
