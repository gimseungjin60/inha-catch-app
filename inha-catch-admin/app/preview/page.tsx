'use client'

import { useState, useEffect } from 'react'
import { 
  Sun, Moon, ChevronRight, Search, Clock, TrendingUp, 
  Plus, X, Heart, ExternalLink, Wifi, Battery, Signal,
  Check, MoreHorizontal, ChevronDown, Command, Bell
} from 'lucide-react'
import { ScholarshipCard } from '@/components/inha-catch/ScholarshipCard'
import { SectionHeader } from '@/components/inha-catch/SectionHeader'
import { SegmentedTabs } from '@/components/inha-catch/Chip'
import { BottomNav } from '@/components/inha-catch/BottomNav'
import { AdminSidebar } from '@/components/inha-catch/preview/AdminSidebar'
import { KPICard } from '@/components/inha-catch/preview/KPICard'
import { LineChart } from '@/components/inha-catch/preview/LineChart'
import { DonutChart } from '@/components/inha-catch/preview/DonutChart'

// ==================== MOCK DATA ====================

const SCHOLARSHIPS = [
  {
    id: 1,
    title: '2026학년도 1학기 국가장학금 신청 안내',
    category: '장학금',
    source: 'scholarship.inha.ac.kr',
    dDay: 3,
    aiSummary: ['소득분위 8분위 이하 대상', '최대 520만원 지원', '성적 B학점 이상 유지 필요'],
    tags: ['국가장학', '소득분위', '학부생'],
    isSignal: true,
  },
  {
    id: 2,
    title: '인하 SW중심대학 해커톤 공모전',
    category: '공모전',
    source: 'sw.inha.ac.kr',
    dDay: 7,
    aiSummary: ['팀 단위 참가 (3-5명)', '총 상금 1,000만원', 'AI/빅데이터 주제'],
    tags: ['해커톤', 'SW', '팀프로젝트'],
  },
  {
    id: 3,
    title: '삼성 청년 SW 아카데미 13기 모집',
    category: '대외활동',
    source: 'samsung.com',
    dDay: 14,
    tags: ['삼성', 'SW', '취업연계'],
  },
  {
    id: 4,
    title: '인하대학교 성적우수 장학금',
    category: '장학금',
    source: 'scholarship.inha.ac.kr',
    dDay: 21,
    tags: ['성적우수', '교내장학', '학부생'],
  },
  {
    id: 5,
    title: '한국장학재단 푸른등대 기부장학금',
    category: '장학금',
    source: 'kosaf.go.kr',
    dDay: 5,
    aiSummary: ['저소득층 우선 선발', '연 300만원 지원', '봉사활동 30시간 이상'],
    tags: ['기부장학', '저소득층', '봉사'],
  },
  {
    id: 6,
    title: '2026 공공데이터 활용 창업경진대회',
    category: '공모전',
    source: 'data.go.kr',
    dDay: 10,
    tags: ['공공데이터', '창업', '팀프로젝트'],
  },
]

const DEADLINE_SOON = [
  { id: 7, title: 'LG 소셜캠퍼스 챌린지', category: '공모전', source: 'lg.com', dDay: 2, tags: ['LG', '소셜임팩트'] },
  { id: 8, title: '교내 근로장학생 추가 모집', category: '장학금', source: 'inha.ac.kr', dDay: 1, tags: ['근로장학', '교내'] },
  { id: 9, title: 'SK 행복나눔재단 장학금', category: '장학금', source: 'skhappiness.org', dDay: 4, tags: ['SK', '나눔'] },
]

const RECENT_SEARCHES = ['국가장학금', '해커톤', 'SW', '대외활동']

const POPULAR_SEARCHES = [
  { rank: 1, keyword: '국가장학금' },
  { rank: 2, keyword: '삼성 SSAFY' },
  { rank: 3, keyword: '공모전' },
  { rank: 4, keyword: '인턴십' },
  { rank: 5, keyword: '교환학생' },
]

const NOTIFICATIONS = [
  { id: 1, category: '마감 임박', title: '국가장학금 신청 마감 D-3', time: '1시간 전', isRead: false },
  { id: 2, category: '새 공고', title: 'SW중심대학 해커톤 접수 시작', time: '3시간 전', isRead: false },
  { id: 3, category: '추천', title: '맞춤 장학금 3건이 새로 등록됐어요', time: '어제', isRead: true },
  { id: 4, category: '알림', title: '저장한 공고가 내일 마감됩니다', time: '2일 전', isRead: true },
  { id: 5, category: '새 공고', title: '삼성 청년 SW 아카데미 모집 공고', time: '3일 전', isRead: true },
]

const USER_KEYWORDS = ['컴퓨터공학', '장학금', 'SW', '해커톤', '대기업']

const CHART_DATA = Array.from({ length: 30 }, (_, i) => ({
  label: `${i + 1}`,
  scholarship: Math.floor(Math.random() * 30) + 10,
  competition: Math.floor(Math.random() * 20) + 5,
}))

const CRAWLING_STATUS = [
  { source: 'scholarship.inha.ac.kr', lastCrawl: '10분 전', newItems: 3, status: 'success' },
  { source: 'kosaf.go.kr', lastCrawl: '15분 전', newItems: 7, status: 'success' },
  { source: 'data.go.kr', lastCrawl: '22분 전', newItems: 2, status: 'success' },
  { source: 'sw.inha.ac.kr', lastCrawl: '1시간 전', newItems: 0, status: 'success' },
  { source: 'wevity.com', lastCrawl: '2시간 전', newItems: 12, status: 'warning' },
]

const ACTIVITY_LOG = [
  { time: '10:42', action: '새 사용자 가입 — kim****@inha.edu' },
  { time: '10:38', action: '공고 승인 — 국가장학금 2차' },
  { time: '10:35', action: '크롤링 완료 — kosaf.go.kr' },
  { time: '10:30', action: '알림 발송 — 마감 D-1 안내' },
  { time: '10:22', action: '새 사용자 가입 — park****@inha.edu' },
  { time: '10:15', action: '공고 수정 — SW해커톤' },
  { time: '10:10', action: '크롤링 시작 — inha.ac.kr' },
  { time: '10:05', action: '사용자 키워드 업데이트' },
]

const ADMIN_POSTS = [
  { id: 1, title: '2026학년도 1학기 국가장학금 신청 안내', category: '장학금', deadline: '2026.05.15', status: 'active', views: 1284 },
  { id: 2, title: '인하 SW중심대학 해커톤 공모전', category: '공모전', deadline: '2026.05.19', status: 'active', views: 856 },
  { id: 3, title: '삼성 청년 SW 아카데미 13기 모집', category: '대외활동', deadline: '2026.05.26', status: 'active', views: 2341 },
  { id: 4, title: '한국장학재단 푸른등대 기부장학금', category: '장학금', deadline: '2026.05.17', status: 'pending', views: 445 },
  { id: 5, title: '2026 공공데이터 활용 창업경진대회', category: '공모전', deadline: '2026.05.22', status: 'active', views: 723 },
  { id: 6, title: 'LG 소셜캠퍼스 챌린지', category: '공모전', deadline: '2026.05.14', status: 'active', views: 512 },
  { id: 7, title: '교내 근로장학생 추가 모집', category: '장학금', deadline: '2026.05.13', status: 'closed', views: 1892 },
  { id: 8, title: 'SK 행복나눔재단 장학금', category: '장학금', deadline: '2026.05.16', status: 'active', views: 634 },
  { id: 9, title: '네이버 부스트캠프 AI 6기', category: '대외활동', deadline: '2026.06.01', status: 'pending', views: 0 },
  { id: 10, title: '카카오 겨울 인턴십 2026', category: '대외활동', deadline: '2026.06.15', status: 'draft', views: 0 },
]

// ==================== TYPES ====================

type MobileTab = 'home' | 'search' | 'bookmark' | 'notifications' | 'profile'
type ScreenView = 'app' | 'onboarding' | 'login' | 'detail'
type AdminTab = 'dashboard' | 'posts' | 'users' | 'crawling' | 'algorithm' | 'notifications' | 'settings'

// ==================== MAIN COMPONENT ====================

export default function InhaCatchPreview() {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [mobileTab, setMobileTab] = useState<MobileTab>('home')
  const [screenView, setScreenView] = useState<ScreenView>('app')
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard')
  const [homeSegment, setHomeSegment] = useState(0)
  const [bookmarkSegment, setBookmarkSegment] = useState(0)
  const [selectedPost, setSelectedPost] = useState<typeof SCHOLARSHIPS[0] | null>(null)
  const [bookmarks, setBookmarks] = useState<number[]>([1, 5])

  const toggleBookmark = (id: number) => {
    setBookmarks(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id])
  }

  const openDetail = (post: typeof SCHOLARSHIPS[0]) => {
    setSelectedPost(post)
    setScreenView('detail')
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark' : ''}`}>
      <div className="min-h-screen bg-stone-100 dark:bg-background transition-colors">
        {/* Dark mode toggle */}
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 bg-paper-card dark:bg-card border border-stone-100 dark:border-border rounded-lg shadow-sm"
          >
            {isDarkMode ? (
              <Sun size={18} className="text-foreground" />
            ) : (
              <Moon size={18} className="text-ink" />
            )}
          </button>
        </div>

        {/* Mobile Preview Section */}
        <section className="py-12 px-4 flex flex-col items-center">
          <h1 className="text-sm font-medium text-stone-400 dark:text-muted-foreground mb-6 uppercase tracking-wider">
            Mobile Preview — iPhone 14 Pro
          </h1>

          {/* Device Frame */}
          <div className="relative w-[390px] h-[844px] bg-paper-card dark:bg-card rounded-[44px] border border-stone-200 dark:border-border shadow-xl overflow-hidden paper-grain">
            {/* Status Bar */}
            <div className="flex items-center justify-between px-8 pt-3 pb-2">
              <span className="text-sm font-medium text-ink dark:text-foreground">9:41</span>
              <div className="flex items-center gap-1">
                <Signal size={14} className="text-ink dark:text-foreground" />
                <Wifi size={14} className="text-ink dark:text-foreground" />
                <Battery size={14} className="text-ink dark:text-foreground" />
              </div>
            </div>

            {/* Screen Content */}
            <div className="flex-1 h-[calc(100%-110px)] overflow-y-auto scrollbar-hide">
              {screenView === 'app' && (
                <>
                  {mobileTab === 'home' && <HomeScreen 
                    segment={homeSegment} 
                    onSegmentChange={setHomeSegment}
                    bookmarks={bookmarks}
                    onBookmark={toggleBookmark}
                    onOpenDetail={openDetail}
                  />}
                  {mobileTab === 'search' && <SearchScreen />}
                  {mobileTab === 'bookmark' && <BookmarkScreen 
                    segment={bookmarkSegment} 
                    onSegmentChange={setBookmarkSegment}
                    bookmarks={bookmarks}
                    onBookmark={toggleBookmark}
                  />}
                  {mobileTab === 'notifications' && <NotificationsScreen />}
                  {mobileTab === 'profile' && <ProfileScreen />}
                </>
              )}
              {screenView === 'onboarding' && <OnboardingScreen />}
              {screenView === 'login' && <LoginScreen />}
              {screenView === 'detail' && selectedPost && (
                <DetailModal 
                  post={selectedPost} 
                  onClose={() => setScreenView('app')}
                  isBookmarked={bookmarks.includes(selectedPost.id)}
                  onBookmark={() => toggleBookmark(selectedPost.id)}
                />
              )}
            </div>

            {/* Bottom Nav (only for app view) */}
            {screenView === 'app' && (
              <BottomNav
                activeTab={mobileTab}
                onChange={setMobileTab}
                notificationCount={2}
              />
            )}
          </div>

          {/* Screen Picker */}
          <div className="mt-6 flex items-center gap-2">
            <span className="text-xs text-stone-400 dark:text-muted-foreground">View screens</span>
            <ChevronRight size={14} className="text-stone-300" />
            <div className="flex gap-2">
              {(['app', 'onboarding', 'login'] as ScreenView[]).map(view => (
                <button
                  key={view}
                  onClick={() => setScreenView(view)}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                    screenView === view || (screenView === 'detail' && view === 'app')
                      ? 'bg-ink dark:bg-foreground text-paper-card dark:text-background'
                      : 'bg-paper-card dark:bg-card text-stone-400 dark:text-muted-foreground border border-stone-100 dark:border-border'
                  }`}
                >
                  {view === 'app' ? 'App' : view === 'onboarding' ? 'Onboarding' : 'Login'}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Admin Dashboard Section */}
        <section className="border-t border-stone-200 dark:border-border bg-paper dark:bg-background">
          <div className="max-w-[1400px] mx-auto">
            <h2 className="text-sm font-medium text-stone-400 dark:text-muted-foreground py-6 px-6 uppercase tracking-wider">
              Admin Dashboard
            </h2>

            <div className="flex min-h-[800px] border-t border-stone-100 dark:border-border">
              {/* Sidebar */}
              <AdminSidebar activeTab={adminTab} onChange={setAdminTab} />

              {/* Main Content */}
              <div className="flex-1 flex flex-col">
                {/* Top Bar */}
                <header className="h-16 border-b border-stone-100 dark:border-border bg-paper-card dark:bg-card flex items-center justify-between px-6">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-ink dark:text-foreground">
                      {adminTab === 'dashboard' ? '대시보드' : '공고 관리'}
                    </h3>
                    <span className="text-stone-300 dark:text-stone-500">/</span>
                    <span className="text-sm text-stone-400 dark:text-muted-foreground">Overview</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-stone-50 dark:bg-secondary rounded-lg text-sm text-stone-400 dark:text-muted-foreground">
                      <Command size={14} />
                      <span>K</span>
                    </button>
                    <button className="relative p-2 hover:bg-stone-50 dark:hover:bg-secondary rounded-lg">
                      <div className="w-8 h-8 bg-ink dark:bg-foreground rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-paper-card dark:text-background">A</span>
                      </div>
                    </button>
                  </div>
                </header>

                {/* Dashboard Content */}
                <div className="flex-1 p-6 bg-paper dark:bg-background overflow-y-auto">
                  {adminTab === 'dashboard' && <AdminDashboard />}
                  {adminTab === 'posts' && <AdminPosts />}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

// ==================== MOBILE SCREENS ====================

function HomeScreen({ 
  segment, 
  onSegmentChange,
  bookmarks,
  onBookmark,
  onOpenDetail
}: { 
  segment: number
  onSegmentChange: (i: number) => void
  bookmarks: number[]
  onBookmark: (id: number) => void
  onOpenDetail: (post: typeof SCHOLARSHIPS[0]) => void
}) {
  const heroPost = SCHOLARSHIPS[0]

  return (
    <div className="px-5 pb-4">
      {/* Meta */}
      <p className="text-xs text-stone-400 dark:text-muted-foreground uppercase tracking-wide mb-4">
        INHA-CATCH ─ 12.MAY.2026
      </p>

      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold leading-tight">
          <span className="text-stone-500 dark:text-stone-300">안녕, 승진.</span>
          <br />
          <span className="text-stone-500 dark:text-stone-300">오늘 </span>
          <span className="text-ink dark:text-foreground">14건</span>
          <span className="text-stone-500 dark:text-stone-300">의 공고가 새로 들어왔어요.</span>
        </h1>
      </div>

      {/* Hero Card */}
      <div className="mb-6">
        <p className="text-xs text-stone-400 dark:text-muted-foreground mb-2">지금 가장 잘 맞는 공고</p>
        <div 
          onClick={() => onOpenDetail(heroPost)}
          className="relative bg-paper-card dark:bg-card border border-stone-100 dark:border-border rounded-[14px] p-4 paper-grain cursor-pointer"
        >
          {/* Signal Margin Marker */}
          <div className="absolute left-0 top-4 w-[5px] h-6 bg-signal dark:bg-signal-dark rounded-r-sm" />
          
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs text-stone-400 dark:text-muted-foreground">
              {heroPost.category} ─ {heroPost.source}
            </p>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-critical" />
              <span className="font-mono text-2xl font-medium tracking-tight-custom tabular-nums text-ink dark:text-foreground">
                D-{String(heroPost.dDay).padStart(2, '0')}
              </span>
            </div>
          </div>
          
          <h2 className="text-lg font-semibold text-ink dark:text-foreground leading-snug mb-3">
            {heroPost.title}
          </h2>

          <div className="bg-signal-soft dark:bg-signal-soft-dark rounded-lg p-3 mb-3">
            <p className="text-xs text-stone-400 dark:text-muted-foreground mb-1.5">AI 요약</p>
            <ul className="space-y-1">
              {heroPost.aiSummary?.map((item, i) => (
                <li key={i} className="text-sm text-ink dark:text-foreground leading-korean">
                  — {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-1.5">
            {heroPost.tags.map((tag, i) => (
              <span key={i} className="px-2 py-1 text-xs bg-stone-50 dark:bg-secondary text-ink dark:text-foreground rounded-lg">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* For You Section */}
      <SectionHeader title="추천" subtitle="FOR YOU" />
      <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-5 px-5 pb-4">
        {SCHOLARSHIPS.slice(1, 4).map(post => (
          <ScholarshipCard
            key={post.id}
            {...post}
            isBookmarked={bookmarks.includes(post.id)}
            onBookmark={() => onBookmark(post.id)}
            onClick={() => onOpenDetail(post)}
          />
        ))}
      </div>

      {/* Deadline Soon Section */}
      <SectionHeader title="마감 임박" subtitle="THIS WEEK" />
      <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-5 px-5 pb-4">
        {DEADLINE_SOON.map(post => (
          <ScholarshipCard
            key={post.id}
            {...post}
            isBookmarked={bookmarks.includes(post.id)}
            onBookmark={() => onBookmark(post.id)}
            onClick={() => onOpenDetail(post as typeof SCHOLARSHIPS[0])}
          />
        ))}
      </div>

      {/* Tabs + List */}
      <div className="mt-2">
        <SegmentedTabs
          tabs={['전체', '장학금', '공모전']}
          activeIndex={segment}
          onChange={onSegmentChange}
        />
        <div className="mt-4 space-y-3">
          {SCHOLARSHIPS.slice(3, 5).map(post => (
            <ScholarshipCard
              key={post.id}
              {...post}
              size="large"
              isBookmarked={bookmarks.includes(post.id)}
              onBookmark={() => onBookmark(post.id)}
              onClick={() => onOpenDetail(post)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function SearchScreen() {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  return (
    <div className="px-5 pb-4">
      {/* Search Bar */}
      <div className="relative mb-6">
        <Search size={18} className="absolute left-0 top-1/2 -translate-y-1/2 text-stone-400 dark:text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="키워드, 학과, 지원금…"
          className="w-full pl-7 pr-4 py-3 bg-transparent border-b border-stone-200 dark:border-border text-ink dark:text-foreground placeholder:text-stone-300 dark:placeholder:text-stone-500 focus:outline-none focus:border-ink dark:focus:border-foreground"
        />
      </div>

      {!query && (
        <>
          {/* Recent */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={14} className="text-stone-400 dark:text-muted-foreground" />
              <span className="text-xs text-stone-400 dark:text-muted-foreground">최근</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {RECENT_SEARCHES.map(keyword => (
                <button
                  key={keyword}
                  className="px-3 py-1.5 text-sm bg-stone-50 dark:bg-secondary text-ink dark:text-foreground rounded-lg hover:bg-stone-100 dark:hover:bg-muted"
                >
                  {keyword}
                </button>
              ))}
            </div>
          </div>

          {/* Popular */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={14} className="text-stone-400 dark:text-muted-foreground" />
              <span className="text-xs text-stone-400 dark:text-muted-foreground">지금 많이 찾는</span>
            </div>
            <div className="space-y-2">
              {POPULAR_SEARCHES.map(({ rank, keyword }) => (
                <button
                  key={rank}
                  className="w-full flex items-center gap-3 py-2 hover:bg-stone-50 dark:hover:bg-secondary rounded-lg px-2 -mx-2"
                >
                  <span className="font-mono text-sm text-stone-400 dark:text-muted-foreground w-5 tabular-nums">
                    {rank}
                  </span>
                  <span className="text-sm text-ink dark:text-foreground">{keyword}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Loading skeleton demo */}
      {query && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="bg-stone-100 dark:bg-secondary rounded-[14px] p-4">
                <div className="h-3 bg-stone-200 dark:bg-muted rounded w-1/3 mb-3" />
                <div className="h-4 bg-stone-200 dark:bg-muted rounded w-full mb-2" />
                <div className="h-4 bg-stone-200 dark:bg-muted rounded w-2/3 mb-3" />
                <div className="flex gap-2">
                  <div className="h-6 bg-stone-200 dark:bg-muted rounded w-16" />
                  <div className="h-6 bg-stone-200 dark:bg-muted rounded w-12" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state demo */}
      {query === 'empty' && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 bg-stone-100 dark:bg-secondary rounded-full flex items-center justify-center mb-4">
            <Search size={24} className="text-stone-300 dark:text-stone-500" />
          </div>
          <p className="text-stone-400 dark:text-muted-foreground text-center">
            검색 결과가 없어요
          </p>
        </div>
      )}
    </div>
  )
}

function BookmarkScreen({ 
  segment, 
  onSegmentChange,
  bookmarks,
  onBookmark
}: { 
  segment: number
  onSegmentChange: (i: number) => void
  bookmarks: number[]
  onBookmark: (id: number) => void
}) {
  const bookmarkedPosts = SCHOLARSHIPS.filter(p => bookmarks.includes(p.id))

  return (
    <div className="px-5 pb-4">
      <div className="flex items-baseline justify-between mb-4">
        <h1 className="text-2xl font-bold text-ink dark:text-foreground">저장함</h1>
        <p className="text-xs text-stone-400 dark:text-muted-foreground">{bookmarks.length}건 보관 중</p>
      </div>

      <SegmentedTabs
        tabs={['전체', '장학금', '공모전']}
        activeIndex={segment}
        onChange={onSegmentChange}
      />

      <div className="mt-4 space-y-3">
        {bookmarkedPosts.length > 0 ? (
          bookmarkedPosts.map(post => (
            <ScholarshipCard
              key={post.id}
              {...post}
              size="large"
              isBookmarked={true}
              onBookmark={() => onBookmark(post.id)}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 bg-stone-100 dark:bg-secondary rounded-full flex items-center justify-center mb-4">
              <Heart size={24} className="text-stone-300 dark:text-stone-500" />
            </div>
            <p className="text-stone-400 dark:text-muted-foreground text-center">
              저장한 공고가 없어요
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function NotificationsScreen() {
  // 카테고리별로 그룹화
  const categorized = {
    urgent: NOTIFICATIONS.filter(n => n.category === '마감 임박'),
    newPosts: NOTIFICATIONS.filter(n => n.category === '새 공고'),
    recommended: NOTIFICATIONS.filter(n => n.category === '추천'),
    general: NOTIFICATIONS.filter(n => n.category === '알림'),
  }

  // 읽지 않은 알림 개수
  const unreadCount = NOTIFICATIONS.filter(n => !n.isRead).length

  return (
    <div className="px-5 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-ink dark:text-foreground">알림</h1>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-ink dark:bg-foreground text-white dark:text-background rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <button className="text-xs text-stone-400 dark:text-muted-foreground hover:text-ink dark:hover:text-foreground transition-colors">
          모두 읽음
        </button>
      </div>

      {/* 마감 임박 카드 */}
      {categorized.urgent.length > 0 && (
        <div className="bg-paper-card dark:bg-card border border-stone-100 dark:border-border rounded-xl p-4 mb-4">
          <h2 className="text-xs uppercase tracking-wider text-stone-400 dark:text-muted-foreground mb-3">마감 임박</h2>
          <div className="space-y-3">
            {categorized.urgent.map((notif, idx) => (
              <div key={notif.id} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-critical mt-1.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink dark:text-foreground leading-snug">{notif.title}</p>
                  <span className="font-mono text-xs text-stone-400 dark:text-muted-foreground tabular-nums">
                    {notif.time}
                  </span>
                </div>
                {!notif.isRead && (
                  <div className="w-1.5 h-1.5 rounded-full bg-signal dark:bg-signal-dark flex-shrink-0 mt-2" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 새 공고 카드 */}
      {categorized.newPosts.length > 0 && (
        <div className="bg-paper-card dark:bg-card border border-stone-100 dark:border-border rounded-xl p-4 mb-4">
          <h2 className="text-xs uppercase tracking-wider text-stone-400 dark:text-muted-foreground mb-3">새 공고</h2>
          <div className="space-y-3">
            {categorized.newPosts.map((notif, idx) => (
              <div key={notif.id} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-signal dark:bg-signal-dark mt-1.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink dark:text-foreground leading-snug">{notif.title}</p>
                  <span className="font-mono text-xs text-stone-400 dark:text-muted-foreground tabular-nums">
                    {notif.time}
                  </span>
                </div>
                {!notif.isRead && (
                  <div className="w-1.5 h-1.5 rounded-full bg-signal dark:bg-signal-dark flex-shrink-0 mt-2" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 맞춤 추천 카드 */}
      {categorized.recommended.length > 0 && (
        <div className="bg-paper-card dark:bg-card border border-stone-100 dark:border-border rounded-xl p-4 mb-4">
          <h2 className="text-xs uppercase tracking-wider text-stone-400 dark:text-muted-foreground mb-3">맞춤 추천</h2>
          <div className="space-y-3">
            {categorized.recommended.map((notif, idx) => (
              <div key={notif.id} className="flex items-start gap-3">
                <Heart size={14} className="text-stone-400 dark:text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink dark:text-foreground leading-snug">{notif.title}</p>
                  <span className="font-mono text-xs text-stone-400 dark:text-muted-foreground tabular-nums">
                    {notif.time}
                  </span>
                </div>
                {!notif.isRead && (
                  <div className="w-1.5 h-1.5 rounded-full bg-signal dark:bg-signal-dark flex-shrink-0 mt-2" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 기타 알림 카드 */}
      {categorized.general.length > 0 && (
        <div className="bg-paper-card dark:bg-card border border-stone-100 dark:border-border rounded-xl p-4 mb-4">
          <h2 className="text-xs uppercase tracking-wider text-stone-400 dark:text-muted-foreground mb-3">기타</h2>
          <div className="space-y-3">
            {categorized.general.map((notif, idx) => (
              <div key={notif.id} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-stone-300 dark:bg-stone-500 mt-1.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-stone-500 dark:text-stone-400 leading-snug">{notif.title}</p>
                  <span className="font-mono text-xs text-stone-400 dark:text-muted-foreground tabular-nums">
                    {notif.time}
                  </span>
                </div>
                {!notif.isRead && (
                  <div className="w-1.5 h-1.5 rounded-full bg-signal dark:bg-signal-dark flex-shrink-0 mt-2" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 알림이 없을 때 */}
      {NOTIFICATIONS.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-12 h-12 rounded-full bg-stone-100 dark:bg-secondary flex items-center justify-center mb-4">
            <Bell size={24} className="text-stone-300 dark:text-stone-500" />
          </div>
          <p className="text-sm text-stone-400 dark:text-muted-foreground">새로운 알림이 없습니다</p>
        </div>
      )}
    </div>
  )
}

function ProfileScreen() {
  return (
    <div className="px-5 pb-4">
      {/* Avatar + Name */}
      <div className="flex flex-col items-center py-6">
        <div className="w-[60px] h-[60px] bg-ink dark:bg-foreground rounded-full flex items-center justify-center mb-3">
          <span className="text-xl font-bold text-paper-card dark:text-background">S</span>
        </div>
        <h1 className="text-xl font-bold text-ink dark:text-foreground">승진</h1>
        <p className="text-xs text-stone-400 dark:text-muted-foreground">컴퓨터공학과 ─ 3학년</p>
      </div>

      {/* Keywords Card */}
      <div className="bg-paper-card dark:bg-card border border-stone-100 dark:border-border rounded-[14px] p-4 mb-3 paper-grain">
        <p className="text-sm font-medium text-ink dark:text-foreground mb-3">내 키워드</p>
        <div className="flex flex-wrap gap-2">
          {USER_KEYWORDS.map(keyword => (
            <span
              key={keyword}
              className="px-3 py-1.5 text-sm bg-stone-50 dark:bg-secondary text-ink dark:text-foreground rounded-lg"
            >
              {keyword}
            </span>
          ))}
          <button className="px-3 py-1.5 text-sm bg-signal-soft dark:bg-signal-soft-dark text-signal dark:text-signal-dark rounded-lg flex items-center gap-1">
            <Plus size={14} />
            추가
          </button>
        </div>
      </div>

      {/* Activity Stats */}
      <div className="bg-paper-card dark:bg-card border border-stone-100 dark:border-border rounded-[14px] p-4 mb-3 paper-grain">
        <p className="text-sm font-medium text-ink dark:text-foreground mb-3">이번 달 활동</p>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-ink dark:text-foreground tabular-nums">47</p>
            <p className="text-xs text-stone-400 dark:text-muted-foreground">조회</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-ink dark:text-foreground tabular-nums">12</p>
            <p className="text-xs text-stone-400 dark:text-muted-foreground">저장</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-ink dark:text-foreground tabular-nums">3</p>
            <p className="text-xs text-stone-400 dark:text-muted-foreground">지원</p>
          </div>
        </div>
      </div>

      {/* Notification Toggles */}
      <div className="bg-paper-card dark:bg-card border border-stone-100 dark:border-border rounded-[14px] p-4 mb-3 paper-grain">
        <p className="text-sm font-medium text-ink dark:text-foreground mb-3">알림 설정</p>
        <div className="space-y-3">
          {['새 맞춤 공고', '마감 D-3 알림', '저장한 공고 업데이트'].map((label, i) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-sm text-ink dark:text-foreground">{label}</span>
              <button className={`w-10 h-6 rounded-full relative transition-colors ${
                i < 2 ? 'bg-ink dark:bg-foreground' : 'bg-stone-200 dark:bg-secondary'
              }`}>
                <div className={`absolute top-1 w-4 h-4 bg-paper-card dark:bg-background rounded-full transition-transform ${
                  i < 2 ? 'right-1' : 'left-1'
                }`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Account Actions */}
      <div className="bg-paper-card dark:bg-card border border-stone-100 dark:border-border rounded-[14px] p-4 paper-grain">
        <p className="text-sm font-medium text-ink dark:text-foreground mb-3">계정</p>
        <div className="space-y-2">
          <button className="w-full text-left text-sm text-ink dark:text-foreground py-2 hover:bg-stone-50 dark:hover:bg-secondary rounded px-2 -mx-2">
            비밀번호 변경
          </button>
          <button className="w-full text-left text-sm text-ink dark:text-foreground py-2 hover:bg-stone-50 dark:hover:bg-secondary rounded px-2 -mx-2">
            로그아웃
          </button>
          <button className="w-full text-left text-sm text-critical py-2 hover:bg-stone-50 dark:hover:bg-secondary rounded px-2 -mx-2">
            회원탈퇴
          </button>
        </div>
      </div>
    </div>
  )
}

// ==================== SPECIAL SCREENS ====================

function OnboardingScreen() {
  return (
    <div className="h-full flex flex-col justify-center items-center px-8 bg-paper dark:bg-background">
      <h1 className="text-4xl font-bold text-ink dark:text-foreground text-center leading-tight tracking-display mb-4">
        흘려보낸
        <br />
        기회들에게.
      </h1>
      <p className="text-sm text-stone-400 dark:text-muted-foreground text-center mb-8">
        인하대학교 장학금과 공모전, 이제 놓치지 마세요.
      </p>

      {/* Dot indicators */}
      <div className="flex gap-2 mb-8">
        <div className="w-2 h-2 rounded-full bg-ink dark:bg-foreground" />
        <div className="w-2 h-2 rounded-full bg-stone-200 dark:bg-secondary" />
        <div className="w-2 h-2 rounded-full bg-stone-200 dark:bg-secondary" />
      </div>

      <button className="w-full py-3.5 bg-ink dark:bg-foreground text-paper-card dark:text-background font-medium rounded-[10px]">
        시작하기
      </button>
    </div>
  )
}

function LoginScreen() {
  return (
    <div className="h-full flex flex-col justify-center px-8 bg-paper dark:bg-background">
      {/* Wordmark */}
      <p className="text-xs text-stone-400 dark:text-muted-foreground uppercase tracking-wider mb-2">
        INHA-CATCH
      </p>
      
      <h1 className="text-2xl font-bold text-ink dark:text-foreground mb-8">
        다시 만나서 반가워요.
      </h1>

      {/* Kakao Button */}
      <button className="w-full py-3.5 bg-[#FEE500] text-[#191919] font-medium rounded-[10px] mb-3 flex items-center justify-center gap-2">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path fillRule="evenodd" clipRule="evenodd" d="M9 0.5C4.02944 0.5 0 3.69224 0 7.61C0 10.0044 1.55892 12.1169 3.93152 13.3604L2.93303 17.0256C2.85421 17.326 3.20729 17.5632 3.46915 17.3912L7.87363 14.5009C8.2421 14.5499 8.61786 14.58 9 14.58C13.9706 14.58 18 11.3878 18 7.47C18 3.55224 13.9706 0.5 9 0.5Z" fill="#191919"/>
        </svg>
        카카오로 계속하기
      </button>

      {/* Email link */}
      <button className="text-sm text-stone-400 dark:text-muted-foreground hover:text-ink dark:hover:text-foreground flex items-center justify-center gap-1">
        이메일로 계속하기
        <ChevronRight size={14} />
      </button>
    </div>
  )
}

function DetailModal({ 
  post, 
  onClose,
  isBookmarked,
  onBookmark
}: { 
  post: typeof SCHOLARSHIPS[0]
  onClose: () => void
  isBookmarked: boolean
  onBookmark: () => void
}) {
  return (
    <div className="h-full flex flex-col bg-paper dark:bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-paper dark:bg-background z-10 px-5 py-3 flex items-center justify-between border-b border-stone-100 dark:border-border">
        <button onClick={onClose} className="p-1 -ml-1">
          <X size={20} className="text-ink dark:text-foreground" />
        </button>
        <span className="text-xs text-stone-400 dark:text-muted-foreground">{post.source}</span>
      </div>

  {/* Content */}
  <div className="flex-1 overflow-y-auto px-5 py-4">
  {/* Hero */}
  <div className="mb-5">
  <p className="text-xs text-stone-400 dark:text-muted-foreground mb-2">{post.category}</p>
  <h1 className="text-2xl font-bold text-ink dark:text-foreground leading-snug mb-3">
  {post.title}
  </h1>
  <div className="flex items-center gap-2">
  {post.dDay <= 3 && <span className="w-2 h-2 rounded-full bg-critical" />}
  <span className="font-mono text-3xl font-bold text-ink dark:text-foreground tabular-nums">
  D-{String(post.dDay).padStart(2, '0')}
  </span>
  </div>
  </div>
  
  {/* AI Summary */}
  {post.aiSummary && (
  <div className="bg-signal-soft dark:bg-signal-soft-dark rounded-xl p-4 mb-4">
  <div className="flex items-center gap-2 mb-3">
  <div className="w-5 h-5 rounded-full bg-signal dark:bg-signal-dark flex items-center justify-center">
  <span className="text-[10px] font-bold text-white">AI</span>
  </div>
  <h2 className="text-sm font-semibold text-ink dark:text-foreground">AI 요약</h2>
  </div>
  <ul className="space-y-2">
  {post.aiSummary.map((item, i) => (
  <li key={i} className="text-sm text-ink dark:text-foreground leading-korean flex items-start gap-2">
  <span className="text-signal dark:text-signal-dark mt-0.5">•</span>
  <span>{item}</span>
  </li>
  ))}
  </ul>
  </div>
  )}

  {/* Tags */}
  <div className="flex gap-2 flex-wrap mb-5">
  {post.tags.map((tag, i) => (
  <span key={i} className="px-3 py-1.5 text-xs bg-stone-100 dark:bg-secondary text-ink dark:text-foreground rounded-full">
  {tag}
  </span>
  ))}
  </div>

  {/* Info Cards Grid */}
  <div className="grid grid-cols-2 gap-3 mb-4">
  {/* Amount Card */}
  <div className="bg-paper-card dark:bg-card border border-stone-100 dark:border-border rounded-xl p-4">
  <p className="text-[10px] uppercase tracking-wider text-stone-400 dark:text-muted-foreground mb-1">지원 금액</p>
  <p className="text-lg font-bold text-ink dark:text-foreground">520만원</p>
  <p className="text-xs text-stone-400 dark:text-muted-foreground mt-0.5">등록금 전액</p>
  </div>

  {/* Deadline Card */}
  <div className="bg-paper-card dark:bg-card border border-stone-100 dark:border-border rounded-xl p-4">
  <p className="text-[10px] uppercase tracking-wider text-stone-400 dark:text-muted-foreground mb-1">접수 마감</p>
  <p className="text-lg font-bold text-ink dark:text-foreground">05.15</p>
  <p className="text-xs text-stone-400 dark:text-muted-foreground mt-0.5">2026년</p>
  </div>
  </div>
  
  {/* Eligibility Card */}
  <div className="bg-paper-card dark:bg-card border border-stone-100 dark:border-border rounded-xl p-4 mb-4">
  <h2 className="text-xs uppercase tracking-wider text-stone-400 dark:text-muted-foreground mb-3">자격 요건</h2>
  <div className="space-y-2.5">
  <div className="flex items-center gap-3">
  <div className="w-6 h-6 rounded-full bg-stone-100 dark:bg-secondary flex items-center justify-center flex-shrink-0">
  <Check size={12} className="text-ink dark:text-foreground" />
  </div>
  <span className="text-sm text-ink dark:text-foreground">인하대학교 재학생 (휴학생 제외)</span>
  </div>
  <div className="flex items-center gap-3">
  <div className="w-6 h-6 rounded-full bg-stone-100 dark:bg-secondary flex items-center justify-center flex-shrink-0">
  <Check size={12} className="text-ink dark:text-foreground" />
  </div>
  <span className="text-sm text-ink dark:text-foreground">소득분위 8분위 이하</span>
  </div>
  <div className="flex items-center gap-3">
  <div className="w-6 h-6 rounded-full bg-stone-100 dark:bg-secondary flex items-center justify-center flex-shrink-0">
  <Check size={12} className="text-ink dark:text-foreground" />
  </div>
  <span className="text-sm text-ink dark:text-foreground">직전 학기 성적 B학점 이상</span>
  </div>
  </div>
  </div>
  
  {/* Timeline Card */}
  <div className="bg-paper-card dark:bg-card border border-stone-100 dark:border-border rounded-xl p-4 mb-4">
  <h2 className="text-xs uppercase tracking-wider text-stone-400 dark:text-muted-foreground mb-3">일정</h2>
  <div className="space-y-3">
  <div className="flex items-center gap-3">
  <div className="w-2 h-2 rounded-full bg-signal dark:bg-signal-dark" />
  <div className="flex-1 flex justify-between items-center">
  <span className="text-sm text-ink dark:text-foreground">접수 기간</span>
  <span className="text-sm text-ink dark:text-foreground font-mono tabular-nums">05.01 — 05.15</span>
  </div>
  </div>
  <div className="flex items-center gap-3">
  <div className="w-2 h-2 rounded-full bg-stone-300 dark:bg-stone-500" />
  <div className="flex-1 flex justify-between items-center">
  <span className="text-sm text-stone-500 dark:text-stone-400">서류 심사</span>
  <span className="text-sm text-stone-500 dark:text-stone-400 font-mono tabular-nums">05.16 — 05.20</span>
  </div>
  </div>
  <div className="flex items-center gap-3">
  <div className="w-2 h-2 rounded-full bg-stone-300 dark:bg-stone-500" />
  <div className="flex-1 flex justify-between items-center">
  <span className="text-sm text-stone-500 dark:text-stone-400">결과 발표</span>
  <span className="text-sm text-stone-500 dark:text-stone-400 font-mono tabular-nums">05.25</span>
  </div>
  </div>
  </div>
  </div>
  
  {/* Documents Card */}
  <div className="bg-paper-card dark:bg-card border border-stone-100 dark:border-border rounded-xl p-4 mb-4">
  <h2 className="text-xs uppercase tracking-wider text-stone-400 dark:text-muted-foreground mb-3">제출 서류</h2>
  <div className="grid grid-cols-2 gap-2">
  <div className="px-3 py-2 bg-stone-50 dark:bg-secondary rounded-lg text-sm text-ink dark:text-foreground text-center">신청서</div>
  <div className="px-3 py-2 bg-stone-50 dark:bg-secondary rounded-lg text-sm text-ink dark:text-foreground text-center">가족관계증명서</div>
  <div className="px-3 py-2 bg-stone-50 dark:bg-secondary rounded-lg text-sm text-ink dark:text-foreground text-center">소득증빙서류</div>
  <div className="px-3 py-2 bg-stone-50 dark:bg-secondary rounded-lg text-sm text-ink dark:text-foreground text-center">성적증명서</div>
  </div>
  </div>
  
  {/* Contact Card */}
  <div className="bg-paper-card dark:bg-card border border-stone-100 dark:border-border rounded-xl p-4 mb-20">
  <h2 className="text-xs uppercase tracking-wider text-stone-400 dark:text-muted-foreground mb-2">문의처</h2>
  <div className="flex items-center justify-between">
  <span className="text-sm text-ink dark:text-foreground">학생지원팀</span>
  <span className="text-sm font-mono text-ink dark:text-foreground">032-860-7114</span>
  </div>
  </div>
  </div>

      {/* Sticky Bottom Bar */}
      <div className="sticky bottom-0 bg-paper-card dark:bg-card border-t border-stone-100 dark:border-border px-5 py-3 flex gap-3">
        <button 
          onClick={onBookmark}
          className={`flex-1 py-3 border rounded-[10px] flex items-center justify-center gap-2 transition-colors ${
            isBookmarked 
              ? 'border-ink dark:border-foreground bg-ink dark:bg-foreground text-paper-card dark:text-background' 
              : 'border-stone-200 dark:border-border text-ink dark:text-foreground'
          }`}
        >
          <Heart size={18} className={isBookmarked ? 'fill-current' : ''} />
          저장
        </button>
        <button className="flex-1 py-3 bg-ink dark:bg-foreground text-paper-card dark:text-background font-medium rounded-[10px] flex items-center justify-center gap-2">
          원문 보러가기
          <ExternalLink size={16} />
        </button>
      </div>
    </div>
  )
}

// ==================== ADMIN SCREENS ====================

function AdminDashboard() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard
          label="오늘 신규 공고"
          value={27}
          change="+12%"
          changeType="positive"
          sparklineData={[12, 15, 18, 14, 22, 25, 27]}
          delay={0}
        />
        <KPICard
          label="활성 사용자"
          value="1,284"
          change="+8%"
          changeType="positive"
          sparklineData={[1100, 1150, 1180, 1220, 1250, 1270, 1284]}
          delay={50}
        />
        <KPICard
          label="대기 승인"
          value={12}
          change="3건 긴급"
          changeType="neutral"
          delay={100}
        />
        <KPICard
          label="크롤링 성공률"
          value="98.4%"
          change="+0.2%"
          changeType="positive"
          sparklineData={[96, 97, 98, 97.5, 98.2, 98.1, 98.4]}
          delay={150}
        />
      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* Chart */}
        <div className={`col-span-8 bg-paper-card dark:bg-card border border-stone-100 dark:border-border rounded-xl p-5 transition-opacity duration-300 ${
          mounted ? 'opacity-100' : 'opacity-0'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-ink dark:text-foreground">30일 공고 현황</h3>
            <span className="text-xs text-stone-400 dark:text-muted-foreground">총 1,247건</span>
          </div>
          <LineChart data={CHART_DATA} />
        </div>

        {/* Right Column */}
        <div className="col-span-4 space-y-4">
          {/* Activity Log */}
          <div className={`bg-paper-card dark:bg-card border border-stone-100 dark:border-border rounded-xl p-4 transition-opacity duration-300 delay-100 ${
            mounted ? 'opacity-100' : 'opacity-0'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-ink dark:text-foreground">최근 활동</h3>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
            <div className="space-y-2">
              {ACTIVITY_LOG.map((log, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <span className="font-mono text-stone-400 dark:text-muted-foreground tabular-nums shrink-0 w-12">
                    {log.time}
                  </span>
                  <span className="text-ink dark:text-foreground truncate">{log.action}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Donut Chart */}
          <div className={`bg-paper-card dark:bg-card border border-stone-100 dark:border-border rounded-xl p-4 transition-opacity duration-300 delay-150 ${
            mounted ? 'opacity-100' : 'opacity-0'
          }`}>
            <h3 className="text-sm font-semibold text-ink dark:text-foreground mb-3">알림 발송</h3>
            <DonutChart value={847} total={1284} label="전송 완료" />
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className={`grid grid-cols-3 gap-4 transition-opacity duration-300 delay-200 ${
        mounted ? 'opacity-100' : 'opacity-0'
      }`}>
        <StatBar label="장학금" value={45} color="ink" />
        <StatBar label="공모전" value={32} color="signal" />
        <StatBar label="대외활동" value={23} color="stone" />
      </div>

      {/* Crawling Status Table */}
      <div className={`bg-paper-card dark:bg-card border border-stone-100 dark:border-border rounded-xl p-5 transition-opacity duration-300 delay-250 ${
        mounted ? 'opacity-100' : 'opacity-0'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-ink dark:text-foreground">크롤링 상태</h3>
          <button className="text-xs text-signal dark:text-signal-dark hover:underline">새로고침</button>
        </div>
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs text-stone-400 dark:text-muted-foreground border-b border-stone-100 dark:border-border">
              <th className="pb-3 font-medium">출처</th>
              <th className="pb-3 font-medium">마지막 수집</th>
              <th className="pb-3 font-medium">신규</th>
              <th className="pb-3 font-medium">상태</th>
            </tr>
          </thead>
          <tbody>
            {CRAWLING_STATUS.map((row, i) => (
              <tr key={i} className="border-b border-stone-50 dark:border-border last:border-0">
                <td className="py-3 text-sm text-ink dark:text-foreground">{row.source}</td>
                <td className="py-3 font-mono text-sm text-stone-400 dark:text-muted-foreground tabular-nums">{row.lastCrawl}</td>
                <td className="py-3 font-mono text-sm text-ink dark:text-foreground tabular-nums">+{row.newItems}</td>
                <td className="py-3">
                  <span className={`inline-flex items-center gap-1.5 text-xs ${
                    row.status === 'success' ? 'text-emerald-600' : 'text-amber-600'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      row.status === 'success' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`} />
                    {row.status === 'success' ? '정상' : '지연'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Stats Bar 컴포넌트
function StatBar({ label, value, color }: { label: string; value: number; color: 'ink' | 'signal' | 'stone' }) {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  const colorClasses = {
    ink: 'bg-ink dark:bg-foreground',
    signal: 'bg-signal dark:bg-signal-dark',
    stone: 'bg-stone-400 dark:bg-stone-500'
  }

  return (
    <div className="bg-paper-card dark:bg-card border border-stone-100 dark:border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-stone-400 dark:text-muted-foreground">{label}</span>
        <span className="text-sm font-bold text-ink dark:text-foreground tabular-nums">{value}%</span>
      </div>
      <div className="h-1.5 bg-stone-100 dark:bg-secondary rounded-full overflow-hidden">
        <div 
          className={`h-full ${colorClasses[color]} rounded-full transition-all duration-500 ease-out`}
          style={{ width: mounted ? `${value}%` : '0%' }}
        />
      </div>
    </div>
  )
}

function AdminPosts() {
  const [selectedCategory, setSelectedCategory] = useState(0)

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SegmentedTabs
            tabs={['전체', '장학금', '공모전', '대외활동']}
            activeIndex={selectedCategory}
            onChange={setSelectedCategory}
          />
          <button className="px-3 py-1.5 text-sm bg-stone-50 dark:bg-secondary text-stone-400 dark:text-muted-foreground rounded-lg flex items-center gap-1">
            상태
            <ChevronDown size={14} />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-muted-foreground" />
            <input
              type="text"
              placeholder="검색..."
              className="pl-9 pr-4 py-2 text-sm bg-stone-50 dark:bg-secondary border border-stone-100 dark:border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-signal"
            />
          </div>
          <button className="px-4 py-2 bg-ink dark:bg-foreground text-paper-card dark:text-background text-sm font-medium rounded-[10px] flex items-center gap-2">
            <Plus size={16} />
            새 공고
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-paper-card dark:bg-card border border-stone-100 dark:border-border rounded-[14px] overflow-hidden paper-grain">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs text-stone-400 dark:text-muted-foreground bg-stone-50 dark:bg-secondary">
              <th className="px-4 py-3 font-medium w-8">
                <input type="checkbox" className="rounded" />
              </th>
              <th className="px-4 py-3 font-medium">제목</th>
              <th className="px-4 py-3 font-medium w-24">카테고리</th>
              <th className="px-4 py-3 font-medium w-28">마감일</th>
              <th className="px-4 py-3 font-medium w-20">상태</th>
              <th className="px-4 py-3 font-medium w-20 text-right">조회수</th>
              <th className="px-4 py-3 font-medium w-12"></th>
            </tr>
          </thead>
          <tbody>
            {ADMIN_POSTS.map((post) => (
              <tr 
                key={post.id} 
                className="border-t border-stone-100 dark:border-border hover:bg-stone-50 dark:hover:bg-secondary cursor-pointer transition-colors"
              >
                <td className="px-4 py-3">
                  <input type="checkbox" className="rounded" />
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-ink dark:text-foreground">{post.title}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-stone-400 dark:text-muted-foreground">{post.category}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-sm text-stone-400 dark:text-muted-foreground tabular-nums">
                    {post.deadline}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 text-xs ${
                    post.status === 'active' ? 'text-emerald-600' :
                    post.status === 'pending' ? 'text-amber-600' :
                    post.status === 'closed' ? 'text-stone-400' :
                    'text-stone-300'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      post.status === 'active' ? 'bg-emerald-500' :
                      post.status === 'pending' ? 'bg-amber-500' :
                      post.status === 'closed' ? 'bg-stone-400' :
                      'bg-stone-300'
                    }`} />
                    {post.status === 'active' ? '활성' :
                     post.status === 'pending' ? '대기' :
                     post.status === 'closed' ? '마감' : '임시'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-mono text-sm text-stone-400 dark:text-muted-foreground tabular-nums">
                    {post.views.toLocaleString()}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button className="p-1 hover:bg-stone-100 dark:hover:bg-muted rounded">
                    <MoreHorizontal size={16} className="text-stone-400 dark:text-muted-foreground" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination hint */}
      <div className="flex items-center justify-between text-sm text-stone-400 dark:text-muted-foreground">
        <span>10개 중 1-10 표시</span>
        <div className="flex gap-1">
          <button className="px-3 py-1.5 bg-ink dark:bg-foreground text-paper-card dark:text-background rounded-lg text-sm">1</button>
          <button className="px-3 py-1.5 hover:bg-stone-100 dark:hover:bg-secondary rounded-lg text-sm">2</button>
          <button className="px-3 py-1.5 hover:bg-stone-100 dark:hover:bg-secondary rounded-lg text-sm">3</button>
        </div>
      </div>
    </div>
  )
}
