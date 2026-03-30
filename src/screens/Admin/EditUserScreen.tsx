import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Layout } from "../../components/Layout/Layout";
import { useNavigation } from "../../routes/NavigationContext";
import { useAuth } from "../../hooks/useAuth";
import { userService } from "../../services/userServices";
import ConsultantPicker from "../../components/ui/ConsultantPicker";

export const EditUserScreen: React.FC = ({}: any) => {
  const { navigate, params } = useNavigation() as any;
  const { user } = useAuth();
  const userId = params?.userId as string | undefined;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<
    "user" | "consultor" | "admin" | "cliente_premium"
  >("user");
  const [consultants, setConsultants] = useState<any[]>([]);
  const [consultantId, setConsultantId] = useState<string | null>(null);

  useEffect(() => {
    if (
      !user ||
      (user.role !== "consultor" && user.role !== "admin" && !user.isAdmin)
    ) {
      navigate("Home");
      return;
    }
    if (userId) fetchUser();
    // load consultants for selector
    async function load() {
      try {
        const list = await userService.getUsersByRole("consultor");
        setConsultants(list);
      } catch (e) {
        console.warn("Erro ao carregar consultores", e);
      }
    }
    load();
  }, [userId]);

  const fetchUser = async () => {
    setLoading(true);
    try {
      const u = await userService.getUserById(userId!);
      if (u) {
        setName(u.name || "");
        setNickname((u as any).nickname || "");
        setPhone(u.phone || "");
        setRole((u.role as any) || "user");
        setConsultantId((u as any).consultantId || null);
      }
    } catch (error) {
      console.error("Erro ao carregar usuário para edição", error);
      Alert.alert("Erro", "Não foi possível carregar usuário.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      console.log(
        "[EDIT USER] Salvando usuário:",
        userId,
        "com consultantId:",
        consultantId,
      );
      await userService.updateUser(userId, {
        name: name.trim(),
        nickname: nickname.trim(),
        phone: phone.trim(),
        role,
        isAdmin: role === "admin",
        consultantId: consultantId === null ? null : consultantId,
      });
      console.log("[EDIT USER] ✅ Usuário atualizado com sucesso");
      Alert.alert("Sucesso", "Usuário atualizado.");
      navigate("AdminUsers");
    } catch (error) {
      console.error("Erro ao salvar usuário", error);
      Alert.alert("Erro", "Falha ao salvar usuário.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout title="Editar Usuário" showBackButton={true} showSidebar={false}>
      <View style={styles.container}>
        {loading ? (
          <ActivityIndicator color="#8c52ff" />
        ) : (
          <>
            <Text style={styles.label}>Nome</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>Apelido</Text>
            <TextInput
              style={styles.input}
              value={nickname}
              onChangeText={setNickname}
            />

            <Text style={styles.label}>Telefone</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
            />

            <Text style={styles.label}>Papel</Text>
            <View style={styles.roleRow}>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  role === "user" && styles.roleActive,
                ]}
                onPress={() => setRole("user")}
              >
                <Text
                  style={[
                    styles.roleText,
                    role === "user" && styles.roleTextActive,
                  ]}
                >
                  Cliente
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  role === "consultor" && styles.roleActive,
                ]}
                onPress={() => setRole("consultor")}
              >
                <Text
                  style={[
                    styles.roleText,
                    role === "consultor" && styles.roleTextActive,
                  ]}
                >
                  Consultor
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  role === "cliente_premium" && styles.roleActive,
                ]}
                onPress={() => setRole("cliente_premium")}
              >
                <Text
                  style={[
                    styles.roleText,
                    role === "cliente_premium" && styles.roleTextActive,
                  ]}
                >
                  Cliente Premium
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  role === "admin" && styles.roleActive,
                ]}
                onPress={() => setRole("admin")}
              >
                <Text
                  style={[
                    styles.roleText,
                    role === "admin" && styles.roleTextActive,
                  ]}
                >
                  Admin
                </Text>
              </TouchableOpacity>
            </View>

            {(role === "user" || role === "cliente_premium") && (
              <>
                <Text style={styles.label}>Consultor responsável</Text>
                <ConsultantPicker
                  consultants={consultants}
                  value={consultantId}
                  onChange={(id) => setConsultantId(id)}
                />
              </>
            )}

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveText}>
                {saving ? "Salvando..." : "Salvar alterações"}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  label: { color: "#fff", marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: "#1a1a1a",
    color: "#fff",
    padding: 12,
    borderRadius: 8,
  },
  roleRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  roleButton: {
    flex: 1,
    padding: 10,
    backgroundColor: "#0d0d0d",
    borderRadius: 8,
    alignItems: "center",
  },
  roleActive: { backgroundColor: "#8c52ff" },
  roleText: { color: "#bbb", fontWeight: "600" },
  roleTextActive: { color: "#fff" },
  saveButton: {
    marginTop: 20,
    backgroundColor: "#8c52ff",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  saveText: { color: "#fff", fontWeight: "700" },
  saveDisabled: { opacity: 0.6 },
});

export default EditUserScreen;
