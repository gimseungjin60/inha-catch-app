import React, { useEffect, useState, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useUser } from '@/context/UserContext'
import Colors from '@/constants/Colors'
import Fonts from '@/constants/Fonts'
import { useColorScheme } from '@/components/useColorScheme'
import { MessageCircle } from 'lucide-react-native'
import { setJwtToken, setRefreshToken } from '@/lib/secureStorage'
import { loginWithKakao } from '@/hooks/useKakaoAuth'

export default function WelcomeScreen() {
  const router = useRouter()
  const { profile, isLoading, updateProfile } = useUser()
  const colorScheme = useColorScheme() ?? 'light'
  const colors = Colors[colorScheme]
  const [isKakaoLoading, setIsKakaoLoading] = useState(false)

  const handleKakaoLogin = async () => {
    setIsKakaoLoading(true)
    try {
      const result = await loginWithKakao()
      if (result) {
        await setJwtToken(result.token)
        await setRefreshToken(result.refreshToken)
        await updateProfile({
          name: result.user.name,
          major: result.user.major || '',
          keywords: result.user.keywords ? result.user.keywords.split(',').filter(Boolean) : [],
          isLoggedIn: true,
          role: result.user.role || 'USER',
          provider: result.user.provider || 'KAKAO',
        })
        if (result.isNewUser) {
          router.replace({ pathname: '/agree-terms', params: { next: '/(tabs)/profile' } } as any)
        } else {
          router.replace('/(tabs)')
        }
      }
    } catch {
      const msg = '카카오 로그인 중 오류가 발생했습니다.'
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('로그인 실패', msg)
    } finally {
      setIsKakaoLoading(false)
    }
  }

  const hasRedirected = useRef(false)
  useEffect(() => {
    if (!isLoading && profile.isLoggedIn && !hasRedirected.current) {
      hasRedirected.current = true
      router.replace('/(tabs)')
    }
  }, [isLoading, profile.isLoggedIn])

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.paper }]}>
        <ActivityIndicator size="small" color={colors.signal} />
      </View>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.paper }]}>
      <View style={styles.top}>
        <Text style={[styles.wordmark, { color: colors.stone400 }]}>INHA-CATCH</Text>
      </View>

      <View style={styles.middle}>
        <Text style={[styles.headline, { color: colors.ink }]}>
          흘려보낸{'\n'}기회들에게.
        </Text>
        <Text style={[styles.subline, { color: colors.stone400 }]}>
          인하공업전문대학 학우님을 위한{'\n'}장학금·공모전 큐레이션 서비스.
        </Text>
      </View>

      <View style={styles.bottom}>
        <Pressable
          onPress={handleKakaoLogin}
          disabled={isKakaoLoading}
          style={[styles.kakaoBtn, { opacity: isKakaoLoading ? 0.6 : 1 }]}
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

        <Pressable
          onPress={() => router.push('/signup')}
          style={[styles.outlineBtn, { borderColor: colors.stone100 }]}
        >
          <Text style={[styles.outlineBtnText, { color: colors.ink }]}>
            이메일로 회원가입
          </Text>
        </Pressable>

        <View style={styles.footerRow}>
          <Text style={[styles.footerText, { color: colors.stone400 }]}>
            이미 계정이 있나요?
          </Text>
          <Pressable onPress={() => router.push('/login')}>
            <Text style={[styles.footerLink, { color: colors.ink }]}> 로그인 →</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  top: {
    paddingTop: 16,
  },
  wordmark: {
    fontFamily: Fonts.semibold,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  middle: {
    flex: 1,
    justifyContent: 'center',
  },
  headline: {
    fontFamily: Fonts.bold,
    fontSize: 44,
    lineHeight: 50,
    letterSpacing: -1.2,
    marginBottom: 20,
  },
  subline: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    lineHeight: 24,
  },
  bottom: {
    paddingBottom: 16,
    gap: 10,
  },
  kakaoBtn: {
    flexDirection: 'row',
    height: 50,
    backgroundColor: '#FEE500',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  kakaoBtnText: {
    fontFamily: Fonts.semibold,
    fontSize: 15,
    color: '#3C1E1E',
  },
  outlineBtn: {
    height: 50,
    borderWidth: 1,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outlineBtnText: {
    fontFamily: Fonts.semibold,
    fontSize: 14,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  footerText: {
    fontFamily: Fonts.regular,
    fontSize: 13,
  },
  footerLink: {
    fontFamily: Fonts.semibold,
    fontSize: 13,
  },
})
