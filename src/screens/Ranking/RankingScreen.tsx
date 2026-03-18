import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { Layout } from "../../components/Layout/Layout";
import { rankingServices, RankingEntry } from "../../services/rankingServices";
import { userService } from "../../services/userServices";

type Row = {
  position: number;
  userId: string;
  displayName: string;
  zeroDays: number;
};

export const RankingScreen = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const ranking = await rankingServices.getRanking(50);
        const out: Row[] = [];

        for (let i = 0; i < ranking.length; i++) {
          const r: RankingEntry = ranking[i];
          let display = r.userId;
          try {
            const u = await userService.getUserById(r.userId);
            if (u) display = u.username || u.name || u.email || display;
          } catch (e) {
            // ignore
          }
          out.push({ position: i + 1, userId: r.userId, displayName: display, zeroDays: r.zeroDays });
        }

        if (mounted) setRows(out);
      } catch (error) {
        console.error("❌ [RANKING SCREEN] Erro ao carregar ranking:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  return (
    <Layout title="Ranking" showBackButton={false} showSidebar={true}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.header}>Ranking — Zeros na planilha</Text>
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="large" color="#8c52ff" />
          </View>
        ) : (
          rows.map((r) => (
            <View key={r.userId} style={styles.row}>
              <Text style={styles.pos}>{r.position}º</Text>
              <View style={styles.info}>
                <Text style={styles.name}>{r.displayName}</Text>
                <Text style={styles.detail}>{r.zeroDays} dias com zero</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { padding: 16 },
  header: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 12 },
  loadingRow: { padding: 40, alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#222' },
  pos: { width: 48, color: '#fff', fontSize: 16, fontWeight: '700' },
  info: { flex: 1 },
  name: { color: '#fff', fontSize: 16, fontWeight: '600' },
  detail: { color: '#999', fontSize: 13 },
});

export default RankingScreen;
