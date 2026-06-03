import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  Pressable,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import api from '@/api/axios'
import { getJwtToken } from '@/lib/secureStorage'
import * as WebBrowser from 'expo-web-browser'
import { ChevronLeft, Bookmark, RefreshCw, ExternalLink } from 'lucide-react-native'
import Colors from '@/constants/Colors'
import Fonts from '@/constants/Fonts'
import { useColorScheme } from '@/components/useColorScheme'
import { useBookmarks } from '@/context/BookmarkContext'
import { useUser } from '@/context/UserContext'
import { useApplications, STATUS_ORDER, STATUS_LABEL, ApplicationStatus } from '@/context/ApplicationContext'
import ScholarshipChat from '@/components/ScholarshipChat'
import Markdown from 'react-native-markdown-display'

interface Scholarship {
  id: number
  title: string
  category: string
  basicSummary?: string
  detailSummary?: string
  dDay: string
  isRecommended: boolean
  author?: string
  postedAt?: string
  viewCount?: number
  eligibility?: string
  amountInfo?: string
  applyPeriod?: string
  content?: string
  postUrl?: string
  sourceSite?: string
}

function parseDDayNumber(dDay: string): number | null {
  if (!dDay) return null
  if (dDay === 'D-Day') return 0
  if (dDay === '마감') return -1
  const m = dDay.match(/^D-(\d+)$/)
  if (m) return parseInt(m[1], 10)
  return null
}

const categoryLabel = (c: string): string => {
  const norm = c?.toLowerCase()
  if (norm === 'scholarship' || c === 'SCHOLARSHIP') return '장학금'
  if (norm === 'contest' || c === 'CONTEST') return '공모전'
  if (c === 'NOTICE') return '공지'
  return c || '공고'
}

export default function DetailScreen() {
  const { id } = useLocalSearchParams()
  const router = useRouter()
  const colorScheme = useColorScheme() ?? 'light'
  const colors = Colors[colorScheme]
  const { toggleBookmark, isBookmarked } = useBookmarks()
  const { profile } = useUser()
  const { getStatus, setStatus, clearStatus } = useApplications()

  const [detail, setDetail] = useState<Scholarship | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDetail = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/api/scholarships/${id}`)
      setDetail(res.data)
    } catch (err: any) {
      console.error('상세 데이터 로딩 실패:', err)
      if (err.response?.status === 404) {
        setDetail(null)
      } else {
        setError('데이터를 불러오지 못했습니다.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDetail()
    if (profile.isLoggedIn && id) {
      ;(async () => {
        const token = await getJwtToken()
        if (!token) return
        api.post('/api/user/view-log', { scholarshipId: Number(id) }).catch(() => {})
      })()
    }
  }, [id])

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.paper }]}>
        <ActivityIndicator size="small" color={colors.signal} />
      </View>
    )
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.paper }]}>
        <Text style={[styles.emptyText, { color: colors.stone400 }]}>{error}</Text>
        <Pressable
          onPress={fetchDetail}
          style={[styles.retryBtn, { backgroundColor: colors.ink }]}
        >
          <RefreshCw size={14} color={colors.paper} />
          <Text style={[styles.retryBtnText, { color: colors.paper }]}>다시 시도</Text>
        </Pressable>
      </SafeAreaView>
    )
  }

  if (!detail) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.paper }]}>
        <Text style={[styles.emptyText, { color: colors.stone400 }]}>공고를 찾을 수 없어요.</Text>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={[styles.linkText, { color: colors.ink }]}>← 돌아가기</Text>
        </Pressable>
      </SafeAreaView>
    )
  }

  const bookmarked = isBookmarked(detail.id)
  const dDayNum = parseDDayNumber(detail.dDay)
  const isUrgent = dDayNum !== null && dDayNum >= 0 && dDayNum <= 3

  // 저작권 정책(시나리오 A): 외부 소스는 본문/AI 요약/챗봇을 제공하지 않고 원문 링크로 유도한다.
  const isMetaOnly =
    detail.sourceSite === 'wevity' || detail.sourceSite === 'thinkcontest'
  const sourceLabel =
    detail.sourceSite === 'wevity'
      ? '위비티(Wevity)'
      : detail.sourceSite === 'thinkcontest'
      ? '씽굿(ThinkContest)'
      : detail.sourceSite ?? '원문 사이트'

  return (
    <View style={[styles.container, { backgroundColor: colors.paper }]}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.paper }}>
        <View style={[styles.topBar, { borderBottomColor: colors.stone100 }]}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.iconBtn}>
            <ChevronLeft size={22} strokeWidth={1.5} color={colors.ink} />
          </Pressable>
          <Text style={[styles.topBarTitle, { color: colors.stone400 }]} numberOfLines={1}>
            상세 ─ DETAIL
          </Text>
          <Pressable onPress={() => toggleBookmark(detail.id)} hitSlop={10} style={styles.iconBtn}>
            <Bookmark
              size={20}
              strokeWidth={1.5}
              color={bookmarked ? colors.ink : colors.stone400}
              fill={bookmarked ? colors.ink : 'transparent'}
            />
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.heroSection}>
          <Text style={[styles.meta, { color: colors.stone400 }]}>
            {categoryLabel(detail.category)}
            {detail.sourceSite ? ` ─ ${detail.sourceSite}` : ''}
          </Text>
          <Text style={[styles.title, { color: colors.ink }]}>{detail.title}</Text>

          <View style={styles.dDayRow}>
            {isUrgent && <View style={[styles.urgentDot, { backgroundColor: colors.critical }]} />}
            <Text style={[styles.dDayText, { color: colors.ink }]}>
              {detail.dDay || detail.applyPeriod || '상시'}
            </Text>
            {detail.viewCount != null && (
              <Text style={[styles.viewCount, { color: colors.stone400 }]}>
                · 조회 {detail.viewCount.toLocaleString()}
              </Text>
            )}
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.stone100 }]} />

        {/* 지원 상태 */}
        {profile.isLoggedIn && (
          <>
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.stone400 }]}>
                지원 상태 ─ STATUS
              </Text>
              <View style={styles.statusRow}>
                {STATUS_ORDER.map((s) => {
                  const active = getStatus(detail.id) === s
                  return (
                    <Pressable
                      key={s}
                      onPress={() => (active ? clearStatus(detail.id) : setStatus(detail.id, s))}
                      style={[
                        styles.statusChip,
                        {
                          backgroundColor: active ? colors.ink : colors.stone50,
                          borderColor: active ? colors.ink : colors.stone100,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusChipText,
                          { color: active ? colors.paper : colors.stone400 },
                        ]}
                      >
                        {STATUS_LABEL[s]}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.stone100 }]} />
          </>
        )}

        {/* AI 요약 (외부 소스는 저작권 정책상 미제공 → 원문 안내) */}
        {isMetaOnly ? (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.stone400 }]}>출처 ─ SOURCE</Text>
            <View style={[styles.aiBox, { backgroundColor: colors.signalSoft }]}>
              <View style={[styles.aiMarker, { backgroundColor: colors.signal }]} />
              <Text style={[styles.aiText, { color: colors.ink }]}>
                이 공고는 {sourceLabel}에서 제공돼요. 신청 자격·기간 등 핵심 정보는 아래에서 확인하고,
                전체 내용은 원문에서 자세히 보실 수 있어요.
              </Text>
              <Pressable
                onPress={async () => {
                  if (detail.postUrl) await WebBrowser.openBrowserAsync(detail.postUrl)
                }}
                disabled={!detail.postUrl}
                style={[styles.sourceLinkBtn, { borderColor: colors.signal, opacity: detail.postUrl ? 1 : 0.5 }]}
              >
                <ExternalLink size={14} color={colors.signal} />
                <Text style={[styles.sourceLinkText, { color: colors.signal }]}>
                  {sourceLabel} 원문에서 자세히 보기
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.stone400 }]}>AI 요약 ─ SUMMARY</Text>
            <View
              style={[
                styles.aiBox,
                { backgroundColor: colors.signalSoft },
              ]}
            >
              <View style={[styles.aiMarker, { backgroundColor: colors.signal }]} />
              {detail.detailSummary ? (
                <Markdown
                  style={{
                    body: { ...markdownBody, color: colors.ink, fontFamily: Fonts.regular },
                    paragraph: { marginTop: 0, marginBottom: 6 },
                    bullet_list: { marginTop: 0, marginBottom: 0 },
                    list_item: { marginBottom: 4 },
                    strong: { fontFamily: Fonts.semibold },
                  }}
                >
                  {detail.detailSummary}
                </Markdown>
              ) : detail.basicSummary ? (
                <Text style={[styles.aiText, { color: colors.ink }]}>{detail.basicSummary}</Text>
              ) : (
                <Text style={[styles.aiText, { color: colors.stone400 }]}>AI 요약을 준비 중이에요.</Text>
              )}
            </View>
          </View>
        )}

        {/* 핵심 정보 */}
        {(detail.eligibility || detail.amountInfo || detail.applyPeriod) && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.stone100 }]} />
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.stone400 }]}>
                핵심 정보 ─ KEY FACTS
              </Text>
              {detail.eligibility && (
                <InfoRow label="지원 자격" value={detail.eligibility} colors={colors} />
              )}
              {detail.amountInfo && (
                <InfoRow label="지원 금액" value={detail.amountInfo} colors={colors} />
              )}
              {detail.applyPeriod && (
                <InfoRow label="신청 기간" value={detail.applyPeriod} colors={colors} />
              )}
            </View>
          </>
        )}

        {/* 본문 */}
        {detail.content && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.stone100 }]} />
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.stone400 }]}>
                상세 내용 ─ DETAILS
              </Text>
              <Text style={[styles.contentText, { color: colors.ink }]}>{detail.content}</Text>
            </View>
          </>
        )}

        {/* AI 챗봇 (외부 소스는 본문 컨텍스트가 없어 미제공) */}
        {profile.isLoggedIn && !isMetaOnly && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.stone100 }]} />
            <View style={styles.section}>
              <ScholarshipChat scholarshipId={detail.id} />
            </View>
          </>
        )}
      </ScrollView>

      {/* Sticky bottom CTA */}
      <SafeAreaView edges={['bottom']} style={{ backgroundColor: colors.paper }}>
        <View style={[styles.bottomBar, { borderTopColor: colors.stone100 }]}>
          <Pressable
            onPress={() => toggleBookmark(detail.id)}
            style={[styles.bookmarkBtn, { borderColor: colors.stone100 }]}
          >
            <Bookmark
              size={18}
              strokeWidth={1.5}
              color={bookmarked ? colors.ink : colors.stone400}
              fill={bookmarked ? colors.ink : 'transparent'}
            />
            <Text style={[styles.bookmarkBtnText, { color: colors.ink }]}>
              {bookmarked ? '저장됨' : '저장'}
            </Text>
          </Pressable>
          <Pressable
            onPress={async () => {
              if (detail.postUrl) {
                await WebBrowser.openBrowserAsync(detail.postUrl)
              }
            }}
            disabled={!detail.postUrl}
            style={[
              styles.primaryBtn,
              {
                backgroundColor: detail.postUrl ? colors.ink : colors.stone200,
                opacity: detail.postUrl ? 1 : 0.6,
              },
            ]}
          >
            <Text style={[styles.primaryBtnText, { color: colors.paper }]}>
              {detail.postUrl
                ? isMetaOnly
                  ? '원문에서 자세히 보기'
                  : '원문 보러가기'
                : '원문 링크 없음'}
            </Text>
            {detail.postUrl && <ExternalLink size={14} color={colors.paper} />}
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  )
}

function InfoRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.stone400 }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.ink }]}>{value}</Text>
    </View>
  )
}

const markdownBody = {
  fontSize: 14,
  lineHeight: 22,
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  topBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  iconBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarTitle: {
    fontFamily: Fonts.semibold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  heroSection: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
  },
  meta: {
    fontFamily: Fonts.semibold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  dDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  urgentDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  dDayText: {
    fontFamily: Fonts.mono,
    fontSize: 18,
    letterSpacing: -0.3,
  },
  viewCount: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    marginLeft: 4,
  },
  divider: {
    height: 1,
    marginHorizontal: 24,
  },
  section: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  sectionLabel: {
    fontFamily: Fonts.semibold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  aiBox: {
    position: 'relative',
    borderRadius: 12,
    padding: 16,
    paddingLeft: 18,
  },
  aiMarker: {
    position: 'absolute',
    left: 0,
    top: 16,
    width: 3,
    height: 24,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  aiText: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 22,
  },
  sourceLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
  },
  sourceLinkText: {
    fontFamily: Fonts.semibold,
    fontSize: 13,
  },
  infoRow: {
    paddingVertical: 10,
  },
  infoLabel: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    marginBottom: 4,
  },
  infoValue: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 21,
  },
  contentText: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 24,
  },
  bottomBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderTopWidth: 1,
  },
  bookmarkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
  },
  bookmarkBtnText: {
    fontFamily: Fonts.semibold,
    fontSize: 14,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    borderRadius: 10,
  },
  primaryBtnText: {
    fontFamily: Fonts.semibold,
    fontSize: 14,
  },
  emptyText: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusChip: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusChipText: {
    fontFamily: Fonts.semibold,
    fontSize: 13,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  retryBtnText: {
    fontFamily: Fonts.semibold,
    fontSize: 13,
  },
  linkText: {
    fontFamily: Fonts.semibold,
    fontSize: 14,
  },
})
