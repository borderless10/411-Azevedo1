/**
 * Tela de Edição de Renda
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useNavigation } from '../../routes/NavigationContext';
import { Layout } from '../../components/Layout/Layout';
import { Button } from '../../components/ui/Button/Button';
import { CurrencyInput } from '../../components/CurrencyInput';
import { DatePicker } from '../../components/DatePicker';
import { CategoryPicker } from '../../components/CategoryPicker';
import incomeServices from '../../services/incomeServices';
import { formatCurrency } from '../../utils/currencyUtils';
import { Income } from '../../types/income';

export const EditIncomeScreen = () => {
  const { user } = useAuth();
  const { navigate, params } = useNavigation();
  const incomeId = params?.id;

  const [value, setValue] = useState(0);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [category, setCategory] = useState<string>('Outros');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({
    value: '',
    description: '',
    date: '',
    general: '',
  });

  // Carregar dados da renda
  useEffect(() => {
    const loadIncome = async () => {
      if (!incomeId || !user) return;

      try {
        setLoading(true);
        const income = await incomeServices.getIncomeById(incomeId);
        
        if (!income) {
          Alert.alert('Erro', 'Renda não encontrada');
          navigate('Home');
          return;
        }

        if (income.userId !== user.id) {
          Alert.alert('Erro', 'Você não tem permissão para editar esta renda');
          navigate('Home');
          return;
        }

        setValue(income.value);
        setDescription(income.description);
        setDate(income.date);
        setCategory(income.category || 'Outros');
      } catch (error: any) {
        console.error('❌ Erro ao carregar renda:', error);
        Alert.alert('Erro', 'Erro ao carregar renda. Tente novamente.');
        navigate('Home');
      } finally {
        setLoading(false);
      }
    };

    loadIncome();
  }, [incomeId, user, navigate]);

  // Validações
  const validateValue = (val: number): string => {
    if (val <= 0) {
      return 'Valor deve ser maior que zero';
    }
    if (val > 1000000) {
      return 'Valor muito alto';
    }
    return '';
  };

  const validateDescription = (text: string): string => {
    if (!text.trim()) {
      return 'Descrição é obrigatória';
    }
    if (text.trim().length < 3) {
      return 'Descrição deve ter pelo menos 3 caracteres';
    }
    if (text.trim().length > 100) {
      return 'Descrição muito longa (máximo 100 caracteres)';
    }
    return '';
  };

  const validateDate = (selectedDate: Date): string => {
    if (selectedDate > new Date()) {
      return 'Data não pode ser no futuro';
    }
    return '';
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
      setErrors((prev) => ({ ...prev, description: validateDescription(text) }));
    }
  };

  const handleDateChange = (selectedDate: Date) => {
    setDate(selectedDate);
    setErrors((prev) => ({ ...prev, date: validateDate(selectedDate) }));
  };

  const handleSave = async () => {
    console.log('💰 Atualizando renda...');

    // Limpar erros
    setErrors({ value: '', description: '', date: '', general: '' });

    // Validar todos os campos
    const valueError = validateValue(value);
    const descriptionError = validateDescription(description);
    const dateError = validateDate(date);

    if (valueError || descriptionError || dateError) {
      setErrors({
        value: valueError,
        description: descriptionError,
        date: dateError,
        general: 'Por favor, corrija os erros antes de salvar',
      });
      return;
    }

    if (!user || !incomeId) {
      Alert.alert('Erro', 'Dados inválidos');
      return;
    }

    try {
      setSaving(true);

      const incomeData = {
        value,
        description: description.trim(),
        date,
        category,
      };

      const savedValue = value;

      await incomeServices.updateIncome(incomeId, incomeData);
      console.log('✅ Renda atualizada');

      // Mostrar mensagem de confirmação e navegar para Home
      Alert.alert(
        'Sucesso! ✅',
        `Renda de ${formatCurrency(savedValue)} atualizada com sucesso!`,
        [
          {
            text: 'OK',
            onPress: () => {
              console.log('🏠 Navegando para Home após atualizar renda...');
              navigate('Home');
            },
            style: 'default',
          },
        ],
        { cancelable: false }
      );
    } catch (error: any) {
      console.error('❌ Erro ao atualizar renda:', error);
      setErrors((prev) => ({
        ...prev,
        general: error.message || 'Erro ao atualizar renda. Tente novamente.',
      }));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('Home');
  };

  if (loading) {
    return (
      <Layout title="Editar Renda" showBackButton={true} showSidebar={false}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Carregando dados...</Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout 
      title="Editar Renda"
      showBackButton={true}
      showSidebar={false}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
                <Ionicons name="cash-outline" size={64} color="#4CAF50" />
              </View>
              <Text style={styles.subtitle}>
                Edite as informações da renda
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
                editable={!saving}
              />

              {/* Descrição */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  <Ionicons name="document-text" size={16} color="#007AFF" />{' '}
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
                    color={errors.description ? '#F44336' : '#999'}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: Salário do mês, Freelance, Venda de item"
                    placeholderTextColor="#999"
                    value={description}
                    onChangeText={handleDescriptionChange}
                    autoCapitalize="sentences"
                    editable={!saving}
                    onBlur={() => validateDescription(description)}
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
                  <Text style={styles.errorTextSmall}>{errors.description}</Text>
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
                  editable={!saving}
                />
                {errors.date ? (
                  <Text style={styles.errorTextSmall}>{errors.date}</Text>
                ) : null}
              </View>

              {/* Categoria */}
              <View style={styles.inputContainer}>
                <CategoryPicker
                  label="Categoria (opcional)"
                  type="income"
                  selectedCategory={category}
                  onSelectCategory={setCategory}
                  editable={!saving}
                />
              </View>

              {/* Botões */}
              <View style={styles.buttonContainer}>
                <Button
                  title="Cancelar"
                  onPress={handleCancel}
                  variant="secondary"
                  icon="close"
                  disabled={saving}
                  style={styles.button}
                />

                <Button
                  title="Salvar Alterações"
                  onPress={handleSave}
                  variant="primary"
                  icon="checkmark"
                  loading={saving}
                  disabled={saving}
                  style={styles.button}
                />
              </View>
            </View>
          </View>
        </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  iconContainer: {
    marginBottom: 16,
    padding: 20,
    backgroundColor: '#E8F5E9',
    borderRadius: 100,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
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
    paddingHorizontal: 16,
  },
  inputWrapperError: {
    borderColor: '#F44336',
    borderWidth: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#333',
  },
  icon: {
    marginLeft: 8,
  },
  errorTextSmall: {
    color: '#F44336',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'right',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
  },
});

export default EditIncomeScreen;
