import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, Platform, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, RefreshCw, Database, Trash2, Cpu, AlertTriangle, Users, FileText, Globe, Award, Trophy, Archive } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useUser } from '@/context/UserContext';
import api from '@/api/axios';

const showAlert = (title: string, msg: string) => {
  Platform.OS === 'web' ? window.alert(msg) : Alert.alert(title, msg);
};

type CrawlAction = 'save' | 'save-all' | 'backfill' | 'clear' | 'purge-outdated' | 'external' | 'external/wevity' | 'external/thinkcontest';

export default function AdminScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { profile } = useUser();

  const [stats, setStats] = useState({ totalScholarships: 0, totalUsers: 0 });
  const [loadingStats, setLoadingStats] = useState(true);
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  // 관리자가 아니면 접근 차단
  useEffect(() => {
    if (profile.role !== 'ADMIN') {
      showAlert('접근 불가', '관리자만 접근할 수 있습니다.');
      router.back();
    }
  }, [profile.role]);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await api.get('/api/scholarships?size=1');
      const total = res.data.totalElements ?? res.data.content?.length ?? 0;
      setStats(prev => ({ ...prev, totalScholarships: total }));
    } catch {}
    setLoadingStats(false);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString('ko-KR');
    setLogs(prev => [`[${time}] ${msg}`, ...prev.slice(0, 49)]);
  };

  const executeCrawlAction = async (action: CrawlAction, label: string) => {
    const destructive = action === 'clear' || action === 'purge-outdated';
    if (destructive) {
      const confirmMsg = action === 'clear'
        ? '정말 전체 데이터를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.'
        : '2024년 이하 과거 공고를 삭제합니다.\n현재 유효한(2025·2026) 공고는 유지됩니다.\n계속하시겠습니까?';
      const confirmed = Platform.OS === 'web'
        ? window.confirm(confirmMsg)
        : await new Promise<boolean>(resolve => {
            Alert.alert('확인', confirmMsg, [
              { text: '취소', onPress: () => resolve(false) },
              { text: '진행', style: 'destructive', onPress: () => resolve(true) },
            ]);
          });
      if (!confirmed) return;
    }

    setRunningAction(action);
    addLog(`${label} 시작...`);
    try {
      const isExternal = action.startsWith('external');
      const res = await api.get(`/api/crawl/${action}`, {
        timeout: isExternal ? 600000 : 120000,
      });
      const msg = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
      addLog(`${label} 완료: ${msg}`);
      showAlert('완료', `${label}이(가) 완료되었습니다.`);
      fetchStats();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || '알 수 없는 오류';
      addLog(`${label} 실패: ${msg}`);
      showAlert('실패', msg);
    } finally {
      setRunningAction(null);
    }
  };

  if (profile.role !== 'ADMIN') return null;

  const actions: { key: CrawlAction; label: string; desc: string; icon: any; color: string; danger?: boolean; group: 'internal' | 'external' | 'maintenance' }[] = [
    { key: 'save', label: '증분 크롤링', desc: '인하공전 최신 공고만 수집', icon: RefreshCw, color: '#2962FF', group: 'internal' },
    { key: 'save-all', label: '전체 크롤링', desc: '인하공전 전체 페이지 재수집', icon: Database, color: '#00897B', group: 'internal' },
    { key: 'external', label: '외부 통합 크롤링', desc: '위비티 + 씽굿 한번에 수집', icon: Globe, color: '#1E88E5', group: 'external' },
    { key: 'external/wevity', label: '위비티 크롤링', desc: '위비티 공모전/대외활동만 수집', icon: Award, color: '#F4511E', group: 'external' },
    { key: 'external/thinkcontest', label: '씽굿 크롤링', desc: '씽굿 공모전만 수집', icon: Trophy, color: '#6D4C41', group: 'external' },
    { key: 'backfill', label: 'AI 요약 생성', desc: '요약 없는 공고에 AI 요약 추가', icon: Cpu, color: '#7B1FA2', group: 'maintenance' },
    { key: 'purge-outdated', label: '과거 공고 정리', desc: '2024년 이하 옛날 공고만 선별 삭제', icon: Archive, color: '#546E7A', group: 'maintenance' },
    { key: 'clear', label: '데이터 전체 삭제', desc: '모든 장학금 데이터 삭제', icon: Trash2, color: '#D32F2F', danger: true, group: 'maintenance' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.screenBackground }]}>
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={28} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>관리자 대시보드</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loadingStats} onRefresh={fetchStats} />}
      >
        {/* 통계 카드 */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
            <FileText size={24} color={colors.primary} />
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {loadingStats ? '...' : stats.totalScholarships}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>전체 공고</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
            <Users size={24} color="#00897B" />
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {profile.role}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>내 역할</Text>
          </View>
        </View>

        {/* 크롤링 제어 */}
        {(['internal', 'external', 'maintenance'] as const).map((group) => {
          const groupActions = actions.filter(a => a.group === group);
          if (groupActions.length === 0) return null;
          const groupLabel =
            group === 'internal' ? '교내 크롤링 (인하공전)' :
            group === 'external' ? '외부 크롤링 (장학금/공모전)' :
            '유지보수';
          return (
            <View key={group}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{groupLabel}</Text>
              {groupActions.map((a) => {
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
            </View>
          );
        })}

        {/* 실행 로그 */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>실행 로그</Text>
        <View style={[styles.logBox, { backgroundColor: colors.cardBackground }]}>
          {logs.length === 0 ? (
            <Text style={{ color: colors.textSecondary, textAlign: 'center', padding: 20 }}>아직 실행 기록이 없습니다.</Text>
          ) : (
            logs.map((log, i) => (
              <Text key={i} style={[styles.logText, { color: log.includes('실패') ? '#D32F2F' : colors.textSecondary }]}>
                {log}
              </Text>
            ))
          )}
        </View>

        {/* 경고 */}
        <View style={[styles.warningCard, { backgroundColor: '#FFF3E0' }]}>
          <AlertTriangle size={18} color="#E65100" />
          <Text style={styles.warningText}>
            크롤링은 서버 리소스를 사용합니다. 전체 크롤링과 AI 요약 생성은 시간이 오래 걸릴 수 있습니다.
          </Text>
        </View>
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
  content: { padding: 20, paddingBottom: 100 },
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  statNumber: { fontSize: 28, fontWeight: 'bold', marginTop: 8 },
  statLabel: { fontSize: 13, marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
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
  logBox: { borderRadius: 12, padding: 16, marginBottom: 16 },
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
