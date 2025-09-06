import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Trophy,
  Star,
  Zap,
  Target,
  TrendingUp,
  Award,
  Medal,
  Crown,
  Flame,
  CheckCircle2,
  Calendar,
  Clock,
  Users,
  BarChart3,
  Sparkles,
  Timer,
  BookOpen,
  Activity,
  Gift,
  Rocket,
  Brain,
  Loader2
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { 
  useLeaderboard,
  useAchievements,
  useUserActivities,
  usePointTransactions,
  getBadgeColor,
  formatActivityMessage,
  getActivityIcon,
  formatRelativeTime,
  formatTransactionMessage,
  getTransactionIcon
} from '@/services'
import { useUnifiedMetrics } from '@/services/unifiedMetricsService'
import { UnifiedLevelService, useUserLevel } from '@/services/unifiedLevelService'
import { supabase } from '@/lib/supabase'
import { MedalsManager } from '@/components/gamification/MedalsManager'
import { RankingSystem } from '@/components/gamification/RankingSystem'

interface LeaderboardEntry {
  rank: number
  user_id: string
  display_name: string
  avatar_url?: string
  total_points: number
  level: number
  next_level_points: number
  tasks_completed: number
  current_streak: number
  productivity_score: number
  achievements: string[]
  badges: any[]
  is_current_user: boolean
}

export function GamificationPage() {
  const { user } = useAuth()
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'quarter' | 'year' | 'all'>('month')
  const [selectedTab, setSelectedTab] = useState<'overview' | 'achievements' | 'leaderboard' | 'activities' | 'medals'>('overview')

  // All hooks must be at the top level - no conditional hooks
  const { data: unifiedMetrics, isLoading: metricsLoading, error: metricsError } = useUnifiedMetrics()
  const { data: leaderboardData, isLoading: leaderboardLoading } = useLeaderboard({ 
    timeframe: selectedTimeframe, 
    limit: 20 
  })
  const { data: achievements, isLoading: achievementsLoading } = useAchievements()
  const { data: activities, isLoading: activitiesLoading } = useUserActivities({ limit: 10 })
  const { data: pointTransactions, isLoading: transactionsLoading } = usePointTransactions()
  
  // Use unified metrics for consistent data across the app
  const metrics = (unifiedMetrics as any) || {
    totalTasks: 0,
    completedTasks: 0,
    totalPoints: 0,
    currentLevel: 1,
    currentStreak: 0,
    completionRate: 0
  }

  // Use unified level service for accurate level progression - must be unconditional
  const { levelInfo, isLoading: levelLoading } = useUserLevel(metrics.totalPoints)
  
  // Get user medals for overview display
  const [userMedals, setUserMedals] = useState<any[]>([])
  
  useEffect(() => {
    const loadUserMedals = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from('user_medals')
            .select(`
              *,
              medal:medals(*)
            `)
            .eq('user_id', user.id)
            .order('awarded_at', { ascending: false })
          
          if (error) throw error
          setUserMedals(data || [])
        } catch (error) {
          console.error('Error fetching user medals:', error)
          setUserMedals([])
        }
      }
    }
    
    loadUserMedals()
  }, [user])

  const isLoading = leaderboardLoading || metricsLoading || achievementsLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Handle unified metrics error with fallback
  if (metricsError) {
    console.warn('Unified metrics failed, using fallback data:', metricsError)
  }

  // Calculate productivity score from available metrics
  const productivityScore = Math.round(
    (metrics.completionRate || 0) * 0.4 + 
    (metrics.currentStreak || 0) * 10 * 0.3 + 
    Math.min((metrics.totalPoints || 0) / 100, 100) * 0.3
  )

  const currentUser = leaderboardData?.data?.current_user || {
    rank: 0,
    total_points: metrics.totalPoints,
    level: levelInfo?.currentLevel || metrics.currentLevel,
    tasks_completed: metrics.completedTasks,
    current_streak: metrics.currentStreak,
    productivity_score: productivityScore
  }

  const leaderboard: LeaderboardEntry[] = leaderboardData?.data?.leaderboard || []
  const weeklyChallenge = leaderboardData?.data?.weekly_challenge
  const activityInsights = leaderboardData?.data?.activity_insights

  // Use unified level service for accurate progression calculations
  const currentLevel = levelInfo?.currentLevel || currentUser.level
  const levelProgress = levelInfo?.progressPercentage || 0
  const pointsToNextLevel = levelInfo?.progressToNextRank || 0
  const nextLevelName = levelInfo?.nextRankName || 'Max Level'
  const isMaxLevel = levelInfo?.isMaxLevel || false

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gamification Hub</h1>
            <p className="text-muted-foreground">
              Track your progress, earn achievements, and compete with others
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant={selectedTimeframe === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTimeframe('week')}
            >
              Week
            </Button>
            <Button
              variant={selectedTimeframe === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTimeframe('month')}
            >
              Month
            </Button>
            <Button
              variant={selectedTimeframe === 'year' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTimeframe('year')}
            >
              Year
            </Button>
          </div>
        </div>

        {/* User Progress Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Level</p>
                  <p className="text-3xl font-bold">{currentUser.level}</p>
                </div>
                <Crown className="h-8 w-8 text-green-200" />
              </div>
              <div className="mt-4">
                <Progress value={levelProgress} className="bg-green-400" />
                <p className="text-xs text-green-100 mt-1">
                  {isMaxLevel ? 'Max level reached!' : `${pointsToNextLevel} points to ${nextLevelName}`}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Total Points</p>
                  <p className="text-3xl font-bold">{currentUser.total_points.toLocaleString()}</p>
                </div>
                <Zap className="h-8 w-8 text-yellow-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Rank #{currentUser.competitive_data?.user_rank || 'N/A'} globally
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Current Streak</p>
                  <p className="text-3xl font-bold">{currentUser.current_streak}</p>
                </div>
                <Flame className="h-8 w-8 text-orange-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {currentUser.current_streak > 0 ? 'Keep it up!' : 'Start your streak today'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Tasks Completed</p>
                  <p className="text-3xl font-bold">{currentUser.tasks_completed}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Productivity Score: {currentUser.productivity_score || 0}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={(value: any) => setSelectedTab(value)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="medals">Medals</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weekly Challenge */}
            {weeklyChallenge && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5" />
                    <span>Weekly Challenge</span>
                  </CardTitle>
                  <CardDescription>{weeklyChallenge.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Progress 
                      value={(weeklyChallenge.progress / weeklyChallenge.target) * 100} 
                      className="w-full" 
                    />
                    <div className="flex justify-between text-sm">
                      <span>{weeklyChallenge.progress} / {weeklyChallenge.target}</span>
                      <span className="text-muted-foreground">{weeklyChallenge.reward}</span>
                    </div>
                    {weeklyChallenge.completed && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Completed!
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Points & Level Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Sparkles className="h-5 w-5" />
                  <span>Progress Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Current Level</span>
                    <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                      Level {currentUser.level}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>
                        {isMaxLevel ? 'Max Level Achieved' : `Progress to ${nextLevelName || 'Next Level'}`}
                      </span>
                      <span>{Math.round(levelProgress)}%</span>
                    </div>
                    <Progress value={levelProgress} className="w-full" />
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{currentUser.total_points}</p>
                      <p className="text-xs text-muted-foreground">Total Points</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-600">
                        {currentLevel >= 10 ? 'MAX' : pointsToNextLevel.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {currentLevel >= 10 ? 'Max Level' : 'Points to Next Level'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activities Quick View */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Recent Activity</span>
                </CardTitle>
                <CardDescription>Your latest 3 actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {activities && activities.slice(0, 3).map((activity: any) => (
                    <div key={activity.id} className="flex items-center space-x-2 p-2 rounded-lg bg-muted/30">
                      <span className="text-sm">{getActivityIcon(activity.activity_type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {formatActivityMessage(activity)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeTime(activity.created_at)}
                        </p>
                      </div>
                    </div>
                  )) || (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No recent activities. Complete tasks or earn medals to get started!
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Activity Insights or Medal Summary */}
            {activityInsights ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>Activity Insights</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Activities</span>
                      <span className="font-medium">{activityInsights.total_activities}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Most Active Day</span>
                      <span className="font-medium">{activityInsights.peak_activity_day}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Top Action</span>
                      <span className="font-medium capitalize">{activityInsights.most_common_action?.replace('_', ' ')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Award className="h-5 w-5" />
                    <span>Medal Collection</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Medals Earned</span>
                      <span className="font-medium">{userMedals?.length || 0}</span>
                    </div>
                    {userMedals && userMedals.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {userMedals.slice(0, 4).map((userMedal: any) => (
                          <div key={userMedal.id} className="flex items-center space-x-1 px-2 py-1 bg-yellow-100 rounded text-xs">
                            <span>🏆</span>
                            <span className="font-medium">{userMedal.medal?.name}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No medals earned yet. Complete achievements to earn your first medal!</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {achievements && achievements.length > 0 ? (
              achievements.map((achievement: any) => {
                const isUnlocked = currentUser.achievements?.includes(achievement.name)
                return (
                  <Card key={achievement.id} className={cn(
                    "transition-all duration-200 hover:shadow-md",
                    isUnlocked ? "bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-300" : "opacity-60"
                  )}>
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-3">
                        <div className={cn(
                          "p-2 rounded-full",
                          isUnlocked ? "bg-yellow-500" : "bg-gray-300"
                        )}>
                          <Trophy className={cn(
                            "h-5 w-5",
                            isUnlocked ? "text-white" : "text-gray-500"
                          )} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">{achievement.name}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {achievement.description}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <Badge variant={isUnlocked ? "default" : "secondary"}>
                              {achievement.points_required} points
                            </Badge>
                            {isUnlocked && (
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Unlocked
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            ) : (
              <div className="col-span-full text-center py-8">
                <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No achievements available yet.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-4">
          <RankingSystem />
        </TabsContent>

        <TabsContent value="activities" className="space-y-4">
          {/* Recent Activities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Recent Activities</span>
              </CardTitle>
              <CardDescription>
                Your latest actions and achievements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {activitiesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : activities && activities.length > 0 ? (
                  activities.map((activity: any) => (
                    <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50">
                      <div className="text-lg">
                        {getActivityIcon(activity.activity_type)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {formatActivityMessage(activity)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatRelativeTime(activity.created_at)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No recent activities.</p>
                    <p className="text-sm text-muted-foreground mt-1">Complete tasks or earn medals to see activity!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Point Transactions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>Point Transactions</span>
              </CardTitle>
              <CardDescription>
                Complete history of points earned and spent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {transactionsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : pointTransactions && pointTransactions.length > 0 ? (
                  pointTransactions.map((transaction: any) => (
                    <div key={transaction.id} className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50">
                      <div className="text-lg">
                        {getTransactionIcon(transaction)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {formatTransactionMessage(transaction)}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-muted-foreground">
                            {formatRelativeTime(transaction.created_at)}
                          </p>
                          <span className={`text-xs font-semibold px-2 py-1 rounded ${
                            transaction.transaction_type === 'earned' 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {transaction.transaction_type === 'earned' ? '+' : '-'}{Math.abs(transaction.points_amount)} pts
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No point transactions yet.</p>
                    <p className="text-sm text-muted-foreground mt-1">Complete tasks to start earning points!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="medals" className="space-y-4">
          <MedalsManager />
        </TabsContent>
      </Tabs>
    </div>
  )
}

