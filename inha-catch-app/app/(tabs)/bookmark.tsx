import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Platform, Pressable, RefreshControl } from 'react-native';
import { useBookmarks } from '@/context/BookmarkContext';
import ScholarshipCard, { Scholarship } from '@/components/ScholarshipCard';
import api from '@/api/axios';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RefreshCw } from 'lucide-react-native';

export default function BookmarkScreen() {
  const { bookmarkedIds } = useBookmarks();
  const [bookmarkedItems, setBookmarkedItems] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const fetchBookmarked = () => {
    if (bookmarkedIds.length === 0) {
      setBookmarkedItems([]);
      return;
    }

    setLoading(true);
    setError(null);

    // 각 북마크 ID에 대해 단건 조회 (새로 추가한 /{id} 엔드��인트 활용)
    Promise.all(
      bookmarkedIds.map(id =>
        api.get(`/api/scholarships/${id}`).then(res => res.data).catch(() => null)
      )
    )
      .then(results => {
        const mapped: Scholarship[] = results
          .filter((d: any) => d !== null)
          .map((d: any) => {
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
        setBookmarkedItems(mapped);
      })
      .catch(err => {
        console.error(err);
        setError('저장한 공고를 불러오지 못했습니다.');
      })
      .finally(() => { setLoading(false); setRefreshing(false); });
  };

  useEffect(() => {
    fetchBookmarked();
  }, [bookmarkedIds]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.screenBackground }]} edges={['top']}>
       <View style={styles.header}>
         <Text style={[styles.headerTitle, { color: colors.text }]}>저장한 공고</Text>
         <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
           총 {bookmarkedIds.length}개의 저장된 공고가 있습니다.
         </Text>
       </View>
       
       {loading ? (
         <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
       ) : error ? (
         <View style={styles.emptyContainer}>
           <Text style={[styles.emptyText, { color: colors.textSecondary, marginBottom: 16 }]}>{error}</Text>
           <Pressable onPress={fetchBookmarked} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 }}>
             <RefreshCw size={16} color="#FFF" />
             <Text style={{ color: '#FFF', fontWeight: 'bold', marginLeft: 6 }}>다시 시도</Text>
           </Pressable>
         </View>
       ) : bookmarkedItems.length === 0 ? (
         <View style={styles.emptyContainer}>
           <Text style={[styles.emptyText, { color: colors.textSecondary }]}>저장한 공고가 없습니다.</Text>
         </View>
       ) : (
         <FlatList
           data={bookmarkedItems}
           keyExtractor={(item) => item.id.toString()}
           contentContainerStyle={styles.listContainer}
           renderItem={({ item }) => <ScholarshipCard item={item} />}
           refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchBookmarked(); }} colors={['#2962FF']} />}
           onRefresh={() => { setRefreshing(true); fetchBookmarked(); }}
           refreshing={refreshing}
         />
       )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingBottom: 10 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  headerSubtitle: { fontSize: 14 },
  listContainer: { padding: 20, paddingBottom: 100 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 },
  emptyText: { fontSize: 16 }
});
