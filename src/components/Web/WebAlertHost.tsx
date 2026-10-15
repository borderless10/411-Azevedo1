import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type AlertButton = {
  text?: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
};

type AlertRequest = {
  title: string;
  message: string;
  buttons: AlertButton[];
};

type AlertFn = (
  title: string,
  message?: string,
  buttons?: AlertButton[],
  options?: { cancelable?: boolean },
) => void;

let publishAlert: ((request: AlertRequest) => void) | null = null;

function installWebAlert() {
  if (Platform.OS !== "web") return;
  const alertApi = Alert as typeof Alert & { __visaoWebAlert?: boolean };
  if (alertApi.__visaoWebAlert) return;
  alertApi.__visaoWebAlert = true;
  const original = Alert.alert.bind(Alert) as AlertFn;
  Alert.alert = ((title, message, buttons, options) => {
    const list =
      buttons && buttons.length > 0 ? buttons : [{ text: "OK", style: "default" as const }];
    if (!publishAlert) {
      original(title, message, buttons, options);
      return;
    }
    publishAlert({
      title: String(title ?? ""),
      message: message ? String(message) : "",
      buttons: list,
    });
  }) as typeof Alert.alert;
}

installWebAlert();

export const WebAlertHost: React.FC = () => {
  const [request, setRequest] = useState<AlertRequest | null>(null);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    publishAlert = setRequest;
    return () => {
      publishAlert = null;
    };
  }, []);

  if (Platform.OS !== "web" || !request) return null;

  const run = (button: AlertButton) => {
    setRequest(null);
    button.onPress?.();
  };

  return (
    <Modal transparent animationType="fade" visible onRequestClose={() => setRequest(null)}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {request.title ? <Text style={styles.title}>{request.title}</Text> : null}
          {request.message ? <Text style={styles.message}>{request.message}</Text> : null}
          <View style={styles.actions}>
            {request.buttons.map((button, index) => {
              const label = button.text || "OK";
              const kind = button.style || "default";
              return (
                <TouchableOpacity
                  key={`${label}-${index}`}
                  style={[
                    styles.button,
                    kind === "cancel" && styles.buttonCancel,
                    kind === "destructive" && styles.buttonDestructive,
                    kind === "default" && styles.buttonDefault,
                  ]}
                  onPress={() => run(button)}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      kind === "cancel" && styles.buttonTextCancel,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#0f0f10",
    borderRadius: 14,
    padding: 20,
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  message: {
    color: "#d0d0d0",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: 8,
  },
  button: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDefault: {
    backgroundColor: "#8c52ff",
  },
  buttonDestructive: {
    backgroundColor: "#ff4d6d",
  },
  buttonCancel: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#444",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
  },
  buttonTextCancel: {
    color: "#ddd",
  },
});
