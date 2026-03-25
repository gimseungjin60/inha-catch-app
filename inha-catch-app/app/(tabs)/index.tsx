import React, { useState, useEffect } from 'react';
<<<<<<< HEAD
import { useRouter } from 'expo-router';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  SafeAreaView, StatusBar, Dimensions 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, Sparkles, Bookmark } from 'lucide-react-native';

// 데이터 타입 정의
interface Scholarship {
  id: number;
  title: string;
  category: string;
  summary: string;
  dDay: string;
  isRecommended: boolean;
}

export default function HomeScreen() {
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [filter, setFilter] = useState('all');
  const router = useRouter();

  useEffect(() => {
    const fetchFromMySQL = async () => {
      try {
        // 웹 브라우저 테스트 시 localhost 사용
        const response = await fetch('http://localhost:8080/api/scholarships');
        const data = await response.json();
        setScholarships(data);
      } catch (error) {
        console.error("DB 연결 실패:", error);
      }
    };
    fetchFromMySQL();
  }, []);

  const filteredData = scholarships.filter(item => 
    filter === 'all' ? true : item.category === filter
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <LinearGradient colors={['#2563eb', '#4f46e5']} style={styles.header}>
        <SafeAreaView>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.brandTitle}>Inha-Catch</Text>
              <Text style={styles.brandSub}>인하공전 학생을 위한 맞춤 기회</Text>
            </View>
            <TouchableOpacity style={styles.iconCircle}>
              <Bell color="white" size={22} />
              <View style={styles.notifBadge} />
            </TouchableOpacity>
          </View>

          <View style={styles.tabBar}>
            {['all', 'scholarship', 'contest'].map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => setFilter(item)}
                style={[styles.chip, filter === item && styles.activeChip]}
              >
                <Text style={[styles.chipText, filter === item && styles.activeChipText]}>
                  {item === 'all' ? '전체' : item === 'scholarship' ? '장학금' : '공모전'}
                </Text>
              </TouchableOpacity>
=======
import { StyleSheet, View, Text, ScrollView, SafeAreaView, Pressable, StatusBar, Platform, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import ScholarshipCard, { Scholarship } from '@/components/ScholarshipCard';
import axios from 'axios';

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [activeTab, setActiveTab] = useState('전체');

  const [data, setData] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Determine the IP address for API (10.0.2.2 for Android emulator)
    const apiUrl = Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080';
    
    axios.get(`${apiUrl}/api/scholarships`)
      .then(res => {
        const rawData = res.data;
        const mapped: Scholarship[] = rawData.map((d: any) => {
          const tags = [];
          if (d.title.includes('공모전')) tags.push('#공모전');
          else tags.push('#장학금');
          
          if (d.eligibility && d.eligibility.length < 10) tags.push('#' + d.eligibility);
          
          return {
            id: d.id, // Primary key
            type: d.title.includes('공모전') ? 'contest' : 'scholarship',
            isRecommended: d.viewCount && d.viewCount > 100,
            title: d.title,
            aiSummary: [
              d.eligibility || '자격 조건은 상세 요강 참조',
              d.amountInfo || '지원 내역은 상세 요강 참조',
              d.applyPeriod || '모집 기한은 상세 요강 참조'
            ],
            tags: tags.length ? tags : ['#인하대'],
            dDay: 30, // Simplified for now
          };
        });
        setData(mapped);
      })
      .catch(err => {
        console.error("API Fetch Error:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  // Filter based on activeTab
  const filteredData = data.filter(item => {
    if (activeTab === '전체') return true;
    if (activeTab === '장학금') return item.type === 'scholarship';
    if (activeTab === '공모전') return item.type === 'contest';
    return true;
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.screenBackground }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.gradientStart} />
      
      {/* Top Header Section */}
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

          {/* Sub Tab Bar */}
          <View style={styles.tabsContainer}>
            {['전체', '장학금', '공모전'].map((tab) => (
              <Pressable 
                key={tab} 
                onPress={() => setActiveTab(tab)}
                style={[
                  styles.tabChip, 
                  activeTab === tab ? styles.tabChipActive : styles.tabChipInactive
                ]}
              >
                <Text style={[
                  styles.tabChipText,
                  activeTab === tab ? styles.tabChipTextActive : styles.tabChipTextInactive
                ]}>
                  {tab}
                </Text>
              </Pressable>
>>>>>>> feature/B
            ))}
          </View>
        </SafeAreaView>
      </LinearGradient>

<<<<<<< HEAD
      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {/* AI 맞춤 추천 섹션 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Sparkles size={20} color="#3b82f6" />
            <Text style={styles.sectionTitle}>AI 맞춤 추천</Text>
          </View>
          
          {filteredData.filter(s => s.isRecommended).map((item) => (
            <TouchableOpacity 
              key={`rec-${item.id}`} 
              style={styles.card}
              onPress={() => router.push(`/details/${item.id}` as any)}
            >
              <LinearGradient colors={['#ffffff', '#f8fafc']} style={styles.cardInner}>
                <View style={styles.cardHeader}>
                  <Text style={styles.categoryTag}>추천</Text>
                  <Text style={styles.dDayTag}>{item.dDay}</Text>
                </View>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardOrg} numberOfLines={1}>{item.summary}</Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.cardPrice}>자세히 보기</Text>
                  <Bookmark size={20} color="#94a3b8" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        {/* 전체 리스트 섹션 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>전체 공고</Text>
          <View style={{ height: 12 }} />
          {filteredData.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              style={[styles.card, { marginBottom: 16 }]}
                onPress={() => router.push(`/details/${item.id}` as any)}            >
              <View style={styles.cardInner}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.categoryTag, { backgroundColor: '#f1f5f9', color: '#64748b' }]}>
                    {item.category === 'scholarship' ? '장학' : '공모전'}
                  </Text>
                  <Text style={styles.dDayTag}>{item.dDay}</Text>
                </View>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.cardOrg} numberOfLines={1}>{item.summary}</Text>
                  <Bookmark size={20} color="#94a3b8" />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
=======
      {/* Scrollable Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.listHeader}>
          <Text style={[styles.listTitle, { color: colors.text }]}>{activeTab} 공고</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{filteredData.length}</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : filteredData.length === 0 ? (
          <Text style={{ textAlign: 'center', marginTop: 40, color: colors.textSecondary }}>공고가 없습니다.</Text>
        ) : (
          filteredData.map((item) => (
            <ScholarshipCard key={item.id} item={item} />
          ))
        )}
>>>>>>> feature/B
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
<<<<<<< HEAD
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  header: { paddingHorizontal: 20, paddingBottom: 25, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 20 },
  brandTitle: { fontSize: 28, fontWeight: '900', color: 'white', letterSpacing: -0.5 },
  brandSub: { fontSize: 13, color: '#dbeafe', fontWeight: '500' },
  iconCircle: { width: 44, height: 44, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  notifBadge: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, backgroundColor: '#ef4444', borderRadius: 4, borderWidth: 1.5, borderColor: '#2563eb' },
  tabBar: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)' },
  activeChip: { backgroundColor: 'white' },
  chipText: { color: 'white', fontWeight: '600', fontSize: 14 },
  activeChipText: { color: '#2563eb' },
  scrollBody: { padding: 20, paddingBottom: 100 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  card: { borderRadius: 24, backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  cardInner: { padding: 20, borderRadius: 24 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  categoryTag: { color: '#2563eb', fontWeight: 'bold', fontSize: 12, backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  dDayTag: { color: '#ef4444', fontWeight: 'bold', fontSize: 12 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 6, lineHeight: 24 },
  cardOrg: { fontSize: 13, color: '#64748b', flex: 1, marginRight: 10 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardPrice: { fontSize: 15, fontWeight: '800', color: '#2563eb' }
=======
  container: { flex: 1 },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
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
  tabChipActive: {
    backgroundColor: '#FFFFFF',
  },
  tabChipInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  tabChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabChipTextActive: {
    color: '#2962FF',
  },
  tabChipTextInactive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
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
  countBadge: {
    backgroundColor: '#E5E8EB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countText: {
    fontSize: 12,
    color: '#5A6B87',
    fontWeight: '600',
  }
>>>>>>> feature/B
});