import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, Platform, RefreshControl, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, RefreshCw, Database, Trash2, Cpu, AlertTriangle, Users, FileText, Bell, Bookmark, TrendingUp, Shield, UserX, UserCheck, Globe, Award } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useUser } from '@/context/UserContext';
import api from '@/api/axios';

const showAlert = (title: string, msg: string) => {
  Platform.OS === 'web' ? window.alert(msg) : Alert.alert(title, msg);
};

type CrawlAction = 'save' | 'save-all' | 'backfill' | 'clear' | 'external' | 'external/wevity' | 'external/thinkcontest';
type TabType = 'dashboard' | 'users' | 'crawl';

type UserItem = {
  id: number;
  email: string;
  name: string;
  major: string;
  role: string;
  provider: string | null;
  isActive: boolean;
  createdAt: string;
  hasFcmToken: boolean;
};

export default function AdminScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { profile } = useUser();

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [stats, setStats] = useState({
    totalScholarships: 0, totalUsers: 0, totalNotifications: 0,
    totalBookmarks: 0, todayScholarships: 0, todayUsers: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  // 사용자 관리
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userPage, setUserPage] = useState(0);
  const [userTotalPages, setUserTotalPages] = useState(0);

  useEffect(() => {
    if (profile.role !== 'ADMIN') {
      showAlert('접근 불가', '관리자만 접근할 수 있습니다.');
      router.back();
    }
  }, [profile.role]);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await api.get('/api/admin/stats');
      setStats(res.data);
    } catch {}
    setLoadingStats(false);
  }, []);

  const fetchUsers = useCallback(async (page = 0) => {
    setLoadingUsers(true);
    try {
      const res = await api.get(`/api/admin/users?page=${page}&size=20`);
      setUsers(res.data.content);
      setUserTotalPages(res.data.totalPages);
      setUserPage(res.data.number);
    } catch (err: any) {
      showAlert('오류', '사용자 목록을 불러올 수 없습니다.');
    }
    setLoadingUsers(false);
  }, []);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers(0);
  }, [activeTab]);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString('ko-KR');
    setLogs(prev => [`[${time}] ${msg}`, ...prev.slice(0, 99)]);
  };

  const executeCrawlAction = async (action: CrawlAction, label: string) => {
    if (action === 'clear') {
      const confirmed = Platform.OS === 'web'
        ? window.confirm('정말 전체 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')
        : await new Promise<boolean>(resolve => {
            Alert.alert('경고', '정말 전체 데이터를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.', [
              { text: '취소', onPress: () => resolve(false) },
              { text: '삭제', style: 'destructive', onPress: () => resolve(true) },
            ]);
          });
      if (!confirmed) return;
    }

    setRunningAction(action);
    addLog(`${label} 시작...`);
    try {
      // 부수효과가 있는 크롤 액션은 POST(삭제는 DELETE)로 호출 (서버 매핑 변경에 맞춤)
      const res =
        action === 'clear'
          ? await api.delete(`/api/crawl/${action}`, { timeout: 300000 })
          : await api.post(`/api/crawl/${action}`, null, { timeout: 300000 });
      const msg = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
      addLog(`✓ ${label} 완료: ${msg}`);
      fetchStats();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || '알 수 없는 오류';
      addLog(`✗ ${label} 실패: ${msg}`);
      showAlert('실패', msg);
    } finally {
      setRunningAction(null);
    }
  };

  const handleChangeRole = async (user: UserItem) => {
    const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
    const msg = `${user.name}의 역할을 ${newRole}(으)로 변경하시겠습니까?`;

    const confirmed = Platform.OS === 'web'
      ? window.confirm(msg)
      : await new Promise<boolean>(resolve => {
          Alert.alert('역할 변경', msg, [
            { text: '취소', onPress: () => resolve(false) },
            { text: '변경', onPress: () => resolve(true) },
          ]);
        });
    if (!confirmed) return;

    try {
      await api.put(`/api/admin/users/${user.id}/role`, { role: newRole });
      fetchUsers(userPage);
    } catch (err: any) {
      showAlert('실패', err.response?.data?.message || '역할 변경에 실패했습니다.');
    }
  };

  const handleToggleActive = async (user: UserItem) => {
    const action = user.isActive ? '비활성화' : '활성화';
    const msg = `${user.name} 계정을 ${action}하시겠습니까?`;

    const confirmed = Platform.OS === 'web'
      ? window.confirm(msg)
      : await new Promise<boolean>(resolve => {
          Alert.alert(`계정 ${action}`, msg, [
            { text: '취소', onPress: () => resolve(false) },
            { text: action, style: user.isActive ? 'destructive' : 'default', onPress: () => resolve(true) },
          ]);
        });
    if (!confirmed) return;

    try {
      await api.put(`/api/admin/users/${user.id}/toggle-active`);
      fetchUsers(userPage);
    } catch (err: any) {
      showAlert('실패', err.response?.data?.message || '상태 변경에 실패했습니다.');
    }
  };

  if (profile.role !== 'ADMIN') return null;

  const actions: { key: CrawlAction; label: string; desc: string; icon: any; color: string; danger?: boolean }[] = [
    { key: 'save', label: '증분 크롤링', desc: '최신 공고만 수집 (인하공전)', icon: RefreshCw, color: '#2962FF' },
    { key: 'save-all', label: '전체 크롤링', desc: '전체 페이지 재수집 (인하공전)', icon: Database, color: '#00897B' },
    { key: 'backfill', label: 'AI 요약 생성', desc: '요약 없는 공고에 AI 요약 추가', icon: Cpu, color: '#7B1FA2' },
    { key: 'external', label: '외부 일괄 크롤링', desc: '위비티 + 씽굿 공모전 동시 수집', icon: Globe, color: '#0277BD' },
    { key: 'external/wevity', label: '위비티 크롤링', desc: 'wevity.com 공모전/대외활동', icon: Award, color: '#1565C0' },
    { key: 'external/thinkcontest', label: '씽굿 크롤링', desc: 'thinkcontest.com 공모전', icon: Award, color: '#00796B' },
    { key: 'clear', label: '데이터 전체 삭제', desc: '모든 장학금 데이터 삭제', icon: Trash2, color: '#D32F2F', danger: true },
  ];

  const tabs: { key: TabType; label: string; icon: any }[] = [
    { key: 'dashboard', label: '대시보드', icon: TrendingUp },
    { key: 'users', label: '사용자', icon: Users },
    { key: 'crawl', label: '크롤링', icon: Database },
  ];

  const renderDashboard = () => (
    <>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>전체 현황</Text>
      <View style={styles.statsGrid}>
        {[
          { icon: FileText, color: colors.primary, value: stats.totalScholarships, label: '전체 공고' },
          { icon: Users, color: '#00897B', value: stats.totalUsers, label: '가입자 수' },
          { icon: Bell, color: '#7B1FA2', value: stats.totalNotifications, label: '발송 알림' },
          { icon: Bookmark, color: '#E65100', value: stats.totalBookmarks, label: '북마크 수' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <View key={i} style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
              <Icon size={22} color={stat.color} />
              <Text style={[styles.statNumber, { color: colors.text }]}>
                {loadingStats ? '...' : stat.value}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
            </View>
          );
        })}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 8 }]}>오늘 활동</Text>
      <View style={styles.statsRow}>
        <View style={[styles.todayCard, { backgroundColor: '#E8F5E9' }]}>
          <Text style={[styles.todayNumber, { color: '#2E7D32' }]}>{loadingStats ? '...' : stats.todayScholarships}</Text>
          <Text style={[styles.todayLabel, { color: '#2E7D32' }]}>오늘 신규 공고</Text>
        </View>
        <View style={[styles.todayCard, { backgroundColor: '#E3F2FD' }]}>
          <Text style={[styles.todayNumber, { color: '#1565C0' }]}>{loadingStats ? '...' : stats.todayUsers}</Text>
          <Text style={[styles.todayLabel, { color: '#1565C0' }]}>오늘 신규 가입</Text>
        </View>
      </View>
    </>
  );

  const renderUsers = () => (
    <>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>사용자 관리</Text>
        <Pressable onPress={() => fetchUsers(userPage)} style={{ padding: 8 }}>
          <RefreshCw size={18} color={colors.primary} />
        </Pressable>
      </View>

      {loadingUsers ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          {users.map((user) => (
            <View key={user.id} style={[styles.userCard, { backgroundColor: colors.cardBackground, opacity: user.isActive ? 1 : 0.6 }]}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Text style={[styles.userName, { color: colors.text }]}>{user.name}</Text>
                  <View style={[styles.roleBadge, { backgroundColor: user.role === 'ADMIN' ? '#F3E5F5' : colors.tagBackground }]}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: user.role === 'ADMIN' ? '#7B1FA2' : colors.textSecondary }}>
                      {user.role}
                    </Text>
                  </View>
                  {user.provider && (
                    <View style={[styles.roleBadge, { backgroundColor: '#FFF9C4' }]}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#F57F17' }}>{user.provider}</Text>
                    </View>
                  )}
                  {!user.isActive && (
                    <View style={[styles.roleBadge, { backgroundColor: '#FFCDD2' }]}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#C62828' }}>비활성</Text>
                    </View>
                  )}
                </View>
                <Text style={{ fontSize: 13, color: colors.textSecondary }}>{user.email}</Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                  {user.major || '학과 미설정'} · 가입: {user.createdAt?.split('T')[0] || '-'}
                  {user.hasFcmToken ? ' · 푸시 ON' : ''}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable onPress={() => handleChangeRole(user)} style={[styles.userActionBtn, { backgroundColor: '#F3E5F5' }]}>
                  <Shield size={16} color="#7B1FA2" />
                </Pressable>
                <Pressable onPress={() => handleToggleActive(user)} style={[styles.userActionBtn, { backgroundColor: user.isActive ? '#FFEBEE' : '#E8F5E9' }]}>
                  {user.isActive ? <UserX size={16} color="#C62828" /> : <UserCheck size={16} color="#2E7D32" />}
                </Pressable>
              </View>
            </View>
          ))}

          {/* 페이지네이션 */}
          {userTotalPages > 1 && (
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 16 }}>
              <Pressable
                onPress={() => fetchUsers(userPage - 1)}
                disabled={userPage === 0}
                style={{ opacity: userPage === 0 ? 0.3 : 1 }}
              >
                <Text style={{ color: colors.primary, fontWeight: 'bold' }}>이전</Text>
              </Pressable>
              <Text style={{ color: colors.textSecondary }}>{userPage + 1} / {userTotalPages}</Text>
              <Pressable
                onPress={() => fetchUsers(userPage + 1)}
                disabled={userPage >= userTotalPages - 1}
                style={{ opacity: userPage >= userTotalPages - 1 ? 0.3 : 1 }}
              >
                <Text style={{ color: colors.primary, fontWeight: 'bold' }}>다음</Text>
              </Pressable>
            </View>
          )}
        </>
      )}
    </>
  );

  const renderCrawl = () => (
    <>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>크롤링 제어</Text>
      {actions.map((a) => {
        const Icon = a.icon;
        const isRunning = runningAction === a.key;
        return (
          <Pressable
            key={a.key}
            style={[
              styles.actionCard,
              { backgroundColor: colors.cardBackground, opacity: runningAction && !isRunning ? 0.5 : 1 },
              a.danger && { borderWidth: 1, borderColor: '#FFCDD2' }
            ]}
            onPress={() => executeCrawlAction(a.key, a.label)}
            disabled={!!runningAction}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: a.color + '18' }]}>
              {isRunning ? <ActivityIndicator color={a.color} size={20} /> : <Icon size={20} color={a.color} />}
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, { color: a.danger ? '#D32F2F' : colors.text }]}>{a.label}</Text>
              <Text style={[styles.actionDesc, { color: colors.textSecondary }]}>{a.desc}</Text>
            </View>
            {isRunning && <Text style={{ color: a.color, fontSize: 12, fontWeight: 'bold' }}>실행중</Text>}
          </Pressable>
        );
      })}

      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>실행 로그</Text>
      <View style={[styles.logBox, { backgroundColor: colors.cardBackground }]}>
        {logs.length === 0 ? (
          <Text style={{ color: colors.textSecondary, textAlign: 'center', padding: 20 }}>아직 실행 기록이 없습니다.</Text>
        ) : (
          logs.map((log, i) => (
            <Text key={i} style={[styles.logText, {
              color: log.includes('✗') ? '#D32F2F' : log.includes('✓') ? '#2E7D32' : colors.textSecondary
            }]}>
              {log}
            </Text>
          ))
        )}
      </View>

      <View style={[styles.warningCard, { backgroundColor: '#FFF3E0' }]}>
        <AlertTriangle size={18} color="#E65100" />
        <Text style={styles.warningText}>
          크롤링은 서버 리소스를 사용합니다. 전체 크롤링과 AI 요약 생성은 시간이 오래 걸릴 수 있습니다.
        </Text>
      </View>
    </>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.screenBackground }]}>
      {/* 헤더 */}
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={28} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>관리자 대시보드</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* 탭 */}
      <View style={[styles.tabBar, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[styles.tabItem, active && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            >
              <Icon size={18} color={active ? colors.primary : colors.textSecondary} />
              <Text style={[styles.tabLabel, { color: active ? colors.primary : colors.textSecondary }]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* 콘텐츠 */}
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loadingStats} onRefresh={() => { fetchStats(); if (activeTab === 'users') fetchUsers(userPage); }} />}
      >
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'crawl' && renderCrawl()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  tabLabel: { fontSize: 14, fontWeight: '600' },
  content: { padding: 20, paddingBottom: 100 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: {
    width: '47%',
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  statNumber: { fontSize: 26, fontWeight: 'bold', marginTop: 6 },
  statLabel: { fontSize: 12, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  todayCard: {
    flex: 1,
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  todayNumber: { fontSize: 28, fontWeight: 'bold' },
  todayLabel: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  userName: { fontSize: 15, fontWeight: '700' },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  userActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  actionContent: { flex: 1 },
  actionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  actionDesc: { fontSize: 13 },
  logBox: { borderRadius: 12, padding: 16, marginBottom: 16, maxHeight: 300 },
  logText: { fontSize: 12, lineHeight: 20, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  warningText: { flex: 1, fontSize: 13, color: '#E65100', lineHeight: 20 },
});
