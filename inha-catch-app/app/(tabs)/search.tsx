import React from 'react';
import { StyleSheet, View, Text, ScrollView, TextInput, SafeAreaView } from 'react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Search as SearchIcon } from 'lucide-react-native';
import ScholarshipCard, { Scholarship } from '@/components/ScholarshipCard';

const DUMMY_DATA: Scholarship[] = [
  {
    id: 1,
    type: 'scholarship',
    isRecommended: true,
    title: '인하대학교 우수장학금 2026',
    aiSummary: ['공학·경영 전공 학점 3.8 이상', '전액 등록금 + 월 50만원', '2026년 4월 15일 (29일 남음)'],
    tags: ['#공학', '#경영', '#추가태그1'],
    dDay: 30,
  },
  {
    id: 2,
    type: 'contest',
    isRecommended: true,
    title: 'K-스타트업 혁신 공모전 2026',
    aiSummary: ['스타트업 아이디어 보유 대학생', '최대 1천만원 + 멘토링', '2026년 3월 25일 (8일 남음)'],
    tags: ['#스타트업', '#혁신', '#IT'],
    dDay: 9,
  }
];

export default function SearchScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <View style={[styles.container, { backgroundColor: colors.screenBackground }]}>
      {/* Top Header Section */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <SafeAreaView>
          <Text style={styles.titleText}>검색 & 필터</Text>
          <View style={styles.searchBar}>
            <SearchIcon color={colors.tabIconDefault} size={20} style={{ marginRight: 8 }} />
            <TextInput 
              placeholder="장학금, 공모전 검색..." 
              placeholderTextColor={colors.tabIconDefault}
              style={styles.searchInput}
            />
          </View>
        </SafeAreaView>
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Popular Tags */}
        <View style={styles.tagsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>📈 인기 태그</Text>
          <View style={styles.tagsGrid}>
            {['#AI', '#공학', '#전액장학금', '#스타트업', '#유학생', '#STEM'].map(tag => (
              <View key={tag} style={[styles.popularTag, { borderColor: colors.border }]}>
                <Text style={{ color: colors.tagText }}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Results List */}
        <View style={styles.listHeader}>
          <Text style={[styles.listTitle, { color: colors.text }]}>전체 공고</Text>
          <Text style={styles.countText}>{DUMMY_DATA.length}개</Text>
        </View>

        {DUMMY_DATA.map((item) => (
          <ScholarshipCard key={item.id} item={item} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  titleText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111',
  },
  contentContainer: {
    padding: 20,
  },
  tagsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  popularTag: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  countText: {
    fontSize: 14,
    color: '#5A6B87',
    fontWeight: '500',
  }
});
