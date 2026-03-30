import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";

import { Layout } from "../../components/Layout/Layout";
import { userService } from "../../services/userServices";
import { useAuth } from "../../hooks/useAuth";
import { useNavigation } from "../../routes/NavigationContext";
import { Ionicons } from "@expo/vector-icons";

export const AdminUsersScreen: React.FC = () => {
  const { user } = useAuth();
  const { navigate } = useNavigation();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [tab, setTab] = useState<"clients" | "consultors">("clients");
  const [query, setQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  useEffect(() => {
    if (
      !user ||
      (user.role !== "consultor" && user.role !== "admin" && !user.isAdmin)
    ) {
      // Se não tiver permissão, redirecionar
      navigate("Home");
      return;
    }
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const all = await userService.getAllUsers();
      setUsers(all);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      Alert.alert("Erro", "Não foi possível carregar usuários.");
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (userId: string, current: boolean) => {
    setToggling(userId);
    try {
      await userService.setUserActive(userId, !current);
      await fetchUsers();
    } catch (error) {
      console.error("Erro ao atualizar isActive:", error);
      Alert.alert("Erro", "Não foi possível atualizar o status do usuário.");
    } finally {
      setToggling(null);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    return (
      <View style={styles.item}>
        <View style={styles.info}>
          <Text style={styles.name}>{item.name || "—"}</Text>
          <Text style={styles.email}>{item.email}</Text>
          <Text style={styles.meta}>
            {item.phone ? `Telefone: ${item.phone}` : "Telefone: —"}
          </Text>
          {item.role === "cliente_premium" && (
            <Text style={[styles.meta, { color: "#c084fc" }]}>Premium</Text>
          )}
        </View>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.smallButton, styles.editButton]}
            onPress={() => navigate("EditUser", { userId: item.id })}
          >
            <Ionicons name="pencil" size={16} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.smallButton,
              item.isActive ? styles.activeSmall : styles.inactiveSmall,
            ]}
            onPress={() => toggleActive(item.id, item.isActive)}
            disabled={toggling === item.id}
          >
            {toggling === item.id ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Ionicons
                name={item.isActive ? "close-circle" : "checkmark-circle"}
                size={16}
                color="#fff"
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Aplicar filtros: role (tab), busca por nome/email/phone e status
  const filteredUsers = users
    .filter((u) => {
      if (tab === "clients")
        return (
          u.role === "user" ||
          !u.role ||
          u.role === "cliente" ||
          u.role === "cliente_premium"
        );
      return u.role === "consultor";
    })
    .filter((u) => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        (u.name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.phone || "").toLowerCase().includes(q)
      );
    })
    .filter((u) => {
      if (statusFilter === "all") return true;
      if (statusFilter === "active") return u.isActive === true;
      return u.isActive === false;
    });
  return (
    <Layout
      title="Gerenciar Usuários"
      showBackButton={false}
      showSidebar={true}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Gerenciar Usuários</Text>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => navigate("CadastrarCliente")}
          >
            <Ionicons name="person-add" size={20} color="#fff" />
            <Text style={styles.createText}>Criar Usuário</Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginBottom: 12 }}>
          <View style={styles.searchRow}>
            <TextInput
              placeholder="Buscar por nome, email ou telefone"
              placeholderTextColor="#666"
              value={query}
              onChangeText={setQuery}
              style={styles.searchInput}
              returnKeyType="search"
            />
            <View style={styles.filterRow}>
              <TouchableOpacity
                style={[
                  styles.filterBtn,
                  statusFilter === "all" && styles.filterActive,
                ]}
                onPress={() => setStatusFilter("all")}
              >
                <Text
                  style={[
                    styles.filterText,
                    statusFilter === "all" && styles.filterTextActive,
                  ]}
                >
                  Todos
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterBtn,
                  statusFilter === "active" && styles.filterActive,
                ]}
                onPress={() => setStatusFilter("active")}
              >
                <Text
                  style={[
                    styles.filterText,
                    statusFilter === "active" && styles.filterTextActive,
                  ]}
                >
                  Ativos
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterBtn,
                  statusFilter === "inactive" && styles.filterActive,
                ]}
                onPress={() => setStatusFilter("inactive")}
              >
                <Text
                  style={[
                    styles.filterText,
                    statusFilter === "inactive" && styles.filterTextActive,
                  ]}
                >
                  Inativos
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tabButton, tab === "clients" && styles.tabActive]}
              onPress={() => setTab("clients")}
            >
              <Text
                style={[
                  styles.tabText,
                  tab === "clients" && styles.tabTextActive,
                ]}
              >
                Clientes
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tabButton,
                tab === "consultors" && styles.tabActive,
              ]}
              onPress={() => setTab("consultors")}
            >
              <Text
                style={[
                  styles.tabText,
                  tab === "consultors" && styles.tabTextActive,
                ]}
              >
                Consultores
              </Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#8c52ff" />
          ) : (
            <FlatList
              data={filteredUsers}
              keyExtractor={(i) => i.id}
              renderItem={renderItem}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              contentContainerStyle={{ paddingBottom: 120 }}
              style={{ flexGrow: 1 }}
            />
          )}
        </View>
      </View>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#8c52ff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  createText: {
    color: "#fff",
    fontWeight: "600",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  email: {
    color: "#999",
    fontSize: 13,
  },
  meta: {
    color: "#bbb",
    fontSize: 12,
    marginTop: 4,
  },
  actions: {},
  actionsRow: { flexDirection: "row", gap: 8 },
  smallButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  editButton: {
    backgroundColor: "#6b6480",
  },
  activeSmall: {
    backgroundColor: "#ff4d6d",
  },
  inactiveSmall: {
    backgroundColor: "#8c52ff",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  active: {
    backgroundColor: "#ff4d6d",
  },
  inactive: {
    backgroundColor: "#8c52ff",
  },
  actionText: {
    color: "#fff",
    fontWeight: "600",
  },
  separator: {
    height: 1,
    backgroundColor: "#222",
  },
  tabs: {
    flexDirection: "row",
    marginBottom: 12,
    backgroundColor: "#0d0d0d",
    borderRadius: 8,
    overflow: "hidden",
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: "#8c52ff",
  },
  tabText: {
    color: "#bbb",
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#fff",
  },
  searchRow: {
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: "#0f0f0f",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#222",
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
  },
  filterBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#111",
  },
  filterActive: {
    backgroundColor: "#8c52ff",
  },
  filterText: {
    color: "#bbb",
    fontWeight: "600",
  },
  filterTextActive: {
    color: "#fff",
  },
  clientTypeRow: {
    marginTop: 8,
    marginBottom: 12,
  },
  filterLabel: {
    color: "#bbb",
    marginBottom: 6,
    fontWeight: "600",
  },
  pickerContainer: {
    backgroundColor: "#0f0f0f",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#222",
    overflow: "hidden",
  },
  picker: {
    color: "#fff",
  },
});

export default AdminUsersScreen;
