import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, SafeAreaView, Pressable, ScrollView, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useUser } from '@/context/UserContext';
import { UserCircle, Tag, Lock, Shield } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '@/api/axios';

const showAlert = (title: string, msg: string) => {
  Platform.OS === 'web' ? window.alert(msg) : Alert.alert(title, msg);
};

export default function ProfileScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, updateProfile } = useUser();

  const [name, setName] = useState(profile.name);
  const [major, setMajor] = useState(profile.major);
  const [keywordInput, setKeywordInput] = useState('');
  const [keywords, setKeywords] = useState<string[]>(profile.keywords || []);

  // 비밀번호 변경
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    setName(profile.name);
    setMajor(profile.major);
    setKeywords(profile.keywords || []);
  }, [profile]);

  const addKeyword = () => {
    if (!keywordInput.trim()) return;
    if (keywords.includes(keywordInput.trim())) return;
    setKeywords([...keywords, keywordInput.trim()]);
    setKeywordInput('');
  };

  const removeKeyword = (k: string) => {
    setKeywords(keywords.filter(item => item !== k));
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (profile.isLoggedIn) {
        await api.put('/api/user/profile', { name, major, keywords: keywords.join(',') });
      }
      await updateProfile({ ...profile, name, major, keywords });
      showAlert('저장 완료', '내 정보가 업데이트 되었습니다!');
    } catch (err) {
      console.error(err);
      showAlert('저장 실패', '서버 동기화 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword.trim()) {
      showAlert('알림', '현재 비밀번호를 입력해주세요.');
      return;
    }
    if (newPassword.length < 4) {
      showAlert('알림', '새 비밀번호는 4자 이상이어야 합니다.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert('알림', '새 비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.post('/api/auth/change-password', { currentPassword, newPassword });
      showAlert('완료', '비밀번호가 변경되었습니다.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordChange(false);
    } catch (err: any) {
      const msg = err.response?.data?.message || '비밀번호 변경에 실패했습니다.';
      showAlert('실패', msg);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const executeLogout = async () => {
    try {
      if (profile.isLoggedIn) {
        await api.post('/api/auth/logout');
      }
    } catch (err) {
      console.log('로그아웃 서버 처리 오류 무시', err);
    }
    await AsyncStorage.multiRemove(['@jwt_token', '@refresh_token', '@user_profile']);
    await updateProfile({ name: '', major: '', grade: '', keywords: [], isLoggedIn: false });
    router.replace('/login');
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm('정말 로그아웃 하시겠습니까?')) {
        await executeLogout();
      }
    } else {
      Alert.alert('로그아웃', '정말 로그아웃 하시겠습니까?', [
        { text: '취소', style: 'cancel' },
        {
          text: '로그아웃',
          style: 'destructive',
          onPress: executeLogout
        }
      ]);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.screenBackground, paddingTop: insets.top }]}>
      <View style={[styles.header, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.titleRow}>
          <UserCircle color={colors.primary} size={24} style={{ marginRight: 8 }} />
          <Text style={[styles.titleText, { color: colors.text }]}>마이 페이지</Text>
        </View>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          학우님의 기본 정보와 맞춤 추천 수신용 키워드를 관리합니다.
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Name Setting */}
        <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.label, { color: colors.text }]}>이름 (닉네임)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.screenBackground, color: colors.text }]}
            placeholder="홍길동"
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Major Setting */}
        <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.label, { color: colors.text }]}>소속 학과 (전공)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.screenBackground, color: colors.text }]}
            placeholder="예: 컴퓨터공학과"
            placeholderTextColor={colors.textSecondary}
            value={major}
            onChangeText={setMajor}
          />
        </View>

        {/* Keywords Setting */}
        <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.keywordHeader}>
             <Tag size={18} color={colors.text} />
             <Text style={[styles.label, { color: colors.text, marginBottom: 0, marginLeft: 6 }]}>맞춤 추천 키워드</Text>
          </View>
          <Text style={[styles.subLabel, { color: colors.textSecondary }]}>소득구간, 성적, 해외연수 등 나만의 조건을 태그로 관리하세요.</Text>

          <View style={styles.keywordInputRow}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.screenBackground, color: colors.text, flex: 1 }]}
              placeholder="예: 소득 8구간, 해외"
              placeholderTextColor={colors.textSecondary}
              value={keywordInput}
              onChangeText={setKeywordInput}
              onSubmitEditing={addKeyword}
            />
            <Pressable onPress={addKeyword} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.addBtnText}>추가</Text>
            </Pressable>
          </View>

          <View style={styles.tagGrid}>
            {keywords.map(k => (
              <Pressable key={k} onPress={() => removeKeyword(k)} style={[styles.tag, { backgroundColor: colors.tagBackground }]}>
                <Text style={[styles.tagText, { color: colors.tagText }]}>{k}  ✕</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Password Change */}
        <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
          <Pressable
            onPress={() => setShowPasswordChange(!showPasswordChange)}
            style={styles.passwordToggle}
          >
            <View style={styles.keywordHeader}>
              <Lock size={18} color={colors.text} />
              <Text style={[styles.label, { color: colors.text, marginBottom: 0, marginLeft: 6 }]}>비밀번호 변경</Text>
            </View>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>{showPasswordChange ? '닫기' : '열기'}</Text>
          </Pressable>

          {showPasswordChange && (
            <View style={{ marginTop: 16 }}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.screenBackground, color: colors.text, marginBottom: 12 }]}
                placeholder="현재 비밀번호"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />
              <TextInput
                style={[styles.input, { backgroundColor: colors.screenBackground, color: colors.text, marginBottom: 12 }]}
                placeholder="새 비밀번호 (4자 이상)"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <TextInput
                style={[styles.input, { backgroundColor: colors.screenBackground, color: colors.text, marginBottom: 16 }]}
                placeholder="새 비밀번호 확인"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <Pressable
                onPress={handleChangePassword}
                style={[styles.passwordBtn, { backgroundColor: colors.primary, opacity: isChangingPassword ? 0.6 : 1 }]}
                disabled={isChangingPassword}
              >
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 15 }}>
                  {isChangingPassword ? '변경 중...' : '비밀번호 변경'}
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        <Pressable onPress={handleSave} style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: isSaving ? 0.6 : 1 }]} disabled={isSaving}>
          <Text style={styles.saveBtnText}>{isSaving ? '저장 중...' : '내 정보 저장하기'}</Text>
        </Pressable>

        {/* 관리자 전용 */}
        {profile.role === 'ADMIN' && (
          <Pressable
            onPress={() => router.push('/admin' as any)}
            style={[styles.adminBtn, { backgroundColor: colors.cardBackground, borderColor: colors.primary }]}
          >
            <Shield size={18} color={colors.primary} />
            <Text style={[styles.adminBtnText, { color: colors.primary }]}>관리자 대시보드</Text>
          </Pressable>
        )}

        <Pressable onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={[styles.logoutBtnText, { color: colors.primary }]}>로그아웃</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: Platform.OS === 'android' ? 40 : 20, borderBottomWidth: 1, borderBottomColor: 'rgba(128,128,128,0.2)', elevation: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  titleText: { fontSize: 22, fontWeight: 'bold' },
  subtitle: { fontSize: 13, lineHeight: 20 },
  content: { padding: 20, paddingBottom: 100 },
  card: { padding: 20, borderRadius: 16, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5, elevation: 2 },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  keywordHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  subLabel: { fontSize: 12, marginBottom: 12, lineHeight: 18 },
  input: { height: 48, borderRadius: 8, paddingHorizontal: 12, fontSize: 15 },
  keywordInputRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  addBtn: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, borderRadius: 8 },
  addBtnText: { color: 'white', fontWeight: 'bold' },
  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  tagText: { fontWeight: '600', fontSize: 13 },
  passwordToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  passwordBtn: { padding: 14, borderRadius: 10, alignItems: 'center' },
  saveBtn: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  adminBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1.5,
    gap: 8,
  },
  adminBtnText: { fontSize: 16, fontWeight: 'bold' },
  logoutBtn: { padding: 16, marginTop: 8, alignItems: 'center' },
  logoutBtnText: { fontSize: 16, fontWeight: 'bold' }
});
