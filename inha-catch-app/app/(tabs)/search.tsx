import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, ActivityIndicator, Platform, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search } from 'lucide-react-native';
import axios from 'axios';
import ScholarshipCard, { Scholarship } from '@/components/ScholarshipCard';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const performSearch = () => {
    if (!keyword.trim()) return;
    setLoading(true);
    setHasSearched(true);
    
    const apiUrl = Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080';
    axios.get(`${apiUrl}/api/scholarships/search?keyword=${encodeURIComponent(keyword)}&size=100`)
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
            isRecommended: d.viewCount && d.viewCount > 100,
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
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.screenBackground, paddingTop: insets.top }]}>
      <View style={[styles.header, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.searchBar}>
          <Search size={20} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="장학금, 공모전 키워드로 검색해보세요."
            placeholderTextColor="#94a3b8"
            value={keyword}
            onChangeText={setKeyword}
            onSubmitEditing={performSearch}
            returnKeyType="search"
            autoCorrect={false}
          />
          {keyword.length > 0 && (
            <Pressable onPress={() => { setKeyword(''); setHasSearched(false); setResults([]); }} style={styles.clearBtn}>
              <Text style={styles.clearText}>X</Text>
            </Pressable>
          )}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.centerBox} />
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
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, elevation: 2 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 12, paddingHorizontal: 12, height: 48 },
  searchIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 16 },
  clearBtn: { padding: 8 },
  clearText: { color: '#94a3b8', fontSize: 16, fontWeight: 'bold' },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 },
  emptyText: { fontSize: 15 },
  listContainer: { padding: 20, paddingBottom: 100 }
});
