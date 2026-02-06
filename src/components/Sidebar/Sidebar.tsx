/**
 * Componente de Sidebar/Menu Lateral
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ViewStyle,
  Image,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useNavigation, ScreenName } from '../../routes/NavigationContext';

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
  style?: ViewStyle;
}

interface MenuItem {
  id: ScreenName;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  visible,
  onClose,
  style,
}) => {
  const { user, signOut } = useAuth();
  const { navigate, currentScreen } = useNavigation();
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -300,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const menuItems: MenuItem[] = [
    { id: 'Home', label: 'Início', icon: 'home', color: '#007AFF' },
    { id: 'Budget', label: 'Orçamento Mensal', icon: 'wallet', color: '#00BCD4' },
    { id: 'ConsumoModerado', label: 'Consumo Moderado', icon: 'leaf', color: '#4CAF50' },
    { id: 'Feed', label: 'Feed', icon: 'newspaper', color: '#007AFF' },
    { id: 'Chat', label: 'Chat', icon: 'chatbubbles', color: '#9C27B0' },
    { id: 'Metas', label: 'Metas', icon: 'flag', color: '#F44336' },
    { id: 'Recomendacao', label: 'Recomendação', icon: 'bulb', color: '#FF9800' },
    { id: 'Profile', label: 'Perfil', icon: 'person', color: '#9C27B0' },
    { id: 'Settings', label: 'Configurações', icon: 'settings', color: '#607D8B' },
  ];

  const handleNavigate = (screen: ScreenName) => {
    navigate(screen);
    onClose();
  };

  const handleLogout = () => {
    signOut();
    navigate('Login');
    onClose();
  };

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: fadeAnim,
        }
      ]}
    >
      <TouchableOpacity
        style={StyleSheet.absoluteFillObject}
        activeOpacity={1}
        onPress={onClose}
      />
      <Animated.View 
        style={[
          styles.container, 
          style,
          {
            transform: [{ translateX: slideAnim }],
          }
        ]} 
        onStartShouldSetResponder={() => true}
      >
        {/* Botão de Fechar no canto superior esquerdo */}
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>

        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../../assets/logo411.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Header do Sidebar */}
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(user?.name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
              </Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName} numberOfLines={1}>
                {user?.name || 'Usuário'}
              </Text>
              <Text style={styles.userEmail} numberOfLines={1}>
                {user?.email || ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Menu Items */}
        <ScrollView style={styles.menu} contentContainerStyle={styles.menuContent}>
          {menuItems.map((item) => {
            const isActive = currentScreen === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  isActive && styles.menuItemActive,
                ]}
                onPress={() => handleNavigate(item.id)}
              >
                <View style={styles.menuItemLeft}>
                  <Ionicons
                    name={item.icon}
                    size={24}
                    color={isActive ? item.color || '#007AFF' : '#999'}
                  />
                  <Text
                    style={[
                      styles.menuItemText,
                      isActive && styles.menuItemTextActive,
                      item.color && isActive && { color: item.color },
                    ]}
                  >
                    {item.label}
                  </Text>
                </View>
                {isActive && (
                  <Ionicons name="chevron-forward" size={20} color={item.color || '#007AFF'} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={24} color="#F44336" />
            <Text style={styles.logoutText}>Sair</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 1000,
  },
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 280,
    backgroundColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1001,
    paddingTop: 0,
  },
  logoContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: 20,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    backgroundColor: '#000',
  },
  logo: {
    width: 200,
    height: 80,
    alignSelf: 'center',
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  userEmail: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 1002,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  menu: {
    flex: 1,
  },
  menuContent: {
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  menuItemActive: {
    backgroundColor: '#1a1a1a',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  menuItemText: {
    fontSize: 16,
    color: '#ccc',
    fontWeight: '500',
  },
  menuItemTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    padding: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#F44336',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F44336',
  },
});

export default Sidebar;
