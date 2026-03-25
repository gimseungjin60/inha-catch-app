import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Platform, Pressable, SafeAreaView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import axios from 'axios';
import * as WebBrowser from 'expo-web-browser';
import { Calendar, Info, ChevronLeft, Bookmark } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useBookmarks } from '@/context/BookmarkContext';

// 타입 정의
interface Scholarship {
  id: number;
  title: string;
  category: string;
  summary: string;
  dDay: string;
  isRecommended: boolean;
  author?: string;
  postedAt?: string;
  viewCount?: number;
  eligibility?: string;
  amountInfo?: string;
  applyPeriod?: string;
  content?: string;
  postUrl?: string;
}

export default function DetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { toggleBookmark, isBookmarked } = useBookmarks();

  const [detail, setDetail] = useState<Scholarship | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const apiUrl = Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080';
        const res = await axios.get(`${apiUrl}/api/scholarships?size=200`);
        // id를 string으로 변환하여 비교 (Pagination 처리 반영)
        const rawData = res.data.content || res.data;
        const item = rawData.find((d: any) => String(d.id) === String(id));
        setDetail(item || null);
      } catch (error) {
        console.error("상세 데이터 로딩 실패:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.screenBackground || '#f8fafc' }]}>
        <ActivityIndicator size="large" color={colors.primary || '#2563eb'} />
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.screenBackground || '#f8fafc' }]}>
        <Text style={{ color: colors.text || '#000' }}>데이터를 찾을 수 없습니다.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.screenBackground || '#f8fafc' }]}>
      <View style={[styles.header, { backgroundColor: 'white' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
           <ChevronLeft color="#1e293b" size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>상세 정보</Text>
        <TouchableOpacity onPress={() => detail && toggleBookmark(detail.id)}>
          <Bookmark size={28} color={colors.primary || '#2563eb'} fill={detail && isBookmarked(detail.id) ? (colors.primary || '#2563eb') : 'transparent'} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={[styles.titleCard, { backgroundColor: colors.cardBackground || '#fff' }]}>
          <Text style={[styles.category, { color: colors.primary || '#2563eb' }]}>
            {detail.category === 'scholarship' ? '장학금' : (detail.category === 'contest' ? '공모전' : detail.category)}
          </Text>
          <Text style={[styles.title, { color: colors.text || '#0f172a' }]}>{detail.title}</Text>
          <View style={styles.infoRow}>
            <Calendar size={16} color="#64748b" />
            <Text style={styles.dDay}>마감 기한: {detail.dDay || detail.applyPeriod || '상시'}</Text>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.cardBackground || '#fff' }]}>
          <View style={styles.sectionTitleRow}>
            <Info size={20} color={colors.primary || '#2563eb'} />
            <Text style={[styles.sectionTitle, { color: colors.text || '#1e293b' }]}>💡 모집 요약 (AI)</Text>
          </View>
          <View style={[styles.summaryBox, { backgroundColor: colors.aiBoxBackground || '#eff6ff', borderLeftColor: colors.primary || '#2563eb' }]}>
            <Text style={[styles.summaryText, { color: colors.primary || '#1e40af' }]}>{detail.summary || 'AI 요약 정보가 없습니다.'}</Text>
          </View>
        </View>
        
        <View style={[styles.section, { backgroundColor: colors.cardBackground || '#fff' }]}>
           <Text style={[styles.sectionTitle, { color: colors.text || '#1e293b' }]}>상세 내용</Text>
           <Text style={[styles.fullContent, { color: colors.textSecondary || '#64748b' }]}>
             {detail.content || detail.eligibility || '본문 내용이 없습니다.'}
           </Text>
        </View>

        <View style={[styles.section, { backgroundColor: 'transparent', elevation: 0, shadowOpacity: 0, marginTop: 10, padding: 0 }]}>
            <TouchableOpacity 
                style={[styles.applyButton, { backgroundColor: colors.primary || '#2563eb' }]}
                onPress={async () => {
                    if (detail.postUrl) {
                        await WebBrowser.openBrowserAsync(detail.postUrl);
                    } else {
                        alert('원문 링크가 없습니다.');
                    }
                }}
            >
                <Text style={styles.applyButtonText}>공고 원문 보러가기</Text>
            </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    padding: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 16, // SafeArea fallback
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  titleCard: {
    padding: 24,
    borderRadius: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  category: {
    fontWeight: '700',
    marginBottom: 8,
    fontSize: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 16,
    lineHeight: 30,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dDay: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  summaryBox: {
    padding: 20,
    borderRadius: 16,
    borderLeftWidth: 4,
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 24,
  },
  fullContent: {
    fontSize: 15,
    lineHeight: 24,
  },
  applyButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  applyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  }
});