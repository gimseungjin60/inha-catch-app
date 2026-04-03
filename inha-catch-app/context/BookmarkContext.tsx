import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '@/api/axios';

type BookmarkContextType = {
  bookmarkedIds: number[];
  toggleBookmark: (id: number) => void;
  isBookmarked: (id: number) => boolean;
};

const BookmarkContext = createContext<BookmarkContextType>({
  bookmarkedIds: [],
  toggleBookmark: () => {},
  isBookmarked: () => false,
});

export const useBookmarks = () => useContext(BookmarkContext);

export const BookmarkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bookmarkedIds, setBookmarkedIds] = useState<number[]>([]);

  useEffect(() => {
    const loadBookmarks = async () => {
      try {
        const stored = await AsyncStorage.getItem('@bookmarks');
        if (stored) {
          setBookmarkedIds(JSON.parse(stored));
        }

        // 서버에서 최신 북마크(저장한 공고) 동기화
        const res = await api.get('/api/bookmarks');
        if (res.data) {
          const ids = res.data.map((item: any) => item.id);
          setBookmarkedIds(ids);
          await AsyncStorage.setItem('@bookmarks', JSON.stringify(ids));
        }
      } catch (e) {
        console.log('Server bookmark sync skipped (offline or not logged in)');
      }
    };
    loadBookmarks();
  }, []);

  const toggleBookmark = async (id: number) => {
    try {
      // Optimistic UI update
      setBookmarkedIds((prev) => {
        let newBookmarks;
        if (prev.includes(id)) {
          newBookmarks = prev.filter(item => item !== id);
        } else {
          newBookmarks = [...prev, id];
        }
        AsyncStorage.setItem('@bookmarks', JSON.stringify(newBookmarks)).catch(e => 
          console.error('Failed to save bookmarks locally', e)
        );
        return newBookmarks;
      });

      // API 호출로 서버 DB 반영
      await api.post(`/api/bookmarks/${id}`);
    } catch (error) {
      console.error('Bookmark server sync error:', error);
    }
  };

  const isBookmarked = (id: number) => bookmarkedIds.includes(id);

  return (
    <BookmarkContext.Provider value={{ bookmarkedIds, toggleBookmark, isBookmarked }}>
      {children}
    </BookmarkContext.Provider>
  );
};
