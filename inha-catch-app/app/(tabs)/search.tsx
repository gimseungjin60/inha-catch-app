import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, ActivityIndicator, Platform, Pressable, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, RefreshCw } from 'lucide-react-native';
import api from '@/api/axios';
import ScholarshipCard, { Scholarship } from '@/components/ScholarshipCard';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useUser } from '@/context/UserContext';

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const { profile } = useUser();
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendedIds, setRecommendedIds] = useState<Set<number>>(new Set());
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 추천 ID 목록을 한 번 불러옴
  useEffect(() => {
    const params = new URLSearchParams();
    if (profile.major) params.append('major', profile.major);
    if (profile.keywords?.length) params.append('keywords', profile.keywords.join(','));

    api.get(`/api/scholarships/recommended?${params.toString()}`)
      .then(res => {
        const ids = new Set<number>(
          (res.data || []).map((r: any) => r.scholarship?.id ?? r.id).filter(Boolean)
        );
        setRecommendedIds(ids);
      })
      .catch(() => {});
  }, [profile.major, profile.keywords]);

  const handleKeywordChange = useCallback((text: string) => {
    setKeyword(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (text.trim().length > 0) {
      debounceTimer.current = setTimeout(() => {
        performSearchWithKeyword(text);
      }, 400);
    } else {
      setHasSearched(false);
      setResults([]);
      setError(null);
    }
  }, [recommendedIds]);

  const performSearchWithKeyword = (searchKeyword: string) => {
    if (!searchKeyword.trim()) return;
    setLoading(true);
    setHasSearched(true);
    setError(null);

    api.get(`/api/scholarships/search?keyword=${encodeURIComponent(searchKeyword)}&size=100`)
      .then(res => {
        const rawData = res.data.content || res.data;
        const mapped: Scholarship[] = rawData.map((d: any) => {
          const tags = [];
          if (d.title.includes('공모전')) tags.push('#공모전');
          else tags.push('#장학금');
          if (d.eligibility && d.eligibility.length < 10) tags.push('#' + d.eligibility);

          return {
            id: d.id,
            type: d.title.includes('공모전') ? 'contest' : 'scholarship',
            isRecommended: recommendedIds.has(d.id),
            title: d.title,
            aiSummary: [
              d.eligibility || '자격 조건은 상세 요강 참조',
              d.amountInfo || '지원 내역은 상세 요강 참조',
              d.applyPeriod || '모집 기한은 상세 요강 참조'
            ],
            tags: tags.length ? tags : ['#인하대'],
            dDay: d.dDay || '상시',
          };
        });
        setResults(mapped);
      })
      .catch(err => {
        console.error(err);
        setError('검색 중 오류가 발생했습니다.');
      })
      .finally(() => setLoading(false));
  };

  const performSearch = () => {
    if (!keyword.trim()) return;
    setLoading(true);
    setHasSearched(true);
    setError(null);

    api.get(`/api/scholarships/search?keyword=${encodeURIComponent(keyword)}&size=100`)
      .then(res => {
        const rawData = res.data.content || res.data;
        const mapped: Scholarship[] = rawData.map((d: any) => {
          const tags = [];
          if (d.title.includes('공모전')) tags.push('#공모전');
          else tags.push('#장학금');
          if (d.eligibility && d.eligibility.length < 10) tags.push('#' + d.eligibility);

          return {
            id: d.id,
            type: d.title.includes('공모전') ? 'contest' : 'scholarship',
            isRecommended: recommendedIds.has(d.id),
            title: d.title,
            aiSummary: [
              d.eligibility || '자격 조건은 상세 요강 참조',
              d.amountInfo || '지원 내역은 상세 요강 참조',
              d.applyPeriod || '모집 기한은 상세 요강 참조'
            ],
            tags: tags.length ? tags : ['#인하대'],
            dDay: d.dDay || '상시',
          };
        });
        setResults(mapped);
      })
      .catch(err => {
        console.error(err);
        setError('검색 중 오류가 발생했습니다.');
      })
      .finally(() => setLoading(false));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.screenBackground, paddingTop: insets.top }]}>
      <View style={[styles.header, { backgroundColor: colors.cardBackground }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.screenBackground }]}>
          <Search size={20} color={colors.tabIconDefault || '#94a3b8'} style={styles.searchIcon} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="장학금, 공모전 키워드로 검색해보세요."
            placeholderTextColor={colors.textSecondary}
            value={keyword}
            onChangeText={handleKeywordChange}
            onSubmitEditing={performSearch}
            returnKeyType="search"
            autoCorrect={false}
          />
          {keyword.length > 0 && (
            <Pressable onPress={() => { setKeyword(''); setHasSearched(false); setResults([]); setError(null); }} style={styles.clearBtn}>
              <Text style={[styles.clearText, { color: colors.textSecondary }]}>X</Text>
            </Pressable>
          )}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.centerBox} />
      ) : error ? (
        <View style={styles.centerBox}>
          <Text style={[styles.emptyText, { color: colors.textSecondary, marginBottom: 16 }]}>{error}</Text>
          <Pressable onPress={performSearch} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 }}>
            <RefreshCw size={16} color="#FFF" />
            <Text style={{ color: '#FFF', fontWeight: 'bold', marginLeft: 6 }}>다시 시도</Text>
          </Pressable>
        </View>
      ) : hasSearched && results.length === 0 ? (
        <View style={styles.centerBox}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>'{keyword}'에 대한 검색 결과가 없습니다.</Text>
        </View>
      ) : !hasSearched ? (
        <View style={styles.centerBox}>
          <Search size={48} color={colors.border || '#e2e8f0'} style={{ marginBottom: 16 }} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>원하시는 공고를 검색해 보세요!</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => <ScholarshipCard item={item} />}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={performSearch} colors={[colors.primary]} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, elevation: 2 },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, height: 48 },
  searchIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 16 },
  clearBtn: { padding: 8 },
  clearText: { fontSize: 16, fontWeight: 'bold' },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 },
  emptyText: { fontSize: 15 },
  listContainer: { padding: 20, paddingBottom: 100 }
});
