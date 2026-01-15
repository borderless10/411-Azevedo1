/**
 * Componente de seleção de data
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDateForDisplay } from '../utils/dateUtils';

interface DatePickerProps {
  label: string;
  date: Date;
  onChangeDate: (date: Date) => void;
  error?: string;
  maxDate?: Date;
  minDate?: Date;
  editable?: boolean;
  style?: ViewStyle;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  label,
  date,
  onChangeDate,
  error,
  maxDate = new Date(),
  minDate,
  editable = true,
  style,
}) => {
  const [showPicker, setShowPicker] = useState(false);

  const handlePress = () => {
    if (!editable) return;
    
    // Para web, usar input nativo HTML
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'date';
      input.value = date.toISOString().split('T')[0];
      
      if (maxDate) {
        input.max = maxDate.toISOString().split('T')[0];
      }
      if (minDate) {
        input.min = minDate.toISOString().split('T')[0];
      }

      input.onchange = (e: any) => {
        const selectedDate = new Date(e.target.value + 'T12:00:00');
        onChangeDate(selectedDate);
      };

      input.click();
    } else {
      // Para mobile, mostrar picker nativo (implementar depois com DateTimePicker)
      setShowPicker(true);
      // TODO: Implementar @react-native-community/datetimepicker
      console.log('DatePicker mobile: implementar com RNDateTimePicker');
    }
  };

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>
        <Ionicons name="calendar" size={16} color="#007AFF" /> {label}
      </Text>

      <TouchableOpacity
        style={[
          styles.inputWrapper,
          error ? styles.inputWrapperError : null,
          !editable ? styles.inputWrapperDisabled : null,
        ]}
        onPress={handlePress}
        disabled={!editable}
      >
        <Ionicons
          name="calendar-outline"
          size={20}
          color={error ? '#F44336' : '#999'}
          style={styles.inputIcon}
        />
        <Text style={styles.dateText}>{formatDateForDisplay(date)}</Text>
        {error ? (
          <Ionicons name="close-circle" size={20} color="#F44336" style={styles.icon} />
        ) : (
          <Ionicons name="chevron-down" size={20} color="#999" style={styles.icon} />
        )}
      </TouchableOpacity>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  inputWrapperError: {
    borderColor: '#F44336',
    borderWidth: 2,
  },
  inputWrapperDisabled: {
    backgroundColor: '#f5f5f5',
  },
  inputIcon: {
    marginRight: 12,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  icon: {
    marginLeft: 8,
  },
  errorText: {
    color: '#F44336',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});

export default DatePicker;
