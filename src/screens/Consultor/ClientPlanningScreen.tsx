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
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Layout } from "../../components/Layout/Layout";
import { useAuth } from "../../hooks/useAuth";
import { useNavigation } from "../../routes/NavigationContext";
import { planningServices } from "../../services/planningServices";
import { userService } from "../../services/userServices";

export const ClientPlanningScreen = () => {
  const { user } = useAuth();
  const { params } = useNavigation();
  const [clientId, setClientId] = useState<string>("");
  const [monthlyIncome, setMonthlyIncome] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // If navigation provided a clientId param, prefill it
    if (params && params.clientId) {
      setClientId(params.clientId);
    }
    // nothing else - Client list moved to separate screen
  }, [params]);

  const handleSave = async () => {
    if (!user) return;
    if (!clientId) {
      Alert.alert("Erro", "Informe o ID do cliente para salvar o planejamento");
      return;
    }

    const numIncome =
      parseFloat(monthlyIncome.replace(/[^0-9.,]/g, "").replace(",", ".")) || 0;

    try {
      setSaving(true);
      await planningServices.savePlanning(user.id, clientId, {
        consultantId: user.id,
        monthlyIncome: numIncome,
        notes,
      });
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
      <View style={styles.container}>
        <Text style={styles.label}>ID do Cliente</Text>
        <TextInput
          style={styles.input}
          value={clientId}
          onChangeText={setClientId}
          placeholder="userId do cliente"
        />

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

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? "Salvando..." : "Salvar Planejamento"}
          </Text>
        </TouchableOpacity>
      </View>
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
  saveButton: {
    backgroundColor: "#4CAF50",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: { color: "#fff", fontWeight: "600" },
});

export default ClientPlanningScreen;
