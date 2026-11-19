/**
 * Item de lançamento do dia (desktop web):
 * arraste estilo kanban via pointer/mouse (RN Web não encaminha HTML5 drag no View).
 */
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatCurrency } from "../../utils/currencyUtils";

export type DesktopDayDragPayload = {
  entryId: string;
  fromDateKey: string;
  kind: "expense" | "income";
  title?: string;
  value?: number;
};

type Props = {
  entryId: string;
  dateKey: string;
  kind?: "expense" | "income";
  title: string;
  meta?: string;
  value: number;
  selected?: boolean;
  onToggleSelect?: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete?: () => void;
};

type DropHandlerOptions = {
  onHoverDay?: (dateKey: string) => void;
  onDragLeaveDay?: (dateKey: string) => void;
};

type ZoneHandlers = {
  onDropEntry: (payload: DesktopDayDragPayload, toDateKey: string) => void;
  options?: DropHandlerOptions;
};

const DRAG_THRESHOLD_PX = 5;

/** Estado global do drag atual (web). */
let activeDayDrag: DesktopDayDragPayload | null = null;
const dragStartListeners = new Set<(payload: DesktopDayDragPayload) => void>();
const dragEndListeners = new Set<() => void>();
const dayZoneHandlers = new Map<string, ZoneHandlers>();

export const getActiveDayDrag = () => activeDayDrag;

export const encodeDayDragPayload = (payload: DesktopDayDragPayload) =>
  JSON.stringify(payload);

export const decodeDayDragPayload = (
  raw: string | null | undefined,
): DesktopDayDragPayload | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as DesktopDayDragPayload;
    if (!parsed?.entryId || !parsed?.fromDateKey) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const subscribeDayDragStart = (
  fn: (payload: DesktopDayDragPayload) => void,
) => {
  dragStartListeners.add(fn);
  return () => {
    dragStartListeners.delete(fn);
  };
};

export const subscribeDayDragEnd = (fn: () => void) => {
  dragEndListeners.add(fn);
  return () => {
    dragEndListeners.delete(fn);
  };
};

const notifyDragStart = (payload: DesktopDayDragPayload) => {
  activeDayDrag = payload;
  dragStartListeners.forEach((fn) => {
    try {
      fn(payload);
    } catch {
      // ignore
    }
  });
};

const notifyDragEnd = () => {
  activeDayDrag = null;
  dragEndListeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // ignore
    }
  });
};

const getDayKeyFromPoint = (clientX: number, clientY: number): string | null => {
  if (typeof document === "undefined") return null;
  const stack =
    typeof document.elementsFromPoint === "function"
      ? document.elementsFromPoint(clientX, clientY)
      : [document.elementFromPoint(clientX, clientY)];
  for (const node of stack) {
    if (!node || !(node instanceof Element)) continue;
    const zone = node.closest("[data-day-drop]") as HTMLElement | null;
    if (!zone) continue;
    const key =
      zone.getAttribute("data-day-drop") ||
      (zone.dataset ? zone.dataset.dayDrop : null);
    if (key) return key;
  }
  return null;
};

let ghostEl: HTMLDivElement | null = null;

const ensureGhost = () => {
  if (typeof document === "undefined") return null;
  if (ghostEl && document.body.contains(ghostEl)) return ghostEl;
  ghostEl = document.createElement("div");
  ghostEl.id = "visao-day-drag-ghost";
  ghostEl.style.cssText = [
    "position:fixed",
    "top:0",
    "left:0",
    "z-index:999999",
    "pointer-events:none",
    "display:none",
    "min-width:180px",
    "max-width:280px",
    "padding:10px 12px",
    "border-radius:8px",
    "border:1px solid #B900FF",
    "background:#12081c",
    "color:#fff",
    "font:600 13px/1.3 system-ui,sans-serif",
    "box-shadow:0 10px 28px rgba(0,0,0,0.45)",
    "transform:translate(-10px,-12px)",
  ].join(";");
  document.body.appendChild(ghostEl);
  return ghostEl;
};

const showGhost = (
  payload: DesktopDayDragPayload,
  clientX: number,
  clientY: number,
) => {
  const el = ensureGhost();
  if (!el) return;
  const safeTitle = String(payload.title || "Lançamento")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const valueText =
    typeof payload.value === "number" ? formatCurrency(payload.value) : "";
  el.innerHTML = `<div style="margin-bottom:4px">${safeTitle}</div><div style="color:#B900FF;font-weight:800">${valueText}</div>`;
  el.style.display = "block";
  el.style.left = `${clientX}px`;
  el.style.top = `${clientY}px`;
};

const moveGhost = (clientX: number, clientY: number) => {
  if (!ghostEl) return;
  ghostEl.style.left = `${clientX}px`;
  ghostEl.style.top = `${clientY}px`;
};

const hideGhost = () => {
  if (!ghostEl) return;
  ghostEl.style.display = "none";
};

const isNoDragTarget = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return false;
  return !!target.closest('[data-no-drag="1"]');
};

export const DesktopDayLedgerItem: React.FC<Props> = ({
  entryId,
  dateKey,
  kind = "expense",
  title,
  meta,
  value,
  selected = false,
  onToggleSelect,
  onEdit,
  onDuplicate,
  onDelete,
}) => {
  const draggingRef = useRef(false);
  const rowRef = useRef<View>(null);
  const metaRef = useRef({ entryId, dateKey, kind, title, value });
  metaRef.current = { entryId, dateKey, kind, title, value };

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const node = rowRef.current as unknown as HTMLElement | null;
    if (!node) return;

    node.style.cursor = "grab";
    node.style.userSelect = "none";

    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return;
      if (isNoDragTarget(event.target)) return;

      // Não inicia drag com modificadores de texto/seleção.
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const originX = event.clientX;
      const originY = event.clientY;
      let started = false;
      let lastHoverKey: string | null = null;
      const snapshot = { ...metaRef.current };

      const onMove = (ev: MouseEvent) => {
        const dx = Math.abs(ev.clientX - originX);
        const dy = Math.abs(ev.clientY - originY);
        if (!started && (dx > DRAG_THRESHOLD_PX || dy > DRAG_THRESHOLD_PX)) {
          started = true;
          draggingRef.current = true;
          const payload: DesktopDayDragPayload = {
            entryId: snapshot.entryId,
            fromDateKey: snapshot.dateKey,
            kind: snapshot.kind,
            title: snapshot.title,
            value: snapshot.value,
          };
          notifyDragStart(payload);
          showGhost(payload, ev.clientX, ev.clientY);
          node.style.opacity = "0.35";
          document.body.style.cursor = "grabbing";
          document.body.style.userSelect = "none";
          // Evita seleção de texto enquanto arrasta.
          ev.preventDefault();
        }
        if (!started) return;

        moveGhost(ev.clientX, ev.clientY);
        const hoverKey = getDayKeyFromPoint(ev.clientX, ev.clientY);
        if (hoverKey && hoverKey !== lastHoverKey) {
          lastHoverKey = hoverKey;
          if (hoverKey !== snapshot.dateKey) {
            dayZoneHandlers.get(hoverKey)?.options?.onHoverDay?.(hoverKey);
          }
        }
      };

      const finish = (ev: MouseEvent) => {
        window.removeEventListener("mousemove", onMove, true);
        window.removeEventListener("mouseup", finish, true);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        node.style.opacity = "1";
        hideGhost();

        if (started) {
          const payload: DesktopDayDragPayload = {
            entryId: snapshot.entryId,
            fromDateKey: snapshot.dateKey,
            kind: snapshot.kind,
            title: snapshot.title,
            value: snapshot.value,
          };
          const toKey = getDayKeyFromPoint(ev.clientX, ev.clientY);
          const handlers = toKey ? dayZoneHandlers.get(toKey) : null;
          if (toKey && handlers && toKey !== payload.fromDateKey) {
            handlers.onDropEntry(payload, toKey);
          }
          notifyDragEnd();
        }

        setTimeout(() => {
          draggingRef.current = false;
        }, 100);
      };

      window.addEventListener("mousemove", onMove, true);
      window.addEventListener("mouseup", finish, true);
    };

    // Capture: pega o evento antes do TouchableOpacity engolir.
    node.addEventListener("mousedown", onMouseDown, true);
    return () => {
      node.removeEventListener("mousedown", onMouseDown, true);
      node.style.opacity = "1";
    };
  }, []);

  return (
    <View
      ref={rowRef}
      style={[styles.row, selected && styles.rowSelected]}
    >
      {onToggleSelect ? (
        <TouchableOpacity
          style={styles.checkBtn}
          onPress={onToggleSelect}
          hitSlop={8}
          accessibilityLabel={selected ? "Desmarcar" : "Selecionar"}
          {...(Platform.OS === "web"
            ? ({ dataSet: { noDrag: "1" } } as object)
            : {})}
        >
          <Ionicons
            name={selected ? "checkbox" : "square-outline"}
            size={20}
            color={selected ? "#B900FF" : "#6b6480"}
          />
        </TouchableOpacity>
      ) : null}
      <View style={styles.handleWrap}>
        <Ionicons name="reorder-three-outline" size={18} color="#a89fc0" />
      </View>
      <TouchableOpacity
        style={styles.main}
        onPress={() => {
          if (draggingRef.current) return;
          if (onToggleSelect) {
            onToggleSelect();
            return;
          }
          onEdit();
        }}
        activeOpacity={0.75}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {meta ? <Text style={styles.meta}>{meta}</Text> : null}
        </View>
        <Text style={styles.amount}>{formatCurrency(value)}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.iconBtn}
        onPress={onDuplicate}
        hitSlop={8}
        accessibilityLabel="Duplicar"
        {...(Platform.OS === "web"
          ? ({ dataSet: { noDrag: "1" } } as object)
          : {})}
      >
        <Ionicons name="copy-outline" size={16} color="#B900FF" />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.iconBtn}
        onPress={onEdit}
        hitSlop={8}
        accessibilityLabel="Editar"
        {...(Platform.OS === "web"
          ? ({ dataSet: { noDrag: "1" } } as object)
          : {})}
      >
        <Ionicons name="pencil" size={16} color="#B900FF" />
      </TouchableOpacity>
      {onDelete ? (
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={onDelete}
          hitSlop={8}
          accessibilityLabel="Excluir"
          {...(Platform.OS === "web"
            ? ({ dataSet: { noDrag: "1" } } as object)
            : {})}
        >
          <Ionicons name="trash-outline" size={16} color="#FF008A" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

/**
 * Marca o dia como zona de drop e registra callbacks.
 * (RN Web não encaminha onDragOver/onDrop no View.)
 */
export const desktopDayDropHandlers = (
  dateKey: string,
  onDropEntry: (payload: DesktopDayDragPayload, toDateKey: string) => void,
  options?: DropHandlerOptions,
) => {
  if (Platform.OS !== "web") return {};
  dayZoneHandlers.set(dateKey, { onDropEntry, options });
  return {
    dataSet: { dayDrop: dateKey },
  } as object;
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#000",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginBottom: 6,
    // @ts-ignore RN Web
    cursor: "grab",
    // @ts-ignore RN Web
    userSelect: "none",
  },
  rowSelected: {
    borderColor: "#B900FF",
    backgroundColor: "rgba(185, 0, 255, 0.12)",
  },
  checkBtn: {
    padding: 4,
    marginRight: 2,
  },
  handleWrap: {
    marginRight: 6,
    paddingVertical: 4,
  },
  main: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  meta: {
    color: "#999",
    fontSize: 11,
    marginTop: 2,
  },
  amount: {
    color: "#B900FF",
    fontWeight: "700",
    marginRight: 4,
  },
  iconBtn: {
    padding: 6,
  },
});

export default DesktopDayLedgerItem;
