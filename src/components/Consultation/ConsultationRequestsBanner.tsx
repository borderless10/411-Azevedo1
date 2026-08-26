import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import { usePendingConsultationRequests } from "../../hooks/useConsultationRequest";
import { useNavigation } from "../../routes/NavigationContext";
import { useAuth } from "../../hooks/useAuth";

export const ConsultationRequestsBanner: React.FC = () => {
  const { colors } = useTheme();
  const { navigate } = useNavigation();
  const { user } = useAuth();
  const requests = usePendingConsultationRequests();
  const isAdmin = user?.isAdmin === true || user?.role === "admin";

  const openClientScheduling = (userId: string) => {
    if (isAdmin) {
      navigate("EditUser", { userId, focusConsultation: true });
      return;
    }
    navigate("ClientDetail", { clientId: userId, focusConsultation: true });
  };

  return (
    <View
      style={[
        styles.wrapper,
        {
          backgroundColor: colors.card,
          borderColor: requests.length ? "#ff4d6d" : colors.border,
        },
      ]}
    >
      <View style={styles.header}>
        <View
          style={[
            styles.headerIcon,
            { backgroundColor: requests.length ? "#ff4d6d" : "#8c52ff" },
          ]}
        >
          <Ionicons name="calendar" size={20} color="#fff" />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>
            Agendamento de consultoria
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {requests.length === 0
              ? "Quando um cliente solicitar liberação, ele aparecerá aqui."
              : requests.length === 1
                ? "1 cliente aguardando link de agendamento"
                : `${requests.length} clientes aguardando link de agendamento`}
          </Text>
        </View>
      </View>

      {requests.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {requests.map((request) => (
            <TouchableOpacity
              key={request.id}
              style={[styles.chip, { borderColor: colors.border }]}
              onPress={() => openClientScheduling(request.userId)}
            >
              <Text
                style={[styles.chipName, { color: colors.text }]}
                numberOfLines={1}
              >
                {request.userDisplayName || "Cliente"}
              </Text>
              <Text style={[styles.chipAction, { color: colors.primary }]}>
                Colocar link →
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <View
          style={[
            styles.helpBox,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.helpTitle, { color: colors.text }]}>
            Como liberar manualmente
          </Text>
          <Text style={[styles.helpText, { color: colors.textSecondary }]}>
            {isAdmin
              ? "Abra o cliente → Editar usuário → preencha “Link de agendamento de consultoria” e, se quiser, o melhor dia → Salvar."
              : "Abra o cliente → card “Agendamento de consultoria” → cole o link e salve."}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  chipsRow: {
    gap: 8,
    paddingRight: 4,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minWidth: 180,
    maxWidth: 240,
    gap: 4,
  },
  chipName: {
    fontSize: 14,
    fontWeight: "700",
  },
  chipAction: {
    fontSize: 12,
    fontWeight: "600",
  },
  helpBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  helpText: {
    fontSize: 13,
    lineHeight: 19,
  },
});

export default ConsultationRequestsBanner;
