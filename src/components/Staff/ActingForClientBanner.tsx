import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../hooks/useAuth";
import { userService } from "../../services/userServices";
import { profileDisplayName } from "../../utils/chatDisplayNames";
import { staffClientId } from "../../utils/staffClientContext";

export function ActingForClientBanner({
  clientId,
}: {
  clientId?: string | null;
}) {
  const { user } = useAuth();
  const actingId = staffClientId(user, clientId);
  const [name, setName] = useState("");

  useEffect(() => {
    if (!actingId) {
      setName("");
      return;
    }
    let cancelled = false;
    userService
      .getUserById(actingId)
      .then((profile) => {
        if (!cancelled) {
          setName(profileDisplayName(profile, "cliente"));
        }
      })
      .catch(() => {
        if (!cancelled) setName("cliente");
      });
    return () => {
      cancelled = true;
    };
  }, [actingId]);

  if (!actingId) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>
        Lançando na conta de {name || "cliente"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "#f3e8ff",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  text: {
    color: "#6b21a8",
    fontWeight: "700",
    fontSize: 14,
  },
});
