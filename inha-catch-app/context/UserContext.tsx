import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type UserProfile = {
  name: string;
  major: string;
  grade?: string;
  keywords: string[];
  isLoggedIn: boolean;
  role?: string;
  provider?: string; // 'LOCAL', 'KAKAO' 등
};

type UserContextType = {
  profile: UserProfile;
  updateProfile: (newProfile: UserProfile) => Promise<void>;
  isLoading: boolean;
};

const defaultProfile: UserProfile = {
  name: '',
  major: '',
  keywords: [],
  isLoggedIn: false,
};

const UserContext = createContext<UserContextType>({
  profile: defaultProfile,
  updateProfile: async () => {},
  isLoading: true,
});

export const useUser = () => useContext(UserContext);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const stored = await AsyncStorage.getItem('@user_profile');
        if (stored) {
          setProfile(JSON.parse(stored));
        }
      } catch (e) {
        console.error('Failed to load user profile', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadProfile();
  }, []);

  const updateProfile = useCallback(async (newProfile: UserProfile) => {
    try {
      setProfile(newProfile);
      await AsyncStorage.setItem('@user_profile', JSON.stringify(newProfile));
    } catch (e) {
      console.error('Failed to save user profile', e);
    }
  }, []);

  const value = useMemo(
    () => ({ profile, updateProfile, isLoading }),
    [profile, updateProfile, isLoading]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
