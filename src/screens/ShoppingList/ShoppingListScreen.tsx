import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Layout } from "../../components/Layout/Layout";
import { useAuth } from "../../hooks/useAuth";
import shoppingListServices from "../../services/shoppingListServices";
import { ShoppingListItem } from "../../types/shoppingListItem";
import {
  DECIMAL_INPUT_KEYBOARD,
  formatCurrency,
  sanitizeDecimalInput,
} from "../../utils/currencyUtils";

export const ShoppingListScreen: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(
    async (opts?: { silent?: boolean; pull?: boolean }) => {
      if (!user?.id) return;
      const silent = opts?.silent === true;
      const pull = opts?.pull === true;
      try {
        if (pull) setRefreshing(true);
        else if (!silent) setLoading(true);
        setItems(await shoppingListServices.list(user.id));
      } finally {
        if (pull) setRefreshing(false);
        else if (!silent) setLoading(false);
      }
    },
    [user?.id],
  );

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => {
    const withValue = items.filter((i) => i.value > 0);
    const total = withValue.reduce((sum, i) => sum + i.value, 0);
    const pending = items
      .filter((i) => !i.done && i.value > 0)
      .reduce((sum, i) => sum + i.value, 0);
    return {
      total,
      pending,
      pricedCount: withValue.length,
      itemCount: items.length,
    };
  }, [items]);

  const parseOptionalValue = (): number => {
    const raw = value.replace(/[^0-9.,]/g, "").replace(",", ".").trim();
    if (!raw) return 0;
    const n = parseFloat(raw);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };

  const addItem = async () => {
    if (!user?.id || !label.trim() || saving) return;
    const nextLabel = label.trim();
    const nextValue = parseOptionalValue();
    setLabel("");
    setValue("");
    try {
      setSaving(true);
      const created = await shoppingListServices.create(user.id, {
        label: nextLabel,
        value: nextValue,
      });
      setItems((prev) => [created, ...prev]);
    } catch {
      setLabel(nextLabel);
      setValue(nextValue > 0 ? String(nextValue) : "");
      await load({ silent: true });
    } finally {
      setSaving(false);
    }
  };

  const toggleItem = async (item: ShoppingListItem) => {
    if (!user?.id) return;
    const nextDone = !item.done;
    setItems((prev) =>
      prev.map((row) =>
        row.id === item.id
          ? { ...row, done: nextDone, updatedAt: new Date() }
          : row,
      ),
    );
    try {
      await shoppingListServices.toggle(user.id, item.id, nextDone);
    } catch {
      setItems((prev) =>
        prev.map((row) =>
          row.id === item.id ? { ...row, done: item.done } : row,
        ),
      );
    }
  };

  const removeItem = async (item: ShoppingListItem) => {
    if (!user?.id) return;
    setItems((prev) => prev.filter((row) => row.id !== item.id));
    try {
      await shoppingListServices.remove(user.id, item.id);
    } catch {
      setItems((prev) => [item, ...prev]);
    }
  };

  return (
    <Layout title="Lista de compras">
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        <View style={styles.container}>
          <View style={styles.totalCard}>
            <View style={styles.totalHeader}>
              <Ionicons name="cart" size={20} color="#B900FF" />
              <Text style={styles.totalLabel}>Total da lista</Text>
            </View>
            <Text style={styles.totalValue}>
              {totals.pricedCount > 0 ? formatCurrency(totals.total) : "—"}
            </Text>
            <Text style={styles.totalMeta}>
              {totals.itemCount === 0
                ? "Nenhum item ainda"
                : totals.pricedCount === 0
                  ? `${totals.itemCount} item(ns) · sem valores`
                  : `${totals.pricedCount} com valor · ${totals.itemCount} no total`}
            </Text>
            {totals.pricedCount > 0 && totals.pending !== totals.total ? (
              <Text style={styles.totalPending}>
                Falta comprar: {formatCurrency(totals.pending)}
              </Text>
            ) : null}
          </View>

          <View style={styles.addRow}>
            <TextInput
              style={[styles.input, styles.nameInput]}
              value={label}
              onChangeText={setLabel}
              placeholder="Nome do item"
              placeholderTextColor="#777"
              onSubmitEditing={addItem}
              returnKeyType="done"
            />
            <TextInput
              style={[styles.input, styles.valueInput]}
              value={value}
              onChangeText={(text) => setValue(sanitizeDecimalInput(text))}
              placeholder="Valor"
              placeholderTextColor="#777"
              keyboardType={DECIMAL_INPUT_KEYBOARD}
              onSubmitEditing={addItem}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[
                styles.addBtn,
                (!label.trim() || saving) && styles.addBtnDisabled,
              ]}
              onPress={addItem}
              disabled={saving || !label.trim()}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="add" size={22} color="#fff" />
              )}
            </TouchableOpacity>
          </View>

          {loading && items.length === 0 ? (
            <ActivityIndicator color="#B900FF" style={{ marginTop: 24 }} />
          ) : (
            <FlatList
              data={items}
              keyExtractor={(i) => i.id}
              refreshing={refreshing}
              onRefresh={() => load({ pull: true })}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={
                items.length === 0 ? styles.emptyList : undefined
              }
              ListEmptyComponent={
                <Text style={styles.empty}>Lista vazia</Text>
              }
              renderItem={({ item }) => (
                <View style={styles.row}>
                  <TouchableOpacity
                    style={styles.check}
                    onPress={() => toggleItem(item)}
                  >
                    <Ionicons
                      name={item.done ? "checkbox" : "square-outline"}
                      size={22}
                      color={item.done ? "#2a9d4b" : "#B900FF"}
                    />
                  </TouchableOpacity>
                  <View style={styles.itemInfo}>
                    <Text
                      style={[styles.itemLabel, item.done && styles.labelDone]}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                    {item.value > 0 ? (
                      <Text
                        style={[
                          styles.itemValue,
                          item.done && styles.itemValueDone,
                        ]}
                        numberOfLines={1}
                      >
                        {formatCurrency(item.value)}
                      </Text>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    style={styles.trashBtn}
                    onPress={() => removeItem(item)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={18} color="#FF008A" />
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Layout>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, padding: 16 },
  totalCard: {
    backgroundColor: "#171321",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    padding: 16,
    marginBottom: 14,
  },
  totalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  totalLabel: {
    color: "#ccc",
    fontSize: 13,
    fontWeight: "600",
  },
  totalValue: {
    color: "#B900FF",
    fontSize: 26,
    fontWeight: "800",
  },
  totalMeta: {
    color: "#888",
    fontSize: 12,
    marginTop: 4,
  },
  totalPending: {
    color: "#a89fc0",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#21172D",
    borderRadius: 8,
    color: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: "#0c0a12",
  },
  nameInput: {
    flex: 1.4,
    minWidth: 0,
  },
  valueInput: {
    flex: 0.9,
    minWidth: 72,
    maxWidth: 110,
  },
  addBtn: {
    backgroundColor: "#B900FF",
    borderRadius: 8,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnDisabled: {
    opacity: 0.5,
  },
  emptyList: { paddingTop: 24 },
  empty: { color: "#a89fc0", textAlign: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#21172D",
  },
  check: { padding: 4 },
  itemInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  itemLabel: { flex: 1, color: "#fff", fontSize: 15, minWidth: 0 },
  labelDone: {
    textDecorationLine: "line-through",
    color: "#888",
  },
  itemValue: {
    color: "#B900FF",
    fontSize: 13,
    fontWeight: "700",
    flexShrink: 0,
  },
  itemValueDone: {
    color: "#666",
    textDecorationLine: "line-through",
  },
  trashBtn: { padding: 4 },
});

export default ShoppingListScreen;
