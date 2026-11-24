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

interface CustomTagInput {
  id: string;
  name: string;
  value: string;
}

const generateTagId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

/** Converte totals (novo formato "custom" ou legado "outros") em linhas editáveis do modal. */
const buildCustomTagInputsFromTotals = (
  totals: any,
): CustomTagInput[] => {
  const custom = Array.isArray(totals?.custom) ? totals.custom : [];
  if (custom.length > 0) {
    return custom.map((tag: any) => ({
      id: tag?.id || generateTagId(),
      name: tag?.name || "",
      value: applyCurrencyMask(
        String(Math.round((Number(tag?.value) || 0) * 100)),
      ),
    }));
  }
  // Compatibilidade com lançamentos antigos que usavam o campo fixo "Outros"
  if (totals?.outros) {
    return [
      {
        id: generateTagId(),
        name: "Outros",
        value: applyCurrencyMask(
          String(Math.round((Number(totals.outros) || 0) * 100)),
        ),
      },
    ];
  }
  return [];
};

/** Soma os ativos extras de um totals (custom novo + outros legado) para exibição/gráfico. */
const sumCustomTags = (totals: any): number => {
  const custom = Array.isArray(totals?.custom) ? totals.custom : [];
  const customSum = custom.reduce(
    (sum: number, tag: any) => sum + (Number(tag?.value) || 0),
    0,
  );
  return customSum + (Number(totals?.outros) || 0);
};

export const ClientInvestments: React.FC = () => {
  const { params, navigate } = useNavigation() as any;
  const { colors } = useTheme();
  const { user } = useAuth();
  const clientId: string = params?.clientId || "";

  const [caixa, setCaixa] = useState<string>("");
  const [ipca, setIpca] = useState<string>("");
  const [customTags, setCustomTags] = useState<CustomTagInput[]>([]);
  const [history, setHistory] = useState<Array<any>>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

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

  const handleAddCustomTag = () => {
    setCustomTags((prev) => [
      ...prev,
      { id: generateTagId(), name: "", value: "" },
    ]);
  };

  const handleChangeCustomTagName = (id: string, name: string) => {
    setCustomTags((prev) =>
      prev.map((tag) => (tag.id === id ? { ...tag, name } : tag)),
    );
  };

  const handleChangeCustomTagValue = (id: string, value: string) => {
    setCustomTags((prev) =>
      prev.map((tag) =>
        tag.id === id ? { ...tag, value: applyCurrencyMask(value) } : tag,
      ),
    );
  };

  const handleRemoveCustomTag = (id: string) => {
    setCustomTags((prev) => prev.filter((tag) => tag.id !== id));
  };

  const resetModalFields = () => {
    setCaixa("");
    setIpca("");
    setCustomTags([]);
    setEditingEntryId(null);
  };

  const handleDelete = (entryId: string) => {
    Alert.alert(
      "Excluir lançamento",
      "Tem certeza que deseja excluir este lançamento de investimentos? Essa ação não pode ser desfeita.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            if (!user || !user.id) {
              Alert.alert("Erro", "Usuário não autenticado");
              return;
            }
            try {
              await planningServices.deleteInvestmentsEntry(
                user.id,
                clientId,
                entryId,
              );
              await loadHistory();
              Alert.alert("Sucesso", "Lançamento excluído");
            } catch (e) {
              console.error("Erro ao excluir investimentos", e);
              Alert.alert("Erro", "Não foi possível excluir o lançamento");
            }
          },
        },
      ],
    );
  };

  const handleSave = async () => {
    if (!user || !user.id) {
      Alert.alert("Erro", "Usuário não autenticado");
      return;
    }
    try {
      const custom = customTags
        .filter((tag) => tag.name.trim().length > 0)
        .map((tag) => ({
          id: tag.id,
          name: tag.name.trim(),
          value: parseCurrency(tag.value),
        }));
      const totals = {
        caixa: parseCurrency(caixa),
        ipca: parseCurrency(ipca),
        custom,
      };
      if (editingEntryId) {
        await planningServices.updateInvestmentsEntry(
          user.id,
          clientId,
          editingEntryId,
          totals,
        );
      } else {
        await planningServices.addInvestmentsEntry(user.id, clientId, totals);
      }
      resetModalFields();
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
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={[styles.entryDate, { color: colors.text }]}>
            {date ? date.toLocaleString() : "-"}
          </Text>
          <View style={{ flexDirection: "row" }}>
            <TouchableOpacity
              onPress={() => {
                setEditingEntryId(item.id);
                setCaixa(
                  applyCurrencyMask(String(Math.round((item.totals?.caixa || 0) * 100))),
                );
                setIpca(
                  applyCurrencyMask(String(Math.round((item.totals?.ipca || 0) * 100))),
                );
                setCustomTags(buildCustomTagInputsFromTotals(item.totals));
                setModalVisible(true);
              }}
            >
              <Text style={{ color: colors.primary, fontWeight: "700" }}>
                Editar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ marginLeft: 16 }}
              onPress={() => handleDelete(item.id)}
            >
              <Text style={{ color: colors.danger || "#E53935", fontWeight: "700" }}>
                Excluir
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
        {(Array.isArray(item.totals?.custom) ? item.totals.custom : []).map(
          (tag: any) => (
            <View key={tag.id} style={styles.entryRow}>
              <Text style={{ color: colors.textSecondary }}>
                {tag.name || "Sem nome"}:
              </Text>
              <Text style={{ color: colors.text }}>
                {formatCurrency(Number(tag.value) || 0)}
              </Text>
            </View>
          ),
        )}
        {!Array.isArray(item.totals?.custom) && item.totals?.outros ? (
          <View style={styles.entryRow}>
            <Text style={{ color: colors.textSecondary }}>Outros:</Text>
            <Text style={{ color: colors.text }}>
              {formatCurrency(item.totals?.outros || 0)}
            </Text>
          </View>
        ) : null}
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
      : { caixa: 0, ipca: 0, custom: [] };

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

        <TouchableOpacity
          style={[styles.updateBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            // novo lançamento: inicia vazio (não é edição do atual)
            setCaixa("");
            setIpca("");
            setCustomTags([]);
            setEditingEntryId(null);
            setModalVisible(true);
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>Novo lançamento</Text>
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
                {editingEntryId ? "Editar lançamento" : "Novo lançamento"}
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

              <View style={{ marginTop: 16 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={[styles.label, { color: colors.textSecondary }]}
                  >
                    Outros ativos
                  </Text>
                  <TouchableOpacity
                    style={[
                      modalStyles.addTagBtn,
                      { borderColor: colors.primary },
                    ]}
                    onPress={handleAddCustomTag}
                  >
                    <Text
                      style={{ color: colors.primary, fontWeight: "700" }}
                    >
                      + Adicionar
                    </Text>
                  </TouchableOpacity>
                </View>

                {customTags.map((tag) => (
                  <View key={tag.id} style={modalStyles.customTagRow}>
                    <TextInput
                      style={[
                        styles.input,
                        modalStyles.customTagNameInput,
                        {
                          backgroundColor: colors.inputBackground,
                          color: colors.text,
                        },
                      ]}
                      placeholder="Nome (ex: Tesouro)"
                      placeholderTextColor={colors.textSecondary}
                      value={tag.name}
                      onChangeText={(t) =>
                        handleChangeCustomTagName(tag.id, t)
                      }
                    />
                    <TextInput
                      style={[
                        styles.input,
                        modalStyles.customTagValueInput,
                        {
                          backgroundColor: colors.inputBackground,
                          color: colors.text,
                        },
                      ]}
                      placeholder="Valor"
                      placeholderTextColor={colors.textSecondary}
                      value={tag.value}
                      onChangeText={(t) =>
                        handleChangeCustomTagValue(tag.id, t)
                      }
                      keyboardType="numeric"
                    />
                    <TouchableOpacity
                      style={modalStyles.removeTagBtn}
                      onPress={() => handleRemoveCustomTag(tag.id)}
                    >
                      <Text
                        style={{
                          color: colors.danger || "#E53935",
                          fontWeight: "700",
                        }}
                      >
                        Remover
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}

                {customTags.length === 0 ? (
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 12,
                      marginTop: 6,
                    }}
                  >
                    Nenhum ativo extra. Toque em "+ Adicionar" para incluir
                    (ex: Tesouro, Ações, Cripto).
                  </Text>
                ) : null}
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
                  onPress={() => {
                    resetModalFields();
                    setModalVisible(false);
                  }}
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
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
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
  addTagBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  customTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  customTagNameInput: { flex: 1.2 },
  customTagValueInput: { flex: 1 },
  removeTagBtn: { paddingHorizontal: 4, paddingVertical: 6 },
});

export default ClientInvestments;
