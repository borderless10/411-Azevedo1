/**
 * Tela de Cadastro de Gasto
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../hooks/useAuth";
import { useNavigation } from "../../routes/NavigationContext";
import { Layout } from "../../components/Layout/Layout";
import { Button } from "../../components/ui/Button/Button";
import { CurrencyInput } from "../../components/CurrencyInput";
import DatePicker from "../../components/DatePicker";
import { CategoryPicker } from "../../components/CategoryPicker";
import expenseServices from "../../services/expenseServices";
import { formatCurrency } from "../../utils/currencyUtils";
import ExpenseCreatedModal from "../../components/ui/ExpenseCreatedModal";

export const AddExpenseScreen = () => {
  const { user } = useAuth();
  const { navigate } = useNavigation();

  const [value, setValue] = useState(0);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date());
  const [category, setCategory] = useState<string>("Alimentação");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    value: "",
    description: "",
    date: "",
    category: "",
    general: "",
  });
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [savedValueForModal, setSavedValueForModal] = useState(0);

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

  const validateCategory = (cat: string): string => {
    if (!cat || cat.trim().length === 0) {
      return "Categoria é obrigatória";
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

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    setErrors((prev) => ({ ...prev, category: validateCategory(cat) }));
  };

  const handleSave = async () => {
    console.log("💸 Salvando gasto...");

    // Limpar erros
    setErrors({
      value: "",
      description: "",
      date: "",
      category: "",
      general: "",
    });

    // Validar todos os campos
    const valueError = validateValue(value);
    const descriptionError = validateDescription(description);
    const dateError = validateDate(date);
    const categoryError = validateCategory(category);

    if (valueError || descriptionError || dateError || categoryError) {
      setErrors({
        value: valueError,
        description: descriptionError,
        date: dateError,
        category: categoryError,
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

      const expenseData = {
        value,
        description: description.trim(),
        date,
        category,
      };

      const newExpense = await expenseServices.createExpense(
        user.id,
        expenseData,
      );
      console.log("✅ Gasto criado:", newExpense);

      // Armazenar valor antes de limpar para usar na mensagem
      const savedValue = value;

      // Limpar formulário
      setValue(0);
      setDescription("");
      setDate(new Date());
      setCategory("Alimentação");

      // Parar loading antes de mostrar modal
      setLoading(false);

      // Mostrar modal personalizado com identidade visual
      setSavedValueForModal(savedValue);
      setSuccessModalVisible(true);
    } catch (error: any) {
      console.error("❌ Erro ao salvar gasto:", error);
      setErrors((prev) => ({
        ...prev,
        general: error.message || "Erro ao salvar gasto. Tente novamente.",
      }));
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("Home");
  };

  return (
    <Layout title="Novo Gasto" showBackButton={true} showSidebar={false}>
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
                <Ionicons name="remove-circle" size={64} color="#F44336" />
              </View>
              <Text style={styles.subtitle}>
                Registre uma saída de dinheiro
              </Text>
            </View>

            {/* Erro geral */}
            {errors.general ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#F44336" />
                <Text style={styles.errorText}>{errors.general}</Text>
              </View>
            ) : null}

            {/* Form */}
            <View style={styles.form}>
              {/* Valor */}
              <CurrencyInput
                label="Valor"
                value={value}
                onChangeValue={handleValueChange}
                error={errors.value}
                icon="cash-outline"
                editable={!loading}
              />

              {/* Descrição */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  <Ionicons name="document-text" size={16} color="#007AFF" />{" "}
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
                    color={errors.description ? "#F44336" : "#999"}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: Mercado, Combustível, Almoço..."
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
                      color="#F44336"
                      style={styles.icon}
                    />
                  ) : description.trim().length >= 3 ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#4CAF50"
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

              {/* Data */}
              <View style={styles.inputContainer}>
                <DatePicker
                  label="Data"
                  date={date}
                  onChangeDate={handleDateChange}
                  error={errors.date}
                  maxDate={new Date()}
                  editable={!loading}
                />
                {errors.date ? (
                  <Text style={styles.errorTextSmall}>{errors.date}</Text>
                ) : null}
              </View>

              {/* Categoria - OBRIGATÓRIA */}
              <View style={styles.inputContainer}>
                <CategoryPicker
                  label="Categoria *"
                  type="expense"
                  selectedCategory={category}
                  onSelectCategory={handleCategoryChange}
                  error={errors.category}
                  editable={!loading}
                />
                {errors.category ? (
                  <Text style={styles.errorTextSmall}>{errors.category}</Text>
                ) : null}
              </View>

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
                  variant="danger"
                  icon="checkmark"
                  loading={loading}
                  disabled={loading}
                  style={styles.button}
                />
              </View>
            </View>
          </View>
        </ScrollView>
        <ExpenseCreatedModal
          visible={successModalVisible}
          amount={savedValueForModal}
          onClose={() => {
            setSuccessModalVisible(false);
            navigate("Home");
          }}
          onViewList={() => {
            setSuccessModalVisible(false);
            navigate("ExpenseList");
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
    backgroundColor: "#FFEBEE",
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
    color: "#F44336",
    fontSize: 14,
    fontWeight: "500",
  },
  form: {
    width: "100%",
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
    borderColor: "#F44336",
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
    color: "#F44336",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  charCount: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
    textAlign: "right",
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

export default AddExpenseScreen;
