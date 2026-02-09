/**
 * Tela de Feed
 * Mostra dicas rápidas e uma linha do tempo de atividades do usuário.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Layout } from '../../components/Layout/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { activityServices } from '../../services/activityServices';
import { Activity, getActivityTypeInfo } from '../../types/activity';
import { formatCurrency } from '../../utils/currencyUtils';

type Tip = {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  tag: string;
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

/**
 * Formatador de "tempo atrás"
 */
const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'agora mesmo';
  } else if (diffMinutes < 60) {
    return `há ${diffMinutes} min`;
  } else if (diffHours < 24) {
    return `há ${diffHours}h`;
  } else if (diffDays === 1) {
    return 'ontem';
  } else if (diffDays < 7) {
    return `há ${diffDays} dias`;
  } else {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    });
  }
};

export const FeedScreen = () => {
  const { user } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  useEffect(() => {
    loadActivities();
  }, []);

  useEffect(() => {
    if (!loading) {
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
    }
  }, [loading]);

  const loadActivities = async () => {
    if (!user) {
      console.log('⚠️ [FEED] Usuário não disponível');
      return;
    }

    try {
      console.log('🔄 [FEED] Iniciando carregamento de atividades para:', user.id);
      setLoading(true);
      const fetchedActivities = await activityServices.getRecentActivities(user.id);
      setActivities(fetchedActivities);
      console.log('✅ [FEED] Atividades carregadas:', fetchedActivities.length);
      
      if (fetchedActivities.length === 0) {
        console.log('⚠️ [FEED] Nenhuma atividade encontrada. Possíveis causas:');
        console.log('  1. Você ainda não criou nenhuma renda/gasto/meta');
        console.log('  2. O índice do Firestore não foi criado');
        console.log('  3. As atividades não estão sendo registradas');
      }
    } catch (error) {
      console.error('❌ [FEED] Erro ao carregar atividades:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadActivities();
    setRefreshing(false);
  };

  const renderActivity = (activity: Activity, index: number) => {
    const typeInfo = getActivityTypeInfo(activity.type);
    const isFirst = index === 0;
    const isLast = index === activities.length - 1;

    return (
      <View key={activity.id} style={styles.timelineItemWrapper}>
        {/* Linha/bolinha da timeline */}
        <View style={styles.timelineLeft}>
          <View style={[styles.timelineLineTop, isFirst && styles.timelineLineHidden]} />
          <View
            style={[
              styles.timelineDot,
              { 
                borderColor: typeInfo.color, 
                backgroundColor: `${typeInfo.color}30` 
              },
            ]}
          >
            <Ionicons name={typeInfo.icon as any} size={16} color={typeInfo.color} />
          </View>
          <View style={[styles.timelineLineBottom, isLast && styles.timelineLineHidden]} />
        </View>

        {/* Conteúdo */}
        <View style={styles.timelineContent}>
          <Text style={styles.timelineLabel}>{activity.title}</Text>
          {activity.description && (
            <Text style={styles.timelineDetail}>{activity.description}</Text>
          )}
          {activity.metadata?.category && (
            <Text style={styles.timelineCategory}>
              {activity.metadata.category}
            </Text>
          )}
          <Text style={styles.timelineTime}>{formatTimeAgo(activity.createdAt)}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <Layout title="Feed" showBackButton={false} showSidebar={true}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Carregando feed...</Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout title="Feed" showBackButton={false} showSidebar={true}>
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#007AFF"
            colors={['#007AFF']}
          />
        }
      >
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
              Dicas rápidas e suas atividades recentes
            </Text>
          </View>

          {/* Dicas rápidas */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💡 Dicas rápidas</Text>
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

          {/* Linha do tempo */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📜 Linha do tempo</Text>
            {activities.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="time-outline" size={48} color="#666" />
                <Text style={styles.emptyText}>Nenhuma atividade ainda</Text>
                <Text style={styles.emptySubtext}>
                  Suas ações aparecerão aqui
                </Text>
              </View>
            ) : (
              <View style={styles.timeline}>
                {activities.map((activity, index) => renderActivity(activity, index))}
              </View>
            )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
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
  timelineLineTop: {
    flex: 1,
    width: 2,
    backgroundColor: '#333',
  },
  timelineLineHidden: {
    opacity: 0,
  },
  timelineDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  timelineLineBottom: {
    flex: 1,
    width: 2,
    backgroundColor: '#333',
  },
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
  timelineCategory: {
    fontSize: 11,
    color: '#007AFF',
    marginBottom: 2,
  },
  timelineTime: {
    fontSize: 11,
    color: '#777',
  },
  emptyState: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});

export default FeedScreen;
