import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/services/revenueService'
import { Trophy, Award, Medal } from 'lucide-react'

interface UserRevenueCardProps {
  user: {
    user_id: string
    user_name: string
    company?: string
    total_revenue: number
    transaction_count: number
    average_deal_size: number
  }
  rank: number
}

export function UserRevenueCard({ user, rank }: UserRevenueCardProps) {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />
      case 2:
        return <Award className="h-5 w-5 text-gray-400" />
      case 3:
        return <Medal className="h-5 w-5 text-amber-600" />
      default:
        return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>
    }
  }

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'border-yellow-200 bg-yellow-50'
      case 2:
        return 'border-gray-200 bg-gray-50'
      case 3:
        return 'border-amber-200 bg-amber-50'
      default:
        return 'border-border'
    }
  }

  return (
    <Card className={`${getRankColor(rank)} transition-all hover:shadow-md`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8">
              {getRankIcon(rank)}
            </div>
            <div>
              <h4 className="font-semibold">{user.user_name}</h4>
              {user.company && (
                <p className="text-sm text-muted-foreground">{user.company}</p>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="font-bold text-lg">
              {formatCurrency(user.total_revenue)}
            </div>
            <div className="text-xs text-muted-foreground">
              {user.transaction_count} transactions
            </div>
            <div className="text-xs text-muted-foreground">
              Avg: {formatCurrency(user.average_deal_size)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}