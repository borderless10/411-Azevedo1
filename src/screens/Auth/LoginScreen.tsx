import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../hooks/useAuth";
import { useNavigation } from "../../routes/NavigationContext";
import { getErrorMessage } from "../../components/ui/ErrorMessage";
import CustomModal from "../../components/ui/CustomModal";

export const LoginScreen = () => {
  const { navigate } = useNavigation();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    email: "",
    password: "",
    general: "",
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Validar email em tempo real
  const validateEmail = (text: string): string => {
    if (!text.trim()) {
      return "Email é obrigatório";
    }
    if (!text.includes("@")) {
      return "Email deve conter @";
    }
    if (!text.includes(".")) {
      return "Email inválido";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(text)) {
      return "Formato de email inválido";
    }
    return "";
  };

  const handleGoToRegister = () => {
    navigate("Register");
  };

  // Validar senha em tempo real
  const validatePassword = (text: string): string => {
    if (!text.trim()) {
      return "Senha é obrigatória";
    }
    if (text.length < 6) {
      return "Senha deve ter pelo menos 6 caracteres";
    }
    return "";
  };

  // Handler para mudança de email
  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (errors.email || text.trim()) {
      setErrors((prev) => ({ ...prev, email: validateEmail(text) }));
    }
  };

  // Handler para mudança de senha
  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (errors.password || text.trim()) {
      setErrors((prev) => ({ ...prev, password: validatePassword(text) }));
    }
  };

  const handleLogin = async () => {
    console.log("🔵 [LOGIN] Iniciando processo de login...");

    // Limpar erros anteriores
    setErrors({ email: "", password: "", general: "" });

    // Validar campos
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);

    if (emailError || passwordError) {
      setErrors({
        email: emailError,
        password: passwordError,
        general: "",
      });
      return;
    }

    try {
      console.log("🔵 [LOGIN] Chamando signIn...");
      setLoading(true);
      await signIn({ email: email.trim(), password });
      console.log("✅ [LOGIN] Login bem-sucedido!");
    } catch (error: any) {
      console.log("❌ [LOGIN] Erro:", error);

      // Garante que não estoura erro se vier algo inesperado do Firebase
      const errorCode =
        error && typeof error === "object" && "code" in error
          ? (error as any).code
          : "default";

      const errorMessage = getErrorMessage(errorCode);

      // Exibe modal personalizado para senha incorreta; mantém alertas para outros erros
      if (
        errorCode === "auth/wrong-password" ||
        errorCode === "auth/invalid-credential"
      ) {
        setModalMessage("Senha incorreta. Verifique e tente novamente.");
        setModalVisible(true);
      } else if (errorCode === "auth/user-not-found") {
        Alert.alert(
          "Erro no login",
          "Usuário não encontrado. Confira o email ou crie uma conta.",
        );
      } else if (errorCode === "auth/invalid-email") {
        Alert.alert(
          "Erro no login",
          "Email inválido. Verifique o formato (ex: usuario@dominio.com).",
        );
      } else {
        Alert.alert("Erro no login", errorMessage);
      }

      // Mapear erros específicos para os campos (mantém feedback abaixo dos inputs)
      if (
        errorCode === "auth/invalid-email" ||
        errorCode === "auth/user-not-found"
      ) {
        setErrors((prev) => ({ ...prev, email: errorMessage }));
      } else if (
        errorCode === "auth/wrong-password" ||
        errorCode === "auth/invalid-credential"
      ) {
        setErrors((prev) => ({ ...prev, password: "Senha incorreta" }));
      } else {
        setErrors((prev) => ({ ...prev, general: errorMessage }));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboard}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image
                source={require("../../../assets/logo411.png")}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>Controle Financeiro</Text>
            <Text style={styles.subtitle}>Faça login para continuar</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Mensagem de erro geral */}
            {errors.general ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#ff4d6d" />
                <Text style={styles.errorText}>{errors.general}</Text>
              </View>
            ) : null}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                <Ionicons name="mail" size={16} color="#8c52ff" /> Email
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  errors.email ? styles.inputWrapperError : null,
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={errors.email ? "#ff4d6d" : "#999"}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.inputWithIcon}
                  placeholder="seu@email.com"
                  placeholderTextColor="#999"
                  value={email}
                  onChangeText={handleEmailChange}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!loading}
                />
                {errors.email ? (
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color="#ff4d6d"
                    style={styles.errorIcon}
                  />
                ) : email.trim() && !errors.email ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color="#8c52ff"
                    style={styles.errorIcon}
                  />
                ) : null}
              </View>
              {errors.email ? (
                <Text style={styles.errorTextSmall}>{errors.email}</Text>
              ) : null}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                <Ionicons name="lock-closed" size={16} color="#8c52ff" /> Senha
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  errors.password ? styles.inputWrapperError : null,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={errors.password ? "#ff4d6d" : "#999"}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.inputWithIcon}
                  placeholder="••••••••"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={handlePasswordChange}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((prev) => !prev)}
                  disabled={loading}
                  style={styles.toggleButton}
                >
                  <Ionicons
                    name={showPassword ? "eye" : "eye-off"}
                    size={20}
                    color="#999"
                    style={styles.toggleIcon}
                  />
                </TouchableOpacity>
                {errors.password ? (
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color="#ff4d6d"
                    style={styles.errorIcon}
                  />
                ) : password.trim() && !errors.password ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color="#8c52ff"
                    style={styles.errorIcon}
                  />
                ) : null}
              </View>
              {errors.password ? (
                <Text style={styles.errorTextSmall}>{errors.password}</Text>
              ) : null}
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.buttonContent}>
                  <Ionicons name="log-in" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Entrar</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={handleGoToRegister}
              disabled={loading}
            >
              <Text style={styles.linkText}>
                Não tem conta?{" "}
                <Text style={styles.linkTextBold}>Criar cadastro</Text>
              </Text>
            </TouchableOpacity>
          </View>
          <CustomModal
            visible={modalVisible}
            title="Erro no login"
            message={modalMessage}
            primaryLabel="Fechar"
            onClose={() => setModalVisible(false)}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  keyboard: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
  },
  logoContainer: {
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 200,
    height: 80,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#999",
  },
  form: {
    width: "100%",
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    paddingLeft: 16,
    paddingRight: 16,
  },
  inputWrapperError: {
    borderColor: "#ff4d6d",
    borderWidth: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  errorIcon: {
    marginLeft: 8,
  },
  toggleButton: {
    marginLeft: 8,
    padding: 6,
  },
  toggleIcon: {
    // kept for future adjustments
  },
  input: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#333",
    color: "#fff",
  },
  inputWithIcon: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: "#fff",
  },
  button: {
    backgroundColor: "#8c52ff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#8c52ff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: "#ccc",
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 8,
  },
  linkButton: {
    marginTop: 24,
    alignItems: "center",
  },
  linkText: {
    fontSize: 14,
    color: "#999",
  },
  linkTextBold: {
    color: "#8c52ff",
    fontWeight: "bold",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3a1a1a",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "#ff4d6d40",
  },
  errorText: {
    flex: 1,
    color: "#ff4d6d",
    fontSize: 14,
    fontWeight: "500",
  },
  errorTextSmall: {
    color: "#ff4d6d",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});

export default LoginScreen;
