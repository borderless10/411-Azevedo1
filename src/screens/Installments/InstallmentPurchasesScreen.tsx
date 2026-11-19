/**
 * Compra parcelada do cliente.
 * Mesmos campos do fluxo do consultor; grava na mesma coleção
 * para o consultor ver no perfil do cliente.
 */
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
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Layout } from "../../components/Layout/Layout";
import { useNavigation } from "../../routes/NavigationContext";
import { useAuth } from "../../hooks/useAuth";
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

export const InstallmentPurchasesScreen: React.FC = () => {
  const { user } = useAuth();
  const { navigate } = useNavigation();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InstallmentPurchase[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [totalText, setTotalText] = useState("");
  const [installmentText, setInstallmentText] = useState("");
  const [installmentsCount, setInstallmentsCount] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date());
  const [cardId, setCardId] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const [list, cardList] = await Promise.all([
        installmentPurchaseServices.listForUser(user.id),
        creditCardServices.getCreditCards(user.id),
      ]);
      const active = cardList.filter((c) => c.isActive !== false);
      setItems(list);
      setCards(active);
      setCardId((current) => current || active[0]?.id || "");
    } catch (error) {
      console.error(error);
      Alert.alert("Erro", "Não foi possível carregar as compras parceladas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  const cardLabel = (id: string) => {
    const card = cards.find((c) => c.id === id);
    if (!card) return "Cartão";
    return `${card.bank} ····${card.last4}`;
  };

  useEffect(() => {
    const count = parseInt(installmentsCount, 10);
    const total = parseCurrency(totalText);
    if (!Number.isFinite(count) || count < 1 || total <= 0) {
      setInstallmentText("");
      return;
    }
    setInstallmentText(formatCurrency(total / count));
  }, [totalText, installmentsCount]);

  const resetForm = () => {
    setTitle("");
    setTotalText("");
    setInstallmentText("");
    setInstallmentsCount("");
    setPurchaseDate(new Date());
    setCardId(cards[0]?.id || "");
  };

  const handleSave = async () => {
    if (!user?.id || saving) return;
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
      Alert.alert("Atenção", "Informe o valor total e o número de parcelas.");
      return;
    }
    if (installmentAmount <= 0) {
      Alert.alert("Atenção", "O valor da parcela é obrigatório.");
      return;
    }
    try {
      setSaving(true);
      await installmentPurchaseServices.create(user.id, user.id, {
        title: title.trim(),
        purchaseDate,
        totalAmount: total,
        installmentAmount,
        cardId,
        installmentsCount: count,
      });
      setModalVisible(false);
      resetForm();
      await load();
      Alert.alert(
        "Compra registrada",
        "O parcelamento foi salvo. Seu consultor já consegue ver no seu perfil.",
      );
    } catch (error: any) {
      Alert.alert("Erro", error?.message || "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout title="Compra parcelada">
      <View style={styles.container}>
        <View style={styles.intro}>
          <Ionicons name="card" size={22} color="#B900FF" />
          <Text style={styles.introText}>
            Registre uma compra no cartão. As parcelas entram nos seus gastos e
            o consultor vê no seu perfil.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.primary}
          onPress={() => {
            if (!cards.length) {
              Alert.alert(
                "Cadastre um cartão",
                "Para parcelar, primeiro adicione um cartão.",
                [
                  { text: "Agora não", style: "cancel" },
                  {
                    text: "Ir para cartões",
                    onPress: () => navigate("Cartoes"),
                  },
                ],
              );
              return;
            }
            setModalVisible(true);
          }}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.primaryText}>Nova compra parcelada</Text>
        </TouchableOpacity>

        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          refreshing={loading}
          onRefresh={load}
          contentContainerStyle={items.length === 0 ? styles.emptyList : undefined}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {loading ? "Carregando..." : "Nenhuma compra parcelada ainda"}
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.cardAmount}>
                  {formatCurrency(item.installmentAmount)}
                </Text>
              </View>
              <Text style={styles.cardMeta}>
                {item.remainingInstallments}/{item.installmentsCount} parcelas
                restantes · total {formatCurrency(item.totalAmount)}
              </Text>
              <Text style={styles.cardMeta}>
                {cardLabel(item.cardId)} · início{" "}
                {new Date(item.purchaseDate).toLocaleDateString("pt-BR")}
              </Text>
            </View>
          )}
        />

        {modalVisible ? (
          <KeyboardAvoidingView
            style={styles.overlay}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <TouchableOpacity
              style={styles.overlayDismiss}
              activeOpacity={1}
              onPress={() => setModalVisible(false)}
            />
            <View style={styles.modal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Nova compra parcelada</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={22} color="#fff" />
                </TouchableOpacity>
              </View>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalBody}
              >
                <Text style={styles.label}>Título</Text>
                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Ex.: Geladeira"
                  placeholderTextColor="#777"
                />

                <DatePicker
                  label="Data da compra"
                  date={purchaseDate}
                  onChangeDate={setPurchaseDate}
                  maxDate={new Date()}
                />

                <Text style={styles.label}>Valor total</Text>
                <TextInput
                  style={styles.input}
                  value={totalText}
                  onChangeText={(text) => setTotalText(applyCurrencyMask(text))}
                  placeholder="R$ 0,00"
                  placeholderTextColor="#777"
                  keyboardType="numeric"
                />

                <Text style={styles.label}>Número de parcelas</Text>
                <TextInput
                  style={styles.input}
                  value={installmentsCount}
                  onChangeText={(text) =>
                    setInstallmentsCount(text.replace(/[^0-9]/g, ""))
                  }
                  placeholder="Ex.: 12"
                  placeholderTextColor="#777"
                  keyboardType="number-pad"
                />

                <Text style={styles.label}>Valor da parcela</Text>
                <View style={styles.computedBox}>
                  <Text
                    style={
                      installmentText
                        ? styles.computedValue
                        : styles.computedPlaceholder
                    }
                  >
                    {installmentText || "Preencha o total e as parcelas"}
                  </Text>
                </View>
                <Text style={styles.computedHint}>
                  Calculado automaticamente: valor total ÷ número de parcelas.
                </Text>

                <Text style={styles.label}>Cartão</Text>
                <View style={styles.cardRow}>
                  {cards.map((card) => {
                    const active = cardId === card.id;
                    return (
                      <TouchableOpacity
                        key={card.id}
                        style={[styles.cardChip, active && styles.cardChipActive]}
                        onPress={() => setCardId(card.id)}
                      >
                        <Text
                          style={[
                            styles.cardChipText,
                            active && styles.cardChipTextActive,
                          ]}
                        >
                          {`${card.bank} ····${card.last4}`}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity
                  style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>Salvar</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        ) : null}
      </View>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  intro: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    backgroundColor: "#171321",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    padding: 14,
    marginBottom: 12,
  },
  introText: { flex: 1, color: "#ccc", fontSize: 13, lineHeight: 18 },
  primary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#B900FF",
    borderRadius: 10,
    paddingVertical: 12,
    marginBottom: 12,
  },
  primaryText: { color: "#fff", fontWeight: "700" },
  emptyList: { paddingTop: 24 },
  empty: { color: "#a89fc0", textAlign: "center" },
  card: {
    backgroundColor: "#171321",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  cardTitle: { flex: 1, color: "#fff", fontWeight: "700", fontSize: 15 },
  cardAmount: { color: "#B900FF", fontWeight: "800" },
  cardMeta: { color: "#999", fontSize: 12, marginTop: 4 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
    zIndex: 50,
  },
  overlayDismiss: { flex: 1 },
  modal: {
    backgroundColor: "#120c18",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: "92%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  modalTitle: { color: "#fff", fontSize: 17, fontWeight: "700" },
  modalBody: { padding: 16, paddingBottom: 28 },
  label: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#fff",
    backgroundColor: "#0c0a12",
  },
  computedBox: {
    borderWidth: 1,
    borderColor: "rgba(185,0,255,0.45)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "rgba(185,0,255,0.08)",
  },
  computedValue: {
    color: "#B900FF",
    fontSize: 18,
    fontWeight: "800",
  },
  computedPlaceholder: {
    color: "#777",
    fontSize: 14,
  },
  computedHint: {
    color: "#888",
    fontSize: 12,
    marginTop: 6,
  },
  cardRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  cardChip: {
    borderWidth: 1,
    borderColor: "#444",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  cardChipActive: { backgroundColor: "#B900FF", borderColor: "#B900FF" },
  cardChipText: { color: "#ddd", fontSize: 12 },
  cardChipTextActive: { color: "#fff", fontWeight: "700" },
  saveBtn: {
    marginTop: 18,
    backgroundColor: "#B900FF",
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 12,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "#fff", fontWeight: "700" },
});

export default InstallmentPurchasesScreen;
