import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Layout } from "../../components/Layout/Layout";
import { useAuth } from "../../hooks/useAuth";
import shoppingListServices from "../../services/shoppingListServices";
import { ShoppingListItem } from "../../types/shoppingListItem";

export const ShoppingListScreen: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      setItems(await shoppingListServices.list(user.id));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  const addItem = async () => {
    if (!user?.id || !label.trim()) return;
    try {
      setSaving(true);
      await shoppingListServices.create(user.id, { label: label.trim() });
      setLabel("");
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout title="Lista de compras">
      <View style={styles.container}>
        <View style={styles.addRow}>
          <TextInput
            style={styles.input}
            value={label}
            onChangeText={setLabel}
            placeholder="Novo item"
            placeholderTextColor="#777"
            onSubmitEditing={addItem}
          />
          <TouchableOpacity
            style={styles.addBtn}
            onPress={addItem}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="add" size={22} color="#fff" />
            )}
          </TouchableOpacity>
        </View>

        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          refreshing={loading}
          onRefresh={load}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {loading ? "Carregando..." : "Lista vazia"}
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <TouchableOpacity
                style={styles.check}
                onPress={async () => {
                  if (!user?.id) return;
                  await shoppingListServices.toggle(user.id, item.id, !item.done);
                  await load();
                }}
              >
                <Ionicons
                  name={item.done ? "checkbox" : "square-outline"}
                  size={22}
                  color={item.done ? "#2a9d4b" : "#B900FF"}
                />
              </TouchableOpacity>
              <Text
                style={[
                  styles.label,
                  item.done && styles.labelDone,
                ]}
              >
                {item.label}
              </Text>
              <TouchableOpacity
                onPress={async () => {
                  if (!user?.id) return;
                  await shoppingListServices.remove(user.id, item.id);
                  await load();
                }}
              >
                <Ionicons name="trash-outline" size={18} color="#FF008A" />
              </TouchableOpacity>
            </View>
          )}
        />
      </View>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  addRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#21172D",
    borderRadius: 8,
    color: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  addBtn: {
    backgroundColor: "#B900FF",
    borderRadius: 8,
    width: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: { color: "#a89fc0" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#21172D",
  },
  check: { padding: 4 },
  label: { flex: 1, color: "#fff" },
  labelDone: {
    textDecorationLine: "line-through",
    color: "#888",
  },
});

export default ShoppingListScreen;