/**
 * Tela para visualização read-only do planejamento pelo cliente
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Layout } from "../../components/Layout/Layout";
import { useAuth } from "../../hooks/useAuth";
import { planningServices } from "../../services/planningServices";
import { activityServices } from "../../services/activityServices";
import { formatCurrency } from "../../utils/currencyUtils";

export const PlanningViewScreen = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [planning, setPlanning] = useState<any | null>(null);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const p = await planningServices.getPlanning(user.id);
        setPlanning(p);
      } catch (err) {
        console.error("Erro ao carregar planning:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const handleSendComment = async () => {
    if (!user) return;
    if (!comment || comment.trim().length === 0) {
      Alert.alert("Atenção", "Digite um comentário antes de enviar");
      return;
    }

    try {
      setSending(true);
      await activityServices.createActivity(user.id, {
        type: "plan_comment",
        title: "Comentário no planejamento",
        description: comment.trim(),
        metadata: { planningExists: !!planning },
      });
      setComment("");
      Alert.alert("Sucesso", "Comentário enviado ao consultor");
    } catch (err) {
      console.error("Erro ao enviar comentário:", err);
      Alert.alert("Erro", "Não foi possível enviar o comentário");
    } finally {
      setSending(false);
    }
  };

  return (
    <Layout title="Planejamento" showBackButton={true} showSidebar={true}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ padding: 16 }}
      >
        {loading ? (
          <View style={{ alignItems: "center", padding: 24 }}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={{ color: "#999", marginTop: 12 }}>
              Carregando planejamento...
            </Text>
          </View>
        ) : (
          <View>
            {!planning ? (
              // Mostrar exemplo mockado quando não houver planejamento real
              <View style={styles.card}>
                <Text style={styles.exampleLabel}>
                  Exemplo de Planejamento (dados fictícios)
                </Text>
                <Text style={styles.title}>
                  Planejamento criado por consultor
                </Text>
                <View style={styles.row}>
                  <Text style={styles.label}>Renda Mensal:</Text>
                  <Text style={styles.value}>{formatCurrency(4500)}</Text>
                </View>

                <View style={{ marginTop: 12 }}>
                  <Text style={styles.subTitle}>
                    Gastos previstos por categoria
                  </Text>
                  <View style={styles.row}>
                    <Text style={styles.label}>Alimentação</Text>
                    <Text style={styles.value}>{formatCurrency(900)}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Transporte</Text>
                    <Text style={styles.value}>{formatCurrency(300)}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Moradia</Text>
                    <Text style={styles.value}>{formatCurrency(1500)}</Text>
                  </View>
                </View>

                <View style={{ marginTop: 12 }}>
                  <Text style={styles.subTitle}>
                    Módulos diários adicionais
                  </Text>
                  <View style={styles.moduleRow}>
                    <Text style={styles.moduleName}>
                      Uber / Transporte por app
                    </Text>
                    <Text style={styles.moduleDesc}>
                      Registrar viagens diárias quando aplicável
                    </Text>
                  </View>
                  <View style={styles.moduleRow}>
                    <Text style={styles.moduleName}>Mercado</Text>
                    <Text style={styles.moduleDesc}>
                      Controle separado para compras de supermercado
                    </Text>
                  </View>
                </View>

                <View style={{ marginTop: 12 }}>
                  <Text style={styles.subTitle}>Observações do consultor</Text>
                  <Text style={styles.notes}>
                    Sugestão: manter média diária abaixo da meta para evitar
                    estouro do orçamento.
                  </Text>
                </View>

                <View style={{ marginTop: 18 }}>
                  <Text style={styles.subTitle}>
                    Enviar comentário para o consultor
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={comment}
                    onChangeText={setComment}
                    placeholder="Escreva uma dúvida ou comentário..."
                    placeholderTextColor="#666"
                    multiline
                  />
                  <TouchableOpacity
                    style={styles.sendButton}
                    onPress={handleSendComment}
                    disabled={sending}
                  >
                    <Text style={styles.sendButtonText}>
                      {sending ? "Enviando..." : "Enviar comentário"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.card}>
                <Text style={styles.title}>
                  Planejamento criado por consultor
                </Text>
                {planning.monthlyIncome !== undefined && (
                  <View style={styles.row}>
                    <Text style={styles.label}>Renda Mensal:</Text>
                    <Text style={styles.value}>
                      {formatCurrency(planning.monthlyIncome)}
                    </Text>
                  </View>
                )}

                {planning.plannedByCategory && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={styles.subTitle}>
                      Gastos previstos por categoria
                    </Text>
                    {Object.entries(planning.plannedByCategory).map(
                      ([cat, amt]) => (
                        <View key={cat} style={styles.row}>
                          <Text style={styles.label}>{cat}</Text>
                          <Text style={styles.value}>
                            {formatCurrency(amt)}
                          </Text>
                        </View>
                      ),
                    )}
                  </View>
                )}

                {planning.modules && planning.modules.length > 0 && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={styles.subTitle}>
                      Módulos diários adicionais
                    </Text>
                    {planning.modules.map((m: any) => (
                      <View key={m.id} style={styles.moduleRow}>
                        <Text style={styles.moduleName}>
                          {m.name}
                          {m.mandatory ? " *" : ""}
                        </Text>
                        {m.description ? (
                          <Text style={styles.moduleDesc}>{m.description}</Text>
                        ) : null}
                      </View>
                    ))}
                  </View>
                )}

                {planning.notes ? (
                  <View style={{ marginTop: 12 }}>
                    <Text style={styles.subTitle}>
                      Observações do consultor
                    </Text>
                    <Text style={styles.notes}>{planning.notes}</Text>
                  </View>
                ) : null}

                <View style={{ marginTop: 18 }}>
                  <Text style={styles.subTitle}>
                    Enviar comentário para o consultor
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={comment}
                    onChangeText={setComment}
                    placeholder="Escreva uma dúvida ou comentário..."
                    placeholderTextColor="#666"
                    multiline
                  />
                  <TouchableOpacity
                    style={styles.sendButton}
                    onPress={handleSendComment}
                    disabled={sending}
                  >
                    <Text style={styles.sendButtonText}>
                      {sending ? "Enviando..." : "Enviar comentário"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  card: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#333",
  },
  empty: { color: "#999", textAlign: "center", padding: 20 },
  exampleLabel: { color: "#FFD54F", fontWeight: "700", marginBottom: 8 },
  title: { color: "#fff", fontSize: 16, fontWeight: "700" },
  subTitle: { color: "#fff", fontSize: 14, fontWeight: "600", marginBottom: 8 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  label: { color: "#ccc" },
  value: { color: "#fff", fontWeight: "700" },
  moduleRow: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  moduleName: { color: "#fff", fontWeight: "600" },
  moduleDesc: { color: "#999", marginTop: 4 },
  notes: { color: "#ccc" },
  input: {
    backgroundColor: "#0a0a0a",
    color: "#fff",
    minHeight: 80,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  sendButton: {
    backgroundColor: "#4CAF50",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  sendButtonText: { color: "#fff", fontWeight: "700" },
});

export default PlanningViewScreen;
