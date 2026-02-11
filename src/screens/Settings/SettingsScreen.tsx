/**
 * Tela de Configurações
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Animated,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useNavigation } from '../../routes/NavigationContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Layout } from '../../components/Layout/Layout';
import { authServices } from '../../services/authServices';

export const SettingsScreen = () => {
  const { user, signOut } = useAuth();
  const { navigate } = useNavigation();
  const { theme, colors, isDark, setThemeMode } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Confirmar Logout',
      'Tem certeza que deseja sair?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: () => {
            signOut();
            navigate('Login');
          },
        },
      ]
    );
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Erro', 'A nova senha e a confirmação não coincidem');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Erro', 'A nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (newPassword === currentPassword) {
      Alert.alert('Erro', 'A nova senha deve ser diferente da atual');
      return;
    }

    setIsChangingPassword(true);
    try {
      await authServices.changePassword(currentPassword, newPassword);
      Alert.alert('Sucesso', 'Senha alterada com sucesso!');
      setIsPasswordModalVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.log('Erro ao alterar senha:', error);
      Alert.alert('Erro', error.message || 'Erro ao alterar senha. Tente novamente.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleThemeChange = (value: boolean) => {
    setThemeMode(value ? 'dark' : 'light');
  };

  const SettingItem: React.FC<{
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightComponent?: React.ReactNode;
  }> = ({ icon, iconColor, title, subtitle, onPress, rightComponent }) => (
    <TouchableOpacity
      style={[styles.settingItem, { backgroundColor: colors.card }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.settingIcon, { backgroundColor: `${iconColor}20` }]}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
        {subtitle && <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
      </View>
      {rightComponent || (
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      )}
    </TouchableOpacity>
  );

  return (
    <Layout title="Configurações" showBackButton={false} showSidebar={true}>
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Preferências */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Preferências</Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <SettingItem
                icon="notifications"
                iconColor="#007AFF"
                title="Notificações"
                subtitle="Receber alertas e lembretes"
                rightComponent={
                  <Switch
                    value={notificationsEnabled}
                    onValueChange={setNotificationsEnabled}
                    trackColor={{ false: colors.border, true: '#007AFF' }}
                    thumbColor="#fff"
                  />
                }
              />
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <SettingItem
                icon={isDark ? 'moon' : 'sunny'}
                iconColor={isDark ? '#9C27B0' : '#FF9800'}
                title={isDark ? 'Tema Escuro' : 'Tema Claro'}
                subtitle={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
                rightComponent={
                  <Switch
                    value={isDark}
                    onValueChange={handleThemeChange}
                    trackColor={{ false: colors.border, true: '#9C27B0' }}
                    thumbColor="#fff"
                  />
                }
              />
            </View>
          </View>

          {/* Conta */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Conta</Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <SettingItem
                icon="person"
                iconColor="#4CAF50"
                title="Meu Perfil"
                subtitle="Ver informações da conta"
                onPress={() => navigate('Profile')}
              />
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <SettingItem
                icon="lock-closed"
                iconColor="#FF9800"
                title="Alterar Senha"
                subtitle="Modificar senha de acesso"
                onPress={() => setIsPasswordModalVisible(true)}
              />
            </View>
          </View>

          {/* Sistema */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Sistema</Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <SettingItem
                icon="help-circle"
                iconColor="#607D8B"
                title="Ajuda e Suporte"
                subtitle="Central de ajuda e FAQ"
                onPress={() => Alert.alert('Em breve', 'Funcionalidade em desenvolvimento')}
              />
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <SettingItem
                icon="document-text"
                iconColor="#2196F3"
                title="Termos e Privacidade"
                subtitle="Política de privacidade"
                onPress={() => Alert.alert('Em breve', 'Funcionalidade em desenvolvimento')}
              />
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <SettingItem
                icon="information-circle"
                iconColor="#9E9E9E"
                title="Sobre"
                subtitle={`Versão 1.0.0`}
                onPress={() => Alert.alert('Sobre', 'Controle Financeiro Pessoal\nVersão 1.0.0\n\nDesenvolvido para gerenciar suas finanças pessoais.')}
              />
            </View>
          </View>

          {/* Ações */}
          <View style={styles.section}>
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <Ionicons name="log-out-outline" size={24} color="#F44336" />
                <Text style={styles.logoutText}>Sair da Conta</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Modal de Alteração de Senha */}
      <Modal
        visible={isPasswordModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPasswordModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setIsPasswordModalVisible(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Alterar Senha</Text>
                  <TouchableOpacity
                    onPress={() => setIsPasswordModalVisible(false)}
                    style={styles.closeButton}
                  >
                    <Ionicons name="close" size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.modalScroll}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Senha Atual */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Senha Atual</Text>
                    <View style={[styles.passwordInput, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                      <TextInput
                        style={[styles.input, { color: colors.text }]}
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        placeholder="Digite sua senha atual"
                        placeholderTextColor={colors.placeholder}
                        secureTextEntry={!showCurrentPassword}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity
                        onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                        style={styles.eyeButton}
                      >
                        <Ionicons
                          name={showCurrentPassword ? 'eye-off' : 'eye'}
                          size={20}
                          color={colors.textSecondary}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Nova Senha */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Nova Senha</Text>
                    <View style={[styles.passwordInput, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                      <TextInput
                        style={[styles.input, { color: colors.text }]}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        placeholder="Digite sua nova senha"
                        placeholderTextColor={colors.placeholder}
                        secureTextEntry={!showNewPassword}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity
                        onPress={() => setShowNewPassword(!showNewPassword)}
                        style={styles.eyeButton}
                      >
                        <Ionicons
                          name={showNewPassword ? 'eye-off' : 'eye'}
                          size={20}
                          color={colors.textSecondary}
                        />
                      </TouchableOpacity>
                    </View>
                    <Text style={[styles.inputHint, { color: colors.textSecondary }]}>
                      Mínimo de 6 caracteres
                    </Text>
                  </View>

                  {/* Confirmar Nova Senha */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Confirmar Nova Senha</Text>
                    <View style={[styles.passwordInput, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                      <TextInput
                        style={[styles.input, { color: colors.text }]}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder="Confirme sua nova senha"
                        placeholderTextColor={colors.placeholder}
                        secureTextEntry={!showConfirmPassword}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={styles.eyeButton}
                      >
                        <Ionicons
                          name={showConfirmPassword ? 'eye-off' : 'eye'}
                          size={20}
                          color={colors.textSecondary}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Botões */}
                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton, { borderColor: colors.border }]}
                      onPress={() => setIsPasswordModalVisible(false)}
                      disabled={isChangingPassword}
                    >
                      <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
                        Cancelar
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.confirmButton]}
                      onPress={handleChangePassword}
                      disabled={isChangingPassword}
                    >
                      {isChangingPassword ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.confirmButtonText}>Alterar</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  settingIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
  },
  divider: {
    height: 1,
    marginLeft: 76,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 12,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F44336',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  passwordInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
  },
  eyeButton: {
    padding: 8,
  },
  inputHint: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default SettingsScreen;
