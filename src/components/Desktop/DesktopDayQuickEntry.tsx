/**
 * Linha única de lançamento rápido (desktop): descrição · valor · pagamento · +
 * Reutilizado em Consumo Moderado, gastos acompanhados e rendas acompanhadas.
 */
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  DECIMAL_INPUT_KEYBOARD,
  formatCurrencyWithoutSymbol,
  parseCurrency,
  sanitizeDecimalInput,
} from "../../utils/currencyUtils";
import { CreditCard } from "../../types/creditCard";

export type QuickPayment = "cash" | "card";

export type DesktopDayQuickEntryPayload = {
  description: string;
  value: number;
  payment: QuickPayment;
  cardId?: string;
};

type Props = {
  /** Se definido, trava a descrição (ex.: título do acompanhamento). */
  lockedDescription?: string;
  descriptionPlaceholder?: string;
  showPayment?: boolean;
  cards?: CreditCard[];
  saving?: boolean;
  onSubmit: (payload: DesktopDayQuickEntryPayload) => void | Promise<void>;
  /** true assim que o usuário começa a digitar descrição (ou há rascunho). */
  onDraftChange?: (hasDraft: boolean) => void;
};

export const DesktopDayQuickEntry: React.FC<Props> = ({
  lockedDescription,
  descriptionPlaceholder = "Descrição",
  showPayment = true,
  cards = [],
  saving = false,
  onSubmit,
  onDraftChange,
}) => {
  const [description, setDescription] = useState(lockedDescription || "");
  const [value, setValue] = useState(0);
  const [valueText, setValueText] = useState("");
  const [payment, setPayment] = useState<QuickPayment>("cash");
  const [cardId, setCardId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (lockedDescription) setDescription(lockedDescription);
  }, [lockedDescription]);

  const hasDraft = useMemo(() => {
    if (lockedDescription) return value > 0 || valueText.trim().length > 0;
    return description.trim().length > 0 || value > 0;
  }, [lockedDescription, description, value, valueText]);

  useEffect(() => {
    onDraftChange?.(hasDraft);
  }, [hasDraft, onDraftChange]);

  const canSubmit = useMemo(() => {
    const desc = (lockedDescription || description).trim();
    if (desc.length < 3) return false;
    if (value <= 0) return false;
    if (!showPayment) return true;
    if (payment !== "cash" && payment !== "card") return false;
    if (payment === "card" && !cardId) return false;
    return true;
  }, [lockedDescription, description, value, showPayment, payment, cardId]);

  const setValueFromText = (text: string) => {
    if (!text.trim()) {
      setValueText("");
      setValue(0);
      return;
    }
    const sanitized = sanitizeDecimalInput(text);
    setValueText(sanitized);
    setValue(parseCurrency(sanitized));
  };

  const resetSoft = () => {
    if (!lockedDescription) setDescription("");
    setValue(0);
    setValueText("");
    setError("");
    if (payment === "card" && cards.length === 1) {
      setCardId(cards[0].id);
    }
  };

  const handleSubmit = async () => {
    const desc = (lockedDescription || description).trim();
    if (desc.length < 3) {
      setError("Informe a descrição");
      return;
    }
    if (value <= 0) {
      setError("Informe o valor");
      return;
    }
    if (showPayment && payment === "card" && !cardId) {
      setError("Selecione o cartão");
      return;
    }
    if (showPayment && payment !== "cash" && payment !== "card") {
      setError("Selecione a forma de pagamento");
      return;
    }

    setError("");
    await onSubmit({
      description: desc,
      value,
      payment: showPayment ? payment : "cash",
      cardId: showPayment && payment === "card" ? cardId : undefined,
    });
    resetSoft();
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <TextInput
          style={[
            styles.desc,
            lockedDescription ? styles.descLocked : null,
          ]}
          value={lockedDescription || description}
          onChangeText={lockedDescription ? undefined : setDescription}
          placeholder={descriptionPlaceholder}
          placeholderTextColor="#666"
          editable={!saving && !lockedDescription}
          onSubmitEditing={() => {
            if (canSubmit) void handleSubmit();
          }}
        />
        <View style={styles.valueBox}>
          <Text style={styles.rs}>R$</Text>
          <TextInput
            style={styles.value}
            value={valueText}
            onChangeText={setValueFromText}
            placeholder="0,00"
            placeholderTextColor="#666"
            keyboardType={DECIMAL_INPUT_KEYBOARD}
            editable={!saving}
            onBlur={() => {
              if (value > 0) {
                setValueText(formatCurrencyWithoutSymbol(value));
              }
            }}
            onSubmitEditing={() => {
              if (canSubmit) void handleSubmit();
            }}
          />
        </View>
        {showPayment ? (
          <>
            <TouchableOpacity
              style={[styles.pay, payment === "cash" && styles.payOn]}
              onPress={() => setPayment("cash")}
              disabled={saving}
              accessibilityLabel="Dinheiro"
            >
              <Ionicons
                name="wallet"
                size={16}
                color={payment === "cash" ? "#fff" : "#999"}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pay, payment === "card" && styles.payOn]}
              onPress={() => {
                setPayment("card");
                if (cards.length > 0) {
                  const stillValid = cards.some((c) => c.id === cardId);
                  if (!stillValid) setCardId(cards[0].id);
                }
              }}
              disabled={saving}
              accessibilityLabel="Crédito"
            >
              <Ionicons
                name="card"
                size={16}
                color={payment === "card" ? "#fff" : "#999"}
              />
            </TouchableOpacity>
          </>
        ) : null}
        <TouchableOpacity
          style={[styles.add, !canSubmit && styles.addDisabled]}
          onPress={() => {
            if (canSubmit) void handleSubmit();
          }}
          disabled={saving || !canSubmit}
          accessibilityLabel="Confirmar lançamento"
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="add" size={22} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {showPayment && payment === "card" ? (
        cards.length === 0 ? (
          <Text style={styles.error}>Sem cartões cadastrados</Text>
        ) : (
          <View style={styles.cards}>
            {cards.map((card) => {
              const active = cardId === card.id;
              return (
                <TouchableOpacity
                  key={card.id}
                  style={[styles.cardChip, active && styles.cardChipOn]}
                  onPress={() => setCardId(card.id)}
                  disabled={saving}
                >
                  <Text
                    style={[styles.cardText, active && styles.cardTextOn]}
                  >
                    {card.bank} ••••{card.last4}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 8,
    gap: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  desc: {
    flex: 1.4,
    minWidth: 120,
    backgroundColor: "#07050D",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    color: "#fff",
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  descLocked: {
    opacity: 0.85,
    color: "#cfc7e0",
  },
  valueBox: {
    flex: 0.9,
    minWidth: 96,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#07050D",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  rs: {
    color: "#B900FF",
    fontWeight: "800",
    fontSize: 12,
    marginRight: 4,
  },
  value: {
    flex: 1,
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    paddingVertical: 0,
    // @ts-ignore RN Web
    outlineStyle: "none",
  },
  pay: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    backgroundColor: "#07050D",
    alignItems: "center",
    justifyContent: "center",
  },
  payOn: {
    borderColor: "#B900FF",
    backgroundColor: "#B900FF",
  },
  add: {
    width: 40,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#B900FF",
    alignItems: "center",
    justifyContent: "center",
  },
  addDisabled: {
    opacity: 0.35,
  },
  cards: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  cardChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    backgroundColor: "#07050D",
  },
  cardChipOn: {
    borderColor: "#B900FF",
    backgroundColor: "rgba(185,0,255,0.25)",
  },
  cardText: {
    color: "#999",
    fontSize: 12,
    fontWeight: "600",
  },
  cardTextOn: {
    color: "#fff",
  },
  error: {
    color: "#FF008A",
    fontSize: 12,
    fontWeight: "600",
  },
});

export default DesktopDayQuickEntry;
