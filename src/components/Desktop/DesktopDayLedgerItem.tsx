/**
 * Item de lançamento do dia (desktop): clique edita, arrasta move, botão duplica.
 */
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatCurrency } from "../../utils/currencyUtils";

const DRAG_MIME = "application/x-visao-day-entry";

export type DesktopDayDragPayload = {
  entryId: string;
  fromDateKey: string;
  kind: "expense" | "income";
};

type Props = {
  entryId: string;
  dateKey: string;
  kind?: "expense" | "income";
  title: string;
  meta?: string;
  value: number;
  onEdit: () => void;
  onDuplicate: () => void;
};

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

export const DesktopDayLedgerItem: React.FC<Props> = ({
  entryId,
  dateKey,
  kind = "expense",
  title,
  meta,
  value,
  onEdit,
  onDuplicate,
}) => {
  const webDragProps =
    Platform.OS === "web"
      ? ({
          draggable: true,
          onDragStart: (event: any) => {
            const payload = encodeDayDragPayload({
              entryId,
              fromDateKey: dateKey,
              kind,
            });
            event?.dataTransfer?.setData?.(DRAG_MIME, payload);
            event?.dataTransfer?.setData?.("text/plain", payload);
            if (event?.dataTransfer) event.dataTransfer.effectAllowed = "move";
          },
        } as object)
      : {};

  return (
    <View style={styles.row} {...webDragProps}>
      <TouchableOpacity
        style={styles.main}
        onPress={onEdit}
        activeOpacity={0.75}
        // @ts-ignore RN Web
        cursor="pointer"
      >
        <Ionicons
          name="reorder-three-outline"
          size={18}
          color="#6b6480"
          style={styles.handle}
        />
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
      >
        <Ionicons name="copy-outline" size={16} color="#B900FF" />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.iconBtn}
        onPress={onEdit}
        hitSlop={8}
        accessibilityLabel="Editar"
      >
        <Ionicons name="pencil" size={16} color="#B900FF" />
      </TouchableOpacity>
    </View>
  );
};

export const desktopDayDropHandlers = (
  dateKey: string,
  onDropEntry: (payload: DesktopDayDragPayload, toDateKey: string) => void,
) => {
  if (Platform.OS !== "web") return {};
  return {
    onDragOver: (event: any) => {
      event?.preventDefault?.();
      if (event?.dataTransfer) event.dataTransfer.dropEffect = "move";
    },
    onDrop: (event: any) => {
      event?.preventDefault?.();
      const raw =
        event?.dataTransfer?.getData?.(DRAG_MIME) ||
        event?.dataTransfer?.getData?.("text/plain");
      const payload = decodeDayDragPayload(raw);
      if (!payload || payload.fromDateKey === dateKey) return;
      onDropEntry(payload, dateKey);
    },
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
  },
  main: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  handle: {
    marginRight: 2,
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
