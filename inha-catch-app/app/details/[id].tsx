import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Platform, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import axios from 'axios';
import { ArrowLeft, ExternalLink, Calendar, MapPin } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function DetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
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
      </View>
    );
  }

  return (
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
});