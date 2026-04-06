import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StyleSheet, View, Text, FlatList, SafeAreaView, Pressable, StatusBar, Platform, ActivityIndicator, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, RefreshCw } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useUser } from '@/context/UserContext';
import ScholarshipCard, { Scholarship } from '@/components/ScholarshipCard';
import api from '@/api/axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [activeTab, setActiveTab] = useState('전체');
  const router = useRouter();
  const { profile } = useUser();

  const [data, setData] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mapScholarship = (d: any, recIds: Set<number>): Scholarship => {
    const tags = [];
    if (d.title.includes('공모전')) tags.push('#공모전');
    else tags.push('#장학금');
    if (d.eligibility && d.eligibility.length < 10) tags.push('#' + d.eligibility);

    let parsedAiSummary = [
      d.eligibility || '자격 조건은 상세 요강 참조',
      d.amountInfo || '지원 내역은 상세 요강 참조',
      d.applyPeriod || '모집 기한은 상세 요강 참조'
    ];
    if (d.basicSummary) {
      const bullets = d.basicSummary.split('\n').filter((s: string) => s.trim().startsWith('•')).map((s: string) => s.replace('•', '').trim());
      if (bullets.length > 0) parsedAiSummary = bullets;
    }

    return {
      id: d.id,
      type: d.title.includes('공모전') ? 'contest' : 'scholarship',
      isRecommended: recIds.has(d.id),
      title: d.title,
      aiSummary: parsedAiSummary,
      tags: tags.length ? tags : ['#인하대'],
      dDay: d.dDay || '상시',
    };
  };

  const fetchData = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (profile.major) params.append('major', profile.major);
    if (profile.keywords?.length) params.append('keywords', profile.keywords.join(','));

    Promise.all([
      api.get('/api/scholarships?size=100'),
      api.get(`/api/scholarships/recommended?${params.toString()}`).catch(() => ({ data: [] })),
    ])
      .then(([allRes, recRes]) => {
        const recIds = new Set<number>(
          (recRes.data || []).map((r: any) => r.scholarship?.id ?? r.id).filter(Boolean)
        );

        const rawData = allRes.data.content || allRes.data;
        const mapped: Scholarship[] = rawData.map((d: any) => mapScholarship(d, recIds));

        mapped.sort((a, b) => {
          if (a.isRecommended && !b.isRecommended) return -1;
          if (!a.isRecommended && b.isRecommended) return 1;
          return 0;
        });

        setData(mapped);
        AsyncStorage.setItem('@cache_scholarships', JSON.stringify(mapped)).catch(() => {});
      })
      .catch(async (err) => {
        console.error("API Fetch Error:", err);
        try {
          const cached = await AsyncStorage.getItem('@cache_scholarships');
          if (cached) {
            setData(JSON.parse(cached));
            setError(null);
            return;
          }
        } catch {}
        setError('데이터를 불러오지 못했습니다.');
      })
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, [profile.major, profile.keywords]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      if (activeTab === '전체') return true;
      if (activeTab === '장학금') return item.type === 'scholarship';
      if (activeTab === '공모전') return item.type === 'contest';
      return true;
    });
  }, [data, activeTab]);

  const renderItem = useCallback(({ item }: { item: Scholarship }) => (
    <ScholarshipCard item={item} />
  ), []);

  const keyExtractor = useCallback((item: Scholarship) => item.id.toString(), []);

  const ListHeader = () => (
    <View style={styles.listHeader}>
      <Text style={[styles.listTitle, { color: colors.text }]}>{activeTab} 공고</Text>
      <View style={[styles.countBadge, { backgroundColor: colors.tagBackground }]}>
        <Text style={[styles.countText, { color: colors.textSecondary }]}>{filteredData.length}</Text>
      </View>
    </View>
  );

  const ListEmpty = () => {
    if (loading) return <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />;
    if (error) return (
      <View style={{ alignItems: 'center', marginTop: 40 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 15, marginBottom: 16 }}>{error}</Text>
        <Pressable onPress={() => fetchData()} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 }}>
          <RefreshCw size={16} color="#FFF" />
          <Text style={{ color: '#FFF', fontWeight: 'bold', marginLeft: 6 }}>다시 시도</Text>
        </Pressable>
      </View>
    );
    return <Text style={{ textAlign: 'center', marginTop: 40, color: colors.textSecondary }}>공고가 없습니다.</Text>;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.screenBackground }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.gradientStart} />

      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        style={styles.headerGradient}
      >
        <SafeAreaView>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.titleText}>Inha-Catch</Text>
              <Text style={styles.subtitleText}>당신의 기회를 찾아드려요</Text>
            </View>
            <Bell size={24} color="#FFF" />
          </View>

          <View style={styles.tabsContainer}>
            {['전체', '장학금', '공모전'].map((tab) => (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.tabChip, activeTab === tab ? styles.tabChipActive : styles.tabChipInactive]}
              >
                <Text style={[styles.tabChipText, activeTab === tab ? styles.tabChipTextActive : styles.tabChipTextInactive]}>
                  {tab}
                </Text>
              </Pressable>
            ))}
          </View>
        </SafeAreaView>
      </LinearGradient>

      <FlatList
        data={loading ? [] : filteredData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.contentContainer}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} colors={[colors.primary]} tintColor={colors.primary} />}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerGradient: {
    paddingTop: Platform.OS === 'android' ? 60 : 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  tabChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tabChipActive: { backgroundColor: '#FFFFFF' },
  tabChipInactive: { backgroundColor: 'rgba(255, 255, 255, 0.2)' },
  tabChipText: { fontSize: 14, fontWeight: '600' },
  tabChipTextActive: { color: '#2962FF' },
  tabChipTextInactive: { color: '#FFFFFF' },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  listTitle: { fontSize: 18, fontWeight: 'bold' },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  countText: { fontSize: 12, fontWeight: '600' }
});
