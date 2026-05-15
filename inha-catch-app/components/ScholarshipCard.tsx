import React from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { Bookmark } from 'lucide-react-native'
import Colors from '@/constants/Colors'
import Fonts from '@/constants/Fonts'
import { useColorScheme } from '@/components/useColorScheme'
import { useRouter } from 'expo-router'
import { useBookmarks } from '@/context/BookmarkContext'

export interface Scholarship {
  id: number
  type: 'scholarship' | 'contest'
  isRecommended: boolean
  title: string
  aiSummary: string[]
  tags: string[]
  dDay: string
}

function parseDDayNumber(dDay: string): number | null {
  if (!dDay) return null
  if (dDay === 'D-Day') return 0
  if (dDay === '마감') return -1
  const m = dDay.match(/^D-(\d+)$/)
  if (m) return parseInt(m[1], 10)
  return null
}

export default function ScholarshipCard({ item }: { item: Scholarship }) {
  const colorScheme = useColorScheme() ?? 'light'
  const colors = Colors[colorScheme]
  const router = useRouter()
  const { toggleBookmark, isBookmarked } = useBookmarks()
  const bookmarked = isBookmarked(item.id)

  const dDayNum = parseDDayNumber(item.dDay)
  const isUrgent = dDayNum !== null && dDayNum >= 0 && dDayNum <= 3
  const isClosed = item.dDay === '마감'
  const category = item.type === 'scholarship' ? '장학금' : '공모전'

  return (
    <Pressable
      onPress={() => router.push(`/details/${item.id}` as any)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.paperCard,
          borderColor: colors.stone100,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      {/* Margin Marker — 시그니처 좌측 라인 */}
      <View
        style={[
          styles.marginMarker,
          { backgroundColor: item.isRecommended ? colors.signal : colors.stone300 },
        ]}
      />

      {/* 상단: 카테고리 메타 + D-day */}
      <View style={styles.metaRow}>
        <Text style={[styles.metaText, { color: colors.stone400 }]} numberOfLines={1}>
          {category}
          {item.isRecommended ? ' ─ AI 추천' : ''}
        </Text>
        <View style={styles.metaRight}>
          {isUrgent && <View style={[styles.urgentDot, { backgroundColor: colors.critical }]} />}
          <Text
            style={[
              styles.dDayText,
              { color: isClosed ? colors.stone300 : colors.ink },
            ]}
          >
            {item.dDay || '상시'}
          </Text>
        </View>
      </View>

      {/* 제목 */}
      <Text style={[styles.title, { color: colors.ink }]} numberOfLines={2}>
        {item.title}
      </Text>

      {/* AI 요약 박스 */}
      {item.aiSummary && item.aiSummary.length > 0 && (
        <View style={[styles.aiBox, { backgroundColor: colors.signalSoft }]}>
          <Text style={[styles.aiLabel, { color: colors.stone400 }]}>AI 요약</Text>
          {item.aiSummary.slice(0, 3).map((line, i) => (
            <Text key={i} style={[styles.aiBullet, { color: colors.ink }]} numberOfLines={2}>
              ─ {line}
            </Text>
          ))}
        </View>
      )}

      {/* 하단: 태그 + 북마크 */}
      <View style={styles.footer}>
        <View style={styles.tagRow}>
          {item.tags.slice(0, 3).map((tag, i) => (
            <View key={i} style={[styles.tag, { backgroundColor: colors.stone50 }]}>
              <Text style={[styles.tagText, { color: colors.ink }]} numberOfLines={1}>
                {tag}
              </Text>
            </View>
          ))}
        </View>
        <Pressable
          onPress={(e) => {
            e.stopPropagation()
            toggleBookmark(item.id)
          }}
          hitSlop={10}
          style={styles.bookmarkBtn}
        >
          <Bookmark
            size={20}
            strokeWidth={1.5}
            color={bookmarked ? colors.ink : colors.stone400}
            fill={bookmarked ? colors.ink : 'transparent'}
          />
        </Pressable>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    paddingLeft: 18,
    marginBottom: 12,
  },
  marginMarker: {
    position: 'absolute',
    left: 0,
    top: 16,
    width: 3,
    height: 20,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metaRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    flex: 1,
    marginRight: 8,
  },
  dDayText: {
    fontFamily: Fonts.mono,
    fontSize: 20,
    letterSpacing: -0.3,
  },
  urgentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  title: {
    fontFamily: Fonts.semibold,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.2,
    marginBottom: 12,
  },
  aiBox: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  aiLabel: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    marginBottom: 6,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  aiBullet: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: 110,
  },
  tagText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
  },
  bookmarkBtn: {
    padding: 4,
  },
})
