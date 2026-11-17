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
  Modal,
} from "react-native";
import { Layout } from "../../components/Layout/Layout";
import { useNavigation } from "../../routes/NavigationContext";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../contexts/ThemeContext";
import installmentPurchaseServices from "../../services/installmentPurchaseServices";
import { creditCardServices } from "../../services/creditCardServices";
import { CreditCard } from "../../types/creditCard";
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
  const [items, setItems] = useState<any[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [totalText, setTotalText] = useState("");
  const [installmentText, setInstallmentText] = useState("");
  const [installmentsCount, setInstallmentsCount] = useState("1");
  const [purchaseDate, setPurchaseDate] = useState(new Date());
  const [cardId, setCardId] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!clientId) return;
    try {
      setLoading(true);
      const [list, cardList] = await Promise.all([
        installmentPurchaseServices.listForUser(clientId),
        creditCardServices.getCreditCards(clientId),
      ]);
      setItems(list);
      setCards(cardList.filter((c) => c.isActive !== false));
      if (!cardId && cardList[0]?.id) setCardId(cardList[0].id);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [clientId]);

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
    if (total <= 0 || count < 1) {
      Alert.alert("Atenção", "Valor total e parcelas inválidos.");
      return;
    }
    try {
      setSaving(true);
      await installmentPurchaseServices.create(user.id, clientId, {
        title: title.trim(),
        purchaseDate,
        totalAmount: total,
        installmentAmount: parseCurrency(installmentText) || total / count,
        cardId,
        installmentsCount: count,
      });
      setModalVisible(false);
      setTitle("");
      setTotalText("");
      setInstallmentText("");
      setInstallmentsCount("1");
      await load();
      Alert.alert(
        "Sucesso",
        "Compra parcelada registrada e despesas geradas no cartão.",
      );
    } catch (e: any) {
      Alert.alert("Erro", e?.message || "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout title="Compras parceladas" showBackButton showSidebar={false}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[styles.primary, { backgroundColor: colors.primary }]}
          onPress={() => setModalVisible(true)}
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
                Início:{" "}
                {new Date(item.purchaseDate).toLocaleDateString("pt-BR")}
              </Text>
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

        <Modal visible={modalVisible} transparent animationType="slide">
          <View style={styles.overlay}>
            <View style={[styles.modal, { backgroundColor: colors.card }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Registrar parcelamento
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
                value={installmentText}
                onChangeText={(t) => setInstallmentText(applyCurrencyMask(t))}
                placeholder="Valor da parcela (opcional)"
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                value={installmentsCount}
                onChangeText={setInstallmentsCount}
                placeholder="Nº de parcelas"
                keyboardType="number-pad"
              />
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
              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
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
                      Salvar
                    </Text>
                  )}
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
  backLink: { marginTop: 16, alignItems: "center" },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 16,
  },
  modal: { borderRadius: 12, padding: 16 },
  modalTitle: { fontWeight: "700", fontSize: 16, marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    color: "#fff",
  },
  cardRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  cardChip: {
    borderWidth: 1,
    borderColor: "#444",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cardChipActive: { backgroundColor: "#8c52ff", borderColor: "#8c52ff" },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  saveBtn: { borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 },
});

export default ClientInstallmentsScreen;