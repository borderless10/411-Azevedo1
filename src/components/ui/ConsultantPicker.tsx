import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  StyleSheet,
} from "react-native";

type User = {
  id: string;
  name?: string;
  email?: string;
};

type Props = {
  consultants: User[];
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
};

export const ConsultantPicker: React.FC<Props> = ({
  consultants,
  value,
  onChange,
  placeholder = "Selecione um consultor",
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return consultants;
    return consultants.filter((c) => {
      const name = (c.name || "").toLowerCase();
      const email = (c.email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [consultants, query]);

  // Log when consultants list changes
  React.useEffect(() => {
    console.log(
      "[CONSULTANT PICKER] Consultants recebidos:",
      consultants.length,
      "consultores loaded",
      consultants.map((c) => ({ id: c.id, name: c.name })),
    );
  }, [consultants]);

  const selected = consultants.find((c) => c.id === value);

  return (
    <View>
      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)}>
        <Text style={styles.triggerText}>
          {selected ? selected.name || selected.email : placeholder}
        </Text>
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <TextInput
              placeholder="Pesquisar consultores..."
              placeholderTextColor="#777"
              value={query}
              onChangeText={setQuery}
              style={styles.searchInput}
              autoFocus
            />

            <TouchableOpacity
              style={styles.noneButton}
              onPress={() => {
                console.log('[CONSULTANT PICKER] "Nenhum" selecionado');
                onChange(null);
                setOpen(false);
                setQuery("");
              }}
            >
              <Text style={styles.noneText}>Nenhum</Text>
            </TouchableOpacity>

            <FlatList
              data={filtered}
              keyExtractor={(i) => i.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.item}
                  onPress={() => {
                    console.log(
                      "[CONSULTANT PICKER] Consultor selecionado:",
                      item.id,
                      item.name,
                    );
                    onChange(item.id);
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <Text style={styles.itemText}>{item.name || item.email}</Text>
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity
              style={styles.close}
              onPress={() => {
                setOpen(false);
                setQuery("");
              }}
            >
              <Text style={styles.closeText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  trigger: {
    backgroundColor: "#1a1a1a",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  triggerText: { color: "#fff" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#000",
    borderRadius: 12,
    maxHeight: "80%",
    padding: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  searchInput: {
    backgroundColor: "#111",
    color: "#fff",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  noneButton: { paddingVertical: 8 },
  noneText: { color: "#8c52ff", fontWeight: "600" },
  item: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#111",
  },
  itemText: { color: "#fff" },
  close: { marginTop: 8, alignItems: "center", padding: 8 },
  closeText: { color: "#ccc" },
});

export default ConsultantPicker;
