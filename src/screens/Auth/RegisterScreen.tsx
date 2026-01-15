import React, { useState } from 'react';
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
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useNavigation } from '../../routes/NavigationContext';
import { getErrorMessage } from '../../components/ui/ErrorMessage';

export const RegisterScreen = () => {
  const { navigate } = useNavigation();
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    general: '',
  });

  // Validações em tempo real
  const validateName = (text: string): string => {
    if (!text.trim()) {
      return 'Nome é obrigatório';
    }
    if (text.trim().length < 3) {
      return 'Nome deve ter pelo menos 3 caracteres';
    }
    return '';
  };

  const validateEmail = (text: string): string => {
    if (!text.trim()) {
      return 'Email é obrigatório';
    }
    if (!text.includes('@')) {
      return 'Email deve conter @';
    }
    if (!text.includes('.')) {
      return 'Email inválido';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(text)) {
      return 'Formato de email inválido';
    }
    return '';
  };

  const validatePassword = (text: string): string => {
    if (!text.trim()) {
      return 'Senha é obrigatória';
    }
    if (text.length < 6) {
      return 'Senha deve ter pelo menos 6 caracteres';
    }
    return '';
  };

  const validateConfirmPassword = (text: string): string => {
    if (!text.trim()) {
      return 'Confirmação de senha é obrigatória';
    }
    if (text !== password) {
      return 'As senhas não coincidem';
    }
    return '';
  };

  // Handlers de mudança
  const handleNameChange = (text: string) => {
    setName(text);
    if (errors.name || text.trim()) {
      setErrors(prev => ({ ...prev, name: validateName(text) }));
    }
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (errors.email || text.trim()) {
      setErrors(prev => ({ ...prev, email: validateEmail(text) }));
    }
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (errors.password || text.trim()) {
      setErrors(prev => ({ ...prev, password: validatePassword(text) }));
    }
    // Revalidar confirmação se já foi preenchida
    if (confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: text === confirmPassword ? '' : 'As senhas não coincidem' }));
    }
  };

  const handleConfirmPasswordChange = (text: string) => {
    setConfirmPassword(text);
    if (errors.confirmPassword || text.trim()) {
      setErrors(prev => ({ ...prev, confirmPassword: validateConfirmPassword(text) }));
    }
  };

  const handleRegister = async () => {
    // Limpar erros anteriores
    setErrors({ name: '', email: '', password: '', confirmPassword: '', general: '' });
    
    // Validar todos os campos
    const nameError = validateName(name);
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    const confirmPasswordError = validateConfirmPassword(confirmPassword);
    
    if (nameError || emailError || passwordError || confirmPasswordError) {
      setErrors({
        name: nameError,
        email: emailError,
        password: passwordError,
        confirmPassword: confirmPasswordError,
        general: '',
      });
      return;
    }

    try {
      setLoading(true);
      await signUp({
        email: email.trim(),
        password,
        name: name.trim(),
        confirmPassword: confirmPassword,
      });
    } catch (error: any) {
      let errorMessage = getErrorMessage(error.code);
      
      // Mapear erros específicos
      if (error.code === 'auth/email-already-in-use') {
        setErrors(prev => ({ ...prev, email: 'Este email já está em uso' }));
      } else if (error.code === 'auth/invalid-email') {
        setErrors(prev => ({ ...prev, email: errorMessage }));
      } else if (error.code === 'auth/weak-password') {
        setErrors(prev => ({ ...prev, password: errorMessage }));
      } else {
        setErrors(prev => ({ ...prev, general: errorMessage }));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoToLogin = () => {
    navigate('Login');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="wallet" size={64} color="#007AFF" />
            </View>
            <Text style={styles.title}>Criar Conta</Text>
            <Text style={styles.subtitle}>
              Preencha os dados para começar
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Mensagem de erro geral */}
            {errors.general ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#F44336" />
                <Text style={styles.errorText}>{errors.general}</Text>
              </View>
            ) : null}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                <Ionicons name="person" size={16} color="#007AFF" /> Nome completo
              </Text>
              <View style={[
                styles.inputWrapper,
                errors.name ? styles.inputWrapperError : null
              ]}>
                <Ionicons 
                  name="person-outline" 
                  size={20} 
                  color={errors.name ? "#F44336" : "#999"} 
                  style={styles.inputIcon} 
                />
                <TextInput
                  style={styles.inputWithIcon}
                  placeholder="João Silva"
                  placeholderTextColor="#999"
                  value={name}
                  onChangeText={handleNameChange}
                  autoCapitalize="words"
                  editable={!loading}
                />
                {errors.name ? (
                  <Ionicons name="close-circle" size={20} color="#F44336" style={styles.errorIcon} />
                ) : name.trim() && !errors.name ? (
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" style={styles.errorIcon} />
                ) : null}
              </View>
              {errors.name ? (
                <Text style={styles.errorTextSmall}>{errors.name}</Text>
              ) : null}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                <Ionicons name="mail" size={16} color="#007AFF" /> Email
              </Text>
              <View style={[
                styles.inputWrapper,
                errors.email ? styles.inputWrapperError : null
              ]}>
                <Ionicons 
                  name="mail-outline" 
                  size={20} 
                  color={errors.email ? "#F44336" : "#999"} 
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
                  <Ionicons name="close-circle" size={20} color="#F44336" style={styles.errorIcon} />
                ) : email.trim() && !errors.email ? (
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" style={styles.errorIcon} />
                ) : null}
              </View>
              {errors.email ? (
                <Text style={styles.errorTextSmall}>{errors.email}</Text>
              ) : null}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                <Ionicons name="lock-closed" size={16} color="#007AFF" /> Senha
              </Text>
              <View style={[
                styles.inputWrapper,
                errors.password ? styles.inputWrapperError : null
              ]}>
                <Ionicons 
                  name="lock-closed-outline" 
                  size={20} 
                  color={errors.password ? "#F44336" : "#999"} 
                  style={styles.inputIcon} 
                />
                <TextInput
                  style={styles.inputWithIcon}
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={handlePasswordChange}
                  secureTextEntry
                  editable={!loading}
                />
                {errors.password ? (
                  <Ionicons name="close-circle" size={20} color="#F44336" style={styles.errorIcon} />
                ) : password.length >= 6 ? (
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" style={styles.errorIcon} />
                ) : null}
              </View>
              {errors.password ? (
                <Text style={styles.errorTextSmall}>{errors.password}</Text>
              ) : null}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                <Ionicons name="shield-checkmark" size={16} color="#007AFF" /> Confirmar senha
              </Text>
              <View style={[
                styles.inputWrapper,
                errors.confirmPassword ? styles.inputWrapperError : null
              ]}>
                <Ionicons 
                  name="shield-checkmark-outline" 
                  size={20} 
                  color={errors.confirmPassword ? "#F44336" : "#999"} 
                  style={styles.inputIcon} 
                />
                <TextInput
                  style={styles.inputWithIcon}
                  placeholder="Digite a senha novamente"
                  placeholderTextColor="#999"
                  value={confirmPassword}
                  onChangeText={handleConfirmPasswordChange}
                  secureTextEntry
                  editable={!loading}
                />
                {errors.confirmPassword ? (
                  <Ionicons name="close-circle" size={20} color="#F44336" style={styles.errorIcon} />
                ) : confirmPassword && confirmPassword === password ? (
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" style={styles.errorIcon} />
                ) : null}
              </View>
              {errors.confirmPassword ? (
                <Text style={styles.errorTextSmall}>{errors.confirmPassword}</Text>
              ) : null}
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.buttonContent}>
                  <Ionicons name="person-add" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Criar Conta</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={handleGoToLogin}
              disabled={loading}
            >
              <Text style={styles.linkText}>
                Já tem uma conta? <Text style={styles.linkTextBold}>Faça login</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  iconContainer: {
    marginBottom: 16,
    padding: 20,
    backgroundColor: '#E3F2FD',
    borderRadius: 100,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingLeft: 16,
    paddingRight: 16,
  },
  inputWrapperError: {
    borderColor: '#F44336',
    borderWidth: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  errorIcon: {
    marginLeft: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    color: '#333',
  },
  inputWithIcon: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  linkButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
    color: '#666',
  },
  linkTextBold: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: '#F44336',
    fontSize: 14,
    fontWeight: '500',
  },
  errorTextSmall: {
    color: '#F44336',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});

export default RegisterScreen;
