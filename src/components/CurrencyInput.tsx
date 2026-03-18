/**
 * Input com máscara de moeda brasileira (R$)
 */

import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { applyCurrencyMask, parseCurrency } from "../utils/currencyUtils";

interface CurrencyInputProps {
  label: string;
  value: number;
  onChangeValue: (value: number) => void;
  error?: string;
  placeholder?: string;
  editable?: boolean;
  icon?: string;
  style?: ViewStyle;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  label,
  value,
  onChangeValue,
  error,
  placeholder = "R$ 0,00",
  editable = true,
  icon = "cash",
  style,
}) => {
  const [displayValue, setDisplayValue] = useState(
    value > 0 ? applyCurrencyMask(String(value * 100)) : "",
  );

  const handleChangeText = (text: string) => {
    // Aplicar máscara
    const masked = applyCurrencyMask(text);
    setDisplayValue(masked);

    // Converter para número e chamar callback
    const numericValue = parseCurrency(masked);
    onChangeValue(numericValue);
  };

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>
        <Ionicons name={icon as any} size={16} color="#8c52ff" /> {label}
      </Text>

      <View
        style={[
          styles.inputWrapper,
          error ? styles.inputWrapperError : null,
          !editable ? styles.inputWrapperDisabled : null,
        ]}
      >
        <Text style={styles.currencySymbol}>R$</Text>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#6b6480"
          value={displayValue.replace("R$ ", "")}
          onChangeText={handleChangeText}
          keyboardType="numeric"
          editable={editable}
        />
        {error ? (
          <Ionicons
            name="close-circle"
            size={20}
            color="#ff4d6d"
            style={styles.icon}
          />
        ) : value > 0 ? (
          <Ionicons
            name="checkmark-circle"
            size={20}
            color="#8c52ff"
            style={styles.icon}
          />
        ) : null}
      </View>

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
    fontWeight: "600",
    color: "#fff",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0e0c14",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2a2040",
    paddingHorizontal: 16,
  },
  inputWrapperError: {
    borderColor: "#ff4d6d",
    borderWidth: 2,
  },
  inputWrapperDisabled: {
    backgroundColor: "#1a1528",
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#8c52ff",
    marginRight: 8,
  },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  icon: {
    marginLeft: 8,
  },
  errorText: {
    color: "#ff4d6d",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});

export default CurrencyInput;
