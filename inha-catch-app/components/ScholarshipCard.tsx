import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Bookmark, Sparkles, Award, Trophy } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useRouter } from 'expo-router';
import { useBookmarks } from '@/context/BookmarkContext';

export interface Scholarship {
  id: number;
  type: 'scholarship' | 'contest';
  isRecommended: boolean;
  title: string;
  aiSummary: string[];
  tags: string[];
  dDay: number;
}

export default function ScholarshipCard({ item }: { item: Scholarship }) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { bookmarkedIds, toggleBookmark, isBookmarked } = useBookmarks();
  const bookmarked = isBookmarked(item.id);

  return (
    <Pressable onPress={() => router.push(`/details/${item.id}` as any)}>
      <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.badges}>
              {/* Type Badge */}
              <View style={styles.typeBadge}>
                 {item.type === 'scholarship' 
                    ? <Award size={14} color={colors.primary} />
                    : <Trophy size={14} color="#9C27B0" />}
                 <Text style={[styles.typeBadgeText, { color: item.type === 'scholarship' ? colors.primary : '#9C27B0' }]}>
                   {item.type === 'scholarship' ? ' 장학금' : ' 공모전'}
                 </Text>
              </View>
              
              {/* Recommend Badge */}
              {item.isRecommended && (
                <View style={[styles.recommendBadge, { backgroundColor: '#F0F5FF' }]}>
                   <Sparkles size={14} color="#FF9800" />
                   <Text style={[styles.recommendText, { color: colors.primary }]}> 추천</Text>
                </View>
              )}
            </View>
            <Pressable 
                style={{ padding: 8, margin: -8 }}
                onPress={(e) => {
                    e.stopPropagation();
                    toggleBookmark(item.id);
                }}
            >
              <Bookmark size={24} color={colors.primary} fill={bookmarked ? colors.primary : 'transparent'} />
            </Pressable>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>

          {/* AI Summary Box */}
          <View style={[styles.aiBox, { backgroundColor: colors.aiBoxBackground }]}>
             <Text style={[styles.aiTitle, { color: colors.aiBoxText }]}>AI 요약</Text>
             {item.aiSummary.map((line, idx) => (
               <View key={idx} style={styles.bulletRow}>
                 <Text style={[styles.bullet, { color: colors.textSecondary }]}>•</Text>
                 <Text style={[styles.bulletText, { color: colors.textSecondary }]}>{line}</Text>
               </View>
             ))}
          </View>

          {/* Footer (Tags & D-Day) */}
          <View style={styles.footer}>
             <View style={styles.tagList}>
                {item.tags.slice(0, 2).map((tag, idx) => (
                   <View key={idx} style={[styles.tag, { backgroundColor: colors.tagBackground }]}>
                      <Text style={[styles.tagText, { color: colors.tagText }]}>{tag}</Text>
                   </View>
                ))}
                {item.tags.length > 2 && (
                   <Text style={[styles.moreTags, { color: colors.tagText }]}>+{item.tags.length - 2}</Text>
                )}
             </View>
             
             <View style={[styles.ddayBadge, { borderColor: colors.primary }]}>
                <Text style={[styles.ddayText, { color: colors.primary }]}>D-{item.dDay}</Text>
             </View>
          </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  badges: { flexDirection: 'row', gap: 8 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F7FA', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  typeBadgeText: { fontSize: 12, fontWeight: '600', marginLeft: 2 },
  recommendBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  recommendText: { fontSize: 12, fontWeight: '600', marginLeft: 2 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  aiBox: { borderRadius: 12, padding: 16, marginBottom: 16 },
  aiTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 8 },
  bulletRow: { flexDirection: 'row', marginBottom: 4 },
  bullet: { marginRight: 6, fontSize: 14 },
  bulletText: { fontSize: 13, lineHeight: 18, flex: 1 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tagList: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tag: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  tagText: { fontSize: 12, fontWeight: '500' },
  moreTags: { fontSize: 12, fontWeight: '500', marginLeft: 4 },
  ddayBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  ddayText: { fontSize: 12, fontWeight: 'bold' }
});
