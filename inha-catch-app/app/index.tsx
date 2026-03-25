import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useUser } from '@/context/UserContext';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Sparkles } from 'lucide-react-native';

export default function WelcomeScreen() {
  const router = useRouter();
  const { profile, isLoading } = useUser();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  useEffect(() => {
    if (!isLoading && profile.isLoggedIn) {
      router.replace('/(tabs)');
    }
  }, [isLoading, profile.isLoggedIn]);

  if (isLoading || profile.isLoggedIn) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.primary }]}>
      <View style={styles.centerContent}>
        <View style={styles.iconBox}>
          <Sparkles color={colors.primary} size={48} />
        </View>
        <Text style={styles.title}>INHA CATCH</Text>
        <Text style={styles.subtitle}>인하대생을 위한 단 하나의 장학금/공모전 알리미</Text>
      </View>

      <View style={[styles.bottomCard, { backgroundColor: colors.screenBackground }]}>
        <Text style={[styles.welcomeText, { color: colors.text }]}>인하캐치와 함께 시작해볼까요?</Text>
        
        <Pressable 
          style={[styles.loginBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/login')}
        >
          <Text style={styles.loginBtnText}>로그인</Text>
        </Pressable>
        
        <Pressable 
          style={[styles.signupBtn, { borderColor: colors.primary }]}
          onPress={() => router.push('/signup')}
        >
          <Text style={[styles.signupBtnText, { color: colors.primary }]}>무료 회원가입</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  iconBox: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 30,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 10,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: 'white',
    letterSpacing: 2,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    fontWeight: '500',
  },
  bottomCard: {
    padding: 30,
    paddingBottom: 50,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -5 },
    elevation: 20,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  loginBtn: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  loginBtnText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  signupBtn: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  signupBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
  }
});
