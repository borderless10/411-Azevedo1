import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Layout } from "../../components/Layout/Layout";
import { useNavigation } from "../../routes/NavigationContext";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../contexts/ThemeContext";
import installmentPurchaseServices from "../../services/installmentPurchaseServices";
import { creditCardServices } from "../../services/creditCardServices";
import { CreditCard } from "../../types/creditCard";
import { InstallmentPurchase } from "../../types/installmentPurchase";
import {
  applyCurrencyMask,
  formatCurrency,
  parseCurrency,
} from "../../utils/currencyUtils";
import DatePicker from "../../components/DatePicker";

export const ClientInstallmentsScreen: React.FC = () => {
  const { params, navigate } = useNavigation() as any;
  const { user } = useAuth();
  const { colors } = useTheme();
  const clientId: string = params?.clientId || "";

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<InstallmentPurchase[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<InstallmentPurchase | null>(
    null,
  );
  const [title, setTitle] = useState("");
  const [totalText, setTotalText] = useState("");
  const [installmentText, setInstallmentText] = useState("");
  const [installmentsCount, setInstallmentsCount] = useState("1");
  const [purchaseDate, setPurchaseDate] = useState(new Date());
  const [cardId, setCardId] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    if (!clientId) return;
    try {
      setLoading(true);
      const [list, cardList] = await Promise.all([
        installmentPurchaseServices.listForUser(clientId),
        creditCardServices.getCreditCards(clientId),
      ]);
      setItems(list);
      const active = cardList.filter((c) => c.isActive !== false);
      setCards(active);
      if (!cardId && active[0]?.id) setCardId(active[0].id);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [clientId]);

  useEffect(() => {
    const count = parseInt(installmentsCount, 10);
    const total = parseCurrency(totalText);
    if (!Number.isFinite(count) || count < 1 || total <= 0) {
      setInstallmentText("");
      return;
    }
    setInstallmentText(formatCurrency(total / count));
  }, [totalText, installmentsCount]);

  const cardLabel = (id?: string) => {
    if (!id) return "Cartão não informado";
    const card = cards.find((c) => c.id === id);
    if (!card) return "Cartão removido";
    return `${card.bank} ····${card.last4}`;
  };

  const resetForm = () => {
    setEditingItem(null);
    setTitle("");
    setTotalText("");
    setInstallmentText("");
    setInstallmentsCount("1");
    setPurchaseDate(new Date());
    setCardId(cards[0]?.id || "");
  };

  const openCreate = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEdit = (item: InstallmentPurchase) => {
    setEditingItem(item);
    setTitle(item.title);
    setTotalText(formatCurrency(item.totalAmount));
    setInstallmentsCount(String(item.installmentsCount));
    setInstallmentText(formatCurrency(item.installmentAmount));
    setPurchaseDate(new Date(item.purchaseDate));
    setCardId(item.cardId || cards[0]?.id || "");
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    resetForm();
  };

  const handleSave = async () => {
    if (!user?.id) return;
    const count = parseInt(installmentsCount, 10);
    if (!title.trim()) {
      Alert.alert("Atenção", "Informe o título da compra.");
      return;
    }
    if (!cardId) {
      Alert.alert("Atenção", "Selecione um cartão.");
      return;
    }
    const total = parseCurrency(totalText);
    const installmentAmount = parseCurrency(installmentText);
    if (total <= 0 || !Number.isFinite(count) || count < 1) {
      Alert.alert("Atenção", "Valor total e parcelas inválidos.");
      return;
    }
    if (installmentAmount <= 0) {
      Alert.alert("Atenção", "O valor da parcela é obrigatório.");
      return;
    }

    const payload = {
      title: title.trim(),
      purchaseDate,
      totalAmount: total,
      installmentAmount,
      cardId,
      installmentsCount: count,
    };

    try {
      setSaving(true);
      if (editingItem?.id) {
        await installmentPurchaseServices.update(
          editingItem.id,
          clientId,
          payload,
        );
      } else {
        await installmentPurchaseServices.create(user.id, clientId, payload);
      }
      closeModal();
      await load();
      Alert.alert(
        "Sucesso",
        editingItem
          ? "Compra parcelada atualizada. As parcelas no cartão foram sincronizadas."
          : "Compra parcelada registrada e despesas geradas no cartão.",
      );
    } catch (e: any) {
      Alert.alert("Erro", e?.message || "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item: InstallmentPurchase) => {
    Alert.alert(
      "Excluir compra parcelada",
      `Remover "${item.title}" e as ${item.installmentsCount} parcelas geradas no cartão?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              setDeletingId(item.id);
              await installmentPurchaseServices.remove(item.id, clientId);
              if (editingItem?.id === item.id) closeModal();
              await load();
            } catch (e: any) {
              Alert.alert("Erro", e?.message || "Falha ao excluir.");
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  return (
    <Layout title="Compras parceladas" showBackButton showSidebar={false}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[styles.primary, { backgroundColor: colors.primary }]}
          onPress={openCreate}
        >
          <Text style={styles.primaryText}>Nova compra parcelada</Text>
        </TouchableOpacity>

        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          refreshing={loading}
          onRefresh={load}
          ListEmptyComponent={
            <Text style={{ color: colors.textSecondary, marginTop: 16 }}>
              {loading ? "Carregando..." : "Nenhum parcelamento"}
            </Text>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, { borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {item.title}
              </Text>
              <Text style={{ color: colors.textSecondary }}>
                {formatCurrency(item.installmentAmount)} ·{" "}
                {item.remainingInstallments}/{item.installmentsCount} restantes
              </Text>
              <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
                Cartão: {cardLabel(item.cardId)}
              </Text>
              <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
                Início:{" "}
                {new Date(item.purchaseDate).toLocaleDateString("pt-BR")}
                {" · "}
                Total {formatCurrency(item.totalAmount)}
              </Text>
              <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
                {item.createdBy && item.createdBy === clientId
                  ? "Registrado pelo cliente"
                  : "Registrado pela equipe"}
              </Text>

              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: colors.primary }]}
                  onPress={() => openEdit(item)}
                  disabled={deletingId === item.id}
                >
                  <Ionicons name="create-outline" size={16} color={colors.primary} />
                  <Text style={[styles.actionText, { color: colors.primary }]}>
                    Editar
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.deleteBtn]}
                  onPress={() => handleDelete(item)}
                  disabled={deletingId === item.id}
                >
                  {deletingId === item.id ? (
                    <ActivityIndicator size="small" color="#ff6b6b" />
                  ) : (
                    <>
                      <Ionicons name="trash-outline" size={16} color="#ff6b6b" />
                      <Text style={[styles.actionText, { color: "#ff6b6b" }]}>
                        Excluir
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        />

        <TouchableOpacity
          style={styles.backLink}
          onPress={() => navigate("ClientDetail", { clientId })}
        >
          <Text style={{ color: colors.primary, fontWeight: "700" }}>
            Voltar ao cliente
          </Text>
        </TouchableOpacity>

        {modalVisible ? (
          <View style={styles.overlay}>
            <TouchableOpacity
              style={styles.overlayDismiss}
              activeOpacity={1}
              onPress={closeModal}
            />
            <View style={[styles.modal, { backgroundColor: colors.card }]}>
              <ScrollView keyboardShouldPersistTaps="handled">
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {editingItem
                    ? "Editar parcelamento"
                    : "Registrar parcelamento"}
                </Text>
                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Título"
                  placeholderTextColor="#888"
                />
                <DatePicker
                  label="Data da compra"
                  date={purchaseDate}
                  onChangeDate={setPurchaseDate}
                  maxDate={new Date()}
                />
                <TextInput
                  style={styles.input}
                  value={totalText}
                  onChangeText={(t) => setTotalText(applyCurrencyMask(t))}
                  placeholder="Valor total"
                  keyboardType="numeric"
                />
                <TextInput
                  style={styles.input}
                  value={installmentsCount}
                  onChangeText={(t) =>
                    setInstallmentsCount(t.replace(/[^0-9]/g, ""))
                  }
                  placeholder="Nº de parcelas"
                  keyboardType="number-pad"
                />
                <Text style={{ color: colors.textSecondary, marginBottom: 6 }}>
                  Valor da parcela
                </Text>
                <View style={styles.computedBox}>
                  <Text
                    style={{
                      color: installmentText ? colors.primary : "#888",
                      fontWeight: installmentText ? "800" : "400",
                      fontSize: installmentText ? 16 : 14,
                    }}
                  >
                    {installmentText || "Preencha o total e as parcelas"}
                  </Text>
                </View>
                <Text style={{ color: colors.textSecondary, marginBottom: 6 }}>
                  Cartão
                </Text>
                <View style={styles.cardRow}>
                  {cards.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={[
                        styles.cardChip,
                        cardId === c.id && styles.cardChipActive,
                      ]}
                      onPress={() => setCardId(c.id)}
                    >
                      <Text
                        style={{
                          color: cardId === c.id ? "#fff" : colors.text,
                          fontSize: 12,
                        }}
                      >
                        {`${c.bank} ····${c.last4}`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {editingItem ? (
                  <Text style={[styles.editHint, { color: colors.textSecondary }]}>
                    Ao salvar, as parcelas antigas no cartão são substituídas
                    pelas novas.
                  </Text>
                ) : null}
                <View style={styles.modalActions}>
                  <TouchableOpacity onPress={closeModal}>
                    <Text style={{ color: colors.textSecondary }}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                    onPress={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={{ color: "#fff", fontWeight: "700" }}>
                        {editingItem ? "Atualizar" : "Salvar"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        ) : null}
      </View>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  primary: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryText: { color: "#fff", fontWeight: "700" },
  card: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  cardTitle: { fontWeight: "700", fontSize: 15 },
  cardActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deleteBtn: {
    borderColor: "#ff6b6b",
  },
  actionText: {
    fontWeight: "700",
    fontSize: 13,
  },
  backLink: { marginTop: 16, alignItems: "center" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 16,
    zIndex: 50,
  },
  overlayDismiss: {
    ...StyleSheet.absoluteFillObject,
  },
  modal: { borderRadius: 12, padding: 16, maxHeight: "90%", zIndex: 2 },
  modalTitle: { fontWeight: "700", fontSize: 16, marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    color: "#fff",
  },
  computedBox: {
    borderWidth: 1,
    borderColor: "#B900FF",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  cardRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  cardChip: {
    borderWidth: 1,
    borderColor: "#444",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cardChipActive: { backgroundColor: "#B900FF", borderColor: "#B900FF" },
  editHint: {
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 16,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  saveBtn: { borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 },
});

export default ClientInstallmentsScreen;
