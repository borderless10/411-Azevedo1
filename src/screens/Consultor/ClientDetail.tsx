import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { Layout } from "../../components/Layout/Layout";
import { useNavigation } from "../../routes/NavigationContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { expenseServices } from "../../services/expenseServices";
import { incomeServices } from "../../services/incomeServices";
import { formatCurrency, getBalanceColor } from "../../utils/currencyUtils";
import { useTheme } from "../../contexts/ThemeContext";

export const ClientDetail: React.FC = () => {
  const { params } = useNavigation() as any;
  const clientId: string = params?.clientId || "";
  const [loading, setLoading] = useState(false);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [incomes, setIncomes] = useState<any[]>([]);
  const [monthlyExpenses, setMonthlyExpenses] = useState<number>(0);
  const [monthlyIncomes, setMonthlyIncomes] = useState<number>(0);
  const { colors } = useTheme();
  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const [messageText, setMessageText] = useState("");
  const insets = useSafeAreaInsets();

  // compute start/end of current month for grouping
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );

  const isSameDay = (a: Date | string, b: Date) => {
    const da = new Date(a);
    return (
      da.getFullYear() === b.getFullYear() &&
      da.getMonth() === b.getMonth() &&
      da.getDate() === b.getDate()
    );
  };

  useEffect(() => {
    async function load() {
      if (!clientId) return;
      setLoading(true);
      try {
        // compute start and end of current month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59,
          999,
        );

        const monthlyExpensesTotal = await expenseServices.getExpensesTotal(
          clientId,
          startOfMonth,
          endOfMonth,
        );
        const monthlyIncomesTotal = await incomeServices.getIncomesTotal(
          clientId,
          startOfMonth,
          endOfMonth,
        );

        // also fetch recent entries for lists
        const ex = await expenseServices.getExpenses(clientId);
        const inc = await incomeServices.getIncomes(clientId);
        setExpenses(ex);
        setIncomes(inc);

        setMonthlyExpenses(monthlyExpensesTotal);
        setMonthlyIncomes(monthlyIncomesTotal);
      } catch (e) {
        console.warn("Erro ao carregar dados do cliente", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [clientId]);

  // totals (all-time as fallback for lists)
  const totalExpenses = expenses.reduce((s, e) => s + (e.value || 0), 0);
  const totalIncomes = incomes.reduce((s, i) => s + (i.value || 0), 0);

  const balanceMonth = monthlyIncomes - monthlyExpenses;

  return (
    <Layout title="Dados do Cliente" showBackButton={true} showSidebar={false}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 16 + insets.bottom + 96,
        }}
      >
        <Text style={[styles.heading, { color: colors.text }]}>
          Visão Geral
        </Text>
        <View style={[styles.row, { borderColor: colors.border }]}>
          <View style={styles.col}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Gastos no mês
            </Text>
            <Text style={[styles.value, { color: colors.text }]}>
              {formatCurrency(monthlyExpenses)}
            </Text>
          </View>
          <View style={styles.col}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Renda no mês
            </Text>
            <Text style={[styles.value, { color: colors.text }]}>
              {formatCurrency(monthlyIncomes)}
            </Text>
          </View>
          <View style={styles.col}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Saldo (mês)
            </Text>
            <Text
              style={[styles.value, { color: getBalanceColor(balanceMonth) }]}
            >
              {formatCurrency(balanceMonth)}
            </Text>
          </View>
        </View>

        <Text style={[styles.subheading, { color: colors.text }]}>
          Movimentações do mês
        </Text>
        {/* Render each day of the month that has any movement */}
        {(() => {
          const days: Date[] = [];
          for (
            let d = new Date(startOfMonth);
            d <= endOfMonth;
            d.setDate(d.getDate() + 1)
          ) {
            days.push(new Date(d));
          }

          const rendered = days.map((day) => {
            const dayExpenses = expenses.filter((e) =>
              isSameDay(e.date || e.createdAt || e, day),
            );
            const dayIncomes = incomes.filter((i) =>
              isSameDay(i.date || i.createdAt || i, day),
            );

            if (dayExpenses.length === 0 && dayIncomes.length === 0)
              return null;

            return (
              <View
                key={day.toISOString()}
                style={[styles.item, { borderColor: colors.border }]}
              >
                <Text style={{ color: colors.text, fontWeight: "700" }}>
                  {day.toLocaleDateString()}
                </Text>
                {dayIncomes.map((inc: any) => (
                  <View
                    key={`inc-${inc.id}`}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginTop: 6,
                    }}
                  >
                    <Text style={{ color: colors.text }}>
                      {inc.description || "Renda"}
                    </Text>
                    <Text style={{ color: getBalanceColor(inc.value) }}>
                      {formatCurrency(inc.value)}
                    </Text>
                  </View>
                ))}
                {dayExpenses.map((exp: any) => (
                  <View
                    key={`exp-${exp.id}`}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginTop: 6,
                    }}
                  >
                    <Text style={{ color: colors.text }}>
                      {exp.description || "Gasto"}
                    </Text>
                    <Text style={{ color: getBalanceColor(-exp.value) }}>
                      {formatCurrency(exp.value)}
                    </Text>
                  </View>
                ))}
              </View>
            );
          });

          return rendered.length === 0 ? (
            <Text style={{ color: colors.textSecondary }}>
              Sem movimentações este mês
            </Text>
          ) : (
            rendered
          );
        })()}
      </ScrollView>

      {/* Message Modal (frontend placeholder) */}
      <Modal visible={messageModalVisible} animationType="slide" transparent>
        <View
          style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Enviar mensagem ao cliente
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                { backgroundColor: colors.inputBackground, color: colors.text },
              ]}
              placeholder="Escreva sua mensagem..."
              placeholderTextColor={colors.placeholder}
              multiline
              value={messageText}
              onChangeText={setMessageText}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#ccc" }]}
                onPress={() => {
                  setMessageModalVisible(false);
                  setMessageText("");
                }}
              >
                <Text>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#4CAF50" }]}
                onPress={() => {
                  console.log("Enviar mensagem para", clientId, messageText);
                  setMessageModalVisible(false);
                  setMessageText("");
                }}
              >
                <Text style={{ color: "#fff" }}>Enviar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bottom action: Enviar mensagem */}
      <View
        style={[
          styles.bottomContainer,
          { backgroundColor: "transparent", bottom: 16 + insets.bottom },
        ]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          style={[styles.sendMessageButton, { backgroundColor: "#2b6cb0" }]}
          onPress={() => setMessageModalVisible(true)}
        >
          <Text style={styles.sendMessageText}>Enviar mensagem ao cliente</Text>
        </TouchableOpacity>
      </View>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  heading: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  subheading: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  col: { flex: 1, alignItems: "center", paddingHorizontal: 8 },
  label: { fontSize: 12 },
  value: { fontSize: 16, fontWeight: "700", marginTop: 6 },
  item: { padding: 10, borderWidth: 1, borderRadius: 8, marginBottom: 8 },
  bottomContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 16,
    alignItems: "center",
    paddingHorizontal: 16,
  },
  sendMessageButton: {
    width: "100%",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  sendMessageText: { color: "#fff", fontWeight: "700" },
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center" },
  modalContent: { width: "92%", padding: 16, borderRadius: 10, borderWidth: 1 },
  modalTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  modalInput: { minHeight: 100, padding: 8, borderRadius: 6, marginBottom: 12 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginLeft: 8,
  },
  bottomContainer: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    zIndex: 1200,
    alignItems: "center",
  },
  sendMessageButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  sendMessageText: { color: "#fff", fontWeight: "700" },
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center" },
  modalContent: { width: "90%", borderRadius: 12, padding: 12, borderWidth: 1 },
  modalTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  modalInput: { minHeight: 100, padding: 8, borderRadius: 8, marginBottom: 12 },
  modalActions: { flexDirection: "row", justifyContent: "space-between" },
  modalButton: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
});

export default ClientDetail;
