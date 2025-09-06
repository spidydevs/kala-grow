import React, { useState, useEffect } from 'react'
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useEnterprise } from '@/contexts/EnterpriseContext'
import { useLeaderboard } from '@/services/gamificationService'
import { ThemeToggle } from '@/components/ThemeToggle'
import { GlobalSearch } from '@/components/GlobalSearch'
import { EnhancedAIAssistant } from '@/components/EnhancedAIAssistant'
import { PointsDisplay } from '@/components/enterprise/PointsDisplay'
import { RoleGuard } from '@/components/enterprise/RoleGuard'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  CheckSquare,
  Clock,
  BarChart3,
  Settings,
  Zap,
  FileText,
  Target,
  LogOut,
  Menu,
  X,
  Search,
  Bell,
  Trophy,
  DollarSign,
  TrendingUp,
  Gamepad2,
  CreditCard,
  FileBarChart,
  Command,
  Home,
  Filter,
  Plus,
  MessageSquare,
  Shield,
  Crown,
  Award
} from 'lucide-react'
import { toast } from 'sonner'

const getNavigation = (permissions: Record<string, boolean>) => [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    current: false
  },
  {
    name: 'Leaderboard',
    href: '/gamification',
    icon: Trophy,
    current: false
  },
  {
    name: 'Tasks',
    href: '/tasks',
    icon: CheckSquare,
    current: false,
    badge: '12'
  },
  {
    name: 'Time Tracking',
    href: '/time-tracking',
    icon: Clock,
    current: false
  },
  // CRM - Admin only
  ...(permissions.can_access_crm ? [{
    name: 'CRM & Pipelines',
    href: '/crm',
    icon: Target,
    current: false,
    adminOnly: true
  }] : []),
  // Business & Finance Section
  ...(permissions.can_access_finances ? [
    { divider: true, label: 'Business & Finance' },
    {
      name: 'Finance Hub',
      href: '/finance',
      icon: DollarSign,
      current: false,
      adminOnly: true,
      badge: 'Reports'
    }
  ] : []),
  // Data Portability - always visible
  { divider: true, label: 'Tools' },
  {
    name: 'Data Portability',
    href: '/data-portability',
    icon: FileBarChart,
    current: false
  },
  // Admin Section
  ...(permissions.can_manage_users ? [
    { divider: true, label: 'Administration' },
    {
      name: 'Admin Panel',
      href: '/admin',
      icon: Crown,
      current: false,
      adminOnly: true
    }
    // Role Management removed from sidebar - accessible through Admin Panel to avoid redundancy
    // System Settings removed from global navigation to avoid redundancy.
    // Admin-only system configuration will be accessible from the Admin Panel (/admin)
  ] : [])
]

export function MainLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, profile, signOut, session } = useAuth()
  const { permissions, currentUser, isAdmin } = useEnterprise()
  const { data: leaderboardData } = useLeaderboard({ timeframe: 'month', limit: 20 })
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Get userPoints from leaderboard data instead of EnterpriseContext
  const userPoints = leaderboardData?.data?.current_user

  const [conversationHistory, setConversationHistory] = useState<Array<{
    role: 'user' | 'assistant'
    message: string
    timestamp: Date
  }>>([])
  
  const createTaskMutation = { isPending: false } // Placeholder since we removed the import

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === 'k') {
          e.preventDefault()
          // Focus search
          const searchInput = document.getElementById('global-search')
          searchInput?.focus()
        }
        if (e.key === 'b') {
          e.preventDefault()
          setSidebarOpen(!sidebarOpen)
        }
        if (e.key === 't') {
          e.preventDefault()
          // AI Assistant now available in sidebar - no keyboard shortcut needed
        }
      }
      if (e.key === 'Escape') {
        setSidebarOpen(false)
        // AI Assistant dialogs handle their own escape key
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [sidebarOpen])

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <div className="flex min-h-screen bg-background transition-colors duration-300">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        </div>
      )}

      {/* Sidebar - Fixed Position */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[280px] bg-card border-r border-border transition-all duration-300 ease-out overflow-hidden',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex h-screen flex-col">{/* Changed to h-screen and removed justify-start items-stretch */}
          {/* Logo and close button */}
          <div className="flex items-center justify-between p-6 border-b border-border/50">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-md overflow-hidden flex items-center justify-center bg-transparent">
                <img src="/favicon.png" alt="Kala Grow" className="h-full w-full object-contain" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Kala Grow</h1>
                <p className="text-xs text-muted-foreground">Productivity Suite</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-accent transition-colors touch-manipulation tap-highlight-transparent"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          {/* Quick Actions */}
          <div className="px-4 py-4 border-b border-border/50">
            <div className="grid grid-cols-1 gap-3">
              <EnhancedAIAssistant 
                onTaskCreated={() => {
                  // Refresh data after AI task creation
                  window.location.reload()
                }}
                onDataFetched={() => {
                  // Handle data fetching if needed
                }}
              />
              
              {/* Points Display */}
              <PointsDisplay />
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {getNavigation(permissions).map((item, index) => {
              // Render divider
              if (item.divider) {
                return (
                  <div key={index} className="py-3 first:pt-0">
                    <div className="border-t border-border/50 mb-3" />
                    <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {item.label}
                    </p>
                  </div>
                )
              }
              
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    isActive ? 'sidebar-item-active' : 'sidebar-item',
                    'relative group touch-manipulation tap-highlight-transparent'
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon
                    className={cn(
                      'h-5 w-5 flex-shrink-0 transition-colors duration-200',
                      isActive
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-muted-foreground group-hover:text-foreground'
                    )}
                  />
                  <span className="flex-1 font-medium">{item.name}</span>

                  
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-green-500 to-emerald-500 rounded-l-full" />
                  )}
                </Link>
              )
            })}
          </nav>

          {/* User profile */}
          <div className="border-t border-border/50 p-4">
            <div className="flex items-center space-x-3 p-3 rounded-xl hover:bg-accent transition-colors">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center shadow-lg">
                  <span className="text-sm font-medium text-white">
                    {profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {profile?.full_name || currentUser?.email?.split('@')[0] || 'User'}
                  </p>
                  {isAdmin && (
                    <div className="w-5 h-5 bg-gradient-to-br from-green-600 to-emerald-600 rounded-full flex items-center justify-center">
                      <Crown className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground truncate">
                    {currentUser?.role || 'Member'}
                  </p>
                  {userPoints && (
                    <div className="flex items-center gap-1">
                      <Award className="h-3 w-3 text-yellow-400" />
                      <span className="text-xs text-yellow-400 font-medium">
                        {userPoints.total_points}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content - Account for fixed sidebar */}
      <div className="flex flex-col flex-1 min-h-screen lg:ml-[280px]">
        {/* Top header */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 sm:px-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors touch-manipulation tap-highlight-transparent"
              >
                <Menu className="h-5 w-5" />
              </button>
              
              {/* Global Search */}
              <div className="hidden sm:block">
                <GlobalSearch className="w-64 lg:w-80" />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Quick actions - desktop only */}
              <div className="hidden md:flex items-center space-x-2">
                <Button variant="ghost"  className="text-xs">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" title="Open Settings" aria-label="Open Settings">
                    <Settings className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate('/settings?tab=profile')}>Profile</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/settings?tab=notifications')}>Notifications</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/settings')}>System Settings</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {permissions?.can_manage_users && (
                    <>
                      <DropdownMenuItem onClick={() => navigate('/admin')}>Admin Panel</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/role-management')}>Role Management</DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <NotificationBell variant="ghost" size="default" />

              {/* Theme toggle */}
              <ThemeToggle />

              {/* User menu - mobile */}
              <div className="sm:hidden">
                <Button variant="ghost" size="icon">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-green-600 to-green-600 flex items-center justify-center">
                    <span className="text-xs font-medium text-white">
                      {profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase()}
                    </span>
                  </div>
                </Button>
              </div>
            </div>
          </div>

          {/* Mobile search */}
          <div className="sm:hidden px-4 pb-3">
            <GlobalSearch className="w-full" />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
