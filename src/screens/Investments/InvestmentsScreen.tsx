import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import { Layout } from "../../components/Layout/Layout";
import { useAuth } from "../../hooks/useAuth";
import { planningServices } from "../../services/planningServices";
import { useTheme } from "../../contexts/ThemeContext";
import { formatCurrency as formatCurrencyUtil } from "../../utils/currencyUtils";
import InvestmentsLineChart, {
  InvPoint,
} from "../../components/Charts/InvestmentsLineChart";

export const InvestmentsScreen: React.FC = () => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const load = async () => {
    if (!user || !user.id) return;
    try {
      setLoading(true);
      const entries = await planningServices.getInvestments(user.id);
      setHistory(entries);
    } catch (e) {
      console.warn("Erro ao carregar investimentos do usuário", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  const current =
    history && history.length > 0
      ? history[0].totals
      : { caixa: 0, ipca: 0, outros: 0 };

  const renderEntry = ({ item }: { item: any }) => {
    const date = item.date ? new Date(item.date) : null;
    return (
      <View style={[styles.entryCard, { borderColor: colors.border }]}>
        <Text style={[styles.entryDate, { color: colors.text }]}>
          {date ? date.toLocaleString() : "-"}
        </Text>
        <View style={styles.entryRow}>
          <Text style={{ color: colors.textSecondary }}>Caixa:</Text>
          <Text style={{ color: colors.text }}>
            {formatCurrencyUtil(item.totals?.caixa || 0)}
          </Text>
        </View>
        <View style={styles.entryRow}>
          <Text style={{ color: colors.textSecondary }}>IPCA:</Text>
          <Text style={{ color: colors.text }}>
            {formatCurrencyUtil(item.totals?.ipca || 0)}
          </Text>
        </View>
        <View style={styles.entryRow}>
          <Text style={{ color: colors.textSecondary }}>Outros:</Text>
          <Text style={{ color: colors.text }}>
            {formatCurrencyUtil(item.totals?.outros || 0)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Layout title="Investimentos">
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          Seus investimentos
        </Text>

        <View style={styles.currentRow}>
          <View>
            <Text style={{ color: colors.textSecondary }}>Caixa</Text>
            <Text style={{ color: colors.text, fontWeight: "700" }}>
              {formatCurrencyUtil(current.caixa || 0)}
            </Text>
          </View>
          <View>
            <Text style={{ color: colors.textSecondary }}>IPCA</Text>
            <Text style={{ color: colors.text, fontWeight: "700" }}>
              {formatCurrencyUtil(current.ipca || 0)}
            </Text>
          </View>
          <View>
            <Text style={{ color: colors.textSecondary }}>Outros</Text>
            <Text style={{ color: colors.text, fontWeight: "700" }}>
              {formatCurrencyUtil(current.outros || 0)}
            </Text>
          </View>
        </View>

        <Text
          style={[styles.historyTitle, { color: colors.text, marginTop: 16 }]}
        >
          Evolução
        </Text>
        <InvestmentsLineChart
          data={
            history
              .slice()
              .reverse()
              .map((h) => ({
                date: new Date(h.date),
                caixa: h.totals?.caixa || 0,
                ipca: h.totals?.ipca || 0,
                outros: h.totals?.outros || 0,
                total:
                  (h.totals?.caixa || 0) +
                  (h.totals?.ipca || 0) +
                  (h.totals?.outros || 0),
              })) as InvPoint[]
          }
        />

        <Text
          style={[styles.historyTitle, { color: colors.text, marginTop: 16 }]}
        >
          Histórico
        </Text>
        <FlatList
          data={history}
          keyExtractor={(h) => h.id}
          renderItem={renderEntry}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={() => (
            <Text style={{ color: colors.textSecondary, marginTop: 8 }}>
              {loading ? "Carregando..." : "Nenhum histórico"}
            </Text>
          )}
        />
      </View>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 18, fontWeight: "700" },
  historyTitle: { fontSize: 16, fontWeight: "700" },
  entryCard: { padding: 10, borderWidth: 1, borderRadius: 8, marginTop: 8 },
  entryDate: { fontSize: 12, fontWeight: "700", marginBottom: 8 },
  entryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  currentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
});

export default InvestmentsScreen;
