'use client'

import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Activity, 
  Sparkles, 
  Bell, 
  Settings 
} from 'lucide-react'

type AdminTab = 'dashboard' | 'posts' | 'users' | 'crawling' | 'algorithm' | 'notifications' | 'settings'

interface AdminSidebarProps {
  activeTab: AdminTab
  onChange: (tab: AdminTab) => void
}

const menuItems: { id: AdminTab; icon: typeof LayoutDashboard; label: string }[] = [
  { id: 'dashboard', icon: LayoutDashboard, label: '대시보드' },
  { id: 'posts', icon: FileText, label: '공고 관리' },
  { id: 'users', icon: Users, label: '사용자' },
  { id: 'crawling', icon: Activity, label: '크롤링 로그' },
  { id: 'algorithm', icon: Sparkles, label: '추천 알고리즘' },
  { id: 'notifications', icon: Bell, label: '알림 발송' },
  { id: 'settings', icon: Settings, label: '설정' },
]

export function AdminSidebar({ activeTab, onChange }: AdminSidebarProps) {
  return (
    <aside className="w-60 bg-paper-card dark:bg-card border-r border-stone-100 dark:border-border flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-stone-100 dark:border-border">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-ink dark:text-foreground tracking-tight">INHA-CATCH</span>
        </div>
        <p className="text-[10px] text-stone-400 dark:text-muted-foreground mt-0.5 uppercase tracking-wider">ADMIN</p>
      </div>

      {/* Menu */}
      <nav className="flex-1 py-4 px-3">
        <ul className="space-y-1">
          {menuItems.map(({ id, icon: Icon, label }) => {
            const isActive = activeTab === id
            return (
              <li key={id}>
                <button
                  onClick={() => onChange(id)}
                  className={`
                    relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                    transition-colors
                    ${isActive 
                      ? 'bg-stone-50 dark:bg-secondary text-ink dark:text-foreground' 
                      : 'text-stone-400 dark:text-muted-foreground hover:bg-stone-50 dark:hover:bg-secondary hover:text-ink dark:hover:text-foreground'
                    }
                  `}
                >
                  {/* Margin Marker for active */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-ink dark:bg-foreground rounded-r-sm" />
                  )}
                  <Icon size={18} strokeWidth={1.5} />
                  <span>{label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}
