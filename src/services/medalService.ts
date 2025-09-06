import { supabase } from '@/lib/supabase'
import { Medal, UserMedal } from '@/lib/supabase'

export const medalService = {
  /**
   * Get all active medals
   */
  async getMedals(): Promise<Medal[]> {
    try {
      // Use direct database query for better reliability
      const { data, error } = await supabase
        .from('medals')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching medals:', error)
      return [] // Return empty array instead of throwing to prevent blocking
    }
  },

  /**
   * Create a new medal (admin only)
   */
  async createMedal(medalData: { name: string; description: string; color?: string; points?: number; criteria?: any }): Promise<Medal> {
    const { data, error } = await supabase.functions.invoke('create-medal', {
      method: 'POST',
      body: medalData
    })
    
    if (error) {
      console.error('Error creating medal:', error)
      throw error
    }
    
    if (!data?.success) {
      throw new Error(data?.error?.message || 'Failed to create medal')
    }
    
    return data.data
  },

  /**
   * Get medals for a specific user
   */
  async getUserMedals(userId: string): Promise<UserMedal[]> {
    try {
      // Use direct database query for better reliability
      const { data, error } = await supabase
        .from('user_medals')
        .select(`
          *,
          medal:medals(*)
        `)
        .eq('user_id', userId)
        .order('awarded_at', { ascending: false })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching user medals:', error)
      return [] // Return empty array instead of throwing to prevent blocking
    }
  },

  /**
   * Award a medal to a user (admin only)
   */
  async awardMedal(userId: string, medalId: string, notes?: string): Promise<UserMedal> {
    const { data, error } = await supabase.functions.invoke('award-medal', {
      method: 'POST',
      body: {
        user_id: userId,
        medal_id: medalId,
        notes: notes
      }
    })
    
    if (error) {
      console.error('Error awarding medal:', error)
      throw error
    }
    
    if (!data?.success) {
      throw new Error(data?.error?.message || 'Failed to award medal')
    }
    
    return data.data
  },

  /**
   * Remove a medal from a user (admin only)
   */
  async removeMedal(userId: string, medalId: string): Promise<void> {
    const { data, error } = await supabase.functions.invoke('award-medal', {
      method: 'DELETE',
      body: {
        user_id: userId,
        medal_id: medalId
      }
    })
    
    if (error) {
      console.error('Error removing medal:', error)
      throw error
    }
    
    if (!data?.success) {
      throw new Error(data?.error?.message || 'Failed to remove medal')
    }
  },

  /**
   * Check if user already has a medal
   */
  async userHasMedal(userId: string, medalId: string): Promise<boolean> {
    try {
      const userMedals = await this.getUserMedals(userId)
      return userMedals.some(userMedal => userMedal.medal_id === medalId)
    } catch (error) {
      console.error('Error checking user medal:', error)
      return false
    }
  },

  /**
   * Get all users for selection dropdown
   */
  async getAllUsers(): Promise<Array<{id: string; full_name: string; avatar_url?: string; job_title?: string}>> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, job_title')
        .eq('status', 'active')
        .order('full_name')
      
      if (error) throw error
      return data?.map(user => ({ id: user.user_id, ...user })) || []
    } catch (error) {
      console.error('Error fetching users:', error)
      return []
    }
  }
}

// Export with MedalService name for compatibility
export const MedalService = {
  getAllMedals: medalService.getMedals,
  createMedal: medalService.createMedal,
  getUserMedals: medalService.getUserMedals,
  awardMedal: medalService.awardMedal,
  removeMedal: medalService.removeMedal,
  userHasMedal: medalService.userHasMedal,
  getAllUsers: medalService.getAllUsers
}

export default medalService