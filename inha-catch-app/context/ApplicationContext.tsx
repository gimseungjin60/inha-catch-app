import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '@/api/axios';
import { useUser } from '@/context/UserContext';

export type ApplicationStatus = 'INTERESTED' | 'APPLIED' | 'ACCEPTED' | 'REJECTED';

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  INTERESTED: '관심',
  APPLIED: '지원',
  ACCEPTED: '합격',
  REJECTED: '탈락',
};

export const STATUS_ORDER: ApplicationStatus[] = ['INTERESTED', 'APPLIED', 'ACCEPTED', 'REJECTED'];

type ApplicationContextType = {
  statusMap: Record<number, ApplicationStatus>;
  getStatus: (scholarshipId: number) => ApplicationStatus | undefined;
  setStatus: (scholarshipId: number, status: ApplicationStatus, memo?: string) => Promise<void>;
  clearStatus: (scholarshipId: number) => Promise<void>;
  refresh: () => Promise<void>;
};

const CACHE_KEY = '@applications_status';

const ApplicationContext = createContext<ApplicationContextType>({
  statusMap: {},
  getStatus: () => undefined,
  setStatus: async () => {},
  clearStatus: async () => {},
  refresh: async () => {},
});

export const useApplications = () => useContext(ApplicationContext);

export const ApplicationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [statusMap, setStatusMap] = useState<Record<number, ApplicationStatus>>({});
  const { profile } = useUser();
  const pendingIds = useRef<Set<number>>(new Set());

  const persist = useCallback(async (map: Record<number, ApplicationStatus>) => {
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(map));
    } catch {}
  }, []);

  const refresh = useCallback(async () => {
    if (!profile.isLoggedIn) return;
    try {
      const res = await api.get('/api/applications');
      const map: Record<number, ApplicationStatus> = {};
      for (const item of res.data || []) {
        const sId = item.scholarship?.id;
        if (sId) map[sId] = item.status;
      }
      setStatusMap(map);
      persist(map);
    } catch (e) {
      // 오프라인 또는 미로그인 — 캐시 유지
    }
  }, [profile.isLoggedIn, persist]);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(CACHE_KEY);
        if (stored) setStatusMap(JSON.parse(stored));
      } catch {}
      refresh();
    })();
  }, [refresh]);

  const setStatus = async (scholarshipId: number, status: ApplicationStatus, memo?: string) => {
    if (pendingIds.current.has(scholarshipId)) return;
    pendingIds.current.add(scholarshipId);

    const prev = { ...statusMap };
    const next = { ...statusMap, [scholarshipId]: status };
    setStatusMap(next);
    persist(next);

    try {
      if (profile.isLoggedIn) {
        const body: any = { status };
        if (memo !== undefined) body.memo = memo;
        await api.post(`/api/applications/${scholarshipId}`, body);
      }
    } catch (e) {
      setStatusMap(prev);
      persist(prev);
    } finally {
      pendingIds.current.delete(scholarshipId);
    }
  };

  const clearStatus = async (scholarshipId: number) => {
    if (pendingIds.current.has(scholarshipId)) return;
    pendingIds.current.add(scholarshipId);

    const prev = { ...statusMap };
    const next = { ...statusMap };
    delete next[scholarshipId];
    setStatusMap(next);
    persist(next);

    try {
      if (profile.isLoggedIn) {
        await api.delete(`/api/applications/${scholarshipId}`);
      }
    } catch (e) {
      setStatusMap(prev);
      persist(prev);
    } finally {
      pendingIds.current.delete(scholarshipId);
    }
  };

  const getStatus = (id: number) => statusMap[id];

  return (
    <ApplicationContext.Provider value={{ statusMap, getStatus, setStatus, clearStatus, refresh }}>
      {children}
    </ApplicationContext.Provider>
  );
};
