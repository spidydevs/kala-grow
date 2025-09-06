import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useLeaderboard, usePointTransactions } from '@/services/gamificationService'
import { Trophy, Star, TrendingUp, History, Award, Users, Crown } from 'lucide-react'
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

// Convert points to rank name based on thresholds
const getPointsToRankName = (points: number) => {
  if (points >= 1750) return 'champion'
  if (points >= 1500) return 'master'
  if (points >= 1250) return 'elite'
  if (points >= 1000) return 'veteran'
  if (points >= 750) return 'special_textbook'
  if (points >= 500) return 'scout'
  return 'recruit'
}

// Convert rank name to display name
const getRankDisplayName = (rankName: string) => {
  const displayNames: { [key: string]: string } = {
    'recruit': 'Recruit',
    'scout': 'Scout',
    'special_textbook': 'Special Textbook',
    'veteran': 'Veteran',
    'elite': 'Elite',
    'master': 'Master',
    'champion': 'Champion'
  }
  return displayNames[rankName] || 'Recruit'
}

export function PointsDisplay() {
  const { data: leaderboardData, isLoading: leaderboardLoading } = useLeaderboard({ 
    timeframe: 'month', 
    limit: 20 
  })
  const { data: transactions, isLoading: transactionsLoading } = usePointTransactions({ limit: 10 })

  if (leaderboardLoading) {
    return (
      <Card className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border-yellow-600/30">
        <CardContent className="p-4">
          <div className="animate-pulse flex items-center space-x-3">
            <div className="rounded-full bg-gray-700 h-10 w-10"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-700 rounded w-3/4"></div>
              <div className="h-3 bg-gray-700 rounded w-1/2"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const currentUser = leaderboardData?.data?.current_user
  if (!currentUser) {
    return null
  }

  const totalPoints = currentUser.total_points || 0
  const rankName = getPointsToRankName(totalPoints)
  const rankDisplayName = getRankDisplayName(rankName)
  const RankIcon = getRankIcon(rankName)
  const tasksCompleted = currentUser.tasks_completed || 0

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card className={cn(
          "cursor-pointer hover:shadow-lg transition-shadow",
          "bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border-yellow-600/30"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className={cn(
                "p-2 rounded-full flex items-center justify-center bg-gradient-to-r",
                getRankGradient(rankName)
              )}>
                <RankIcon className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white">{totalPoints.toLocaleString()}</h3>
                  <Badge variant="secondary" className={cn(
                    "text-xs",
                    rankName === 'champion' && 'text-red-400',
                    rankName === 'master' && 'text-indigo-400',
                    rankName === 'elite' && 'text-purple-400',
                    rankName === 'veteran' && 'text-blue-400',
                    rankName === 'special_textbook' && 'text-yellow-400',
                    rankName === 'scout' && 'text-green-400',
                    rankName === 'recruit' && 'text-amber-400'
                  )}>
                    {rankDisplayName}
                  </Badge>
                </div>
                <p className="text-sm text-gray-400">Total Points</p>
              </div>
              <div className="text-right">
                <div className="text-xs text-green-400">+{tasksCompleted}</div>
                <div className="text-xs text-gray-400">tasks</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px] bg-black border-gray-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <RankIcon className={cn(
              "h-5 w-5",
              rankName === 'champion' && 'text-red-400',
              rankName === 'master' && 'text-indigo-400',
              rankName === 'elite' && 'text-purple-400',
              rankName === 'veteran' && 'text-blue-400',
              rankName === 'special_textbook' && 'text-yellow-400',
              rankName === 'scout' && 'text-green-400',
              rankName === 'recruit' && 'text-amber-400'
            )} />
            Points Dashboard
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            Track your productivity achievements and gamification progress.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Points Summary */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-gray-900 border-gray-700">
              <CardContent className="p-3 text-center">
                <div className="text-lg font-bold text-white">{totalPoints.toLocaleString()}</div>
                <div className="text-xs text-gray-400">Total Points</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-900 border-gray-700">
              <CardContent className="p-3 text-center">
                <div className="text-lg font-bold text-green-400">+{tasksCompleted.toLocaleString()}</div>
                <div className="text-xs text-gray-400">Tasks Done</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-900 border-gray-700">
              <CardContent className="p-3 text-center">
                <div className="text-lg font-bold text-blue-400">{currentUser.rank || 'N/A'}</div>
                <div className="text-xs text-gray-400">Rank</div>
              </CardContent>
            </Card>
          </div>

          {/* Rank Progress */}
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white">Current Rank: {rankDisplayName}</span>
                <RankIcon className={cn(
                  "h-4 w-4",
                  rankName === 'champion' && 'text-red-400',
                  rankName === 'master' && 'text-indigo-400',
                  rankName === 'elite' && 'text-purple-400',
                  rankName === 'veteran' && 'text-blue-400',
                  rankName === 'special_textbook' && 'text-yellow-400',
                  rankName === 'scout' && 'text-green-400',
                  rankName === 'recruit' && 'text-amber-400'
                )} />
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div 
                  className={cn(
                    "h-2 rounded-full transition-all bg-gradient-to-r",
                    getRankGradient(rankName)
                  )}
                  style={{ 
                    width: `${Math.min((totalPoints % 250) / 250 * 100, 100)}%` 
                  }}
                ></div>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {totalPoints < 1750 ? `${Math.max(0, (Math.floor(totalPoints / 250) + 1) * 250 - totalPoints)} points to next rank` : 'Max rank achieved!'}
              </div>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-white">
                <History className="h-4 w-4" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {!transactions || transactions.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-2">No recent activity</p>
                ) : (
                  transactions.slice(0, 5).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between text-xs">
                      <span className="text-gray-300 truncate flex-1">
                        {transaction.description}
                      </span>
                      <span className={cn(
                        "font-medium ml-2",
                        transaction.transaction_type === 'earned' ? 'text-green-400' : 'text-red-400'
                      )}>
                        {transaction.transaction_type === 'earned' ? '+' : ''}{transaction.points_amount}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}