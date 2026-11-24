import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { Layout } from "../../components/Layout/Layout";
import { useNavigation } from "../../routes/NavigationContext";
import { useTheme } from "../../contexts/ThemeContext";
import { planningServices } from "../../services/planningServices";
import { formatCurrency as formatCurrencyUtil } from "../../utils/currencyUtils";
import InvestmentsLineChart, {
  InvPoint,
} from "../../components/Charts/InvestmentsLineChart";

export const ClientInvestmentsView: React.FC = () => {
  const { params, navigate } = useNavigation() as any;
  const { colors } = useTheme();
  const clientId: string = params?.clientId || "";

  const [history, setHistory] = useState<Array<any>>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const entries = await planningServices.getInvestments(clientId);
      setHistory(entries);
    } catch (e) {
      console.warn("Erro ao carregar histórico de investimentos", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!clientId) return;
    loadHistory();
  }, [clientId]);

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
        {(Array.isArray(item.totals?.custom) ? item.totals.custom : []).map(
          (tag: any) => (
            <View key={tag.id} style={styles.entryRow}>
              <Text style={{ color: colors.textSecondary }}>
                {tag.name || "Sem nome"}:
              </Text>
              <Text style={{ color: colors.text }}>
                {formatCurrencyUtil(Number(tag.value) || 0)}
              </Text>
            </View>
          ),
        )}
        {!Array.isArray(item.totals?.custom) && item.totals?.outros ? (
          <View style={styles.entryRow}>
            <Text style={{ color: colors.textSecondary }}>Outros:</Text>
            <Text style={{ color: colors.text }}>
              {formatCurrencyUtil(item.totals?.outros || 0)}
            </Text>
          </View>
        ) : null}
      </View>
    );
  };

  const sumCustomTags = (totals: any): number => {
    const custom = Array.isArray(totals?.custom) ? totals.custom : [];
    const customSum = custom.reduce(
      (sum: number, tag: any) => sum + (Number(tag?.value) || 0),
      0,
    );
    return customSum + (Number(totals?.outros) || 0);
  };

  const current =
    history && history.length > 0
      ? history[0].totals
      : { caixa: 0, ipca: 0, custom: [] };

  return (
    <Layout
      title="Investimentos (Visualização)"
      showBackButton={true}
      showSidebar={false}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          Investimentos do cliente
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
          {(Array.isArray(current.custom) ? current.custom : []).map(
            (tag: any) => (
              <View key={tag.id}>
                <Text style={{ color: colors.textSecondary }}>
                  {tag.name || "Sem nome"}
                </Text>
                <Text style={{ color: colors.text, fontWeight: "700" }}>
                  {formatCurrencyUtil(Number(tag.value) || 0)}
                </Text>
              </View>
            ),
          )}
          {!Array.isArray(current.custom) && current.outros ? (
            <View>
              <Text style={{ color: colors.textSecondary }}>Outros</Text>
              <Text style={{ color: colors.text, fontWeight: "700" }}>
                {formatCurrencyUtil(current.outros || 0)}
              </Text>
            </View>
          ) : null}
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
              .map((h) => {
                const outrosAtivos = sumCustomTags(h.totals);
                return {
                  date: new Date(h.date),
                  caixa: h.totals?.caixa || 0,
                  ipca: h.totals?.ipca || 0,
                  outros: outrosAtivos,
                  total:
                    (h.totals?.caixa || 0) +
                    (h.totals?.ipca || 0) +
                    outrosAtivos,
                };
              }) as InvPoint[]
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

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: colors.primary, marginTop: 16 },
          ]}
          onPress={() => navigate("ClientDetail", { clientId })}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>Voltar</Text>
        </TouchableOpacity>
      </View>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 18, fontWeight: "700" },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: "center",
  },
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
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
    marginTop: 12,
  },
});

export default ClientInvestmentsView;
