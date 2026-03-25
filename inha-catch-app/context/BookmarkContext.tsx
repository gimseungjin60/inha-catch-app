import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    // Load initial bookmarks from AsyncStorage
    const loadBookmarks = async () => {
      try {
        const stored = await AsyncStorage.getItem('@bookmarks');
        if (stored) {
          setBookmarkedIds(JSON.parse(stored));
        }
      } catch (e) {
        console.error('Failed to load bookmarks', e);
      }
    };
    loadBookmarks();
  }, []);

  const toggleBookmark = async (id: number) => {
    try {
      setBookmarkedIds((prev) => {
        let newBookmarks;
        if (prev.includes(id)) {
          newBookmarks = prev.filter(item => item !== id);
        } else {
          newBookmarks = [...prev, id];
        }
        
        // Save to AsyncStorage asynchronously
        AsyncStorage.setItem('@bookmarks', JSON.stringify(newBookmarks)).catch(e => 
          console.error('Failed to save bookmarks', e)
        );
        
        return newBookmarks;
      });
    } catch (error) {
      console.error('Bookmark toggle error:', error);
    }
  };

  const isBookmarked = (id: number) => bookmarkedIds.includes(id);

  return (
    <BookmarkContext.Provider value={{ bookmarkedIds, toggleBookmark, isBookmarked }}>
      {children}
    </BookmarkContext.Provider>
  );
};
