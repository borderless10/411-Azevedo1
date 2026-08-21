import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../hooks/useAuth";
import { CoupleMember } from "../../types/auth";
import { getCoupleMemberLabel } from "../../utils/coupleAccount";

export const CoupleMemberPickerScreen = () => {
  const { user, setActiveCoupleMember, signOut } = useAuth();
  const [saving, setSaving] = useState<CoupleMember | null>(null);

  const handleSelect = async (member: CoupleMember) => {
    try {
      setSaving(member);
      await setActiveCoupleMember(member);
    } finally {
      setSaving(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Image
            source={require("../../../assets/logo411.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Quem está acessando agora?</Text>
          <Text style={styles.subtitle}>
            Esta conta é compartilhada. Escolha o integrante para registrar o
            Consumo Moderado e os gastos desta sessão.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.memberButton}
          onPress={() => handleSelect(1)}
          disabled={saving !== null}
        >
          {saving === 1 ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="heart" size={22} color="#ff4d6d" />
              <Text style={styles.memberText}>
                {getCoupleMemberLabel(user, 1)}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.memberButton}
          onPress={() => handleSelect(2)}
          disabled={saving !== null}
        >
          {saving === 2 ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="heart" size={22} color="#ff4d6d" />
              <Text style={styles.memberText}>
                {getCoupleMemberLabel(user, 2)}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => signOut()}
          disabled={saving !== null}
        >
          <Text style={styles.logoutText}>Sair da conta</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  logo: {
    width: 180,
    height: 72,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    lineHeight: 20,
  },
  memberButton: {
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  memberText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  logoutButton: {
    marginTop: 16,
    alignItems: "center",
    padding: 12,
  },
  logoutText: {
    color: "#999",
    fontSize: 14,
  },
});

export default CoupleMemberPickerScreen;
