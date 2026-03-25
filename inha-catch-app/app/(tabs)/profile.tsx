import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, SafeAreaView, Pressable, ScrollView, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useUser } from '@/context/UserContext';
import { UserCircle, Tag, BookOpen } from 'lucide-react-native';
import { useRouter } from 'expo-router';

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

  const handleSave = async () => {
    await updateProfile({ ...profile, name, major, keywords });
    Alert.alert('저장 완료', '내 정보가 업데이트 되었습니다!');
  };

  const handleLogout = async () => {
    Alert.alert('로그아웃', '정말 로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { 
        text: '로그아웃', 
        style: 'destructive',
        onPress: async () => {
          await updateProfile({ ...profile, isLoggedIn: false });
          router.replace('/');
        }
      }
    ]);
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

        <Pressable onPress={handleSave} style={[styles.saveBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.saveBtnText}>내 정보 저장하기</Text>
        </Pressable>

        <Pressable onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={[styles.logoutBtnText, { color: colors.primary }]}>로그아웃</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: Platform.OS === 'android' ? 40 : 20, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', elevation: 1 },
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
  saveBtn: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  logoutBtn: { padding: 16, marginTop: 8, alignItems: 'center' },
  logoutBtnText: { fontSize: 16, fontWeight: 'bold' }
});
