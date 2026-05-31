import React, { useEffect, useState, useCallback } from 'react';
import { Tabs } from 'expo-router';
import { Home, Search, Bookmark, Bell, UserCircle } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useUser } from '@/context/UserContext';
import { View, ActivityIndicator } from 'react-native';
import api from '@/api/axios';

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { profile, isLoading } = useUser();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    if (!profile.isLoggedIn) return;
    try {
      const res = await api.get('/api/notifications/unread-count');
      setUnreadCount(res.data.count || 0);
    } catch {
      // 무시
    }
  }, [profile.isLoggedIn]);

  useEffect(() => {
    if (!profile.isLoggedIn) return;
    fetchUnreadCount();
    // 30초마다 읽지 않은 알림 수 갱신
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount, profile.isLoggedIn]);

  // 비로그인 시 ActivityIndicator만 표시. navigate는 호출자(profile.tsx 등)가 DevSettings.reload()로 처리
  if (isLoading || !profile.isLoggedIn) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.stone300,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.paperCard,
          borderTopWidth: 1,
          borderTopColor: colors.stone100,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          fontFamily: 'Pretendard-Medium',
        }
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarIcon: ({ color }) => <Home color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: '검색',
          tabBarIcon: ({ color }) => <Search color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="bookmark"
        options={{
          title: '저장',
          tabBarIcon: ({ color }) => <Bookmark color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: '알림',
          tabBarIcon: ({ color }) => <Bell color={color} size={24} />,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: { backgroundColor: '#F44336', fontSize: 11 },
        }}
        listeners={{
          tabPress: () => fetchUnreadCount(),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '내 정보',
          tabBarIcon: ({ color }) => <UserCircle color={color} size={24} />,
        }}
      />
    </Tabs>
  );
}
