/**
 * Componente de Botão Reutilizável
 */

import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  View,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'outline';
export type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Mapeamento de variantes para estilos
  const variantStyleMap: Record<ButtonVariant, ViewStyle> = {
    primary: styles.buttonPrimary,
    secondary: styles.buttonSecondary,
    danger: styles.buttonDanger,
    success: styles.buttonSuccess,
    outline: styles.buttonOutline,
  };

  const sizeStyleMap: Record<ButtonSize, ViewStyle> = {
    small: styles.buttonSmall,
    medium: styles.buttonMedium,
    large: styles.buttonLarge,
  };

  const textVariantStyleMap: Record<ButtonVariant, TextStyle> = {
    primary: styles.textPrimary,
    secondary: styles.textSecondary,
    danger: styles.textDanger,
    success: styles.textSuccess,
    outline: styles.textOutline,
  };

  const textSizeStyleMap: Record<ButtonSize, TextStyle> = {
    small: styles.textSmall,
    medium: styles.textMedium,
    large: styles.textLarge,
  };

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      friction: 7,
      tension: 100,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 7,
      tension: 100,
    }).start();
  };

  const handlePress = () => {
    handlePressOut();
    setTimeout(() => onPress(), 100);
  };

  const buttonStyles = [
    styles.button,
    variantStyleMap[variant],
    sizeStyleMap[size],
    fullWidth && styles.buttonFullWidth,
    (disabled || loading) && styles.buttonDisabled,
    style,
  ];

  const textStyles = [
    styles.text,
    textVariantStyleMap[variant],
    textSizeStyleMap[size],
    textStyle,
  ];

  const iconSize = size === 'small' ? 16 : size === 'medium' ? 20 : 24;
  const iconColor = variant === 'outline' || variant === 'secondary' ? '#007AFF' : '#fff';

  const renderIcon = () => {
    if (loading) {
      return <ActivityIndicator color={iconColor} size="small" style={styles.icon} />;
    }
    if (icon) {
      return <Ionicons name={icon} size={iconSize} color={iconColor} style={styles.icon} />;
    }
    return null;
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={buttonStyles}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        disabled={disabled || loading}
        activeOpacity={1}
      >
        <View style={styles.content}>
          {iconPosition === 'left' && renderIcon()}
          <Text style={textStyles}>{title}</Text>
          {iconPosition === 'right' && renderIcon()}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  icon: {
    marginHorizontal: 4,
  },
  
  // Variantes
  buttonPrimary: {
    backgroundColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOpacity: 0.3,
  },
  buttonSecondary: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e8e8e8',
    shadowColor: '#000',
    shadowOpacity: 0.08,
  },
  buttonDanger: {
    backgroundColor: '#F44336',
    shadowColor: '#F44336',
    shadowOpacity: 0.3,
  },
  buttonSuccess: {
    backgroundColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOpacity: 0.3,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#007AFF',
    shadowOpacity: 0,
    elevation: 0,
  },
  
  // Tamanhos
  buttonSmall: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  buttonMedium: {
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  buttonLarge: {
    paddingHorizontal: 32,
    paddingVertical: 18,
  },
  
  // Estados
  buttonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonFullWidth: {
    width: '100%',
  },
  
  // Textos
  text: {
    fontWeight: '600',
  },
  textPrimary: {
    color: '#fff',
  },
  textSecondary: {
    color: '#333',
  },
  textDanger: {
    color: '#fff',
  },
  textSuccess: {
    color: '#fff',
  },
  textOutline: {
    color: '#007AFF',
  },
  
  textSmall: {
    fontSize: 14,
  },
  textMedium: {
    fontSize: 16,
  },
  textLarge: {
    fontSize: 18,
  },
});

export default Button;
