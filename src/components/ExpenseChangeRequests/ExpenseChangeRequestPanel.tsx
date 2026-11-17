import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import expenseChangeRequestServices from "../../services/expenseChangeRequestServices";
import {
  ExpenseChangeRequest,
  ExpenseChangeRequestType,
} from "../../types/expenseChangeRequest";
import { formatCurrency, parseCurrency, sanitizeDecimalInput } from "../../utils/currencyUtils";

type Props = {
  userId: string;
  mode: "client" | "staff";
  reviewerId?: string;
};

export const ExpenseChangeRequestPanel: React.FC<Props> = ({
  userId,
  mode,
  reviewerId,
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requests, setRequests] = useState<ExpenseChangeRequest[]>([]);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ExpenseChangeRequestType>("tracked");
  const [amountText, setAmountText] = useState("");
  const [notes, setNotes] = useState("");

  const load = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const list =
        mode === "staff"
          ? await expenseChangeRequestServices.listPendingForUser(userId)
          : await expenseChangeRequestServices.listForUser(userId);
      setRequests(list);
    } catch (e) {
      console.warn("Falha ao carregar solicitações de gasto", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [userId, mode]);

  const handleCreate = async () => {
    const trimmed = title.trim();
    if (trimmed.length < 2) {
      Alert.alert("Atenção", "Informe um título para o gasto.");
      return;
    }
    try {
      setSaving(true);
      await expenseChangeRequestServices.create(userId, {
        title: trimmed,
        type,
        amount: parseCurrency(amountText) || undefined,
        notes,
      });
      setTitle("");
      setAmountText("");
      setNotes("");
      await load();
      Alert.alert("Enviado", "Solicitação enviada ao consultor.");
    } catch (e: any) {
      Alert.alert("Erro", e?.message || "Não foi possível enviar.");
    } finally {
      setSaving(false);
    }
  };

  const handleReview = async (
    id: string,
    decision: "approved" | "rejected",
  ) => {
    if (!reviewerId) return;
    try {
      setSaving(true);
      await expenseChangeRequestServices.review(reviewerId, id, decision);
      await load();
      Alert.alert(
        decision === "approved" ? "Aprovado" : "Recusado",
        decision === "approved"
          ? "Item incluído no planejamento."
          : "Solicitação recusada.",
      );
    } catch (e: any) {
      Alert.alert("Erro", e?.message || "Falha ao revisar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        {mode === "client"
          ? "Solicitar novo gasto no plano"
          : "Solicitações pendentes"}
      </Text>

      {mode === "client" ? (
        <>
          <View style={styles.typeRow}>
            {(
              [
                { id: "tracked", label: "Acompanhado" },
                { id: "extra", label: "Extra" },
              ] as const
            ).map((opt) => {
              const active = type === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.typeChip, active && styles.typeChipActive]}
                  onPress={() => setType(opt.id)}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      active && styles.typeChipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Título / categoria"
            placeholderTextColor="#6b6480"
          />
          <TextInput
            style={styles.input}
            value={amountText}
            onChangeText={(t) => setAmountText(sanitizeDecimalInput(t))}
            placeholder="Valor (opcional)"
            placeholderTextColor="#6b6480"
          />
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Observações"
            placeholderTextColor="#6b6480"
            multiline
          />
          <TouchableOpacity
            style={[styles.primaryBtn, saving && styles.disabled]}
            onPress={handleCreate}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Enviar solicitação</Text>
            )}
          </TouchableOpacity>
        </>
      ) : null}

      {loading ? (
        <ActivityIndicator color="#B900FF" style={{ marginTop: 12 }} />
      ) : (
        <View style={{ marginTop: 12 }}>
          {requests.length === 0 ? (
            <Text style={styles.empty}>
              {mode === "staff"
                ? "Nenhuma solicitação pendente."
                : "Você ainda não enviou solicitações."}
            </Text>
          ) : (
            requests.map((req) => (
              <View key={req.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{req.title}</Text>
                  <Text style={styles.rowMeta}>
                    {req.type === "extra" ? "Extra" : "Acompanhado"}
                    {req.amount != null
                      ? ` · ${formatCurrency(req.amount)}`
                      : ""}
                    {mode === "client" ? ` · ${req.status}` : ""}
                  </Text>
                  {req.notes ? (
                    <Text style={styles.rowNotes}>{req.notes}</Text>
                  ) : null}
                </View>
                {mode === "staff" && req.status === "pending" ? (
                  <View style={styles.reviewCol}>
                    <TouchableOpacity
                      style={styles.approveBtn}
                      onPress={() => handleReview(req.id, "approved")}
                      disabled={saving}
                    >
                      <Ionicons name="checkmark" size={18} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => handleReview(req.id, "rejected")}
                      disabled={saving}
                    >
                      <Ionicons name="close" size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            ))
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#21172D",
    backgroundColor: "#171321",
  },
  title: { color: "#fff", fontWeight: "700", fontSize: 16, marginBottom: 8 },
  typeRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  typeChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#21172D",
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  typeChipActive: { backgroundColor: "#B900FF", borderColor: "#B900FF" },
  typeChipText: { color: "#a89fc0", fontWeight: "600" },
  typeChipTextActive: { color: "#fff" },
  input: {
    borderWidth: 1,
    borderColor: "#21172D",
    borderRadius: 8,
    color: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 8,
  },
  notesInput: { minHeight: 64, textAlignVertical: "top" },
  primaryBtn: {
    backgroundColor: "#B900FF",
    borderRadius: 8,
    alignItems: "center",
    paddingVertical: 12,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700" },
  disabled: { opacity: 0.7 },
  empty: { color: "#a89fc0", fontSize: 13 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#21172D",
    paddingVertical: 10,
    gap: 8,
  },
  rowTitle: { color: "#fff", fontWeight: "700" },
  rowMeta: { color: "#a89fc0", fontSize: 12, marginTop: 2 },
  rowNotes: { color: "#cfc6e8", fontSize: 12, marginTop: 4 },
  reviewCol: { flexDirection: "row", gap: 6 },
  approveBtn: {
    backgroundColor: "#2a9d4b",
    borderRadius: 8,
    padding: 8,
  },
  rejectBtn: {
    backgroundColor: "#c1121f",
    borderRadius: 8,
    padding: 8,
  },
});

export default ExpenseChangeRequestPanel;