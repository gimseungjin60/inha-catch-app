import React, { useState, useEffect } from 'react';
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
            ))}
          </View>
        </SafeAreaView>
      </LinearGradient>

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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
});