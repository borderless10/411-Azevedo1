import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Layout } from "../../components/Layout/Layout";
import { useAuth } from "../../hooks/useAuth";
import userNotesServices from "../../services/userNotesServices";
import { UserNote } from "../../types/userNote";

export const UserNotesScreen: React.FC = () => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      setNotes(await userNotesServices.list(user.id));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id) return;
    if (!title.trim()) {
      Alert.alert("Título obrigatório");
      return;
    }
    try {
      setSaving(true);
      if (editingId) {
        await userNotesServices.update(user.id, editingId, { title, body });
      } else {
        await userNotesServices.create(user.id, { title, body });
      }
      setTitle("");
      setBody("");
      setEditingId(null);
      await load();
    } catch (e: any) {
      Alert.alert("Erro", e?.message || "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout title="Minhas notas">
      <View style={styles.container}>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Título"
          placeholderTextColor="#777"
        />
        <TextInput
          style={[styles.input, styles.body]}
          value={body}
          onChangeText={setBody}
          placeholder="Conteúdo"
          placeholderTextColor="#777"
          multiline
        />
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveText}>
              {editingId ? "Atualizar nota" : "Nova nota"}
            </Text>
          )}
        </TouchableOpacity>

        <FlatList
          data={notes}
          keyExtractor={(n) => n.id}
          refreshing={loading}
          onRefresh={load}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {loading ? "Carregando..." : "Nenhuma nota"}
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    onPress={() => {
                      setEditingId(item.id);
                      setTitle(item.title);
                      setBody(item.body);
                    }}
                  >
                    <Text style={styles.link}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={async () => {
                      if (!user?.id) return;
                      await userNotesServices.remove(user.id, item.id);
                      await load();
                    }}
                  >
                    <Text style={[styles.link, { color: "#FF008A" }]}>
                      Excluir
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              {item.body ? (
                <Text style={styles.cardBody}>{item.body}</Text>
              ) : null}
            </View>
          )}
        />
      </View>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  input: {
    borderWidth: 1,
    borderColor: "#21172D",
    borderRadius: 8,
    color: "#fff",
    padding: 10,
    marginBottom: 8,
  },
  body: { minHeight: 90, textAlignVertical: "top" },
  saveBtn: {
    backgroundColor: "#B900FF",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  saveText: { color: "#fff", fontWeight: "700" },
  empty: { color: "#a89fc0", marginTop: 8 },
  card: {
    borderWidth: 1,
    borderColor: "#21172D",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTitle: { color: "#fff", fontWeight: "700", flex: 1 },
  cardActions: { flexDirection: "row", gap: 10 },
  link: { color: "#B900FF", fontWeight: "600", fontSize: 12 },
  cardBody: { color: "#cfc6e8", marginTop: 8 },
});

export default UserNotesScreen;