/**
 * Primitivos de página desktop — toolbars, canvas de formulário e tabela.
 * Shell (scroll full-bleed) fica em DesktopShell; aqui só composição de conteúdo.
 */
import React, { ReactNode } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { desktop } from "../../theme/desktopTokens";
import { DesktopGlowCard } from "../ui/DesktopGlowCard";
import { useDesktopWeb } from "../../utils/desktopWeb";

type CanvasProps = {
  children: ReactNode;
  /** Limite de largura para formulários/leitura (não no scroller). */
  maxWidth?: number;
  style?: StyleProp<ViewStyle>;
};

export const DesktopPageCanvas: React.FC<CanvasProps> = ({
  children,
  maxWidth,
  style,
}) => {
  const isDesktop = useDesktopWeb();
  if (!isDesktop) {
    return <>{children}</>;
  }
  return (
    <View
      style={[
        styles.canvas,
        maxWidth
          ? { maxWidth, width: "100%", alignSelf: "center" }
          : null,
        style,
      ]}
    >
      {children}
    </View>
  );
};

type ToolbarProps = {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  filters?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export const DesktopToolbar: React.FC<ToolbarProps> = ({
  title,
  subtitle,
  actions,
  filters,
  style,
}) => (
  <View style={[styles.toolbar, style]}>
    <View style={styles.toolbarLeft}>
      {title ? <Text style={styles.toolbarTitle}>{title}</Text> : null}
      {subtitle ? <Text style={styles.toolbarSub}>{subtitle}</Text> : null}
    </View>
    {actions ? <View style={styles.toolbarActions}>{actions}</View> : null}
    {filters ? <View style={styles.toolbarFilters}>{filters}</View> : null}
  </View>
);

type ChipProps = {
  label: string;
  active?: boolean;
  onPress: () => void;
};

export const DesktopFilterChip: React.FC<ChipProps> = ({
  label,
  active,
  onPress,
}) => (
  <TouchableOpacity
    style={[styles.chip, active && styles.chipOn]}
    onPress={onPress}
    activeOpacity={0.85}
  >
    <Text style={[styles.chipText, active && styles.chipTextOn]}>{label}</Text>
  </TouchableOpacity>
);

type PrimaryBtnProps = {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  danger?: boolean;
};

export const DesktopPrimaryButton: React.FC<PrimaryBtnProps> = ({
  label,
  icon = "add",
  onPress,
  danger,
}) => (
  <TouchableOpacity
    style={[styles.primaryBtn, danger && styles.primaryBtnDanger]}
    onPress={onPress}
    activeOpacity={0.85}
  >
    <Ionicons name={icon} size={18} color="#fff" />
    <Text style={styles.primaryBtnText}>{label}</Text>
  </TouchableOpacity>
);

type TableProps = {
  headers: string[];
  columnFlex?: number[];
  children: ReactNode;
  emptyText?: string;
  isEmpty?: boolean;
};

export const DesktopTable: React.FC<TableProps> = ({
  headers,
  columnFlex,
  children,
  emptyText = "Nenhum item",
  isEmpty,
}) => (
  <DesktopGlowCard variant="neutral" contentStyle={{ padding: 0 }}>
    <View style={styles.thead}>
      {headers.map((h, i) => (
        <Text
          key={h}
          style={[
            styles.th,
            { flex: columnFlex?.[i] ?? 1 },
            i === headers.length - 1 ? styles.thRight : null,
          ]}
        >
          {h}
        </Text>
      ))}
    </View>
    {isEmpty ? (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>{emptyText}</Text>
      </View>
    ) : (
      children
    )}
  </DesktopGlowCard>
);

type RowProps = {
  cells: ReactNode[];
  columnFlex?: number[];
  onPress?: () => void;
};

export const DesktopTableRow: React.FC<RowProps> = ({
  cells,
  columnFlex,
  onPress,
}) => {
  const body = (
    <View style={styles.tr}>
      {cells.map((cell, i) => (
        <View
          key={i}
          style={[
            styles.td,
            { flex: columnFlex?.[i] ?? 1 },
            i === cells.length - 1 ? styles.tdRight : null,
          ]}
        >
          {typeof cell === "string" || typeof cell === "number" ? (
            <Text style={styles.tdText} numberOfLines={2}>
              {cell}
            </Text>
          ) : (
            cell
          )}
        </View>
      ))}
    </View>
  );
  if (!onPress) return body;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
      {body}
    </TouchableOpacity>
  );
};

type KpiStripProps = {
  items: { label: string; value: string; accent?: string }[];
};

export const DesktopKpiStrip: React.FC<KpiStripProps> = ({ items }) => (
  <View style={styles.kpiStrip}>
    {items.map((item) => (
      <DesktopGlowCard
        key={item.label}
        variant="neutral"
        style={styles.kpiCard}
        contentStyle={styles.kpiInner}
      >
        <Text style={styles.kpiLabel}>{item.label}</Text>
        <Text style={[styles.kpiValue, item.accent ? { color: item.accent } : null]}>
          {item.value}
        </Text>
      </DesktopGlowCard>
    ))}
  </View>
);

const styles = StyleSheet.create({
  canvas: {
    width: "100%",
    gap: 16,
    paddingBottom: 8,
  },
  toolbar: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  toolbarLeft: {
    flex: 1,
    minWidth: 180,
  },
  toolbarTitle: {
    color: desktop.text,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  toolbarSub: {
    marginTop: 2,
    color: desktop.textMuted,
    fontSize: 13,
  },
  toolbarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  toolbarFilters: {
    flexBasis: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: desktop.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: desktop.surfaceElevated,
  },
  chipOn: {
    backgroundColor: desktop.purple,
    borderColor: desktop.purple,
  },
  chipText: {
    color: desktop.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  chipTextOn: {
    color: "#fff",
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: desktop.purple,
  },
  primaryBtnDanger: {
    backgroundColor: desktop.magenta,
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  thead: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: desktop.border,
    backgroundColor: desktop.surfaceElevated,
  },
  th: {
    color: desktop.textMuted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  thRight: {
    textAlign: "right",
  },
  tr: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: desktop.border,
  },
  td: {
    paddingRight: 8,
    justifyContent: "center",
  },
  tdRight: {
    alignItems: "flex-end",
    paddingRight: 0,
  },
  tdText: {
    color: desktop.text,
    fontSize: 13,
  },
  empty: {
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    color: desktop.textMuted,
    fontSize: 14,
  },
  kpiStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  kpiCard: {
    flexGrow: 1,
    minWidth: 160,
    flexBasis: "22%",
  },
  kpiInner: {
    gap: 4,
    minHeight: 72,
    justifyContent: "center",
  },
  kpiLabel: {
    color: desktop.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  kpiValue: {
    color: desktop.text,
    fontSize: 20,
    fontWeight: "800",
  },
});
