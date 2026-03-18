/**
 * Tela de Perfil do Usuário
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { userService } from '../../services/userServices';
import { useNavigation } from '../../routes/NavigationContext';
import { Layout } from '../../components/Layout/Layout';

export const ProfileScreen = () => {
  const { user, refreshUser } = useAuth();
  const { navigate, params } = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const successFadeAnim = useRef(new Animated.Value(0)).current;
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [currency, setCurrency] = useState<string>(user?.currency || 'BRL');
  const [showInRanking, setShowInRanking] = useState<boolean>(
    user?.showInRanking === true,
  );
  const [savingPrefs, setSavingPrefs] = useState<boolean>(false);

  // Verificar se o usuário é admin
  const isAdmin = user?.role === 'admin' || user?.isAdmin === true;

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

    // Verificar se há parâmetros de sucesso
    if (params?.showSuccess && params?.successMessage) {
      setShowSuccess(true);
      setSuccessMessage(params.successMessage);
      
      // Animar a mensagem de sucesso
      Animated.timing(successFadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();

      // Ocultar mensagem após 5 segundos
      const timer = setTimeout(() => {
        Animated.timing(successFadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setShowSuccess(false);
          setSuccessMessage('');
        });
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [params]);

  return (
    <Layout title="Perfil" showBackButton={false} showSidebar={true}>
      <ScrollView style={styles.container}>
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Mensagem de Sucesso */}
          {showSuccess && (
            <Animated.View
              style={[
                styles.successContainer,
                {
                  opacity: successFadeAnim,
                },
              ]}
            >
              <View style={styles.successIconContainer}>
                <Ionicons name="checkmark-circle" size={48} color="#8c52ff" />
              </View>
              <Text style={styles.successTitle}>Cliente Cadastrado!</Text>
              <Text style={styles.successMessage}>{successMessage}</Text>
            </Animated.View>
          )}

          {/* Avatar e Informações Básicas */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(user?.name?.[0] || user?.email?.[0] || 'A').toUpperCase()}
                </Text>
              </View>
              {isAdmin && (
                <View style={styles.badgeContainer}>
                  <View style={styles.adminBadge}>
                    <Ionicons name="shield-checkmark" size={16} color="#8c52ff" />
                    <Text style={styles.badgeText}>Admin</Text>
                  </View>
                </View>
              )}
            </View>
            
            <Text style={styles.userName}>
              {user?.name || 'Usuário'}
            </Text>
            <Text style={styles.userEmail}>
              {user?.email || ''}
            </Text>
          </View>

          {/* Card de Função */}
          <View style={styles.roleCard}>
            <View style={styles.roleHeader}>
              <Ionicons name="business" size={24} color="#8c52ff" />
              <Text style={styles.roleTitle}>Função</Text>
            </View>
            <View style={styles.roleContent}>
              <Text style={styles.roleName}>
                {isAdmin ? 'Administrador' : 'Usuário'}
              </Text>
              <Text style={styles.roleDescription}>
                {isAdmin
                  ? 'Você tem acesso completo ao sistema e pode gerenciar todas as funcionalidades, incluindo cadastrar novos clientes.'
                  : 'Você tem acesso às funcionalidades básicas do sistema.'}
              </Text>
            </View>
          </View>

          {/* Informações do Sistema */}
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Ionicons name="information-circle" size={24} color="#8c52ff" />
              <Text style={styles.infoTitle}>Informações da Conta</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>ID do Usuário</Text>
              <Text style={styles.infoValue}>{user?.id || 'N/A'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Status</Text>
              <View style={styles.statusContainer}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Ativo</Text>
              </View>
            </View>
          </View>

          {/* Preferências do Usuário */}
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Ionicons name="options" size={24} color="#8c52ff" />
              <Text style={styles.infoTitle}>Preferências</Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Moeda</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {['BRL', 'USD', 'EUR'].map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.currencyButton,
                      currency === c && styles.currencyButtonActive,
                    ]}
                    onPress={() => setCurrency(c)}
                  >
                    <Text
                      style={
                        currency === c
                          ? styles.currencyButtonTextActive
                          : styles.currencyButtonText
                      }
                    >
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Participar do Ranking</Text>
              <TouchableOpacity
                onPress={() => setShowInRanking((s) => !s)}
                style={styles.toggleButton}
              >
                <View
                  style={[
                    styles.toggleDot,
                    showInRanking && styles.toggleDotActive,
                  ]}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, savingPrefs && styles.saveButtonDisabled]}
              onPress={async () => {
                if (!user?.id) return;
                try {
                  setSavingPrefs(true);
                  await userService.updateUserPreferences(user.id, {
                    currency,
                    showInRanking,
                  });
                  // refresh user data in context
                  await refreshUser();
                  setShowSuccess(true);
                  setSuccessMessage('Preferências salvas com sucesso');
                  setTimeout(() => setShowSuccess(false), 4000);
                } catch (e) {
                  console.error('Erro ao salvar preferências', e);
                  Alert.alert('Erro', 'Não foi possível salvar as preferências');
                } finally {
                  setSavingPrefs(false);
                }
              }}
            >
              <Text style={styles.saveButtonText}>{savingPrefs ? 'Salvando...' : 'Salvar Preferências'}</Text>
            </TouchableOpacity>
          </View>

          {/* Funcionalidades de Admin */}
          {isAdmin && (
            <View style={styles.adminCard}>
              <View style={styles.adminCardHeader}>
                <Ionicons name="shield-checkmark" size={24} color="#8c52ff" />
                <Text style={styles.adminCardTitle}>Área Administrativa</Text>
              </View>
              <Text style={styles.adminCardDescription}>
                Gerencie usuários e funcionalidades do sistema
              </Text>
              
              <TouchableOpacity
                style={styles.adminButton}
                onPress={() => navigate('CadastrarCliente')}
                activeOpacity={0.7}
              >
                <View style={styles.adminButtonIconContainer}>
                  <Ionicons name="person-add" size={24} color="#8c52ff" />
                </View>
                <View style={styles.adminButtonContent}>
                  <Text style={styles.adminButtonTitle}>Cadastrar Novo Cliente</Text>
                  <Text style={styles.adminButtonSubtitle}>
                    Criar login e conta para um novo cliente no sistema
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>
            </View>
          )}

          {/* Estatísticas Rápidas */}
          <View style={styles.statsCard}>
            <View style={styles.statsHeader}>
              <Ionicons name="stats-chart" size={24} color="#ff4d6d" />
              <Text style={styles.statsTitle}>
                {isAdmin ? 'Acesso de Administrador' : 'Informações da Conta'}
              </Text>
            </View>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Ionicons name="settings" size={20} color="#999" />
                <Text style={styles.statLabel}>Configurações</Text>
                <Text style={styles.statValue}>
                  {isAdmin ? 'Liberado' : 'Básico'}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="shield" size={20} color="#999" />
                <Text style={styles.statLabel}>Permissões</Text>
                <Text style={styles.statValue}>
                  {isAdmin ? 'Completo' : 'Padrão'}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    padding: 20,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1a1a1a',
    borderWidth: 3,
    borderColor: '#8c52ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 40,
    fontWeight: 'bold',
  },
  badgeContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8c52ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#999',
  },
  roleCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  roleContent: {
    gap: 8,
  },
  roleName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#8c52ff',
  },
  roleDescription: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  infoLabel: {
    fontSize: 14,
    color: '#999',
  },
  infoValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8c52ff',
  },
  statusText: {
    fontSize: 14,
    color: '#8c52ff',
    fontWeight: '600',
  },
  statsCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  statValue: {
    fontSize: 14,
    color: '#8c52ff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  adminCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#8c52ff',
    shadowColor: '#8c52ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  adminCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  adminCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  adminCardDescription: {
    fontSize: 14,
    color: '#999',
    marginBottom: 16,
    marginLeft: 36,
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
    gap: 12,
  },
  adminButtonIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#8c52ff20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminButtonContent: {
    flex: 1,
    gap: 4,
  },
  adminButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  adminButtonSubtitle: {
    fontSize: 12,
    color: '#999',
  },
  successContainer: {
    backgroundColor: '#1a3a1a',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#8c52ff',
    alignItems: 'center',
    shadowColor: '#8c52ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  successIconContainer: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8c52ff',
    marginBottom: 12,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 24,
  },
  currencyButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#0a0a0a',
  },
  currencyButtonActive: {
    backgroundColor: '#8c52ff',
    borderColor: '#8c52ff',
  },
  currencyButtonText: {
    color: '#ddd',
    fontWeight: '700',
  },
  currencyButtonTextActive: {
    color: '#000',
    fontWeight: '800',
  },
  toggleButton: {
    padding: 8,
    borderRadius: 999,
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#333',
  },
  toggleDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#444',
  },
  toggleDotActive: {
    backgroundColor: '#8c52ff',
  },
  saveButton: {
    marginTop: 12,
    backgroundColor: '#8c52ff',
    padding: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
});

export default ProfileScreen;
