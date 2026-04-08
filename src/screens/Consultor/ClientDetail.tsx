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
import { useAuth } from "../../hooks/useAuth";
import { userService } from "../../services/userServices";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { expenseServices } from "../../services/expenseServices";
import { incomeServices } from "../../services/incomeServices";
import { planningServices } from "../../services/planningServices";
import { formatCurrency, getBalanceColor } from "../../utils/currencyUtils";
import { useTheme } from "../../contexts/ThemeContext";

export const ClientDetail: React.FC = () => {
  const { params, navigate } = useNavigation() as any;
  const { user } = useAuth();
  const clientId: string = params?.clientId || "";
  const [loading, setLoading] = useState(false);
  const [clientDoc, setClientDoc] = useState<any | null>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [incomes, setIncomes] = useState<any[]>([]);
  const [monthlyExpenses, setMonthlyExpenses] = useState<number>(0);
  const [monthlyIncomes, setMonthlyIncomes] = useState<number>(0);
  const [plannedByCategory, setPlannedByCategory] = useState<Record<
    string,
    number
  > | null>(null);
  const [expensesByCategory, setExpensesByCategory] = useState<any[]>([]);
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
      // se o usuário atual for consultor, verificar propriedade do cliente
      try {
        if (user && user.role === "consultor") {
          const client = await userService.getUserById(clientId);
          setClientDoc(client ?? null);
          if (client && (client as any).consultantId !== user.id) {
            navigate("Home");
            return;
          }
        } else {
          // if not a consultant, still try to load client profile for display
          const client = await userService.getUserById(clientId);
          setClientDoc(client ?? null);
        }
      } catch (e) {
        console.warn("Erro na verificação de permissão do consultor", e);
      }
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
        // fetch planning for this client (if any)
        try {
          const plan = await planningServices.getPlanning(clientId);
          setPlannedByCategory(plan?.plannedByCategory ?? null);
        } catch (e) {
          console.warn("Erro ao buscar planejamento do cliente", e);
        }

        // fetch expenses grouped by category for the month
        try {
          const grouped = await expenseServices.getExpensesGroupedByCategory(
            clientId,
            startOfMonth,
            endOfMonth,
          );
          setExpensesByCategory(grouped);
        } catch (e) {
          console.warn("Erro ao agrupar gastos por categoria", e);
        }
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
        <View style={styles.actionColumn}>
          <TouchableOpacity
            style={[
              styles.actionButtonFull,
              { backgroundColor: colors.primary },
            ]}
            onPress={() => navigate("ClientPlanning", { clientId })}
          >
            <Text style={styles.actionButtonText}>Abrir Planejamento</Text>
          </TouchableOpacity>

          {clientDoc?.role === "cliente_premium" && (
            <TouchableOpacity
              style={[
                styles.actionButtonFull,
                { backgroundColor: colors.primary },
              ]}
              onPress={() =>
                navigate(
                  user && user.role === "consultor"
                    ? "ClientInvestments"
                    : "ClientInvestmentsView",
                  { clientId },
                )
              }
            >
              <Text style={styles.actionButtonText}>Investimentos</Text>
            </TouchableOpacity>
          )}

          {clientDoc?.role === "cliente_premium" && (
            <TouchableOpacity
              style={[
                styles.actionButtonFull,
                { backgroundColor: colors.primary },
              ]}
              onPress={() => navigate("Metas", { clientId })}
            >
              <Text style={styles.actionButtonText}>Metas</Text>
            </TouchableOpacity>
          )}
          {clientDoc && (
            <TouchableOpacity
              style={[
                styles.actionButtonFull,
                { backgroundColor: colors.primary },
              ]}
              onPress={() => navigate("Wishlist", { clientId })}
            >
              <Text style={styles.actionButtonText}>Lista de Desejos</Text>
            </TouchableOpacity>
          )}

          {clientDoc && (
            <TouchableOpacity
              style={[
                styles.actionButtonFull,
                { backgroundColor: colors.primary },
              ]}
              onPress={() => navigate("Recomendacao", { clientId })}
            >
              <Text style={styles.actionButtonText}>Recomendações</Text>
            </TouchableOpacity>
          )}

          {clientDoc && (
            <TouchableOpacity
              style={[
                styles.actionButtonFull,
                { backgroundColor: colors.primary },
              ]}
              onPress={() => navigate("Cartoes", { clientId })}
            >
              <Text style={styles.actionButtonText}>Cartões</Text>
            </TouchableOpacity>
          )}
        </View>
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
        {/* Comparison with planning */}
        <Text
          style={[styles.subheading, { color: colors.text, marginTop: 12 }]}
        >
          Comparação por categoria
        </Text>
        <View style={{ marginBottom: 12 }}>
          {(() => {
            // build union of category keys from expenses and plan
            const keys = new Set<string>();
            expensesByCategory.forEach((e) => keys.add(e.category));
            if (plannedByCategory)
              Object.keys(plannedByCategory).forEach((k) => keys.add(k));

            if (keys.size === 0)
              return (
                <Text style={{ color: colors.textSecondary }}>
                  Sem dados para comparar
                </Text>
              );

            return Array.from(keys).map((cat) => {
              const expenseEntry = expensesByCategory.find(
                (e) => e.category === cat,
              );
              const actual = expenseEntry ? expenseEntry.total : 0;
              const planned = plannedByCategory
                ? (plannedByCategory[cat] ?? 0)
                : undefined;
              const over = planned !== undefined ? actual - planned : 0;
              const statusColor =
                planned === undefined
                  ? colors.textSecondary
                  : over > 0
                    ? "#ff4d6d"
                    : "#8c52ff";

              return (
                <View
                  key={cat}
                  style={[
                    styles.item,
                    {
                      borderColor: colors.border,
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    },
                  ]}
                >
                  <View>
                    <Text style={{ color: colors.text, fontWeight: "700" }}>
                      {cat}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                      {planned !== undefined
                        ? `Planejado: ${formatCurrency(planned)}`
                        : "Sem planejamento"}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ color: statusColor, fontWeight: "700" }}>
                      {formatCurrency(actual)}
                    </Text>
                    {planned !== undefined ? (
                      <Text
                        style={{ color: colors.textSecondary, fontSize: 12 }}
                      >
                        {over > 0
                          ? `+${formatCurrency(over)} acima`
                          : `${formatCurrency(Math.abs(over))} abaixo`}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            });
          })()}
        </View>
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
                style={[styles.modalButton, { backgroundColor: "#8c52ff" }]}
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
          style={[
            styles.sendMessageButton,
            { backgroundColor: colors.primary },
          ]}
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
  actionRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  actionColumn: { flexDirection: "column", marginBottom: 12 },
  actionButtonFull: {
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 8,
  },
  actionButtonText: { color: "#fff", fontWeight: "700" },
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
