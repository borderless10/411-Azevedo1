import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { Layout } from "../../components/Layout/Layout";
import { useNavigation } from "../../routes/NavigationContext";
import { userService } from "../../services/userServices";
import { useTheme } from "../../contexts/ThemeContext";

export const ClientList: React.FC = () => {
  const { navigate } = useNavigation();
  const { colors } = useTheme();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [term, setTerm] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const list = await userService.getUsersByRole("user");
        setClients(list);
      } catch (e) {
        console.warn("Erro ao carregar clientes", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function openPlanning(clientId: string) {
    navigate("ClientPlanning", { clientId });
  }

  return (
    <Layout title="Clientes" showBackButton showSidebar>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <TextInput
          placeholder="Buscar cliente"
          placeholderTextColor={colors.placeholder}
          style={[
            styles.search,
            { backgroundColor: colors.inputBackground, color: colors.text },
          ]}
          value={term}
          onChangeText={setTerm}
        />
        {loading ? (
          <ActivityIndicator />
        ) : (
          <FlatList
            data={clients.filter((c) => {
              if (!term) return true;
              const t = term.toLowerCase();
              return (
                (c.name || "").toLowerCase().includes(t) ||
                (c.email || "").toLowerCase().includes(t)
              );
            })}
            keyExtractor={(i) => i.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.row, { borderColor: colors.border }]}
                onPress={() => openPlanning(item.id)}
              >
                <View>
                  <Text style={[styles.name, { color: colors.text }]}>
                    {item.name || item.email}
                  </Text>
                  <Text style={{ color: colors.textSecondary }}>
                    {item.email}
                  </Text>
                </View>
                <Text style={{ color: colors.primary }}>Planejar</Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  row: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: { fontSize: 16, fontWeight: "600" },
  search: { padding: 10, borderRadius: 8, marginBottom: 12 },
});

export default ClientList;
