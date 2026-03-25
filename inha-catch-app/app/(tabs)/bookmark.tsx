import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Platform } from 'react-native';
import { useBookmarks } from '@/context/BookmarkContext';
import ScholarshipCard, { Scholarship } from '@/components/ScholarshipCard';
import axios from 'axios';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BookmarkScreen() {
  const { bookmarkedIds } = useBookmarks();
  const [bookmarkedItems, setBookmarkedItems] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(false);
  
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  useEffect(() => {
    if (bookmarkedIds.length === 0) {
      setBookmarkedItems([]);
      return;
    }
    
    setLoading(true);
    const apiUrl = Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080';
    
    // Instead of querying by IDs individually, since we don't have an endpoint for it,
    // we fetch size=200 and filter local ones. Ideally, we should make a /api/scholarships/ids api.
    axios.get(`${apiUrl}/api/scholarships?size=200`)
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
        
        const filtered = mapped.filter(item => bookmarkedIds.includes(item.id));
        setBookmarkedItems(filtered);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [bookmarkedIds]); // Re-fetch or re-filter when bookmarkedIds change

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
