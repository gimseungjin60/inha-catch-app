import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  SafeAreaView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useUser } from '@/context/UserContext'
import Colors from '@/constants/Colors'
import Fonts from '@/constants/Fonts'
import api from '@/api/axios'
import { useColorScheme } from '@/components/useColorScheme'
import { ChevronLeft, Check, ChevronRight, X } from 'lucide-react-native'
import { setJwtToken, setRefreshToken } from '@/lib/secureStorage'

const showAlert = (title: string, msg: string) => {
  Platform.OS === 'web' ? window.alert(msg) : Alert.alert(title, msg)
}

export default function SignupScreen() {
  const router = useRouter()
  const { updateProfile } = useUser()
  const colorScheme = useColorScheme() ?? 'light'
  const colors = Colors[colorScheme]

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [major, setMajor] = useState('')
  const [keywordInput, setKeywordInput] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const addKeyword = () => {
    if (!keywordInput.trim()) return
    if (keywords.includes(keywordInput.trim())) return
    setKeywords([...keywords, keywordInput.trim()])
    setKeywordInput('')
  }

  const removeKeyword = (k: string) => {
    setKeywords(keywords.filter((item) => item !== k))
  }

  const handleComplete = async () => {
    if (!email.trim() || !password.trim() || !name.trim() || !major.trim()) {
      showAlert('알림', '필수 항목을 모두 입력해주세요 (이메일, 비밀번호, 이름, 학과).')
      return
    }
    const emailRegex = /^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$/
    if (!emailRegex.test(email.trim())) {
      showAlert('알림', '올바른 이메일 형식을 입력해주세요.')
      return
    }
    if (password.length < 8) {
      showAlert('알림', '비밀번호는 8자 이상이어야 합니다.')
      return
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      showAlert('알림', '비밀번호는 영문과 숫자를 모두 포함해야 합니다.')
      return
    }
    if (!agreeTerms || !agreePrivacy) {
      showAlert('알림', '서비스 이용약관과 개인정보 처리방침에 모두 동의해주세요.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await api.post('/api/auth/signup', {
        email: email.trim(),
        password: password.trim(),
        name: name.trim(),
        major: major.trim(),
        keywords: keywords.join(','),
      })

      const { token, refreshToken, user } = res.data
      if (!token || !user) {
        showAlert('회원가입 실패', '서버 응답이 올바르지 않습니다.')
        return
      }
      await setJwtToken(token)
      await setRefreshToken(refreshToken)
      await updateProfile({
        name: user.name || name.trim(),
        major: user.major || major.trim(),
        keywords: user.keywords ? user.keywords.split(',').filter(Boolean) : keywords,
        isLoggedIn: true,
        role: user.role || 'USER',
        provider: user.provider || 'LOCAL',
      })

      try {
        await api.post('/api/user/agree-terms', { terms: true, privacy: true })
      } catch (e) {
        console.warn('약관 동의 기록 실패 (가입은 완료됨):', e)
      }

      router.replace('/(tabs)')
    } catch (err: any) {
      const msg = err.response?.data?.message || '네트워크 오류가 발생했습니다.'
      showAlert('회원가입 실패', msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.paper }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <ChevronLeft size={24} strokeWidth={1.5} color={colors.ink} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.meta, { color: colors.stone400 }]}>회원가입 ─ SIGN UP</Text>
        <Text style={[styles.title, { color: colors.ink }]}>
          환영해요.{'\n'}맞춤 정보를 알려주세요.
        </Text>
        <Text style={[styles.subtitle, { color: colors.stone400 }]}>
          학과·키워드를 입력하면 더 정확한 추천을 받을 수 있어요.
        </Text>

        {/* 계정 정보 */}
        <View style={[styles.card, { backgroundColor: colors.paperCard, borderColor: colors.stone100 }]}>
          <Text style={[styles.cardLabel, { color: colors.stone400 }]}>계정 정보 ─ ACCOUNT</Text>

          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.stone400 }]}>이메일</Text>
            <TextInput
              style={[styles.input, { color: colors.ink, backgroundColor: colors.stone50, borderColor: colors.stone100 }]}
              placeholder="name@inhatc.ac.kr"
              placeholderTextColor={colors.stone300}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.stone400 }]}>비밀번호</Text>
            <TextInput
              style={[styles.input, { color: colors.ink, backgroundColor: colors.stone50, borderColor: colors.stone100 }]}
              placeholder="영문 + 숫자 8자 이상"
              placeholderTextColor={colors.stone300}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.stone400 }]}>이름 (또는 닉네임)</Text>
            <TextInput
              style={[styles.input, { color: colors.ink, backgroundColor: colors.stone50, borderColor: colors.stone100 }]}
              placeholder="홍길동"
              placeholderTextColor={colors.stone300}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={[styles.field, { marginBottom: 0 }]}>
            <Text style={[styles.fieldLabel, { color: colors.stone400 }]}>학과</Text>
            <TextInput
              style={[styles.input, { color: colors.ink, backgroundColor: colors.stone50, borderColor: colors.stone100 }]}
              placeholder="예: 컴퓨터정보공학과"
              placeholderTextColor={colors.stone300}
              value={major}
              onChangeText={setMajor}
            />
          </View>
        </View>

        {/* 관심 키워드 */}
        <View style={[styles.card, { backgroundColor: colors.paperCard, borderColor: colors.stone100 }]}>
          <Text style={[styles.cardLabel, { color: colors.stone400 }]}>관심 키워드 ─ OPTIONAL</Text>
          <Text style={[styles.cardDesc, { color: colors.stone400 }]}>
            소득구간·해외연수·창업 등 관심 분야를 등록해보세요.
          </Text>

          <View style={styles.keywordInputRow}>
            <TextInput
              style={[styles.input, styles.keywordInput, { color: colors.ink, backgroundColor: colors.stone50, borderColor: colors.stone100 }]}
              placeholder="예: 소득 8구간"
              placeholderTextColor={colors.stone300}
              value={keywordInput}
              onChangeText={setKeywordInput}
              onSubmitEditing={addKeyword}
              returnKeyType="done"
            />
            <Pressable onPress={addKeyword} style={[styles.addBtn, { backgroundColor: colors.ink }]}>
              <Text style={[styles.addBtnText, { color: colors.paper }]}>추가</Text>
            </Pressable>
          </View>

          <View style={styles.tagGrid}>
            {keywords.length === 0 ? (
              <Text style={[styles.emptyTagText, { color: colors.stone300 }]}>
                선택사항이에요. 나중에 마이페이지에서도 추가할 수 있어요.
              </Text>
            ) : (
              keywords.map((k) => (
                <Pressable
                  key={k}
                  onPress={() => removeKeyword(k)}
                  style={[styles.tagChip, { backgroundColor: colors.stone50 }]}
                >
                  <Text style={[styles.tagText, { color: colors.ink }]}>{k}</Text>
                  <X size={12} strokeWidth={1.5} color={colors.stone400} />
                </Pressable>
              ))
            )}
          </View>
        </View>

        {/* 약관 동의 */}
        <View style={[styles.card, { backgroundColor: colors.paperCard, borderColor: colors.stone100 }]}>
          <Text style={[styles.cardLabel, { color: colors.stone400 }]}>약관 ─ AGREEMENT</Text>

          <AgreeRow
            checked={agreeTerms}
            onToggle={() => setAgreeTerms(!agreeTerms)}
            onOpen={() => router.push('/legal/terms' as any)}
            label="(필수) 서비스 이용약관"
            colors={colors}
          />
          <AgreeRow
            checked={agreePrivacy}
            onToggle={() => setAgreePrivacy(!agreePrivacy)}
            onOpen={() => router.push('/legal/privacy' as any)}
            label="(필수) 개인정보 처리방침"
            colors={colors}
          />
        </View>

        <Pressable
          onPress={handleComplete}
          disabled={isSubmitting}
          style={[styles.submitBtn, { backgroundColor: colors.ink, opacity: isSubmitting ? 0.6 : 1 }]}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.paper} size="small" />
          ) : (
            <Text style={[styles.submitText, { color: colors.paper }]}>인하캐치 시작하기</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

function AgreeRow({
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
    <View style={styles.agreeRow}>
      <Pressable onPress={onToggle} style={styles.agreeCheckArea} hitSlop={4}>
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
        <Text style={[styles.agreeLabel, { color: colors.ink }]}>{label}</Text>
      </Pressable>
      <Pressable onPress={onOpen} hitSlop={10} style={styles.agreeViewBtn}>
        <Text style={[styles.agreeViewText, { color: colors.signal }]}>보기</Text>
        <ChevronRight size={14} color={colors.signal} />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'android' ? 24 : 8,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 100,
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
    marginBottom: 24,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  cardLabel: {
    fontFamily: Fonts.semibold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  cardDesc: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    marginTop: -8,
    marginBottom: 14,
  },
  field: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    marginBottom: 6,
  },
  input: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  keywordInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  keywordInput: { flex: 1 },
  addBtn: {
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: {
    fontFamily: Fonts.semibold,
    fontSize: 13,
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tagText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
  },
  emptyTagText: {
    fontFamily: Fonts.regular,
    fontSize: 12,
  },
  agreeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  agreeCheckArea: {
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
  agreeLabel: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    flex: 1,
  },
  agreeViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  agreeViewText: {
    fontFamily: Fonts.semibold,
    fontSize: 12,
  },
  submitBtn: {
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitText: {
    fontFamily: Fonts.semibold,
    fontSize: 15,
  },
})
