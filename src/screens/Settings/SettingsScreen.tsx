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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useNavigation } from '../../routes/NavigationContext';
import { Layout } from '../../components/Layout/Layout';

export const SettingsScreen = () => {
  const { user, signOut } = useAuth();
  const { navigate } = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

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

  const SettingItem: React.FC<{
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightComponent?: React.ReactNode;
  }> = ({ icon, iconColor, title, subtitle, onPress, rightComponent }) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.settingIcon, { backgroundColor: `${iconColor}20` }]}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {rightComponent || (
        <Ionicons name="chevron-forward" size={20} color="#666" />
      )}
    </TouchableOpacity>
  );

  return (
    <Layout title="Configurações" showBackButton={false} showSidebar={true}>
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
          {/* Preferências */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferências</Text>
            <View style={styles.sectionCard}>
              <SettingItem
                icon="notifications"
                iconColor="#007AFF"
                title="Notificações"
                subtitle="Receber alertas e lembretes"
                rightComponent={
                  <Switch
                    value={notificationsEnabled}
                    onValueChange={setNotificationsEnabled}
                    trackColor={{ false: '#333', true: '#007AFF' }}
                    thumbColor="#fff"
                  />
                }
              />
              <View style={styles.divider} />
              <SettingItem
                icon="moon"
                iconColor="#9C27B0"
                title="Tema Escuro"
                subtitle="Ativar modo escuro"
                rightComponent={
                  <Switch
                    value={darkMode}
                    onValueChange={setDarkMode}
                    trackColor={{ false: '#333', true: '#9C27B0' }}
                    thumbColor="#fff"
                  />
                }
              />
            </View>
          </View>

          {/* Conta */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Conta</Text>
            <View style={styles.sectionCard}>
              <SettingItem
                icon="person"
                iconColor="#4CAF50"
                title="Meu Perfil"
                subtitle="Ver informações da conta"
                onPress={() => navigate('Profile')}
              />
              <View style={styles.divider} />
              <SettingItem
                icon="lock-closed"
                iconColor="#FF9800"
                title="Segurança"
                subtitle="Alterar senha e privacidade"
                onPress={() => Alert.alert('Em breve', 'Funcionalidade em desenvolvimento')}
              />
            </View>
          </View>

          {/* Sistema */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sistema</Text>
            <View style={styles.sectionCard}>
              <SettingItem
                icon="help-circle"
                iconColor="#607D8B"
                title="Ajuda e Suporte"
                subtitle="Central de ajuda e FAQ"
                onPress={() => Alert.alert('Em breve', 'Funcionalidade em desenvolvimento')}
              />
              <View style={styles.divider} />
              <SettingItem
                icon="document-text"
                iconColor="#2196F3"
                title="Termos e Privacidade"
                subtitle="Política de privacidade"
                onPress={() => Alert.alert('Em breve', 'Funcionalidade em desenvolvimento')}
              />
              <View style={styles.divider} />
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
            <View style={styles.sectionCard}>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    marginBottom: 12,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
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
    color: '#fff',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#999',
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
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
});

export default SettingsScreen;
