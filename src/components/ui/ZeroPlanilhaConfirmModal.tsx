import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  DECIMAL_INPUT_KEYBOARD,
  formatCurrency,
  parseCurrency,
  sanitizeDecimalInput,
} from "../../utils/currencyUtils";
import {
  OpeningExpenseEntry,
  OpeningExpenseKind,
} from "../../types/openingExpense";

type DraftRow = {
  id: string;
  kind: OpeningExpenseKind;
  title: string;
  amountText: string;
};

type Props = {
  visible: boolean;
  dayLabel: string;
  loading?: boolean;
  trackedOptions?: string[];
  fixedKind?: OpeningExpenseKind;
  onConfirmZero: () => void;
  onConfirmEntries: (entries: OpeningExpenseEntry[]) => void;
  onCancel: () => void;
};

const newRow = (
  kind: OpeningExpenseKind,
  trackedOptions: string[],
): DraftRow => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  kind,
  title:
    kind === "tracked" && trackedOptions.length === 1
      ? trackedOptions[0]
      : kind === "consumption"
        ? "Consumo moderado"
        : trackedOptions[0] || "",
  amountText: "",
});

const ZeroPlanilhaConfirmModal: React.FC<Props> = ({
  visible,
  dayLabel,
  loading = false,
  trackedOptions = [],
  fixedKind,
  onConfirmZero,
  onConfirmEntries,
  onCancel,
}) => {
  const [step, setStep] = useState<"question" | "entries">("question");
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [formError, setFormError] = useState("");

  const defaultKind: OpeningExpenseKind = fixedKind || "consumption";

  useEffect(() => {
    if (visible) {
      setStep("question");
      setRows([newRow(defaultKind, trackedOptions)]);
      setFormError("");
    }
  }, [visible, dayLabel, defaultKind, trackedOptions.join("|")]);

  const runningTotal = useMemo(
    () =>
      rows.reduce((sum, row) => sum + Math.max(0, parseCurrency(row.amountText)), 0),
    [rows],
  );

  const updateRow = (id: string, patch: Partial<DraftRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const handleSave = () => {
    const entries: OpeningExpenseEntry[] = rows
      .map((row) => ({
        kind: fixedKind || row.kind,
        title:
          (fixedKind === "tracked" || row.kind === "tracked"
            ? row.title || trackedOptions[0]
            : row.title || "Consumo moderado"
          ).trim(),
        amount: parseCurrency(row.amountText),
      }))
      .filter((e) => e.amount > 0);

    if (entries.length === 0) {
      setFormError("");
      onConfirmZero();
      return;
    }

    const missingTitle = entries.some(
      (e) => e.kind === "tracked" && e.title.length < 2,
    );
    if (missingTitle) {
      setFormError("Selecione o gasto acompanhado em cada linha.");
      return;
    }

    setFormError("");
    onConfirmEntries(entries);
  };

  const showKindPicker = !fixedKind;

  return (
    <Modal animationType="fade" transparent visible={visible}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          <View style={styles.iconWrap}>
            <Ionicons
              name={step === "question" ? "help-circle" : "cash"}
              size={56}
              color="#8c52ff"
            />
          </View>

          {step === "question" ? (
            <>
              <Text style={styles.title}>Consumo Moderado</Text>
              <Text style={styles.message}>
                No dia {dayLabel}, você teve gasto de Consumo Moderado?
              </Text>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.noButton, loading && styles.buttonDisabled]}
                  onPress={onConfirmZero}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.noLabel}>Não</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.yesButton, loading && styles.buttonDisabled]}
                  onPress={() => setStep("entries")}
                  disabled={loading}
                >
                  <Text style={styles.yesLabel}>Sim</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.dismissButton}
                onPress={onCancel}
                disabled={loading}
              >
                <Text style={styles.dismissLabel}>Agora não</Text>
              </TouchableOpacity>
            </>
          ) : (
            <ScrollView
              style={styles.entriesScroll}
              contentContainerStyle={styles.entriesContent}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.title}>Quais foram os gastos?</Text>
              <Text style={styles.message}>
                Adicione um ou mais gastos do dia {dayLabel}. Deixe em branco ou
                0 para registrar zero no app.
              </Text>

              {rows.map((row, index) => (
                <View key={row.id} style={styles.entryCard}>
                  <View style={styles.entryHeader}>
                    <Text style={styles.entryIndex}>Gasto {index + 1}</Text>
                    {rows.length > 1 ? (
                      <TouchableOpacity
                        onPress={() =>
                          setRows((prev) => prev.filter((r) => r.id !== row.id))
                        }
                      >
                        <Ionicons name="trash-outline" size={18} color="#ff4d6d" />
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {showKindPicker ? (
                    <View style={styles.kindRow}>
                      {(
                        [
                          { id: "consumption", label: "Consumo" },
                          { id: "tracked", label: "Acompanhado" },
                        ] as const
                      ).map((opt) => {
                        const active = row.kind === opt.id;
                        return (
                          <TouchableOpacity
                            key={opt.id}
                            style={[styles.kindChip, active && styles.kindChipActive]}
                            onPress={() =>
                              updateRow(row.id, {
                                kind: opt.id,
                                title:
                                  opt.id === "consumption"
                                    ? "Consumo moderado"
                                    : trackedOptions[0] || "",
                              })
                            }
                          >
                            <Text
                              style={[
                                styles.kindChipText,
                                active && styles.kindChipTextActive,
                              ]}
                            >
                              {opt.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : null}

                  {row.kind === "tracked" || fixedKind === "tracked" ? (
                    trackedOptions.length > 0 ? (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.trackedScroll}
                      >
                        {trackedOptions.map((name) => {
                          const active = row.title === name;
                          return (
                            <TouchableOpacity
                              key={name}
                              style={[
                                styles.trackedChip,
                                active && styles.trackedChipActive,
                              ]}
                              onPress={() => updateRow(row.id, { title: name })}
                            >
                              <Text
                                style={[
                                  styles.trackedChipText,
                                  active && styles.trackedChipTextActive,
                                ]}
                              >
                                {name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    ) : (
                      <TextInput
                        style={styles.titleInput}
                        value={row.title}
                        onChangeText={(t) => updateRow(row.id, { title: t })}
                        placeholder="Nome do gasto acompanhado"
                        placeholderTextColor="#6b6480"
                      />
                    )
                  ) : (
                    <TextInput
                      style={styles.titleInput}
                      value={row.title}
                      onChangeText={(t) => updateRow(row.id, { title: t })}
                      placeholder="Descrição"
                      placeholderTextColor="#6b6480"
                    />
                  )}

                  <TextInput
                    style={styles.input}
                    value={row.amountText}
                    onChangeText={(text) => {
                      updateRow(row.id, {
                        amountText: sanitizeDecimalInput(text),
                      });
                      if (formError) setFormError("");
                    }}
                    placeholder="0,00"
                    placeholderTextColor="#6b6480"
                    keyboardType={DECIMAL_INPUT_KEYBOARD}
                  />
                </View>
              ))}

              <TouchableOpacity
                style={styles.addRowButton}
                onPress={() =>
                  setRows((prev) => [
                    ...prev,
                    newRow(fixedKind || "consumption", trackedOptions),
                  ])
                }
              >
                <Ionicons name="add-circle-outline" size={18} color="#8c52ff" />
                <Text style={styles.addRowText}>Adicionar outro gasto</Text>
              </TouchableOpacity>

              {runningTotal > 0 ? (
                <Text style={styles.totalHelper}>
                  Total informado: {formatCurrency(runningTotal)}
                </Text>
              ) : null}

              {formError ? (
                <Text style={styles.errorText}>{formError}</Text>
              ) : null}

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.noButton, loading && styles.buttonDisabled]}
                  onPress={() => {
                    setStep("question");
                    setFormError("");
                  }}
                  disabled={loading}
                >
                  <Text style={styles.noLabel}>Voltar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.yesButton, loading && styles.buttonDisabled]}
                  onPress={handleSave}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.yesLabel}>Salvar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  container: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "90%",
    backgroundColor: "#0e0c14",
    borderRadius: 14,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2a2040",
  },
  entriesScroll: { width: "100%" },
  entriesContent: { paddingBottom: 8 },
  iconWrap: {
    marginBottom: 10,
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 10,
    textAlign: "center",
  },
  message: {
    color: "#a89fc0",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  entryCard: {
    width: "100%",
    backgroundColor: "#1a1528",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2a2040",
    padding: 12,
    marginBottom: 10,
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  entryIndex: {
    color: "#cfc6e8",
    fontWeight: "700",
    fontSize: 13,
  },
  kindRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  kindChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#2a2040",
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  kindChipActive: {
    backgroundColor: "#8c52ff",
    borderColor: "#8c52ff",
  },
  kindChipText: { color: "#a89fc0", fontWeight: "600", fontSize: 12 },
  kindChipTextActive: { color: "#fff" },
  trackedScroll: { marginBottom: 8 },
  trackedChip: {
    borderWidth: 1,
    borderColor: "#2a2040",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 8,
  },
  trackedChipActive: {
    backgroundColor: "#3d2a66",
    borderColor: "#8c52ff",
  },
  trackedChipText: { color: "#a89fc0", fontSize: 12 },
  trackedChipTextActive: { color: "#fff", fontWeight: "700" },
  titleInput: {
    borderWidth: 1,
    borderColor: "#2a2040",
    borderRadius: 8,
    color: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  input: {
    width: "100%",
    backgroundColor: "#0e0c14",
    borderWidth: 1,
    borderColor: "#2a2040",
    borderRadius: 10,
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  addRowButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  addRowText: { color: "#8c52ff", fontWeight: "700" },
  totalHelper: {
    color: "#cfc6e8",
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
    width: "100%",
  },
  actionsRow: {
    width: "100%",
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  noButton: {
    flex: 1,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#2a2040",
    borderRadius: 10,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  noLabel: {
    color: "#a89fc0",
    fontSize: 15,
    fontWeight: "700",
  },
  yesButton: {
    flex: 1,
    backgroundColor: "#8c52ff",
    borderRadius: 10,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  yesLabel: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  dismissButton: {
    marginTop: 14,
    paddingVertical: 8,
  },
  dismissLabel: {
    color: "#6b6480",
    fontSize: 14,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  errorText: {
    color: "#ff4d6d",
    fontSize: 13,
    marginBottom: 8,
    alignSelf: "flex-start",
  },
});

export default ZeroPlanilhaConfirmModal;