'use client'

import { Home, Search, Bookmark, Bell, User } from 'lucide-react'

type TabType = 'home' | 'search' | 'bookmark' | 'notifications' | 'profile'

interface BottomNavProps {
  activeTab: TabType
  onChange: (tab: TabType) => void
  notificationCount?: number
}

const tabs: { id: TabType; icon: typeof Home; label: string }[] = [
  { id: 'home', icon: Home, label: '홈' },
  { id: 'search', icon: Search, label: '검색' },
  { id: 'bookmark', icon: Bookmark, label: '저장' },
  { id: 'notifications', icon: Bell, label: '알림' },
  { id: 'profile', icon: User, label: '내 정보' },
]

export function BottomNav({ activeTab, onChange, notificationCount = 0 }: BottomNavProps) {
  return (
    <nav className="flex items-center justify-around py-2 bg-paper-card dark:bg-card border-t border-stone-100 dark:border-border">
      {tabs.map(({ id, icon: Icon, label }) => {
        const isActive = activeTab === id
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className="flex flex-col items-center gap-0.5 px-4 py-1"
          >
            <div className="relative">
              <Icon
                size={20}
                strokeWidth={1.5}
                className={isActive ? 'text-ink dark:text-foreground' : 'text-stone-300 dark:text-stone-500'}
              />
              {id === 'notifications' && notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-signal dark:bg-signal-dark rounded-full" />
              )}
            </div>
            <span className={`text-[10px] ${isActive ? 'text-ink dark:text-foreground' : 'text-stone-300 dark:text-stone-500'}`}>
              {label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
