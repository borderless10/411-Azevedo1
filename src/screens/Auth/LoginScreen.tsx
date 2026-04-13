import React, { useEffect, useState } from "react";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "../../hooks/useAuth";
import { useNavigation } from "../../routes/NavigationContext";
import { getErrorMessage } from "../../components/ui/ErrorMessage";
import CustomModal from "../../components/ui/CustomModal";

const REMEMBER_EMAIL_KEY = "@411:remember-email";
const SAVED_EMAIL_KEY = "@411:saved-email";
const BIOMETRIC_EMAIL_KEY = "@411:biometric-email";
const BIOMETRIC_PASSWORD_KEY = "@411:biometric-password";

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
  const [rememberEmail, setRememberEmail] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [hasBiometricCredentials, setHasBiometricCredentials] = useState(false);

  useEffect(() => {
    const loadLoginPreferences = async () => {
      try {
        const [rememberFlag, savedEmail] = await Promise.all([
          AsyncStorage.getItem(REMEMBER_EMAIL_KEY),
          AsyncStorage.getItem(SAVED_EMAIL_KEY),
        ]);

        if (rememberFlag === "true" && savedEmail) {
          setRememberEmail(true);
          setEmail(savedEmail);
        }
      } catch (error) {
        console.log("Erro ao carregar preferências de login:", error);
      }

      if (Platform.OS === "web") {
        setBiometricAvailable(false);
        setHasBiometricCredentials(false);
        return;
      }

      try {
        const [
          hasHardware,
          isEnrolled,
          savedBiometricEmail,
          savedBiometricPass,
        ] = await Promise.all([
          LocalAuthentication.hasHardwareAsync(),
          LocalAuthentication.isEnrolledAsync(),
          SecureStore.getItemAsync(BIOMETRIC_EMAIL_KEY),
          SecureStore.getItemAsync(BIOMETRIC_PASSWORD_KEY),
        ]);

        const canUseBiometry = hasHardware && isEnrolled;
        setBiometricAvailable(canUseBiometry);
        setHasBiometricCredentials(
          Boolean(savedBiometricEmail && savedBiometricPass),
        );
      } catch (error) {
        console.log("Erro ao verificar biometria:", error);
        setBiometricAvailable(false);
        setHasBiometricCredentials(false);
      }
    };

    void loadLoginPreferences();
  }, []);

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

  const handleAuthError = (error: any) => {
    console.log("❌ [LOGIN] Erro:", error);

    const errorCode =
      error && typeof error === "object" && "code" in error
        ? (error as any).code
        : "default";

    const errorMessage = getErrorMessage(errorCode);

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
  };

  const persistLoginPreferences = async (
    loginEmail: string,
    loginPassword: string,
  ) => {
    if (rememberEmail) {
      await AsyncStorage.multiSet([
        [REMEMBER_EMAIL_KEY, "true"],
        [SAVED_EMAIL_KEY, loginEmail],
      ]);

      if (Platform.OS !== "web" && biometricAvailable) {
        await SecureStore.setItemAsync(BIOMETRIC_EMAIL_KEY, loginEmail);
        await SecureStore.setItemAsync(BIOMETRIC_PASSWORD_KEY, loginPassword);
        setHasBiometricCredentials(true);
      }
      return;
    }

    await AsyncStorage.multiRemove([REMEMBER_EMAIL_KEY, SAVED_EMAIL_KEY]);

    if (Platform.OS !== "web") {
      await Promise.all([
        SecureStore.deleteItemAsync(BIOMETRIC_EMAIL_KEY),
        SecureStore.deleteItemAsync(BIOMETRIC_PASSWORD_KEY),
      ]);
      setHasBiometricCredentials(false);
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
      const normalizedEmail = email.trim();

      await signIn({ email: normalizedEmail, password });
      await persistLoginPreferences(normalizedEmail, password);

      console.log("✅ [LOGIN] Login bem-sucedido!");
    } catch (error: any) {
      handleAuthError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (loading || !biometricAvailable) {
      return;
    }

    if (!hasBiometricCredentials) {
      Alert.alert(
        "Biometria indisponível",
        "Faça um login com 'Salvar meu login' marcado para ativar o acesso por biometria.",
      );
      return;
    }

    try {
      const [savedBiometricEmail, savedBiometricPassword] = await Promise.all([
        SecureStore.getItemAsync(BIOMETRIC_EMAIL_KEY),
        SecureStore.getItemAsync(BIOMETRIC_PASSWORD_KEY),
      ]);

      if (!savedBiometricEmail || !savedBiometricPassword) {
        setHasBiometricCredentials(false);
        Alert.alert(
          "Biometria indisponível",
          "Não encontramos credenciais salvas para biometria.",
        );
        return;
      }

      const authResult = await LocalAuthentication.authenticateAsync({
        promptMessage: "Entrar com biometria",
        cancelLabel: "Cancelar",
        fallbackLabel: "Usar senha",
      });

      if (!authResult.success) {
        return;
      }

      setLoading(true);
      setEmail(savedBiometricEmail);
      await signIn({
        email: savedBiometricEmail,
        password: savedBiometricPassword,
      });
    } catch (error) {
      handleAuthError(error);
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
              style={styles.rememberContainer}
              onPress={() => setRememberEmail((prev) => !prev)}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Ionicons
                name={rememberEmail ? "checkbox" : "square-outline"}
                size={20}
                color={rememberEmail ? "#8c52ff" : "#999"}
              />
              <Text style={styles.rememberText}>Salvar meu login</Text>
            </TouchableOpacity>

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

            {biometricAvailable ? (
              <TouchableOpacity
                style={[
                  styles.biometricButton,
                  (loading || !hasBiometricCredentials) &&
                    styles.buttonDisabled,
                ]}
                onPress={handleBiometricLogin}
                disabled={loading || !hasBiometricCredentials}
              >
                <View style={styles.buttonContent}>
                  <Ionicons name="finger-print" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Entrar com biometria</Text>
                </View>
              </TouchableOpacity>
            ) : null}

            {biometricAvailable && !hasBiometricCredentials ? (
              <Text style={styles.helperText}>
                Marque "Salvar meu login" e entre uma vez para ativar a
                biometria.
              </Text>
            ) : null}
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
  rememberContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  rememberText: {
    color: "#fff",
    fontSize: 14,
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
  biometricButton: {
    backgroundColor: "#4f46e5",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#4f46e5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
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
  helperText: {
    marginTop: 8,
    color: "#999",
    fontSize: 12,
    textAlign: "center",
  },
});

export default LoginScreen;
