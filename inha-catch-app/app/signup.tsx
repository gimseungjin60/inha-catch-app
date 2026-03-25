import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, SafeAreaView, Platform, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useUser } from '@/context/UserContext';
import Colors from '@/constants/Colors';
import axios from 'axios';
import { useColorScheme } from '@/components/useColorScheme';
import { UserPlus, BookOpen, Tag, Mail, Lock, ChevronLeft } from 'lucide-react-native';

export default function SignupScreen() {
  const router = useRouter();
  const { updateProfile } = useUser();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [major, setMajor] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);

  const addKeyword = () => {
    if (!keywordInput.trim()) return;
    if (keywords.includes(keywordInput.trim())) return;
    setKeywords([...keywords, keywordInput.trim()]);
    setKeywordInput('');
  };

  const removeKeyword = (k: string) => {
    setKeywords(keywords.filter(item => item !== k));
  };

  const handleComplete = async () => {
    if (!email.trim() || !password.trim() || !name.trim() || !major.trim()) {
      Alert.alert('알림', '모든 필수 항목(이메일, 비밀번호, 이름, 전공)을 입력해주세요.');
      return;
    }
    
    try {
      const apiUrl = Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080';
      const res = await axios.post(`${apiUrl}/api/auth/signup`, {
        email: email.trim(),
        password: password.trim(),
        name: name.trim(),
        major: major.trim(),
        keywords: keywords.join(','),
      });

      await updateProfile({
        name: res.data.name,
        major: res.data.major || '',
        grade: '',
        keywords: res.data.keywords ? res.data.keywords.split(',').filter(Boolean) : [],
        isLoggedIn: true
      });
      
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('회원가입 실패', err.response?.data?.message || '네트워크 오류가 발생했습니다.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.screenBackground }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={{ marginBottom: 20 }}>
            <ChevronLeft size={28} color={colors.text} style={{ marginLeft: -8 }} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>환영합니다! 👋</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            인하캐치에서 회원님에게 딱 맞는 장학금과 공모전을 추천해 드리기 위해 맞춤 정보를 입력해주세요.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Mail size={18} color={colors.text} />
              <Text style={[styles.label, { color: colors.text }]}>아이디 (이메일)</Text>
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: colors.screenBackground, color: colors.text }]}
              placeholder="inha@inha.ac.kr"
              placeholderTextColor={colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Lock size={18} color={colors.text} />
              <Text style={[styles.label, { color: colors.text }]}>비밀번호</Text>
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: colors.screenBackground, color: colors.text }]}
              placeholder="비밀번호 입력"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <UserPlus size={18} color={colors.text} />
              <Text style={[styles.label, { color: colors.text }]}>이름 (또는 닉네임)</Text>
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: colors.screenBackground, color: colors.text }]}
              placeholder="홍길동"
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <BookOpen size={18} color={colors.text} />
              <Text style={[styles.label, { color: colors.text }]}>소속 학과</Text>
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: colors.screenBackground, color: colors.text }]}
              placeholder="컴퓨터공학과"
              placeholderTextColor={colors.textSecondary}
              value={major}
              onChangeText={setMajor}
            />
          </View>

          <View style={[styles.inputGroup, { borderBottomWidth: 0 }]}>
            <View style={styles.labelRow}>
              <Tag size={18} color={colors.text} />
              <Text style={[styles.label, { color: colors.text }]}>관심 키워드 (선택)</Text>
            </View>
            <Text style={[styles.helperText, { color: colors.textSecondary }]}>
              소득구간, 성적, 해외연수 등을 태그로 등록하세요.
            </Text>
            <View style={styles.keywordRow}>
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
                  <Text style={[styles.tagText, { color: colors.tagText }]}>{k} ✕</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <Pressable onPress={handleComplete} style={[styles.submitBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.submitText}>인하캐치 시작하기</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingTop: Platform.OS === 'android' ? 60 : 20, paddingBottom: 100 },
  header: { marginBottom: 30 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 12 },
  subtitle: { fontSize: 15, lineHeight: 22 },
  card: { padding: 20, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5, elevation: 2, marginBottom: 30 },
  inputGroup: { marginBottom: 24 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  label: { fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  helperText: { fontSize: 13, marginBottom: 10, marginTop: -4 },
  input: { height: 50, borderRadius: 10, paddingHorizontal: 14, fontSize: 15 },
  keywordRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  addBtn: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, borderRadius: 10 },
  addBtnText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  tagText: { fontWeight: '600', fontSize: 13 },
  submitBtn: { padding: 18, borderRadius: 12, alignItems: 'center' },
  submitText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});
