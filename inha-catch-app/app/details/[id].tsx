import React, { useEffect, useState } from 'react';
<<<<<<< HEAD
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Calendar, Info } from 'lucide-react-native';

// 타입 정의
interface Scholarship {
  id: number;
  title: string;
  category: string;
  summary: string;
  dDay: string;
  isRecommended: boolean;
}
=======
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Platform, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import axios from 'axios';
import { ArrowLeft, ExternalLink, Calendar, MapPin } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
>>>>>>> feature/B

export default function DetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
<<<<<<< HEAD
  // 타입을 <Scholarship | null>로 지정하여 에러 해결
  const [data, setData] = useState<Scholarship | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`http://localhost:8080/api/scholarships`);
        const json: Scholarship[] = await response.json();
        // find 메서드 내 s의 타입 지정
        const item = json.find((s: Scholarship) => s.id.toString() === id);
        setData(item || null);
      } catch (error) {
        console.error("상세 데이터 로딩 실패:", error);
      }
    };
    fetchData();
  }, [id]);

  if (!data) {
    return (
      <View style={styles.loading}>
        <Text>데이터를 불러오는 중입니다...</Text>
=======
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiUrl = Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080';
    // Currently fetching all and finding the one. In production, make a /api/scholarships/{id} route.
    axios.get(`${apiUrl}/api/scholarships`)
      .then(res => {
        const item = res.data.find((d: any) => String(d.id) === String(id));
        setDetail(item);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.screenBackground }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.screenBackground }]}>
        <Text style={{ color: colors.text }}>데이터를 찾을 수 없습니다.</Text>
>>>>>>> feature/B
      </View>
    );
  }

  return (
<<<<<<< HEAD
    <SafeAreaView style={styles.container}>
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronLeft color="#1e293b" size={28} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>상세 정보</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerCard}>
          <Text style={styles.category}>{data.category === 'scholarship' ? '장학금' : '공모전'}</Text>
          <Text style={styles.title}>{data.title}</Text>
          <View style={styles.infoRow}>
            <Calendar size={16} color="#64748b" />
            <Text style={styles.dDay}>마감 기한: {data.dDay}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Info size={20} color="#2563eb" />
            <Text style={styles.sectionTitle}>AI 요약 설명</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryText}>{data.summary}</Text>
          </View>
        </View>
        
        {/* 추가 정보 섹션 예시 */}
        <View style={[styles.section, { marginTop: 30 }]}>
            <TouchableOpacity style={styles.applyButton}>
                <Text style={styles.applyButtonText}>공고 원문 보러가기</Text>
            </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
=======
    <View style={[styles.container, { backgroundColor: colors.screenBackground }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
           <ArrowLeft color="#FFF" size={24} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{detail.title}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Main Title Card */}
        <View style={[styles.titleCard, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.title, { color: colors.text }]}>{detail.title}</Text>
          <Text style={[styles.author, { color: colors.textSecondary }]}>작성자: {detail.author}</Text>
          <Text style={[styles.author, { color: colors.textSecondary }]}>게시일: {detail.postedAt}</Text>
          <Text style={[styles.author, { color: colors.textSecondary }]}>조회수: {detail.viewCount}</Text>
        </View>

        {/* AI Summary Equivalent from backend */}
        <View style={[styles.aiBox, { backgroundColor: colors.aiBoxBackground }]}>
           <Text style={[styles.aiTitle, { color: colors.primary }]}>💡 모집 요약</Text>
           <View style={styles.bulletRow}>
             <Text style={styles.bullet}>•</Text>
             <Text style={styles.bulletText}>지원 대상: {detail.eligibility || '내용 참조'}</Text>
           </View>
           <View style={styles.bulletRow}>
             <Text style={styles.bullet}>•</Text>
             <Text style={styles.bulletText}>지원 금액: {detail.amountInfo || '내용 참조'}</Text>
           </View>
           <View style={styles.bulletRow}>
             <Text style={styles.bullet}>•</Text>
             <Text style={styles.bulletText}>신청 기간: {detail.applyPeriod || '내용 참조'}</Text>
           </View>
        </View>

        {/* Full Content */}
        <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
           <Text style={[styles.sectionTitle, { color: colors.text }]}>상세 내용</Text>
           <Text style={[styles.fullContent, { color: colors.textSecondary }]}>
             {detail.content || '본문 내용이 없습니다.'}
           </Text>
        </View>
      </ScrollView>
    </View>
>>>>>>> feature/B
  );
}

const styles = StyleSheet.create({
<<<<<<< HEAD
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: 'white' },
  navTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  content: { padding: 20 },
  headerCard: { backgroundColor: 'white', padding: 24, borderRadius: 24, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  category: { color: '#2563eb', fontWeight: '700', marginBottom: 8, fontSize: 14 },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 16, lineHeight: 30 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dDay: { color: '#64748b', fontSize: 14, fontWeight: '500' },
  section: { marginTop: 10 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  summaryBox: { backgroundColor: '#eff6ff', padding: 20, borderRadius: 20, borderLeftWidth: 4, borderLeftColor: '#2563eb' },
  summaryText: { fontSize: 15, color: '#1e40af', lineHeight: 24 },
  applyButton: { backgroundColor: '#2563eb', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  applyButtonText: { color: 'white', fontSize: 16, fontWeight: '700' }
=======
  centered: {
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center'
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  contentContainer: {
    padding: 20,
  },
  titleCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  author: {
    fontSize: 14,
    marginBottom: 4,
  },
  aiBox: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  aiTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  bullet: {
    marginRight: 8,
    color: '#333',
    fontWeight: 'bold',
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: '#444',
  },
  section: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  fullContent: {
    fontSize: 15,
    lineHeight: 24,
  }
>>>>>>> feature/B
});