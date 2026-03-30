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
        // defensive: some user objects may have `id` or `uid` depending on source
        const consultantId =
          (user as any).id || (user as any).uid || (user as any).userId;
        if (!consultantId) {
          console.warn("Consultor sem id válido, user:", user);
          setClients([]);
          setLoading(false);
          return;
        }

        // load only clients assigned to this consultant
        console.log("Carregando clientes para consultorId:", consultantId);
        const list =
          await consultantServices.getClientsByConsultant(consultantId);
        console.log(
          "[CONSULTOR HOME] ✅ Clientes carregados:",
          list.length,
          "clientes encontrados",
        );
        if (list.length === 0) {
          console.warn(
            "[CONSULTOR HOME] ⚠️ Nenhum cliente encontrado para consultantId:",
            consultantId,
          );
        }
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
                  style={[styles.button, { backgroundColor: colors.primary }]}
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
    backgroundColor: "transparent",
    marginBottom: 10,
  },
  cardLeft: { flex: 1 },
  cardRight: { marginLeft: 12 },
  name: { color: "#fff", fontSize: 16, fontWeight: "600" },
  subtitle: { color: "#bbb", fontSize: 12 },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  buttonText: { color: "#fff", fontWeight: "600" },
});

export default ConsultorHome;
