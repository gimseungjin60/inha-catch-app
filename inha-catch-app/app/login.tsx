import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useUser } from '@/context/UserContext'
import Colors from '@/constants/Colors'
import Fonts from '@/constants/Fonts'
import api from '@/api/axios'
import { useColorScheme } from '@/components/useColorScheme'
import { ChevronLeft, MessageCircle } from 'lucide-react-native'
import { setJwtToken, setRefreshToken } from '@/lib/secureStorage'
import { loginWithKakao } from '@/hooks/useKakaoAuth'

const showAlert = (title: string, msg: string) => {
  Platform.OS === 'web' ? window.alert(msg) : Alert.alert(title, msg)
}

export default function LoginScreen() {
  const router = useRouter()
  const { updateProfile } = useUser()
  const colorScheme = useColorScheme() ?? 'light'
  const colors = Colors[colorScheme]

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isKakaoLoading, setIsKakaoLoading] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [isResetting, setIsResetting] = useState(false)

  const saveLoginData = async (data: any) => {
    if (!data?.token || !data?.refreshToken || !data?.user) {
      throw new Error('INVALID_LOGIN_RESPONSE')
    }
    await setJwtToken(data.token)
    await setRefreshToken(data.refreshToken)
    await updateProfile({
      name: data.user.name ?? '',
      major: data.user.major || '',
      keywords: data.user.keywords ? data.user.keywords.split(',').filter(Boolean) : [],
      isLoggedIn: true,
      role: data.user.role || 'USER',
      provider: data.user.provider || 'LOCAL',
    })
  }

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      showAlert('로그인 실패', '이메일과 비밀번호를 입력해주세요.')
      return
    }
    setIsSubmitting(true)
    try {
      const res = await api.post('/api/auth/login', {
        email: email.trim(),
        password: password.trim(),
      })
      await saveLoginData(res.data)
      router.replace('/(tabs)')
    } catch (err: any) {
      const msg =
        err.message === 'INVALID_LOGIN_RESPONSE'
          ? '서버 응답이 올바르지 않습니다. 잠시 후 다시 시도해주세요.'
          : err.response?.data?.message || '이메일 혹은 비밀번호를 확인해주세요.'
      showAlert('로그인 실패', msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKakaoLogin = async () => {
    setIsKakaoLoading(true)
    try {
      const result = await loginWithKakao()
      if (result) {
        await saveLoginData(result)
        if (result.isNewUser) {
          router.replace({ pathname: '/agree-terms', params: { next: '/(tabs)/profile' } } as any)
        } else {
          router.replace('/(tabs)')
        }
      } else {
        showAlert('로그인 실패', '카카오 로그인이 취소되었습니다.')
      }
    } catch (err: any) {
      showAlert('로그인 실패', '카카오 로그인 중 오류가 발생했습니다.')
    } finally {
      setIsKakaoLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!resetEmail.trim()) {
      showAlert('알림', '이메일을 입력해주세요.')
      return
    }
    setIsResetting(true)
    try {
      const res = await api.post('/api/auth/reset-password', { email: resetEmail.trim() })
      const tempPw = res.data.tempPassword
      if (tempPw) {
        showAlert('임시 비밀번호 발급', `임시 비밀번호: ${tempPw}\n\n로그인 후 반드시 비밀번호를 변경해주세요.`)
      } else {
        showAlert('완료', res.data.message || '처리되었습니다.')
      }
      setShowResetModal(false)
      setResetEmail('')
    } catch (err: any) {
      const msg = err.response?.data?.message || '비밀번호 초기화에 실패했습니다.'
      showAlert('실패', msg)
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.paper }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
            <ChevronLeft size={24} strokeWidth={1.5} color={colors.ink} />
          </Pressable>
        </View>

        <View style={styles.content}>
          <Text style={[styles.meta, { color: colors.stone400 }]}>로그인 ─ SIGN IN</Text>
          <Text style={[styles.title, { color: colors.ink }]}>
            다시 만나서{'\n'}반가워요.
          </Text>

          <View style={styles.form}>
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
                placeholder="비밀번호 입력"
                placeholderTextColor={colors.stone300}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <Pressable
              style={styles.forgotBtn}
              onPress={() => {
                setResetEmail(email)
                setShowResetModal(true)
              }}
              hitSlop={6}
            >
              <Text style={[styles.forgotText, { color: colors.signal }]}>비밀번호를 잊으셨나요?</Text>
            </Pressable>

            <Pressable
              style={[styles.loginBtn, { backgroundColor: colors.ink, opacity: isSubmitting ? 0.6 : 1 }]}
              onPress={handleLogin}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.paper} size="small" />
              ) : (
                <Text style={[styles.loginBtnText, { color: colors.paper }]}>로그인</Text>
              )}
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: colors.stone100 }]} />
              <Text style={[styles.dividerText, { color: colors.stone400 }]}>또는</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.stone100 }]} />
            </View>

            <Pressable
              style={[styles.kakaoBtn, { opacity: isKakaoLoading ? 0.6 : 1 }]}
              onPress={handleKakaoLogin}
              disabled={isKakaoLoading}
            >
              {isKakaoLoading ? (
                <ActivityIndicator color="#3C1E1E" />
              ) : (
                <>
                  <MessageCircle size={18} color="#3C1E1E" fill="#3C1E1E" />
                  <Text style={styles.kakaoBtnText}>카카오로 시작하기</Text>
                </>
              )}
            </Pressable>

            <View style={styles.footerRow}>
              <Text style={[styles.footerText, { color: colors.stone400 }]}>
                계정이 없으신가요?
              </Text>
              <Pressable onPress={() => router.push('/signup')} hitSlop={6}>
                <Text style={[styles.footerLink, { color: colors.ink }]}> 회원가입 →</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* 비밀번호 찾기 모달 */}
      <Modal visible={showResetModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowResetModal(false)}>
          <Pressable
            style={[styles.modalContent, { backgroundColor: colors.paperCard, borderColor: colors.stone100 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalLabel, { color: colors.stone400 }]}>비밀번호 찾기</Text>
            <Text style={[styles.modalTitle, { color: colors.ink }]}>임시 비밀번호를 받아보세요</Text>
            <Text style={[styles.modalDesc, { color: colors.stone400 }]}>
              가입한 이메일을 입력하면 임시 비밀번호가 발급됩니다.
            </Text>
            <TextInput
              style={[styles.input, { color: colors.ink, backgroundColor: colors.stone50, borderColor: colors.stone100, marginBottom: 14 }]}
              placeholder="이메일 입력"
              placeholderTextColor={colors.stone300}
              keyboardType="email-address"
              autoCapitalize="none"
              value={resetEmail}
              onChangeText={setResetEmail}
            />
            <Pressable
              style={[styles.loginBtn, { backgroundColor: colors.ink, opacity: isResetting ? 0.6 : 1, marginBottom: 10 }]}
              onPress={handleResetPassword}
              disabled={isResetting}
            >
              {isResetting ? (
                <ActivityIndicator color={colors.paper} size="small" />
              ) : (
                <Text style={[styles.loginBtnText, { color: colors.paper }]}>임시 비밀번호 발급</Text>
              )}
            </Pressable>
            <Pressable onPress={() => setShowResetModal(false)}>
              <Text style={[styles.modalCancel, { color: colors.stone400 }]}>취소</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  header: {
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'android' ? 24 : 8,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
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
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.8,
    marginBottom: 36,
  },
  form: {
    flex: 1,
  },
  field: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    marginBottom: 6,
  },
  input: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    marginTop: -4,
  },
  forgotText: {
    fontFamily: Fonts.semibold,
    fontSize: 12,
  },
  loginBtn: {
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginBtnText: {
    fontFamily: Fonts.semibold,
    fontSize: 15,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    marginHorizontal: 12,
  },
  kakaoBtn: {
    flexDirection: 'row',
    height: 50,
    backgroundColor: '#FEE500',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  kakaoBtnText: {
    fontFamily: Fonts.semibold,
    fontSize: 14,
    color: '#3C1E1E',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontFamily: Fonts.regular,
    fontSize: 13,
  },
  footerLink: {
    fontFamily: Fonts.semibold,
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 18, 32, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
  },
  modalLabel: {
    fontFamily: Fonts.semibold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  modalTitle: {
    fontFamily: Fonts.bold,
    fontSize: 20,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  modalDesc: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  modalCancel: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    textAlign: 'center',
  },
})
