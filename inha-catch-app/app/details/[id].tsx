import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, Pressable, SafeAreaView, TouchableOpacity, Image, Dimensions, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import api from '@/api/axios';
import * as WebBrowser from 'expo-web-browser';
import { Calendar, Info, ChevronLeft, Bookmark, RefreshCw, Sparkles } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useBookmarks } from '@/context/BookmarkContext';
import Markdown from 'react-native-markdown-display';

const IMAGE_EXT_RE = /\.(jpe?g|png|gif|webp|bmp)(\?|$)/i;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 타입 정의
interface Scholarship {
  id: number;
  title: string;
  category: string;
  basicSummary?: string;
  detailSummary?: string;
  dDay?: string;
  isRecommended: boolean;
  author?: string;
  postedAt?: string;
  viewCount?: number;
  eligibility?: string;
  amountInfo?: string;
  applyPeriod?: string;
  content?: string;
  postUrl?: string;
  relatedLinks?: string;
  recommendReasons?: string[];
}

export default function DetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { toggleBookmark, isBookmarked } = useBookmarks();

  const [detail, setDetail] = useState<Scholarship | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/api/scholarships/${id}`);
      setDetail(res.data);
    } catch (err: any) {
      console.error("상세 데이터 로딩 실패:", err);
      if (err.response?.status === 404) {
        setDetail(null);
      } else {
        setError('데이터를 불러오지 못했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const images = useMemo<string[]>(() => {
    if (!detail?.relatedLinks) return [];
    return detail.relatedLinks
      .split('\n')
      .map(s => s.trim())
      .filter(u => u.startsWith('http') && IMAGE_EXT_RE.test(u));
  }, [detail?.relatedLinks]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.screenBackground || '#f8fafc' }]}>
        <View style={[styles.header, { backgroundColor: colors.cardBackground || '#fff' }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft color={colors.text || '#1e293b'} size={28} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text || '#1e293b' }]}>상세 정보</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.contentContainer}>
          <View style={[styles.skeletonBlock, { backgroundColor: colors.cardBackground, height: 200 }]} />
          <View style={[styles.skeletonBlock, { backgroundColor: colors.cardBackground, height: 120, marginTop: 16 }]} />
          <View style={[styles.skeletonBlock, { backgroundColor: colors.cardBackground, height: 160, marginTop: 16 }]} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.screenBackground || '#f8fafc' }]}>
        <Text style={{ color: colors.textSecondary || '#666', marginBottom: 16 }}>{error}</Text>
        <Pressable onPress={fetchDetail} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary || '#2563eb', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 }}>
          <RefreshCw size={16} color="#FFF" />
          <Text style={{ color: '#FFF', fontWeight: 'bold', marginLeft: 6 }}>다시 시도</Text>
        </Pressable>
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
      <View style={[styles.header, { backgroundColor: colors.cardBackground || '#fff' }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="뒤로 가기"
          accessibilityRole="button"
        >
           <ChevronLeft color={colors.text || '#1e293b'} size={28} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text || '#1e293b' }]} numberOfLines={1}>상세 정보</Text>
        <TouchableOpacity
          onPress={() => detail && toggleBookmark(detail.id)}
          accessibilityLabel={detail && isBookmarked(detail.id) ? '북마크 해제' : '북마크 추가'}
          accessibilityRole="button"
          accessibilityState={{ selected: !!(detail && isBookmarked(detail.id)) }}
        >
          <Bookmark size={28} color={colors.primary || '#2563eb'} fill={detail && isBookmarked(detail.id) ? (colors.primary || '#2563eb') : 'transparent'} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {images.length > 0 && (
          <View style={styles.heroWrap}>
            <FlatList
              data={images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(uri, idx) => `${idx}-${uri}`}
              renderItem={({ item }) => (
                <Image source={{ uri: item }} style={styles.heroImage} resizeMode="cover" />
              )}
            />
            {images.length > 1 && (
              <View style={styles.heroCountBadge}>
                <Text style={styles.heroCountText}>{images.length}장</Text>
              </View>
            )}
          </View>
        )}

        <View style={[styles.titleCard, { backgroundColor: colors.cardBackground || '#fff' }]}>
          <Text style={[styles.category, { color: colors.primary || '#2563eb' }]}>
            {detail.category === 'scholarship' ? '장학금' : (detail.category === 'contest' ? '공모전' : detail.category)}
          </Text>
          <Text style={[styles.title, { color: colors.text || '#0f172a' }]}>{detail.title}</Text>

          {detail.recommendReasons && detail.recommendReasons.length > 0 && (
            <View style={styles.reasonsRow}>
              {detail.recommendReasons.slice(0, 4).map((reason, idx) => (
                <View key={idx} style={[styles.reasonChip, { backgroundColor: colors.aiBoxBackground || '#eff6ff' }]}>
                  <Text style={[styles.reasonChipText, { color: colors.primary || '#2563eb' }]}>{reason}</Text>
                </View>
              ))}
            </View>
          )}
          <View style={styles.infoRow}>
            <Calendar size={16} color="#64748b" />
            <Text style={styles.dDay}>마감 기한: </Text>
            <View style={[
              styles.ddayChip,
              detail.dDay === '마감' ? { backgroundColor: '#FEE2E2' } :
              (detail.dDay === 'D-Day' || (detail.dDay?.startsWith('D-') && parseInt(detail.dDay.replace('D-',''),10) <= 3)) ? { backgroundColor: '#FEF3C7' } :
              { backgroundColor: '#DBEAFE' }
            ]}>
              <Text style={[
                styles.ddayChipText,
                detail.dDay === '마감' ? { color: '#DC2626' } :
                (detail.dDay === 'D-Day' || (detail.dDay?.startsWith('D-') && parseInt(detail.dDay.replace('D-',''),10) <= 3)) ? { color: '#D97706' } :
                { color: '#2563EB' }
              ]}>
                {detail.dDay || detail.applyPeriod || '상시'}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.cardBackground || '#fff' }]}>
          <View style={styles.sectionTitleRow}>
            <Info size={20} color={colors.primary || '#2563eb'} />
            <Text style={[styles.sectionTitle, { color: colors.text || '#1e293b' }]}>💡 모집 요약 (AI)</Text>
          </View>
          <View style={[styles.summaryBox, { backgroundColor: colors.aiBoxBackground || '#eff6ff', borderLeftColor: colors.primary || '#2563eb' }]}>
            {detail.detailSummary ? (
              <Markdown 
                style={{ 
                  body: { ...styles.summaryText, color: colors.primary || '#1e40af' },
                  bullet_list: { marginTop: 0, marginBottom: 0 }
                }}
              >
                {detail.detailSummary}
              </Markdown>
            ) : (
              <Text style={[styles.summaryText, { color: colors.primary || '#1e40af' }]}>AI 요약 정보가 없습니다.</Text>
            )}
          </View>
        </View>
        
        {/* 핵심 정보 카드 */}
        {(detail.eligibility || detail.amountInfo || detail.applyPeriod) && (
          <View style={[styles.section, { backgroundColor: colors.cardBackground || '#fff' }]}>
            <Text style={[styles.sectionTitle, { color: colors.text || '#1e293b', marginBottom: 16 }]}>핵심 정보</Text>
            {detail.eligibility && (
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: colors.primary || '#2563eb' }]}>지원 자격</Text>
                <Text style={[styles.infoValue, { color: colors.text || '#334155' }]}>{detail.eligibility}</Text>
              </View>
            )}
            {detail.amountInfo && (
              <View style={styles.infoItem}>
                <Text style={[styles.infoLabel, { color: colors.primary || '#2563eb' }]}>지원 금액</Text>
                <Text style={[styles.infoValue, { color: colors.text || '#334155' }]}>{detail.amountInfo}</Text>
              </View>
            )}
            {detail.applyPeriod && (
              <View style={[styles.infoItem, { borderBottomWidth: 0, paddingBottom: 0, marginBottom: 0 }]}>
                <Text style={[styles.infoLabel, { color: colors.primary || '#2563eb' }]}>신청 기간</Text>
                <Text style={[styles.infoValue, { color: colors.text || '#334155' }]}>{detail.applyPeriod}</Text>
              </View>
            )}
          </View>
        )}

        <View style={[styles.section, { backgroundColor: colors.cardBackground || '#fff' }]}>
           <Text style={[styles.sectionTitle, { color: colors.text || '#1e293b', marginBottom: 12 }]}>상세 내용</Text>
           {detail.content ? (
             <Markdown
               style={{
                 body: { color: colors.textSecondary || '#475569', fontSize: 15, lineHeight: 26 },
                 heading2: { color: colors.text || '#0f172a', fontSize: 17, fontWeight: '700', marginTop: 14, marginBottom: 8 },
                 heading3: { color: colors.text || '#0f172a', fontSize: 15, fontWeight: '700', marginTop: 10, marginBottom: 6 },
                 strong: { color: colors.text || '#0f172a', fontWeight: '700' },
                 bullet_list: { marginVertical: 4 },
                 list_item: { marginVertical: 2 },
                 blockquote: {
                   backgroundColor: colors.aiBoxBackground || '#eff6ff',
                   borderLeftColor: colors.primary || '#2563eb',
                   borderLeftWidth: 4,
                   paddingHorizontal: 12,
                   paddingVertical: 8,
                   marginVertical: 8,
                 },
               }}
             >
               {detail.content}
             </Markdown>
           ) : (
             <Text style={[styles.fullContent, { color: colors.textSecondary || '#64748b' }]}>본문 내용이 없습니다.</Text>
           )}
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
                accessibilityLabel="공고 원문 보러가기"
                accessibilityRole="button"
                accessibilityHint="탭하면 외부 브라우저로 원문 페이지가 열립니다"
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
  ddayChip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  ddayChipText: {
    fontSize: 13,
    fontWeight: '700',
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
    lineHeight: 26,
    letterSpacing: 0.3,
  },
  infoItem: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.2)',
    paddingBottom: 12,
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    lineHeight: 22,
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
  },
  heroWrap: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  heroImage: {
    width: SCREEN_WIDTH - 40,
    height: 220,
  },
  heroCountBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  heroCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  reasonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  reasonChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  reasonChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  skeletonBlock: {
    borderRadius: 16,
    opacity: 0.6,
  },
});