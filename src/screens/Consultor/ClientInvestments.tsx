import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  Modal,
} from "react-native";
import { Layout } from "../../components/Layout/Layout";
import { useNavigation } from "../../routes/NavigationContext";
import { useTheme } from "../../contexts/ThemeContext";
import { planningServices } from "../../services/planningServices";
import { useAuth } from "../../hooks/useAuth";
import {
  applyCurrencyMask,
  parseCurrency,
  formatCurrency as formatCurrencyUtil,
} from "../../utils/currencyUtils";
import InvestmentsLineChart, {
  InvPoint,
} from "../../components/Charts/InvestmentsLineChart";

export const ClientInvestments: React.FC = () => {
  const { params, navigate } = useNavigation() as any;
  const { colors } = useTheme();
  const { user } = useAuth();
  const clientId: string = params?.clientId || "";

  const [caixa, setCaixa] = useState<string>("");
  const [ipca, setIpca] = useState<string>("");
  const [outros, setOutros] = useState<string>("");
  const [history, setHistory] = useState<Array<any>>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [modalVisible, setModalVisible] = useState<boolean>(false);

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

  const parseNumber = (s: string) => {
    const n = parseFloat(
      String(s)
        .replace(/[^0-9.,-]/g, "")
        .replace(",", "."),
    );
    return Number.isNaN(n) ? 0 : n;
  };

  const handleSave = async () => {
    if (!user || !user.id) {
      Alert.alert("Erro", "Usuário não autenticado");
      return;
    }
    try {
      const totals = {
        caixa: parseCurrency(caixa),
        ipca: parseCurrency(ipca),
        outros: parseCurrency(outros),
      };
      await planningServices.addInvestmentsEntry(user.id, clientId, totals);
      setCaixa("");
      setIpca("");
      setOutros("");
      await loadHistory();
      Alert.alert("Sucesso", "Investimentos registrados");
      setModalVisible(false);
    } catch (e) {
      console.error("Erro ao salvar investimentos", e);
      Alert.alert("Erro", "Não foi possível salvar os investimentos");
    }
  };

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
            {formatCurrency(item.totals?.caixa || 0)}
          </Text>
        </View>
        <View style={styles.entryRow}>
          <Text style={{ color: colors.textSecondary }}>IPCA:</Text>
          <Text style={{ color: colors.text }}>
            {formatCurrency(item.totals?.ipca || 0)}
          </Text>
        </View>
        <View style={styles.entryRow}>
          <Text style={{ color: colors.textSecondary }}>Outros:</Text>
          <Text style={{ color: colors.text }}>
            {formatCurrency(item.totals?.outros || 0)}
          </Text>
        </View>
      </View>
    );
  };

  const formatCurrency = (v: number) => {
    try {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(v);
    } catch (e) {
      return v.toFixed(2);
    }
  };

  const current =
    history && history.length > 0
      ? history[0].totals
      : { caixa: 0, ipca: 0, outros: 0 };

  return (
    <Layout title="Investimentos" showBackButton={true} showSidebar={false}>
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
          <View>
            <Text style={{ color: colors.textSecondary }}>Outros</Text>
            <Text style={{ color: colors.text, fontWeight: "700" }}>
              {formatCurrencyUtil(current.outros || 0)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.updateBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            // prefill modal inputs with current formatted values
            setCaixa(
              applyCurrencyMask(String(Math.round((current.caixa || 0) * 100))),
            );
            setIpca(
              applyCurrencyMask(String(Math.round((current.ipca || 0) * 100))),
            );
            setOutros(
              applyCurrencyMask(
                String(Math.round((current.outros || 0) * 100)),
              ),
            );
            setModalVisible(true);
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>Atualizar</Text>
        </TouchableOpacity>

        <Text
          style={[styles.historyTitle, { color: colors.text, marginTop: 16 }]}
        >
          Evolução
        </Text>
        {/* chart uses history converted to ascending order */}
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

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: colors.primary, marginTop: 16 },
          ]}
          onPress={() => navigate("ClientDetail", { clientId })}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>Voltar</Text>
        </TouchableOpacity>

        <Modal visible={modalVisible} animationType="slide" transparent>
          <View
            style={[
              modalStyles.overlay,
              { backgroundColor: "rgba(0,0,0,0.5)" },
            ]}
          >
            <View
              style={[
                modalStyles.modal,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[modalStyles.modalTitle, { color: colors.text }]}>
                Atualizar Investimentos
              </Text>

              <View style={{ marginTop: 8 }}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Caixa
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.inputBackground,
                      color: colors.text,
                    },
                  ]}
                  value={caixa}
                  onChangeText={(t) => setCaixa(applyCurrencyMask(t))}
                  keyboardType="numeric"
                />
              </View>

              <View style={{ marginTop: 8 }}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  IPCA
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.inputBackground,
                      color: colors.text,
                    },
                  ]}
                  value={ipca}
                  onChangeText={(t) => setIpca(applyCurrencyMask(t))}
                  keyboardType="numeric"
                />
              </View>

              <View style={{ marginTop: 8 }}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Outros
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.inputBackground,
                      color: colors.text,
                    },
                  ]}
                  value={outros}
                  onChangeText={(t) => setOutros(applyCurrencyMask(t))}
                  keyboardType="numeric"
                />
              </View>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginTop: 12,
                }}
              >
                <TouchableOpacity
                  style={[
                    modalStyles.modalBtn,
                    { backgroundColor: colors.border },
                  ]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text
                    style={[modalStyles.modalBtnText, { color: colors.text }]}
                  >
                    Cancelar
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    modalStyles.modalBtn,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={handleSave}
                >
                  <Text style={[modalStyles.modalBtnText, { color: "#fff" }]}>
                    Salvar
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
  formRow: { marginTop: 12 },
  label: { fontSize: 13, marginBottom: 6 },
  input: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 },
  saveBtn: {
    marginTop: 12,
    paddingVertical: 12,
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
    justifyContent: "space-between",
    marginTop: 12,
  },
  updateBtn: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "center", alignItems: "center" },
  modal: { width: "92%", borderRadius: 12, padding: 12, borderWidth: 1 },
  modalTitle: { fontSize: 16, fontWeight: "700" },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 120,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 6,
  },
  modalBtnText: { fontWeight: "700" },
});

export default ClientInvestments;
