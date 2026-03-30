import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Layout } from "../../components/Layout/Layout";
import { useAuth } from "../../hooks/useAuth";
import { useNavigation } from "../../routes/NavigationContext";
import { wishlistServices } from "../../services/wishlistServices";
import { formatCurrency } from "../../utils/currencyUtils";
import { WishlistItem, CreateWishlistData } from "../../types/wishlist";

export const WishlistScreen = () => {
  const { user } = useAuth();
  const { params } = useNavigation() as any;
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);

  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadItems();
  }, [params?.clientId, user]);

  useEffect(() => {
    if (!loading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [loading]);

  const loadItems = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const ownerId =
        params?.clientId && user.role === "consultor"
          ? params.clientId
          : user.id;
      const fetched = await wishlistServices.getWishlist(ownerId);
      setItems(fetched);
    } catch (error) {
      console.error("❌ Erro ao carregar wishlist:", error);
      Alert.alert("Erro", "Não foi possível carregar a lista de desejos");
    } finally {
      setLoading(false);
    }
  };

  const ownerId =
    params?.clientId && user?.role === "consultor" ? params.clientId : user?.id;

  const openCreate = () => {
    // disable create when viewing client's wishlist
    if (ownerId && ownerId !== user?.id) return;
    setIsEditing(false);
    setEditingItem(null);
    setName("");
    setValue("");
    setDescription("");
    setShowCreateModal(true);
  };

  const openEdit = (item: WishlistItem) => {
    // disable edit when viewing client's wishlist
    if (ownerId && ownerId !== user?.id) return;
    setIsEditing(true);
    setEditingItem(item);
    setName(item.name || "");
    setValue(String(item.value || ""));
    setDescription(item.description || "");
    setShowCreateModal(true);
  };

  const handleSave = async () => {
    if (!user) return;
    const numericValue = parseFloat(
      value.replace(/[^0-9.,]/g, "").replace(",", "."),
    );
    if (!name.trim()) {
      Alert.alert("Erro", "Digite um nome");
      return;
    }
    if (!numericValue || numericValue <= 0) {
      Alert.alert("Erro", "Digite um valor válido");
      return;
    }

    try {
      setSaving(true);
      const data: CreateWishlistData = {
        name: name.trim(),
        value: numericValue,
        description: description.trim() || undefined,
      };
      if (isEditing && editingItem) {
        await wishlistServices.updateWishlist(editingItem.id, data);
        Alert.alert("Sucesso", "Item atualizado");
      } else {
        await wishlistServices.createWishlist(user.id, data);
        Alert.alert("Sucesso", "Item adicionado");
      }
      setShowCreateModal(false);
      await loadItems();
    } catch (error: any) {
      console.error("❌ Erro ao salvar wishlist:", error);
      Alert.alert("Erro", error.message || "Não foi possível salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item: WishlistItem) => {
    Alert.alert("Confirmar exclusão", `Deseja remover "${item.name}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: async () => {
          try {
            await wishlistServices.deleteWishlist(item.id);
            Alert.alert("Sucesso", "Item removido");
            await loadItems();
          } catch (error) {
            console.error("❌ Erro ao remover item:", error);
            Alert.alert("Erro", "Não foi possível remover o item");
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <Layout
        title="Lista de Desejos"
        showBackButton={false}
        showSidebar={true}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff4d6d" />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </Layout>
    );
  }

  const showBack = params?.clientId && user?.role === "consultor";

  return (
    <Layout
      title="Lista de Desejos"
      showBackButton={showBack}
      showSidebar={!showBack}
    >
      <ScrollView style={styles.container}>
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={styles.header}>
            <Ionicons name="heart" size={64} color="#ff4d6d" />
            <Text style={styles.title}>Lista de Desejos</Text>
            <Text style={styles.subtitle}>
              Salve itens que você deseja comprar
            </Text>
          </View>

          <TouchableOpacity style={styles.createButton} onPress={openCreate}>
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.createButtonText}>Adicionar Desejo</Text>
          </TouchableOpacity>

          {items.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="heart-outline" size={64} color="#666" />
              <Text style={styles.emptyText}>Nenhum desejo ainda</Text>
              <Text style={styles.emptySubtext}>
                Adicione itens que você gostaria de comprar
              </Text>
            </View>
          ) : (
            <View style={styles.list}>
              {items.map((item) => (
                <View key={item.id} style={styles.card}>
                  <View style={styles.cardLeft}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemDesc}>{item.description}</Text>
                    <Text style={styles.itemValue}>
                      {formatCurrency(item.value)}
                    </Text>
                  </View>

                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => openEdit(item)}
                    >
                      <Ionicons name="pencil" size={18} color="#8c52ff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => handleDelete(item)}
                    >
                      <Ionicons name="trash" size={18} color="#ff4d6d" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreateModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalOverlayTouchable}
            activeOpacity={1}
            onPress={() => setShowCreateModal(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isEditing ? "Editar Desejo" : "Novo Desejo"}
              </Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.label}>Nome</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Ex: Notebook"
                placeholderTextColor="#666"
              />

              <Text style={styles.label}>Valor</Text>
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={setValue}
                placeholder="0,00"
                placeholderTextColor="#666"
                keyboardType="numeric"
              />

              <Text style={styles.label}>Descrição (opcional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Detalhes..."
                placeholderTextColor="#666"
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>
                    {isEditing ? "Salvar" : "Adicionar"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#000" },
  loadingContainer: {
    height: 300,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
  },
  loadingText: { marginTop: 8, color: "#999" },
  header: { alignItems: "center", marginBottom: 12 },
  title: { fontSize: 20, fontWeight: "700", marginTop: 8, color: "#fff" },
  subtitle: { color: "#999", marginTop: 4 },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ff4d6d",
    padding: 12,
    borderRadius: 8,
    marginVertical: 12,
  },
  createButtonText: { color: "#fff", fontWeight: "700" },
  emptyState: { alignItems: "center", marginTop: 40 },
  emptyText: { fontSize: 16, marginTop: 8 },
  emptySubtext: { color: "#666", marginTop: 4 },
  list: { marginTop: 8 },
  card: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardLeft: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: "700", color: "#fff", marginBottom: 4 },
  itemDesc: { color: "#ccc", marginTop: 4 },
  itemValue: { marginTop: 6, fontWeight: "700", color: "#8c52ff" },
  cardActions: { flexDirection: "row", gap: 8 },
  iconButton: { padding: 8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "flex-end",
  },
  modalOverlayTouchable: { flex: 1 },
  modalContent: {
    backgroundColor: "#1a1a1a",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#fff" },
  modalBody: { padding: 20 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 8,
    marginTop: 16,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0a0a0a",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#fff",
    paddingVertical: 12,
    backgroundColor: "#0a0a0a",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    paddingHorizontal: 12,
  },
  textArea: { minHeight: 80, textAlignVertical: "top" },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#8c52ff",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: "#fff", fontWeight: "700" },
});
