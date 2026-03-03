/**
 * Tela (esqueleto) para que o consultor crie/edite o planejamento do cliente
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Layout } from "../../components/Layout/Layout";
import { useAuth } from "../../hooks/useAuth";
import { useNavigation } from "../../routes/NavigationContext";
import { planningServices } from "../../services/planningServices";
import { userService } from "../../services/userServices";
import consultantServices from "../../services/consultantServices";
import { getCategoriesByType } from "../../types/category";

export const ClientPlanningScreen = () => {
  const { user } = useAuth();
  const { params } = useNavigation();
  const [clients, setClients] = useState<any[]>([]);
  const [term, setTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [monthlyIncome, setMonthlyIncome] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [plannedByCategory, setPlannedByCategory] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    // If navigation provided a clientId param, prefill selected client
    async function init() {
      if (params && params.clientId) {
        const u = await userService.getUserById(params.clientId);
        if (u) setSelectedClient(u);
      } else if (user) {
        try {
          const list = await consultantServices.getClientsByConsultant(user.id);
          setClients(list);
        } catch (e) {
          console.warn("Erro ao buscar clientes", e);
        }
      }
    }
    init();
  }, [params, user]);

  const handleSave = async () => {
    if (!user) return;
    if (!selectedClient) {
      Alert.alert("Erro", "Selecione um cliente para salvar o planejamento");
      return;
    }

    const numIncome =
      parseFloat(monthlyIncome.replace(/[^0-9.,]/g, "").replace(",", ".")) || 0;

    try {
      setSaving(true);
      const payload: any = {
        consultantId: user.id,
        monthlyIncome: numIncome,
        notes,
      };
      if (Object.keys(plannedByCategory).length > 0) {
        const mapped = Object.fromEntries(
          Object.entries(plannedByCategory).map(([k, v]) => {
            const n = parseFloat(v.replace(/[^0-9.,]/g, "").replace(",", "."));
            return [k, Number.isNaN(n) ? 0 : n];
          }),
        );
        payload.plannedByCategory = mapped;
      }

      await planningServices.savePlanning(user.id, selectedClient.id, payload);
      Alert.alert("Sucesso", "Planejamento salvo para o cliente");
    } catch (error) {
      console.error("Erro ao salvar planejamento:", error);
      Alert.alert("Erro", "Não foi possível salvar o planejamento");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout
      title="Planejamento do Cliente"
      showBackButton={true}
      showSidebar={true}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.label}>Selecionar Cliente</Text>
        {selectedClient ? (
          <View style={{ marginBottom: 12 }}>
            <Text style={{ color: "#fff", marginBottom: 6 }}>
              {selectedClient.displayName ||
                selectedClient.name ||
                selectedClient.email}
            </Text>
            <TouchableOpacity
              onPress={() => setSelectedClient(null)}
              style={{ marginBottom: 8 }}
            >
              <Text style={{ color: "#ffcc00" }}>Trocar cliente</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TextInput
              style={styles.input}
              value={term}
              onChangeText={setTerm}
              placeholder="Buscar cliente (nome ou email)"
            />
            {clients
              .filter((c) => {
                if (!term) return true;
                const t = term.toLowerCase();
                return (
                  (c.displayName || c.name || "").toLowerCase().includes(t) ||
                  (c.email || "").toLowerCase().includes(t)
                );
              })
              .map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.clientRow}
                  onPress={() => setSelectedClient(item)}
                >
                  <Text style={styles.clientName}>
                    {item.displayName || item.name || item.email}
                  </Text>
                </TouchableOpacity>
              ))}
          </>
        )}

        <Text style={styles.label}>Renda Mensal (opcional)</Text>
        <TextInput
          style={styles.input}
          value={monthlyIncome}
          onChangeText={setMonthlyIncome}
          placeholder="0,00"
          keyboardType="numeric"
        />

        <Text style={styles.label}>Observações do Consultor</Text>
        <TextInput
          style={[styles.input, { height: 120 }]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Notas..."
          multiline
        />

        <View style={{ marginTop: 12 }}>
          <Text style={styles.label}>Valores por categoria (despesa)</Text>
          {getCategoriesByType("expense").map((cat) => (
            <View key={cat.name} style={styles.categoryRow}>
              <Text style={styles.categoryLabel}>{cat.name}</Text>
              <TextInput
                style={styles.categoryInput}
                placeholder="0,00"
                keyboardType="numeric"
                value={plannedByCategory[cat.name] ?? ""}
                onChangeText={(v) =>
                  setPlannedByCategory((s) => ({ ...s, [cat.name]: v }))
                }
              />
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.saveButton, { marginTop: 16, marginBottom: 24 }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? "Salvando..." : "Salvar Planejamento"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 8, color: "#fff" },
  clientRow: { padding: 10, borderBottomWidth: 1, borderBottomColor: "#333" },
  clientName: { color: "#fff" },
  label: { color: "#fff", marginBottom: 8, fontSize: 14 },
  input: {
    backgroundColor: "#0a0a0a",
    color: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  categoryLabel: { color: "#fff", flex: 1, marginRight: 8 },
  categoryInput: {
    width: 120,
    backgroundColor: "#0a0a0a",
    color: "#fff",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  saveButton: {
    backgroundColor: "#4CAF50",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: { color: "#fff", fontWeight: "600" },
});

export default ClientPlanningScreen;
