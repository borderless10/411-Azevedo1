/**
 * Componente de Header/Cabeçalho
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useNavigation } from '../../routes/NavigationContext';

interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
  showProfile?: boolean;
  rightAction?: React.ReactNode;
  style?: ViewStyle;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showBackButton = false,
  showProfile = true,
  rightAction,
  style,
}) => {
  const { user } = useAuth();
  const { navigate, currentScreen } = useNavigation();

  const handleBack = () => {
    if (currentScreen === 'AddIncome' || currentScreen === 'AddExpense') {
      navigate('Home');
    } else {
      navigate('Home');
    }
  };

  const handleProfile = () => {
    navigate('Profile');
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.left}>
        {showBackButton && (
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
        )}
        {title ? (
          <Text style={styles.title}>{title}</Text>
        ) : (
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>Olá,</Text>
              <Text style={styles.userName} numberOfLines={1}>
                {user?.name || user?.email || 'Usuário'}
              </Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.right}>
        {rightAction || (
          <>
            {showProfile && (
              <TouchableOpacity onPress={handleProfile} style={styles.profileButton}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(user?.name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerContent: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: '#666',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    maxWidth: 200,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileButton: {
    padding: 4,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default Header;
