import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  Platform,
  DevSettings,
  Modal,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Colors from '@/constants/Colors'
import Fonts from '@/constants/Fonts'
import { useColorScheme } from '@/components/useColorScheme'
import { useUser } from '@/context/UserContext'
import { Shield, ChevronDown, ChevronUp, X, AlertTriangle, ClipboardList, ChevronRight } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { clearAuthTokens, getJwtToken } from '@/lib/secureStorage'
import api from '@/api/axios'
import { validatePassword } from '@/utils/validation'

const showAlert = (title: string, msg: string) => {
  Platform.OS === 'web' ? window.alert(msg) : Alert.alert(title, msg)
}

export default function ProfileScreen() {
  const colorScheme = useColorScheme() ?? 'light'
  const colors = Colors[colorScheme]
  const router = useRouter()
  const { profile, updateProfile } = useUser()

  const [name, setName] = useState(profile.name)
  const [major, setMajor] = useState(profile.major)
  const [keywordInput, setKeywordInput] = useState('')
  const [keywords, setKeywords] = useState<string[]>(profile.keywords || [])

  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const [isSaving, setIsSaving] = useState(false)

  // 회원탈퇴
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    setName(profile.name)
    setMajor(profile.major)
    setKeywords(profile.keywords ?? [])
  }, [profile.name, profile.major, profile.keywords])

  const addKeyword = () => {
    if (!keywordInput.trim()) return
    if (keywords.includes(keywordInput.trim())) return
    setKeywords([...keywords, keywordInput.trim()])
    setKeywordInput('')
  }

  const removeKeyword = (k: string) => {
    setKeywords(keywords.filter((item) => item !== k))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      if (profile.isLoggedIn) {
        const token = await getJwtToken()
        if (token) {
          await api.put('/api/user/profile', { name, major, keywords: keywords.join(',') })
        }
      }
      await updateProfile({ ...profile, name, major, keywords })
      showAlert('저장 완료', '내 정보가 업데이트 되었습니다!')
    } catch (err) {
      console.error(err)
      showAlert('저장 실패', '서버 동기화 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword.trim()) {
      showAlert('알림', '현재 비밀번호를 입력해주세요.')
      return
    }
    const pwError = validatePassword(newPassword)
    if (pwError) {
      showAlert('알림', pwError)
      return
    }
    if (newPassword !== confirmPassword) {
      showAlert('알림', '새 비밀번호가 일치하지 않습니다.')
      return
    }

    setIsChangingPassword(true)
    try {
      await api.post('/api/auth/change-password', { currentPassword, newPassword })
      showAlert('완료', '비밀번호가 변경되었습니다.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswordChange(false)
    } catch (err: any) {
      const msg = err.response?.data?.message || '비밀번호 변경에 실패했습니다.'
      showAlert('실패', msg)
    } finally {
      setIsChangingPassword(false)
    }
  }

  const executeLogout = async () => {
    try {
      if (profile.isLoggedIn) {
        await api.post('/api/auth/logout')
      }
    } catch (err) {
      console.log('로그아웃 서버 처리 오류 무시', err)
    }
    await clearAuthTokens()
    await AsyncStorage.multiRemove([
      '@user_profile',
      '@bookmarks',
      '@cache_scholarships',
    ])
    DevSettings.reload()
  }

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm('정말 로그아웃 하시겠습니까?')) {
        await executeLogout()
      }
    } else {
      Alert.alert('로그아웃', '정말 로그아웃 하시겠습니까?', [
        { text: '취소', style: 'cancel' },
        { text: '로그아웃', style: 'destructive', onPress: executeLogout },
      ])
    }
  }

  // ── 회원탈퇴 ─────────────────────────────────────────
  const isLocalAccount = (profile.provider ?? 'LOCAL').toUpperCase() === 'LOCAL'

  const performDelete = async (password?: string) => {
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await api.delete('/api/user/me', {
        data: password ? { password } : {},
      })
      // 성공 — 토큰/캐시 모두 비우고 환영 화면으로
      await clearAuthTokens()
      await AsyncStorage.multiRemove([
        '@user_profile',
        '@bookmarks',
        '@cache_scholarships',
      ])
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') window.location.reload()
      } else {
        DevSettings.reload()
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || '회원 탈퇴에 실패했습니다.'
      setDeleteError(msg)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteAccount = () => {
    if (isLocalAccount) {
      // LOCAL: 비번 재확인 모달
      setDeletePassword('')
      setDeleteError(null)
      setShowDeleteModal(true)
      return
    }
    // 소셜(카카오): 비번 없이 confirm 두 번
    const confirmMsg = '정말 탈퇴하시겠어요?\n저장된 공고·키워드·알림 모두 삭제되고 복구할 수 없어요.'
    if (Platform.OS === 'web') {
      if (window.confirm(confirmMsg)) {
        if (window.confirm('마지막 확인. 진행하면 즉시 계정이 삭제돼요.')) {
          performDelete()
        }
      }
    } else {
      Alert.alert('회원 탈퇴', confirmMsg, [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴하기',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              '마지막 확인',
              '진행하면 즉시 계정이 삭제돼요.',
              [
                { text: '취소', style: 'cancel' },
                { text: '진행', style: 'destructive', onPress: () => performDelete() },
              ]
            )
          },
        },
      ])
    }
  }

  const submitDeleteModal = async () => {
    if (!deletePassword.trim()) {
      setDeleteError('비밀번호를 입력해주세요.')
      return
    }
    await performDelete(deletePassword)
  }

  const initial = (name || profile.name || 'U')[0]?.toUpperCase()

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.paper }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.meta, { color: colors.stone400 }]}>내 정보 ─ PROFILE</Text>
          <View style={styles.profileRow}>
            <View style={[styles.avatar, { backgroundColor: colors.ink }]}>
              <Text style={[styles.avatarText, { color: colors.paper }]}>{initial}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.ink }]}>{name || '학우님'}</Text>
              <Text style={[styles.subtitle, { color: colors.stone400 }]}>
                {major || '학과 미설정'}
              </Text>
            </View>
          </View>
        </View>

        {/* 내 지원 현황 진입 */}
        {profile.isLoggedIn && (
          <Pressable
            onPress={() => router.push('/applications' as any)}
            style={[styles.menuRow, { backgroundColor: colors.paperCard, borderColor: colors.stone100 }]}
          >
            <View style={styles.menuLeft}>
              <ClipboardList size={18} strokeWidth={1.5} color={colors.ink} />
              <View>
                <Text style={[styles.menuTitle, { color: colors.ink }]}>내 지원 현황</Text>
                <Text style={[styles.menuSub, { color: colors.stone400 }]}>
                  관심·지원·합격/탈락 트래킹
                </Text>
              </View>
            </View>
            <ChevronRight size={16} strokeWidth={1.5} color={colors.stone400} />
          </Pressable>
        )}

        {/* Section: 기본 정보 */}
        <View style={[styles.card, { backgroundColor: colors.paperCard, borderColor: colors.stone100 }]}>
          <Text style={[styles.cardLabel, { color: colors.stone400 }]}>기본 정보 ─ BASIC</Text>

          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.stone400 }]}>이름</Text>
            <TextInput
              style={[styles.input, { color: colors.ink, backgroundColor: colors.stone50, borderColor: colors.stone100 }]}
              placeholder="홍길동"
              placeholderTextColor={colors.stone300}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.field}>
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

        {/* Section: 키워드 */}
        <View style={[styles.card, { backgroundColor: colors.paperCard, borderColor: colors.stone100 }]}>
          <Text style={[styles.cardLabel, { color: colors.stone400 }]}>맞춤 키워드 ─ KEYWORDS</Text>
          <Text style={[styles.cardDesc, { color: colors.stone400 }]}>
            관심 분야 태그로 맞춤 추천을 받아보세요.
          </Text>

          <View style={styles.keywordInputRow}>
            <TextInput
              style={[styles.input, styles.keywordInput, { color: colors.ink, backgroundColor: colors.stone50, borderColor: colors.stone100 }]}
              placeholder="예: 소득 8구간, 해외연수"
              placeholderTextColor={colors.stone300}
              value={keywordInput}
              onChangeText={setKeywordInput}
              onSubmitEditing={addKeyword}
              returnKeyType="done"
            />
            <Pressable
              onPress={addKeyword}
              style={[styles.addBtn, { backgroundColor: colors.ink }]}
            >
              <Text style={[styles.addBtnText, { color: colors.paper }]}>추가</Text>
            </Pressable>
          </View>

          <View style={styles.tagGrid}>
            {keywords.length === 0 ? (
              <Text style={[styles.emptyTagText, { color: colors.stone300 }]}>
                아직 키워드가 없어요.
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

        {/* Section: 비밀번호 변경 (Collapsible) */}
        <View style={[styles.card, { backgroundColor: colors.paperCard, borderColor: colors.stone100 }]}>
          <Pressable
            onPress={() => setShowPasswordChange(!showPasswordChange)}
            style={styles.collapseHeader}
          >
            <View>
              <Text style={[styles.cardLabel, { color: colors.stone400 }]}>비밀번호 ─ PASSWORD</Text>
              <Text style={[styles.cardDesc, { color: colors.stone400, marginTop: 4, marginBottom: 0 }]}>
                보안을 위해 주기적으로 변경하세요.
              </Text>
            </View>
            {showPasswordChange ? (
              <ChevronUp size={18} strokeWidth={1.5} color={colors.stone400} />
            ) : (
              <ChevronDown size={18} strokeWidth={1.5} color={colors.stone400} />
            )}
          </Pressable>

          {showPasswordChange && (
            <View style={{ marginTop: 16 }}>
              <TextInput
                style={[styles.input, { color: colors.ink, backgroundColor: colors.stone50, borderColor: colors.stone100, marginBottom: 10 }]}
                placeholder="현재 비밀번호"
                placeholderTextColor={colors.stone300}
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />
              <TextInput
                style={[styles.input, { color: colors.ink, backgroundColor: colors.stone50, borderColor: colors.stone100, marginBottom: 10 }]}
                placeholder="새 비밀번호 (영문+숫자 8자 이상)"
                placeholderTextColor={colors.stone300}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <TextInput
                style={[styles.input, { color: colors.ink, backgroundColor: colors.stone50, borderColor: colors.stone100, marginBottom: 14 }]}
                placeholder="새 비밀번호 확인"
                placeholderTextColor={colors.stone300}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <Pressable
                onPress={handleChangePassword}
                disabled={isChangingPassword}
                style={[styles.primaryBtn, { backgroundColor: colors.ink, opacity: isChangingPassword ? 0.5 : 1 }]}
              >
                <Text style={[styles.primaryBtnText, { color: colors.paper }]}>
                  {isChangingPassword ? '변경 중…' : '비밀번호 변경'}
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* 저장 버튼 */}
        <Pressable
          onPress={handleSave}
          disabled={isSaving}
          style={[styles.primaryBtn, { backgroundColor: colors.ink, opacity: isSaving ? 0.5 : 1, marginTop: 4 }]}
        >
          <Text style={[styles.primaryBtnText, { color: colors.paper }]}>
            {isSaving ? '저장 중…' : '내 정보 저장'}
          </Text>
        </Pressable>

        {/* 관리자 (ADMIN only) */}
        {profile.role === 'ADMIN' && (
          <Pressable
            onPress={() => router.push('/admin' as any)}
            style={[styles.outlineBtn, { borderColor: colors.stone100 }]}
          >
            <Shield size={16} strokeWidth={1.5} color={colors.ink} />
            <Text style={[styles.outlineBtnText, { color: colors.ink }]}>관리자 대시보드</Text>
          </Pressable>
        )}

        {/* 로그아웃 */}
        <Pressable onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={[styles.logoutText, { color: colors.ink }]}>로그아웃</Text>
        </Pressable>

        {/* 위험구역 — 회원탈퇴 */}
        <View style={[styles.dangerCard, { borderColor: colors.critical, backgroundColor: colors.paperCard }]}>
          <View style={styles.dangerHeader}>
            <AlertTriangle size={14} strokeWidth={1.5} color={colors.critical} />
            <Text style={[styles.dangerTitle, { color: colors.critical }]}>위험 구역 ─ DANGER ZONE</Text>
          </View>
          <Text style={[styles.dangerDesc, { color: colors.stone400 }]}>
            회원 탈퇴 시 저장한 공고·키워드·알림이 모두 삭제되며 복구할 수 없어요.
          </Text>
          <Pressable onPress={handleDeleteAccount} style={[styles.dangerBtn, { borderColor: colors.critical }]}>
            <Text style={[styles.dangerBtnText, { color: colors.critical }]}>회원 탈퇴</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* 회원탈퇴 비밀번호 재확인 모달 (LOCAL 전용) */}
      <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => !isDeleting && setShowDeleteModal(false)}>
          <Pressable
            style={[styles.modalContent, { backgroundColor: colors.paperCard, borderColor: colors.stone100 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalMeta, { color: colors.critical }]}>위험 ─ DANGER</Text>
            <Text style={[styles.modalTitle, { color: colors.ink }]}>정말 탈퇴하시겠어요?</Text>
            <Text style={[styles.modalDesc, { color: colors.stone400 }]}>
              계속하려면 비밀번호를 한 번 더 입력해주세요. 진행 시 즉시 계정이 삭제되고 복구할 수 없어요.
            </Text>
            <TextInput
              style={[styles.input, { color: colors.ink, backgroundColor: colors.stone50, borderColor: colors.stone100, marginBottom: 10 }]}
              placeholder="비밀번호"
              placeholderTextColor={colors.stone300}
              secureTextEntry
              value={deletePassword}
              onChangeText={(v) => {
                setDeletePassword(v)
                if (deleteError) setDeleteError(null)
              }}
              editable={!isDeleting}
            />
            {deleteError && (
              <Text style={[styles.modalError, { color: colors.critical }]}>{deleteError}</Text>
            )}
            <View style={styles.modalBtnRow}>
              <Pressable
                onPress={() => !isDeleting && setShowDeleteModal(false)}
                style={[styles.modalCancelBtn, { borderColor: colors.stone100 }]}
                disabled={isDeleting}
              >
                <Text style={[styles.modalCancelText, { color: colors.ink }]}>취소</Text>
              </Pressable>
              <Pressable
                onPress={submitDeleteModal}
                disabled={isDeleting}
                style={[styles.modalConfirmBtn, { backgroundColor: colors.critical, opacity: isDeleting ? 0.6 : 1 }]}
              >
                {isDeleting ? (
                  <ActivityIndicator color={colors.paper} size="small" />
                ) : (
                  <Text style={[styles.modalConfirmText, { color: colors.paper }]}>탈퇴하기</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 20,
  },
  meta: {
    fontFamily: Fonts.semibold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: Fonts.bold,
    fontSize: 20,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 22,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    marginTop: 2,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuTitle: {
    fontFamily: Fonts.semibold,
    fontSize: 14,
  },
  menuSub: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    marginTop: 2,
  },
  cardLabel: {
    fontFamily: Fonts.semibold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  cardDesc: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
    marginBottom: 12,
  },
  field: {
    marginTop: 12,
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
  keywordInput: {
    flex: 1,
  },
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
  collapseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  primaryBtn: {
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: {
    fontFamily: Fonts.semibold,
    fontSize: 14,
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
  },
  outlineBtnText: {
    fontFamily: Fonts.semibold,
    fontSize: 14,
  },
  logoutBtn: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  logoutText: {
    fontFamily: Fonts.semibold,
    fontSize: 14,
  },
  // ── 위험구역 / 회원탈퇴
  dangerCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginTop: 24,
  },
  dangerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  dangerTitle: {
    fontFamily: Fonts.semibold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  dangerDesc: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  dangerBtn: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dangerBtnText: {
    fontFamily: Fonts.semibold,
    fontSize: 14,
  },
  // ── 모달
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 18, 32, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 14,
    padding: 20,
  },
  modalMeta: {
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
    lineHeight: 19,
    marginBottom: 14,
  },
  modalError: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    marginBottom: 10,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  modalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelText: {
    fontFamily: Fonts.semibold,
    fontSize: 14,
  },
  modalConfirmBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalConfirmText: {
    fontFamily: Fonts.semibold,
    fontSize: 14,
  },
})
