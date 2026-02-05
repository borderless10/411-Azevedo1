/**
 * Tela de Feed
 * Mostra dicas rápidas e uma linha do tempo simples de atividades.
 * Tudo é estático por enquanto (sem integração com backend).
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Layout } from '../../components/Layout/Layout';

type Tip = {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  tag: string;
};

type ActivityItem = {
  id: string;
  label: string;
  detail: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  timeAgo: string;
};

const tips: Tip[] = [
  {
    id: '1',
    title: 'Comece pelo essencial',
    description: 'Liste seus gastos fixos (aluguel, contas, mercado) antes de qualquer compra por impulso.',
    icon: 'checkbox-outline',
    color: '#4CAF50',
    tag: 'Organização',
  },
  {
    id: '2',
    title: 'Registre pequenos gastos',
    description: 'Café, delivery e corridas de app somam mais do que parece. Registrar ajuda a enxergar vazamentos.',
    icon: 'cafe-outline',
    color: '#FF9800',
    tag: 'Consumo',
  },
  {
    id: '3',
    title: 'Defina um limite de lazer',
    description: 'Separe um valor por mês só para lazer. Gastar com culpa reduz a chance de seguir o plano.',
    icon: 'happy-outline',
    color: '#03A9F4',
    tag: 'Equilíbrio',
  },
];

const activities: ActivityItem[] = [
  {
    id: 'a1',
    label: 'Você criou sua conta',
    detail: 'Bem-vindo(a)! Acompanhe aqui os próximos passos.',
    icon: 'person-add-outline',
    color: '#4CAF50',
    timeAgo: 'há poucos minutos',
  },
  {
    id: 'a2',
    label: 'Dica: registre sua primeira renda',
    detail: 'Use o botão "Adicionar Renda" na Home para começar.',
    icon: 'cash-outline',
    color: '#8BC34A',
    timeAgo: 'hoje',
  },
  {
    id: 'a3',
    label: 'Configure suas metas',
    detail: 'Na tela de Metas você poderá definir objetivos como reserva de emergência.',
    icon: 'flag-outline',
    color: '#F44336',
    timeAgo: 'em breve',
  },
];

export const FeedScreen = () => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

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
  }, []);

  return (
    <Layout title="Feed" showBackButton={false} showSidebar={true}>
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
          {/* Cabeçalho */}
          <View style={styles.header}>
            <Ionicons name="newspaper-outline" size={64} color="#007AFF" />
            <Text style={styles.title}>Feed</Text>
            <Text style={styles.subtitle}>
              Dicas rápidas e um resumo do que você pode fazer no app.
            </Text>
          </View>

          {/* Dicas rápidas */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dicas rápidas</Text>
            {tips.map((tip) => (
              <View key={tip.id} style={styles.tipCard}>
                <View style={[styles.tipIconContainer, { backgroundColor: `${tip.color}20` }]}>
                  <Ionicons name={tip.icon} size={24} color={tip.color} />
                </View>
                <View style={styles.tipContent}>
                  <View style={styles.tipHeader}>
                    <Text style={styles.tipTitle}>{tip.title}</Text>
                    <View style={[styles.tipTag, { borderColor: tip.color }]}>
                      <Text style={[styles.tipTagText, { color: tip.color }]}>
                        {tip.tag}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.tipDescription}>{tip.description}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Linha do tempo simples */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Linha do tempo</Text>
            <View style={styles.timeline}>
              {activities.map((activity, index) => (
                <View key={activity.id} style={styles.timelineItemWrapper}>
                  {/* Linha/bolinha da timeline */}
                  <View style={styles.timelineLeft}>
                    <View style={styles.timelineLineTop(index === 0)} />
                    <View
                      style={[
                        styles.timelineDot,
                        { borderColor: activity.color, backgroundColor: `${activity.color}30` },
                      ]}
                    >
                      <Ionicons name={activity.icon} size={16} color={activity.color} />
                    </View>
                    <View style={styles.timelineLineBottom(index === activities.length - 1)} />
                  </View>

                  {/* Conteúdo */}
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineLabel}>{activity.label}</Text>
                    <Text style={styles.timelineDetail}>{activity.detail}</Text>
                    <Text style={styles.timelineTime}>{activity.timeAgo}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  tipIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tipContent: {
    flex: 1,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  tipTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginRight: 8,
  },
  tipTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  tipTagText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  tipDescription: {
    fontSize: 13,
    color: '#ccc',
    lineHeight: 18,
  },
  timeline: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    paddingVertical: 8,
    paddingRight: 12,
    paddingLeft: 4,
    borderWidth: 1,
    borderColor: '#333',
  },
  timelineItemWrapper: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  timelineLeft: {
    width: 36,
    alignItems: 'center',
  },
  timelineLineTop: (isFirst: boolean) => ({
    flex: isFirst ? 0 : 1,
    width: 2,
    backgroundColor: '#333',
  }),
  timelineDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  timelineLineBottom: (isLast: boolean) => ({
    flex: isLast ? 0 : 1,
    width: 2,
    backgroundColor: '#333',
  }),
  timelineContent: {
    flex: 1,
    paddingLeft: 8,
    paddingRight: 4,
  },
  timelineLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  timelineDetail: {
    fontSize: 13,
    color: '#ccc',
    marginBottom: 2,
  },
  timelineTime: {
    fontSize: 11,
    color: '#777',
  },
});

export default FeedScreen;
