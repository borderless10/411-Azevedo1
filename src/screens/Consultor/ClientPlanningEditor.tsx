import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import consultantServices from "../../services/consultantServices";
import planningServices from "../../services/planningServices";
import type { User } from "../../types/auth";
import type { Planning, CreatePlanningData } from "../../types/planning";
import { useAuth } from "../../hooks/useAuth";

export default function ClientPlanningEditor() {
  const [clients, setClients] = useState<User[]>([]);
  const [term, setTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<User | null>(null);
  const [planning, setPlanning] = useState<Planning | null>(null);
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth() as any;

  useEffect(() => {
    // load clients for current consultant (assumes auth context provides uid)
    // For now, attempt to read from a global auth if available; otherwise developer will wire
    async function load() {
      try {
        const consultantId = user?.id || "";
        const list =
          await consultantServices.getClientsByConsultant(consultantId);
        setClients(list);
      } catch (e) {
        console.warn("Erro ao buscar clientes", e);
      }
    }
    load();
  }, []);

  async function onSelectClient(client: User) {
    setSelectedClient(client);
    setPlanning(null);
    setMonthlyIncome("");
    setNotes("");
    try {
      const p = await planningServices.getPlanning(client.id);
      if (p) {
        setPlanning(p);
        setMonthlyIncome((p.monthlyIncome ?? 0).toString());
        setNotes(p.notes ?? "");
      }
    } catch (e) {
      console.warn("Erro ao carregar planning", e);
    }
  }

  async function onSave() {
    if (!selectedClient) return;
    setLoading(true);
    try {
      const data: CreatePlanningData = {
        monthlyIncome: Number(monthlyIncome) || 0,
        modules: planning?.modules || [],
        plannedByCategory: planning?.plannedByCategory || {},
        notes,
      };
      // determine create vs update by presence
      const consultantId = user?.id || "";
      await planningServices.savePlanning(
        consultantId,
        selectedClient.id,
        data,
      );
      // reload
      const p = await planningServices.getPlanning(selectedClient.id);
      setPlanning(p ?? null);
    } catch (e) {
      console.warn("Erro ao salvar planning", e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Editor de Planejamento (Consultor)</Text>
      <TextInput
        placeholder="Buscar cliente (nome ou email)"
        value={term}
        onChangeText={setTerm}
        style={styles.input}
      />
      <FlatList
        data={clients.filter((c) => {
          if (!term) return true;
          const t = term.toLowerCase();
          return (
            (c.displayName || c.name || "").toLowerCase().includes(t) ||
            (c.email || "").toLowerCase().includes(t)
          );
        })}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => onSelectClient(item)}
            style={styles.clientRow}
          >
            <Text>{item.displayName || item.name || item.email}</Text>
          </TouchableOpacity>
        )}
      />

      {selectedClient && (
        <View style={styles.editor}>
          <Text style={styles.subtitle}>
            Planejamento de:{" "}
            {selectedClient.displayName || selectedClient.email}
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Renda mensal"
            value={monthlyIncome}
            onChangeText={setMonthlyIncome}
            keyboardType="numeric"
          />
          <TextInput
            style={[styles.input, { height: 100 }]}
            placeholder="Notas do consultor"
            value={notes}
            onChangeText={setNotes}
            multiline
          />
          <Button
            title={loading ? "Salvando..." : "Salvar Planejamento"}
            onPress={onSave}
            disabled={loading}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 18, fontWeight: "600", marginBottom: 8 },
  subtitle: { fontSize: 16, fontWeight: "500", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  clientRow: { padding: 10, borderBottomWidth: 1, borderBottomColor: "#eee" },
  editor: { marginTop: 12 },
});
