import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Layout } from "../../components/Layout/Layout";
import { useAuth } from "../../hooks/useAuth";
import consultantServices from "../../services/consultantServices";
import { userService } from "../../services/userServices";
import { User } from "../../types/auth";
import { useNavigation } from "../../routes/NavigationContext";
import { useTheme } from "../../contexts/ThemeContext";

export const ConsultorHome: React.FC = () => {
  const { user } = useAuth();
  const { navigate } = useNavigation();
  const { colors } = useTheme();
  const [clients, setClients] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      if (!user) return;
      setLoading(true);
      try {
        // load all users with role 'user' as clients for now
        const list = await userService.getUsersByRole("user");
        setClients(list);
      } catch (e) {
        console.warn("Erro ao carregar clientes do consultor", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  function openPlanning(clientId: string) {
    // Navigate to the existing ClientPlanning screen and pass clientId as param
    navigate("ClientPlanning", { clientId });
  }

  return (
    <Layout title="Consultor - Painel" showSidebar>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.heading, { color: colors.text }]}>
          Meus Clientes
        </Text>
        <FlatList
          data={clients}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <View
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.cardLeft}>
                <Text style={[styles.name, { color: colors.text }]}>
                  {item.name || item.displayName || item.email}
                </Text>
                <Text
                  style={[styles.subtitle, { color: colors.textSecondary }]}
                >
                  {item.username || item.email}
                </Text>
              </View>
              <View style={styles.cardRight}>
                <TouchableOpacity
                  style={[
                    styles.button,
                    { backgroundColor: "#2b6cb0", marginBottom: 8 },
                  ]}
                  onPress={() => openPlanning(item.id)}
                >
                  <Text style={styles.buttonText}>Abrir Planejamento</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: "#4CAF50" }]}
                  onPress={() =>
                    navigate("ClientDetail", { clientId: item.id })
                  }
                >
                  <Text style={styles.buttonText}>Ver Dados</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={() => (
            <Text style={{ color: colors.text }}>
              {loading ? "Carregando..." : "Nenhum cliente encontrado"}
            </Text>
          )}
        />
      </View>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16 },
  heading: { fontSize: 18, fontWeight: "600", marginBottom: 12 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#111",
    marginBottom: 10,
  },
  cardLeft: { flex: 1 },
  cardRight: { marginLeft: 12 },
  name: { color: "#fff", fontSize: 16, fontWeight: "600" },
  subtitle: { color: "#bbb", fontSize: 12 },
  button: {
    backgroundColor: "#2b6cb0",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  buttonText: { color: "#fff", fontWeight: "600" },
});

export default ConsultorHome;
