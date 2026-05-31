import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Check, ChevronRight } from 'lucide-react-native'
import Colors from '@/constants/Colors'
import Fonts from '@/constants/Fonts'
import { useColorScheme } from '@/components/useColorScheme'
import api from '@/api/axios'

const showAlert = (title: string, msg: string) => {
  Platform.OS === 'web' ? window.alert(msg) : Alert.alert(title, msg)
}

export default function AgreeTermsScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ next?: string }>()
  const colorScheme = useColorScheme() ?? 'light'
  const colors = Colors[colorScheme]

  const [agreeTerms, setAgreeTerms] = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const allAgreed = agreeTerms && agreePrivacy

  const toggleAll = () => {
    const next = !allAgreed
    setAgreeTerms(next)
    setAgreePrivacy(next)
  }

  const handleProceed = async () => {
    if (!allAgreed) {
      showAlert('알림', '모든 필수 약관에 동의해주세요.')
      return
    }
    setIsSubmitting(true)
    try {
      await api.post('/api/user/agree-terms', { terms: true, privacy: true })
      const nextRoute = (params.next as string) || '/(tabs)'
      router.replace(nextRoute as any)
    } catch (err: any) {
      const msg = err.response?.data?.message || '약관 동의 처리에 실패했습니다.'
      showAlert('실패', msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.paper }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.meta, { color: colors.stone400 }]}>약관 ─ TERMS</Text>
        <Text style={[styles.title, { color: colors.ink }]}>
          시작 전에{'\n'}확인해주세요.
        </Text>
        <Text style={[styles.subtitle, { color: colors.stone400 }]}>
          서비스 이용에 필요한 두 가지 항목에 동의가 필요해요.
        </Text>

        {/* 전체 동의 */}
        <Pressable
          onPress={toggleAll}
          style={[
            styles.allCard,
            {
              backgroundColor: allAgreed ? colors.signalSoft : colors.paperCard,
              borderColor: allAgreed ? colors.signal : colors.stone100,
            },
          ]}
        >
          <View
            style={[
              styles.checkbox,
              {
                borderColor: allAgreed ? colors.signal : colors.stone200,
                backgroundColor: allAgreed ? colors.signal : 'transparent',
              },
            ]}
          >
            {allAgreed && <Check size={14} color={colors.paper} strokeWidth={3} />}
          </View>
          <Text style={[styles.allLabel, { color: colors.ink }]}>전체 동의</Text>
        </Pressable>

        <View style={styles.divider} />

        <ItemRow
          checked={agreeTerms}
          onToggle={() => setAgreeTerms(!agreeTerms)}
          onOpen={() => router.push('/legal/terms' as any)}
          label="(필수) 서비스 이용약관"
          colors={colors}
        />
        <ItemRow
          checked={agreePrivacy}
          onToggle={() => setAgreePrivacy(!agreePrivacy)}
          onOpen={() => router.push('/legal/privacy' as any)}
          label="(필수) 개인정보 처리방침"
          colors={colors}
        />

        <Text style={[styles.noteText, { color: colors.stone400 }]}>
          만 14세 미만은 본 서비스를 이용할 수 없어요. 동의함으로써 만 14세 이상임을 확인합니다.
        </Text>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.stone100, backgroundColor: colors.paper }]}>
        <Pressable
          onPress={handleProceed}
          disabled={!allAgreed || isSubmitting}
          style={[
            styles.cta,
            {
              backgroundColor: allAgreed ? colors.ink : colors.stone200,
              opacity: isSubmitting ? 0.6 : 1,
            },
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.paper} size="small" />
          ) : (
            <Text style={[styles.ctaText, { color: allAgreed ? colors.paper : colors.stone400 }]}>
              동의하고 시작하기
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

function ItemRow({
  checked,
  onToggle,
  onOpen,
  label,
  colors,
}: {
  checked: boolean
  onToggle: () => void
  onOpen: () => void
  label: string
  colors: any
}) {
  return (
    <View style={[styles.itemRow, { borderBottomColor: colors.stone100 }]}>
      <Pressable onPress={onToggle} style={styles.itemCheckArea} hitSlop={4}>
        <View
          style={[
            styles.checkbox,
            {
              borderColor: checked ? colors.ink : colors.stone200,
              backgroundColor: checked ? colors.ink : 'transparent',
            },
          ]}
        >
          {checked && <Check size={12} color={colors.paper} strokeWidth={3} />}
        </View>
        <Text style={[styles.itemLabel, { color: colors.ink }]}>{label}</Text>
      </Pressable>
      <Pressable onPress={onOpen} hitSlop={10} style={styles.itemViewBtn}>
        <Text style={[styles.itemViewText, { color: colors.signal }]}>보기</Text>
        <ChevronRight size={14} color={colors.signal} />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 24 : 16,
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
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.6,
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 28,
  },
  allCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  allLabel: {
    fontFamily: Fonts.semibold,
    fontSize: 15,
  },
  divider: {
    height: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  itemCheckArea: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemLabel: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    flex: 1,
  },
  itemViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  itemViewText: {
    fontFamily: Fonts.semibold,
    fontSize: 12,
  },
  noteText: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 20,
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  cta: {
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaText: {
    fontFamily: Fonts.semibold,
    fontSize: 15,
  },
})
