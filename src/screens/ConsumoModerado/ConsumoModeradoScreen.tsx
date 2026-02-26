/**
 * Tela de Consumo Moderado
 */

import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Layout } from "../../components/Layout/Layout";
import { useAuth } from "../../hooks/useAuth";
import expenseServices from "../../services/expenseServices";
import { formatCurrency } from "../../utils/currencyUtils";
import {
  subtractDays,
  getStartOfDay,
  getEndOfDay,
  getFriendlyDateLabel,
  getFirstDayOfMonth,
  addDays,
} from "../../utils/dateUtils";
import { useNavigation } from "../../routes/NavigationContext";

export const ConsumoModeradoScreen = () => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const { user } = useAuth();
  const { currentScreen } = useNavigation();
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState<Array<{ date: Date; total: number }>>([]);

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

    const fetchMonth = async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        const today = new Date();
        const start = getFirstDayOfMonth(today);
        const end = getEndOfDay(today);

        const expenses = await expenseServices.getExpenses(user.id, {
          startDate: start,
          endDate: end,
        });

        // Inicializar mapa de datas para todos os dias do mês até hoje
        const map = new Map<string, number>();
        let cursor = getStartOfDay(start);
        while (cursor <= getStartOfDay(today)) {
          map.set(cursor.toDateString(), 0);
          cursor = addDays(cursor, 1);
        }

        // Debug: mostrar alguns gastos retornados
        console.log("🔎 [CONSUMO] expenses sample:", expenses.slice(0, 6));

        // Agregar valores por dia (forçando value como número)
        expenses.forEach((exp) => {
          const expDate = new Date(exp.date);
          const key = getStartOfDay(expDate).toDateString();
          const prev = map.get(key) ?? 0;
          const val =
            typeof exp.value === "number"
              ? exp.value
              : parseFloat(String(exp.value)) || 0;
          map.set(key, prev + val);
        });

        const list: Array<{ date: Date; total: number }> = [];
        Array.from(map.entries()).forEach(([k, v]) => {
          list.push({ date: new Date(k), total: v });
        });

        setDays(list);
      } catch (err) {
        console.error(
          "❌ [CONSUMO] Erro ao buscar gastos para Consumo Moderado:",
          err,
        );
      } finally {
        setLoading(false);
      }
    };

    // Buscar ao montar e sempre que a tela ficar ativa
    if (currentScreen === "ConsumoModerado") {
      fetchMonth();
    }
  }, [user]);

  return (
    <Layout title="Consumo Moderado" showBackButton={false} showSidebar={true}>
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
          <View style={styles.header}>
            <Ionicons name="leaf-outline" size={64} color="#4CAF50" />
            <Text style={styles.title}>Consumo Moderado</Text>
            <Text style={styles.subtitle}>
              Acompanhe e gerencie seu consumo de forma consciente
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Consumo dos últimos 7 dias</Text>
            {loading ? (
              <ActivityIndicator color="#4CAF50" style={{ marginTop: 12 }} />
            ) : (
              <View style={{ marginTop: 12 }}>
                {days.map((d) => (
                  <View style={styles.dayRow} key={d.date.toDateString()}>
                    <Text style={styles.dayLabel}>
                      {getFriendlyDateLabel(d.date)}
                    </Text>
                    <Text style={styles.dayAmount}>
                      {formatCurrency(d.total)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            <Text style={[styles.cardText, { marginTop: 14 }]}>
              Os valores acima foram extraídos dos gastos que você já cadastrou
              na tela principal.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
    paddingVertical: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#333",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
  },
  cardText: {
    fontSize: 14,
    color: "#ccc",
    lineHeight: 20,
  },
  dayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  dayLabel: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  dayAmount: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});

export default ConsumoModeradoScreen;
