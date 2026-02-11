/**
 * Componente de Header/Cabeçalho
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Image,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useNavigation } from '../../routes/NavigationContext';
import { useTheme } from '../../contexts/ThemeContext';

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
  const { colors } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

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
    <Animated.View 
      style={[
        styles.container, 
        {
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
        style,
      ]}
    >
      <View style={styles.left}>
        {showBackButton && (
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        )}
        {!title && (
          <Image 
            source={require('../../../assets/logo411.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        )}
        {title ? (
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        ) : (
          <View style={styles.headerContent}>
            <View>
              <Text style={[styles.greeting, { color: colors.textSecondary }]}>Olá,</Text>
              <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
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
                <View style={[styles.avatar, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.avatarText, { color: colors.text }]}>
                    {(user?.name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  logo: {
    width: 180,
    height: 72,
    marginRight: 0,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerContent: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
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
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default Header;
