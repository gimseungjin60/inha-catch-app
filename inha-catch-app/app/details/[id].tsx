import React, { useEffect, useState } from 'react';
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

export default function DetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
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
      </View>
    );
  }

  return (
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
  );
}

const styles = StyleSheet.create({
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
});