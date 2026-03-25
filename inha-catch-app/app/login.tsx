import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, SafeAreaView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useUser } from '@/context/UserContext';
import Colors from '@/constants/Colors';
import axios from 'axios';
import { useColorScheme } from '@/components/useColorScheme';
import { Mail, Lock, ChevronLeft } from 'lucide-react-native';

export default function LoginScreen() {
  const router = useRouter();
  const { updateProfile, profile } = useUser();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('로그인 실패', '이메일과 비밀번호를 입력해주세요.');
      return;
    }
    
    try {
      const apiUrl = Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080';
      const res = await axios.post(`${apiUrl}/api/auth/login`, {
        email: email.trim(),
        password: password.trim(),
      });

      await updateProfile({
        ...profile, // Keep existing offline profile if any
        name: res.data.name,
        major: res.data.major || '',
        grade: '',
        keywords: res.data.keywords ? res.data.keywords.split(',').filter(Boolean) : [],
        isLoggedIn: true
      });
      
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('로그인 실패', err.response?.data?.message || '이메일 혹은 비밀번호를 확인해주세요.');
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

            <Pressable style={styles.forgotBtn}>
              <Text style={[styles.forgotText, { color: colors.primary }]}>비밀번호를 잊으셨나요?</Text>
            </Pressable>

            <Pressable 
              style={[styles.loginBtn, { backgroundColor: colors.primary }]}
              onPress={handleLogin}
            >
              <Text style={styles.loginBtnText}>로그인</Text>
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
  footerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }
});
