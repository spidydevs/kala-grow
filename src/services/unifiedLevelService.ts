import React from 'react'
import { supabase } from '@/lib/supabase'

// Unified Level Calculation Service
// This service provides a single source of truth for level calculations
// that matches the database rank_tiers schema

export interface RankTier {
  id: string
  level: number
  tier: number
  name: string
  points_required: number
  color: string
  icon_url?: string
}

export interface LevelInfo {
  currentLevel: number
  currentTier: number
  currentRankName: string
  currentPoints: number
  pointsRequired: number
  nextRankName?: string
  nextRankPointsRequired?: number
  progressToNextRank: number
  progressPercentage: number
  rankColor: string
  isMaxLevel: boolean
}

export class UnifiedLevelService {
  private static rankTiers: RankTier[] = []
  private static isInitialized = false

  /**
   * Initialize the service by fetching rank tiers from database
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      const { data, error } = await supabase
        .from('rank_tiers')
        .select('*')
        .order('level', { ascending: true })
        .order('tier', { ascending: true })

      if (error) {
        console.warn('Failed to load rank tiers from database, using fallback:', error)
        // Use fallback data when table doesn't exist or other database issues
        this.rankTiers = this.getFallbackRankTiers()
      } else {
        this.rankTiers = data || this.getFallbackRankTiers()
      }

      this.isInitialized = true
      console.log(`Initialized unified level service with ${this.rankTiers.length} rank tiers`)
    } catch (error) {
      console.error('Error initializing level service:', error)
      this.rankTiers = this.getFallbackRankTiers()
      this.isInitialized = true
    }
  }

  /**
   * Get user's level information based on their total points
   */
  static async getUserLevelInfo(totalPoints: number): Promise<LevelInfo> {
    await this.initialize()

    // Find the current rank tier based on points
    let currentRank = this.rankTiers[0] // Default to first rank
    
    for (let i = this.rankTiers.length - 1; i >= 0; i--) {
      if (totalPoints >= this.rankTiers[i].points_required) {
        currentRank = this.rankTiers[i]
        break
      }
    }

    // Find the next rank
    const currentRankIndex = this.rankTiers.findIndex(rank => 
      rank.level === currentRank.level && rank.tier === currentRank.tier
    )
    
    const nextRank = currentRankIndex < this.rankTiers.length - 1 
      ? this.rankTiers[currentRankIndex + 1] 
      : null

    // Calculate progress
    const pointsInCurrentRank = totalPoints - currentRank.points_required
    const pointsNeededForNext = nextRank 
      ? nextRank.points_required - currentRank.points_required 
      : 0

    const progressPercentage = nextRank && pointsNeededForNext > 0
      ? Math.min(100, Math.max(0, (pointsInCurrentRank / pointsNeededForNext) * 100))
      : 100 // Max level reached

    return {
      currentLevel: currentRank.level,
      currentTier: currentRank.tier,
      currentRankName: currentRank.name,
      currentPoints: totalPoints,
      pointsRequired: currentRank.points_required,
      nextRankName: nextRank?.name,
      nextRankPointsRequired: nextRank?.points_required,
      progressToNextRank: nextRank ? nextRank.points_required - totalPoints : 0,
      progressPercentage: Math.round(progressPercentage),
      rankColor: currentRank.color || '#FFD700',
      isMaxLevel: !nextRank
    }
  }

  /**
   * Get simplified level (0-10) for backward compatibility
   */
  static async getSimpleLevel(totalPoints: number): Promise<number> {
    const levelInfo = await this.getUserLevelInfo(totalPoints)
    return levelInfo.currentLevel
  }

  /**
   * Get points required for a specific level
   */
  static async getPointsForLevel(level: number, tier: number = 1): Promise<number> {
    await this.initialize()
    
    const rank = this.rankTiers.find(r => r.level === level && r.tier === tier)
    return rank?.points_required || 0
  }

  /**
   * Get all available ranks for display purposes
   */
  static async getAllRankTiers(): Promise<RankTier[]> {
    await this.initialize()
    return [...this.rankTiers]
  }

  /**
   * Update user's rank in the database
   */
  static async updateUserRank(userId: string, totalPoints: number): Promise<void> {
    try {
      const levelInfo = await this.getUserLevelInfo(totalPoints)
      
      // Find the rank tier ID
      const rankTier = this.rankTiers.find(r => 
        r.level === levelInfo.currentLevel && r.tier === levelInfo.currentTier
      )

      if (rankTier) {
        const { error } = await supabase
          .from('user_stats')
          .upsert({
            user_id: userId,
            total_points: totalPoints,
            current_level: levelInfo.currentLevel,
            current_rank_tier_id: rankTier.id,
            rank_updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          })

        if (error) {
          console.error('Error updating user rank:', error)
        }
      }
    } catch (error) {
      console.error('Error in updateUserRank:', error)
    }
  }

  /**
   * Fallback rank tiers when database is unavailable
   */
  private static getFallbackRankTiers(): RankTier[] {
    const fallbackTiers: Omit<RankTier, 'id'>[] = [
      // Level 0: Recruit
      { level: 0, tier: 1, name: 'Recruit Tier 1', points_required: 0, color: '#8B4513' },
      { level: 0, tier: 2, name: 'Recruit Tier 2', points_required: 50, color: '#8B4513' },
      { level: 0, tier: 3, name: 'Recruit Tier 3', points_required: 100, color: '#8B4513' },
      
      // Level 1: Scout  
      { level: 1, tier: 1, name: 'Scout Tier 1', points_required: 200, color: '#696969' },
      { level: 1, tier: 2, name: 'Scout Tier 2', points_required: 350, color: '#696969' },
      { level: 1, tier: 3, name: 'Scout Tier 3', points_required: 500, color: '#696969' },
      
      // Level 2: Specialist
      { level: 2, tier: 1, name: 'Specialist Tier 1', points_required: 750, color: '#CD7F32' },
      { level: 2, tier: 2, name: 'Specialist Tier 2', points_required: 1000, color: '#CD7F32' },
      { level: 2, tier: 3, name: 'Specialist Tier 3', points_required: 1500, color: '#CD7F32' },
      
      // Level 3: Expert
      { level: 3, tier: 1, name: 'Expert Tier 1', points_required: 2000, color: '#C0C0C0' },
      { level: 3, tier: 2, name: 'Expert Tier 2', points_required: 2750, color: '#C0C0C0' },
      { level: 3, tier: 3, name: 'Expert Tier 3', points_required: 3500, color: '#C0C0C0' },
      
      // Level 4: Veteran
      { level: 4, tier: 1, name: 'Veteran Tier 1', points_required: 4500, color: '#FFD700' },
      { level: 4, tier: 2, name: 'Veteran Tier 2', points_required: 6000, color: '#FFD700' },
      { level: 4, tier: 3, name: 'Veteran Tier 3', points_required: 8000, color: '#FFD700' },
      
      // Level 5: Elite
      { level: 5, tier: 1, name: 'Elite Tier 1', points_required: 10000, color: '#00FF00' },
      { level: 5, tier: 2, name: 'Elite Tier 2', points_required: 13000, color: '#00FF00' },
      { level: 5, tier: 3, name: 'Elite Tier 3', points_required: 16000, color: '#00FF00' },
      
      // Level 6: Master
      { level: 6, tier: 1, name: 'Master Tier 1', points_required: 20000, color: '#0000FF' },
      { level: 6, tier: 2, name: 'Master Tier 2', points_required: 25000, color: '#0000FF' },
      { level: 6, tier: 3, name: 'Master Tier 3', points_required: 30000, color: '#0000FF' },
      
      // Level 7: Champion
      { level: 7, tier: 1, name: 'Champion Tier 1', points_required: 37500, color: '#800080' },
      { level: 7, tier: 2, name: 'Champion Tier 2', points_required: 45000, color: '#800080' },
      { level: 7, tier: 3, name: 'Champion Tier 3', points_required: 55000, color: '#800080' },
      
      // Level 8: Hero
      { level: 8, tier: 1, name: 'Hero Tier 1', points_required: 65000, color: '#FF69B4' },
      { level: 8, tier: 2, name: 'Hero Tier 2', points_required: 80000, color: '#FF69B4' },
      { level: 8, tier: 3, name: 'Hero Tier 3', points_required: 100000, color: '#FF69B4' },
      
      // Level 9: Legend
      { level: 9, tier: 1, name: 'Legend Tier 1', points_required: 125000, color: '#FF4500' },
      { level: 9, tier: 2, name: 'Legend Tier 2', points_required: 155000, color: '#FF4500' },
      { level: 9, tier: 3, name: 'Legend Tier 3', points_required: 200000, color: '#FF4500' },
      
      // Level 10: Mythic
      { level: 10, tier: 1, name: 'Mythic Tier 1', points_required: 250000, color: '#DC143C' },
      { level: 10, tier: 2, name: 'Mythic Tier 2', points_required: 325000, color: '#DC143C' },
      { level: 10, tier: 3, name: 'Mythic Tier 3', points_required: 500000, color: '#DC143C' }
    ]

    return fallbackTiers.map((tier, index) => ({
      ...tier,
      id: `fallback-${index}`
    }))
  }

  /**
   * Get level display name with tier
   */
  static formatLevelDisplay(level: number, tier: number): string {
    const levelNames = [
      'Recruit', 'Scout', 'Specialist', 'Expert', 'Veteran', 
      'Elite', 'Master', 'Champion', 'Hero', 'Legend', 'Mythic'
    ]
    
    const levelName = levelNames[level] || 'Unknown'
    return `${levelName} Tier ${tier}`
  }
}

// Export convenient hooks for React components
export function useUserLevel(totalPoints: number) {
  const [levelInfo, setLevelInfo] = React.useState<LevelInfo | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchLevelInfo = async () => {
      try {
        setIsLoading(true)
        const info = await UnifiedLevelService.getUserLevelInfo(totalPoints)
        setLevelInfo(info)
      } catch (error) {
        console.error('Error fetching level info:', error)
        setLevelInfo(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLevelInfo()
  }, [totalPoints])

  return { levelInfo, isLoading }
}

// For compatibility with existing code
export const calculateLevel = async (totalPoints: number): Promise<number> => {
  return UnifiedLevelService.getSimpleLevel(totalPoints)
}

export const calculatePointsForLevel = async (level: number): Promise<number> => {
  return UnifiedLevelService.getPointsForLevel(level)
}