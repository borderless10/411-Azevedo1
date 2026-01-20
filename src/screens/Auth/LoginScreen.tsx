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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useNavigation } from '../../routes/NavigationContext';
import { getErrorMessage } from '../../components/ui/ErrorMessage';

export const LoginScreen = () => {
  const { navigate } = useNavigation();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    email: '',
    password: '',
    general: '',
  });

  // Validar email em tempo real
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

  // Validar senha em tempo real
  const validatePassword = (text: string): string => {
    if (!text.trim()) {
      return 'Senha é obrigatória';
    }
    if (text.length < 6) {
      return 'Senha deve ter pelo menos 6 caracteres';
    }
    return '';
  };

  // Handler para mudança de email
  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (errors.email || text.trim()) {
      setErrors(prev => ({ ...prev, email: validateEmail(text) }));
    }
  };

  // Handler para mudança de senha
  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (errors.password || text.trim()) {
      setErrors(prev => ({ ...prev, password: validatePassword(text) }));
    }
  };

  const handleLogin = async () => {
    console.log('🔵 [LOGIN] Iniciando processo de login...');
    
    // Limpar erros anteriores
    setErrors({ email: '', password: '', general: '' });
    
    // Validar campos
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    
    if (emailError || passwordError) {
      setErrors({
        email: emailError,
        password: passwordError,
        general: '',
      });
      return;
    }

    try {
      console.log('🔵 [LOGIN] Chamando signIn...');
      setLoading(true);
      await signIn({ email: email.trim(), password });
      console.log('✅ [LOGIN] Login bem-sucedido!');
    } catch (error: any) {
      console.log('❌ [LOGIN] Erro:', error);
      let errorMessage = getErrorMessage(error.code);
      
      // Mapear erros específicos para os campos
      if (error.code === 'auth/invalid-email' || error.code === 'auth/user-not-found') {
        setErrors(prev => ({ ...prev, email: errorMessage }));
      } else if (error.code === 'auth/wrong-password') {
        setErrors(prev => ({ ...prev, password: 'Senha incorreta' }));
      } else {
        setErrors(prev => ({ ...prev, general: errorMessage }));
      }
    } finally {
      setLoading(false);
    }
  };


  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../../assets/logo411.png')} 
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
              <Ionicons name="alert-circle" size={20} color="#F44336" />
              <Text style={styles.errorText}>{errors.general}</Text>
            </View>
          ) : null}

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
                placeholder="••••••••"
                placeholderTextColor="#999"
                value={password}
                onChangeText={handlePasswordChange}
                secureTextEntry
                editable={!loading}
              />
              {errors.password ? (
                <Ionicons name="close-circle" size={20} color="#F44336" style={styles.errorIcon} />
              ) : password.trim() && !errors.password ? (
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" style={styles.errorIcon} />
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
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 200,
    height: 80,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
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
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
    color: '#fff',
  },
  inputWithIcon: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#fff',
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
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3a1a1a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#F4433640',
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

export default LoginScreen;
