import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

type Props = { children: React.ReactNode };
type State = { error: Error | null };

/**
 * Última linha de defesa: erro de renderização mostra tela de recuperação
 * em vez de fechar o app sem explicação. O erro fica visível para relato.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error?.message, info?.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Algo deu errado nesta tela</Text>
        <Text style={styles.message}>
          Toque em tentar de novo para continuar. Se repetir, tire uma foto
          desta tela e avise a equipe.
        </Text>
        <Text style={styles.detail} numberOfLines={3}>
          {String(this.state.error?.message || this.state.error || "")}
        </Text>
        <TouchableOpacity style={styles.button} onPress={this.reset}>
          <Text style={styles.buttonText}>Tentar de novo</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
    backgroundColor: "#0d0d12",
  },
  title: { color: "#fff", fontSize: 18, fontWeight: "700", textAlign: "center" },
  message: { color: "#bbb", fontSize: 14, textAlign: "center", lineHeight: 20 },
  detail: { color: "#777", fontSize: 12, textAlign: "center" },
  button: {
    marginTop: 8,
    backgroundColor: "#8c52ff",
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 10,
  },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
