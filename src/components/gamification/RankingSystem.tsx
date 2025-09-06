import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar } from '@/components/ui/avatar'
import { Trophy, Star, TrendingUp, Users, Crown, Loader2 } from 'lucide-react'
import { useLeaderboard } from '@/services/gamificationService'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

const RANK_LEVEL_NAMES = [
  'Recruit', 'Scout', 'Special Textbook', 'Veteran', 'Elite', 'Master', 'Champion'
]

const getRankIcon = (rankName: string) => {
  const icons: { [key: string]: any } = {
    'recruit': Users,
    'scout': Users,
    'special_textbook': Star,
    'veteran': Star,
    'elite': Trophy,
    'master': Crown,
    'champion': Crown
  }
  return icons[rankName] || Users
}

const getRankGradient = (rankName: string) => {
  const gradients: { [key: string]: string } = {
    'recruit': 'from-amber-600 to-amber-400',
    'scout': 'from-green-600 to-green-400', 
    'special_textbook': 'from-yellow-600 to-yellow-400',
    'veteran': 'from-blue-600 to-blue-400',
    'elite': 'from-purple-600 to-purple-400',
    'master': 'from-indigo-600 to-indigo-400',
    'champion': 'from-red-600 to-red-400'
  }
  return gradients[rankName] || gradients['recruit']
}

const getRankIndex = (rankName: string): number => {
  const ranks = ['recruit', 'scout', 'special_textbook', 'veteran', 'elite', 'master', 'champion']
  const index = ranks.indexOf(rankName)
  return index >= 0 ? index : 0
}

export function RankingSystem() {
  const { user } = useAuth()
  const { data: leaderboardData, isLoading, error } = useLeaderboard({ 
    timeframe: 'month', 
    limit: 20 
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="font-semibold mb-2">Unable to load leaderboard</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Please try again later or contact support if the issue persists.
          </p>
        </div>
      </div>
    )
  }

  const leaderboard = leaderboardData?.data?.leaderboard || []
  const currentUser = leaderboardData?.data?.current_user

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Leaderboard</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Top performers in the organization
        </p>
      </div>

      {/* Current User Rank */}
      {currentUser && (
        <Card className="relative overflow-hidden">
          <div 
            className={cn(
              'absolute inset-0 bg-gradient-to-r opacity-10',
              getRankGradient(currentUser.rank_name || 'recruit')
            )}
          />
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Your Current Rank
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Rank Display */}
              <div className="text-center">
                <div 
                  className={cn(
                    'w-20 h-20 mx-auto rounded-full bg-gradient-to-r flex items-center justify-center text-white mb-4',
                    getRankGradient(currentUser.rank_name || 'recruit')
                  )}
                >
                  {React.createElement(getRankIcon(currentUser.rank_name || 'recruit'), { 
                    className: 'h-8 w-8' 
                  })}
                </div>
                <h3 className="text-xl font-bold">
                  {currentUser.rank_display || 'Recruit'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {currentUser.total_points || 0} points
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-green-600">{currentUser.total_points?.toLocaleString() || 0}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Total Points</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{currentUser.tasks_completed || 0}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Tasks Completed</p>
                </div>
              </div>

              {/* Additional Stats */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Your Rank</span>
                  <Badge variant="secondary">#{currentUser.rank || 'N/A'}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Daily Streak</span>
                  <Badge variant="outline">{currentUser.daily_streak || 0} days</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Trophy className="h-5 w-5 mr-2 text-yellow-600" />
            Top Performers
          </CardTitle>
          <CardDescription>
            Leading contributors this month
          </CardDescription>
        </CardHeader>
        <CardContent>
          {leaderboard.length > 0 ? (
            <div className="space-y-3">
              {leaderboard.slice(0, 10).map((member, index) => {
                const position = index + 1
                const rankName = member.rank_name || 'recruit'
                const RankIcon = getRankIcon(rankName)
                
                return (
                  <div 
                    key={member.user_id || index} 
                    className={cn(
                      'flex items-center justify-between p-4 rounded-lg border transition-colors',
                      position <= 3 
                        ? 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-800'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800',
                      member.user_id === user?.id && 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    )}
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      {/* Position */}
                      <div className="w-8 text-center">
                        {position <= 3 ? (
                          <div 
                            className={cn(
                              'w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold',
                              position === 1 && 'bg-yellow-500',
                              position === 2 && 'bg-gray-400',
                              position === 3 && 'bg-orange-600'
                            )}
                          >
                            {position}
                          </div>
                        ) : (
                          <span className="text-lg font-semibold text-gray-600 dark:text-gray-400">
                            {position}
                          </span>
                        )}
                      </div>

                      {/* User Info */}
                      <div className="flex items-center space-x-3 flex-1">
                        <Avatar className="w-10 h-10">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                            {member.full_name?.charAt(0) || 'U'}
                          </div>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-semibold">
                              {member.full_name || 'Unknown User'}
                              {member.user_id === user?.id && (
                                <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(You)</span>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RankIcon className="h-3 w-3" />
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              {member.rank_display || 'Recruit'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Points & Stats */}
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">
                        {(member.total_points || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {member.tasks_completed || 0} tasks
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No ranking data yet</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Complete tasks and activities to start climbing the leaderboard!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rank Progression Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Rank Progression</CardTitle>
          <CardDescription>
            Understand how the ranking system works
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {RANK_LEVEL_NAMES.map((rankName, index) => {
              const rankKey = ['recruit', 'scout', 'special_textbook', 'veteran', 'elite', 'master', 'champion'][index]
              const RankIcon = getRankIcon(rankKey || 'recruit')
              const userRankName = currentUser?.rank_name || 'recruit'
              const userRankIndex = ['recruit', 'scout', 'special_textbook', 'veteran', 'elite', 'master', 'champion'].indexOf(userRankName)
              const isCurrentOrLower = userRankIndex >= index
              
              return (
                <div 
                  key={rankKey || index}
                  className={cn(
                    'p-4 rounded-lg border text-center transition-all',
                    isCurrentOrLower 
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  )}
                >
                  <div 
                    className={cn(
                      'w-12 h-12 mx-auto rounded-full bg-gradient-to-r flex items-center justify-center text-white mb-3',
                      getRankGradient(rankKey || 'recruit')
                    )}
                  >
                    <RankIcon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold">{rankName}</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Rank {index + 1}
                  </p>
                  {isCurrentOrLower && (
                    <Badge className="mt-2" variant="secondary">
                      {index === userRankIndex ? 'Current' : 'Achieved'}
                    </Badge>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}