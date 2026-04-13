/**
 * Tela de Cadastro de Renda
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../hooks/useAuth";
import { useNavigation } from "../../routes/NavigationContext";
import { Layout } from "../../components/Layout/Layout";
import { Button } from "../../components/ui/Button/Button";
import { CurrencyInput } from "../../components/CurrencyInput";
import DatePicker from "../../components/DatePicker";
import { CategoryPicker } from "../../components/CategoryPicker";
import incomeServices from "../../services/incomeServices";
import { planningServices } from "../../services/planningServices";
import { formatCurrency } from "../../utils/currencyUtils";
import IncomeCreatedModal from "../../components/ui/IncomeCreatedModal";

export const AddIncomeScreen = () => {
  const { user } = useAuth();
  const { navigate, params } = useNavigation() as any;

  const [value, setValue] = useState(0);
  const [incomeType, setIncomeType] = useState<"tracked" | "general">(
    "general",
  );
  const [description, setDescription] = useState("");
  const [trackedIncomeTitle, setTrackedIncomeTitle] = useState("");
  const [trackedIncomeOptions, setTrackedIncomeOptions] = useState<string[]>(
    [],
  );
  const [date, setDate] = useState(new Date());
  const [category, setCategory] = useState<string>("Outros");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    value: "",
    description: "",
    trackedIncomeTitle: "",
    date: "",
    general: "",
  });
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [savedValueForModal, setSavedValueForModal] = useState(0);

  const navigateToReturnScreen = () => {
    navigate(params?.returnTo || "Home", params?.returnParams);
  };

  useEffect(() => {
    if (params?.prefillDate) {
      try {
        setDate(new Date(params.prefillDate));
      } catch {
        // ignore invalid date param
      }
    }
  }, [params?.prefillDate]);

  useEffect(() => {
    if (params?.prefillDescription) {
      const prefill = String(params.prefillDescription);
      setDescription(prefill);
      setTrackedIncomeTitle(prefill);
      setIncomeType("tracked");
    }
  }, [params?.prefillDescription]);

  useEffect(() => {
    if (params?.trackedMode) {
      setIncomeType("tracked");
    }
  }, [params?.trackedMode]);

  useEffect(() => {
    const loadTrackedIncomeOptions = async () => {
      if (!user?.id) return;
      try {
        const planning = await planningServices.getPlanning(user.id);
        const options = (planning?.expectedIncomes || [])
          .filter((item) => item.dailyTracking)
          .map((item) => String(item.source || "").trim())
          .filter(Boolean);

        const unique = Array.from(new Set(options)).sort((a, b) =>
          a.localeCompare(b, "pt-BR"),
        );

        setTrackedIncomeOptions(unique);
      } catch (error) {
        console.warn("Erro ao carregar rendas acompanhadas", error);
      }
    };

    loadTrackedIncomeOptions();
  }, [user?.id]);

  // Validações
  const validateValue = (val: number): string => {
    if (val <= 0) {
      return "Valor deve ser maior que zero";
    }
    if (val > 1000000) {
      return "Valor muito alto";
    }
    return "";
  };

  const validateDescription = (text: string): string => {
    if (!text.trim()) {
      return "Descrição é obrigatória";
    }
    if (text.trim().length < 3) {
      return "Descrição deve ter pelo menos 3 caracteres";
    }
    if (text.trim().length > 100) {
      return "Descrição muito longa (máximo 100 caracteres)";
    }
    return "";
  };

  const validateDate = (selectedDate: Date): string => {
    if (selectedDate > new Date()) {
      return "Data não pode ser no futuro";
    }
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    if (selectedDate < oneYearAgo) {
      return "Data muito antiga (máximo 1 ano atrás)";
    }
    return "";
  };

  // Handlers
  const handleValueChange = (val: number) => {
    setValue(val);
    if (errors.value || val > 0) {
      setErrors((prev) => ({ ...prev, value: validateValue(val) }));
    }
  };

  const handleDescriptionChange = (text: string) => {
    setDescription(text);
    if (errors.description || text.trim()) {
      setErrors((prev) => ({
        ...prev,
        description: validateDescription(text),
      }));
    }
  };

  const handleDateChange = (selectedDate: Date) => {
    setDate(selectedDate);
    setErrors((prev) => ({ ...prev, date: validateDate(selectedDate) }));
  };

  const handleSave = async () => {
    console.log("💰 Salvando renda...");

    // Limpar erros
    setErrors({
      value: "",
      description: "",
      trackedIncomeTitle: "",
      date: "",
      general: "",
    });

    // Validar todos os campos
    const valueError = validateValue(value);
    const descriptionError =
      incomeType === "general" ? validateDescription(description) : "";
    const trackedIncomeTitleError =
      incomeType === "tracked" && !trackedIncomeTitle.trim()
        ? "Selecione a renda acompanhada"
        : "";
    const dateError = validateDate(date);

    if (
      valueError ||
      descriptionError ||
      trackedIncomeTitleError ||
      dateError
    ) {
      setErrors({
        value: valueError,
        description: descriptionError,
        trackedIncomeTitle: trackedIncomeTitleError,
        date: dateError,
        general: "Por favor, corrija os erros antes de salvar",
      });
      return;
    }

    if (!user) {
      Alert.alert("Erro", "Usuário não autenticado");
      return;
    }

    try {
      setLoading(true);

      const isTracked = incomeType === "tracked";
      const finalDescription = isTracked
        ? trackedIncomeTitle.trim()
        : description.trim();

      const incomeData = {
        value,
        description: finalDescription,
        date,
        category: isTracked ? "Acompanhamento Diário" : category,
        dailyTracking: isTracked,
      };

      const newIncome = await incomeServices.createIncome(user.id, incomeData);
      console.log("✅ Renda criada:", newIncome);

      // Armazenar valor antes de limpar para usar na mensagem
      const savedValue = value;

      // Limpar formulário
      setValue(0);
      setDescription("");
      setTrackedIncomeTitle("");
      setIncomeType("general");
      setDate(new Date());
      setCategory("Outros");

      // Parar loading antes de mostrar modal
      setLoading(false);

      // Mostrar modal personalizado com identidade visual
      setSavedValueForModal(savedValue);
      setSuccessModalVisible(true);
    } catch (error: any) {
      console.error("❌ Erro ao salvar renda:", error);
      setErrors((prev) => ({
        ...prev,
        general: error.message || "Erro ao salvar renda. Tente novamente.",
      }));
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigateToReturnScreen();
  };

  return (
    <Layout title="Nova Renda" showBackButton={true} showSidebar={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Header visual */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Ionicons name="add-circle" size={64} color="#8c52ff" />
              </View>
              <Text style={styles.subtitle}>
                Registre uma entrada de dinheiro
              </Text>
            </View>

            {/* Erro geral */}
            {errors.general ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#ff4d6d" />
                <Text style={styles.errorText}>{errors.general}</Text>
              </View>
            ) : null}

            {/* Form */}
            <View style={styles.form}>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeTab,
                    incomeType === "tracked" && styles.typeTabActive,
                  ]}
                  onPress={() => setIncomeType("tracked")}
                  disabled={loading}
                >
                  <Ionicons
                    name="analytics"
                    size={18}
                    color={incomeType === "tracked" ? "#8c52ff" : "#999"}
                  />
                  <Text
                    style={[
                      styles.typeTabText,
                      incomeType === "tracked" && styles.typeTabTextActive,
                    ]}
                  >
                    Renda acompanhada
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeTab,
                    incomeType === "general" && styles.typeTabActive,
                  ]}
                  onPress={() => setIncomeType("general")}
                  disabled={loading}
                >
                  <Ionicons
                    name="cash"
                    size={18}
                    color={incomeType === "general" ? "#8c52ff" : "#999"}
                  />
                  <Text
                    style={[
                      styles.typeTabText,
                      incomeType === "general" && styles.typeTabTextActive,
                    ]}
                  >
                    Renda geral
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Valor */}
              <CurrencyInput
                label="Valor"
                value={value}
                onChangeValue={handleValueChange}
                error={errors.value}
                icon="cash"
                editable={!loading}
              />

              {incomeType === "tracked" ? (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>
                    <Ionicons name="analytics" size={16} color="#8c52ff" /> Qual
                    renda acompanhada?
                  </Text>

                  {trackedIncomeOptions.length === 0 ? (
                    <View style={styles.emptyTrackedContainer}>
                      <Text style={styles.emptyTrackedText}>
                        O consultor ainda não definiu rendas acompanhadas.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.trackedOptionsContainer}>
                      {trackedIncomeOptions.map((option) => {
                        const active = trackedIncomeTitle === option;
                        return (
                          <TouchableOpacity
                            key={option}
                            style={[
                              styles.trackedOption,
                              active && styles.trackedOptionActive,
                            ]}
                            onPress={() => setTrackedIncomeTitle(option)}
                            disabled={loading}
                          >
                            <Text
                              style={[
                                styles.trackedOptionText,
                                active && styles.trackedOptionTextActive,
                              ]}
                            >
                              {option}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  {errors.trackedIncomeTitle ? (
                    <Text style={styles.errorTextSmall}>
                      {errors.trackedIncomeTitle}
                    </Text>
                  ) : null}
                </View>
              ) : (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>
                    <Ionicons name="document-text" size={16} color="#8c52ff" />{" "}
                    Descrição
                  </Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      errors.description ? styles.inputWrapperError : null,
                    ]}
                  >
                    <Ionicons
                      name="document-text-outline"
                      size={20}
                      color={errors.description ? "#ff4d6d" : "#999"}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Ex: Salário, Freelance, Presente..."
                      placeholderTextColor="#999"
                      value={description}
                      onChangeText={handleDescriptionChange}
                      editable={!loading}
                      maxLength={100}
                    />
                    {errors.description ? (
                      <Ionicons
                        name="close-circle"
                        size={20}
                        color="#ff4d6d"
                        style={styles.icon}
                      />
                    ) : description.trim().length >= 3 ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#8c52ff"
                        style={styles.icon}
                      />
                    ) : null}
                  </View>
                  {errors.description ? (
                    <Text style={styles.errorTextSmall}>
                      {errors.description}
                    </Text>
                  ) : null}
                  <Text style={styles.charCount}>
                    {description.length}/100 caracteres
                  </Text>
                </View>
              )}

              {/* Data */}
              <DatePicker
                label="Data"
                date={date}
                onChangeDate={handleDateChange}
                error={errors.date}
                maxDate={new Date()}
                editable={!loading}
              />

              {/* Categoria */}
              {incomeType === "general" ? (
                <CategoryPicker
                  label="Categoria (opcional)"
                  type="income"
                  selectedCategory={category}
                  onSelectCategory={setCategory}
                  editable={!loading}
                />
              ) : null}

              {/* Botões */}
              <View style={styles.buttonContainer}>
                <Button
                  title="Cancelar"
                  onPress={handleCancel}
                  variant="secondary"
                  icon="close"
                  disabled={loading}
                  style={styles.button}
                />

                <Button
                  title="Salvar"
                  onPress={handleSave}
                  variant="success"
                  icon="checkmark"
                  loading={loading}
                  disabled={loading}
                  style={styles.button}
                />
              </View>
            </View>
          </View>
        </ScrollView>
        <IncomeCreatedModal
          visible={successModalVisible}
          amount={savedValueForModal}
          onClose={() => {
            setSuccessModalVisible(false);
            navigateToReturnScreen();
          }}
          onViewList={() => {
            setSuccessModalVisible(false);
            navigate("IncomeList");
          }}
          onAddAnother={() => {
            setSuccessModalVisible(false);
            // formulário já limpo anteriormente
          }}
        />
      </KeyboardAvoidingView>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
    marginTop: 20,
  },
  iconContainer: {
    marginBottom: 16,
    padding: 20,
    backgroundColor: "#E8F5E9",
    borderRadius: 100,
  },
  subtitle: {
    fontSize: 16,
    color: "#DDD",
    textAlign: "center",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFEBEE",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: "#ff4d6d",
    fontSize: 14,
    fontWeight: "500",
  },
  form: {
    width: "100%",
  },
  typeSelector: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  typeTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#444",
    borderRadius: 12,
    paddingVertical: 12,
    backgroundColor: "#2b2b2b",
  },
  typeTabActive: {
    borderColor: "#8c52ff",
    backgroundColor: "#2b174d",
  },
  typeTabText: {
    color: "#ccc",
    fontSize: 13,
    fontWeight: "600",
  },
  typeTabTextActive: {
    color: "#fff",
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2b2b2b",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#444",
    paddingHorizontal: 16,
  },
  inputWrapperError: {
    borderColor: "#ff4d6d",
    borderWidth: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: "#fff",
  },
  icon: {
    marginLeft: 8,
  },
  errorTextSmall: {
    color: "#ff4d6d",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  charCount: {
    fontSize: 12,
    color: "#bbb",
    marginTop: 4,
    textAlign: "right",
  },
  emptyTrackedContainer: {
    borderWidth: 1,
    borderColor: "#444",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#2b2b2b",
  },
  emptyTrackedText: {
    color: "#aaa",
    fontSize: 13,
  },
  trackedOptionsContainer: {
    gap: 8,
  },
  trackedOption: {
    borderWidth: 1,
    borderColor: "#444",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#2b2b2b",
  },
  trackedOptionActive: {
    borderColor: "#8c52ff",
    backgroundColor: "#2b174d",
  },
  trackedOptionText: {
    color: "#ddd",
    fontSize: 14,
    fontWeight: "600",
  },
  trackedOptionTextActive: {
    color: "#fff",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
  },
});

export default AddIncomeScreen;
