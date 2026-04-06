import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useUser } from '@/context/UserContext';
import Colors from '@/constants/Colors';
import api from '@/api/axios';
import { useColorScheme } from '@/components/useColorScheme';
import { Mail, Lock, ChevronLeft } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const showAlert = (title: string, msg: string) => {
  Platform.OS === 'web' ? window.alert(msg) : Alert.alert(title, msg);
};

export default function LoginScreen() {
  const router = useRouter();
  const { updateProfile, profile } = useUser();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      showAlert('로그인 실패', '이메일과 비밀번호를 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/api/auth/login', {
        email: email.trim(),
        password: password.trim(),
      });

      await AsyncStorage.setItem('@jwt_token', res.data.token);
      await AsyncStorage.setItem('@refresh_token', res.data.refreshToken);
      await updateProfile({
        ...profile,
        name: res.data.user.name,
        major: res.data.user.major || '',
        grade: '',
        keywords: res.data.user.keywords ? res.data.user.keywords.split(',').filter(Boolean) : [],
        isLoggedIn: true,
        role: res.data.user.role || 'USER',
      });

      router.replace('/(tabs)');
    } catch (err: any) {
      const msg = err.response?.data?.message || '이메일 혹은 비밀번호를 확인해주세요.';
      showAlert('로그인 실패', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetEmail.trim()) {
      showAlert('알림', '이메일을 입력해주세요.');
      return;
    }
    setIsResetting(true);
    try {
      const res = await api.post('/api/auth/reset-password', { email: resetEmail.trim() });
      const tempPw = res.data.tempPassword;
      if (tempPw) {
        showAlert('임시 비밀번호 발급', `임시 비밀번호: ${tempPw}\n\n로그인 후 반드시 비밀번호를 변경해주세요.`);
      } else {
        showAlert('완료', res.data.message || '처리되었습니다.');
      }
      setShowResetModal(false);
      setResetEmail('');
    } catch (err: any) {
      const msg = err.response?.data?.message || '비밀번호 초기화에 실패했습니다.';
      showAlert('실패', msg);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.screenBackground }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={28} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>다시 오셨군요!</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>인하캐치 계정으로 로그인해주세요.</Text>

          <View style={styles.form}>
            <View style={[styles.inputContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <Mail size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="이메일"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={[styles.inputContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              <Lock size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="비밀번호"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <Pressable style={styles.forgotBtn} onPress={() => { setResetEmail(email); setShowResetModal(true); }}>
              <Text style={[styles.forgotText, { color: colors.primary }]}>비밀번호를 잊으셨나요?</Text>
            </Pressable>

            <Pressable
              style={[styles.loginBtn, { backgroundColor: colors.primary, opacity: isSubmitting ? 0.6 : 1 }]}
              onPress={handleLogin}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.loginBtnText}>로그인</Text>
              )}
            </Pressable>

            <View style={styles.footerRow}>
              <Text style={{ color: colors.textSecondary }}>계정이 없으신가요? </Text>
              <Pressable onPress={() => router.push('/signup')}>
                <Text style={{ color: colors.primary, fontWeight: 'bold' }}>회원가입</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* 비밀번호 찾기 모달 */}
      <Modal visible={showResetModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowResetModal(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.cardBackground }]} onPress={e => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>비밀번호 찾기</Text>
            <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
              가입한 이메일을 입력하면 임시 비밀번호가 발급됩니다.
            </Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.screenBackground, borderColor: colors.border }]}>
              <Mail size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="이메일 입력"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                value={resetEmail}
                onChangeText={setResetEmail}
              />
            </View>
            <Pressable
              style={[styles.loginBtn, { backgroundColor: colors.primary, opacity: isResetting ? 0.6 : 1, marginBottom: 12 }]}
              onPress={handleResetPassword}
              disabled={isResetting}
            >
              {isResetting ? <ActivityIndicator color="white" /> : <Text style={styles.loginBtnText}>임시 비밀번호 발급</Text>}
            </Pressable>
            <Pressable onPress={() => setShowResetModal(false)}>
              <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 15 }}>취소</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  header: { padding: 20, paddingTop: Platform.OS === 'android' ? 40 : 20 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 12 },
  subtitle: { fontSize: 16, marginBottom: 40 },
  form: { flex: 1 },
  inputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderRadius: 16, 
    marginBottom: 16, 
    paddingHorizontal: 16,
    height: 56
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16 },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 32 },
  forgotText: { fontSize: 14, fontWeight: '600' },
  loginBtn: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  loginBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  footerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { width: '100%', borderRadius: 20, padding: 24 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  modalDesc: { fontSize: 14, lineHeight: 20, marginBottom: 20 },
});
