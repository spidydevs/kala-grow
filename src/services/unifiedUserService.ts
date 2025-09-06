import { supabase } from '@/lib/supabase';
import { userManagementService } from '@/services/userManagementService';

export interface UnifiedUser {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'member';
  job_title?: string;
  company?: string;
  avatar_url?: string;
  status: 'active' | 'inactive' | 'deleted';
  created_at: string;
  last_active_at?: string;
}

export interface UsersListResponse {
  users: UnifiedUser[];
  total_count: number;
  admin_count: number;
  member_count: number;
  active_count: number;
}

/**
 * Unified User Service for consistent user data access across the platform
 * This service ensures all parts of the app get the same user data structure
 */
export class UnifiedUserService {
  /**
   * Get all users with complete profile and auth data
   * This is the primary method that should be used across the platform
   */
  static async getAllUsers(): Promise<UsersListResponse> {
    console.log('[UnifiedUserService] Starting getAllUsers...');
    
    // Try admin endpoint first (most complete data)
    try {
      console.log('[UnifiedUserService] Trying admin endpoint...');
      const adminResponse = await userManagementService.getAllUsers();
      console.log('[UnifiedUserService] Admin endpoint succeeded with', adminResponse.users.length, 'users');
      
      const users: UnifiedUser[] = adminResponse.users.map((user: any) => ({
        id: user.id || user.user_id,
        user_id: user.user_id || user.id,
        full_name: user.full_name || 'Unknown User',
        email: user.email || `user@company.com`,
        role: user.role || 'member',
        job_title: user.job_title || '',
        company: user.company || '',
        avatar_url: user.avatar_url || '',
        status: user.status || 'active',
        created_at: user.created_at || new Date().toISOString(),
        last_active_at: user.last_active_at
      }));
      
      return {
        users,
        total_count: adminResponse.total_count,
        admin_count: adminResponse.admin_count,
        member_count: adminResponse.member_count,
        active_count: adminResponse.active_count
      };
    } catch (adminError) {
      console.warn('[UnifiedUserService] Admin endpoint failed:', adminError);
    }
    
    // Try public endpoint
    try {
      console.log('[UnifiedUserService] Trying public endpoint...');
      const { data: response, error } = await supabase.functions.invoke('public-users');
      
      if (error) {
        throw new Error(error.message || 'Public users endpoint failed');
      }
      
      if (!response || !response.success) {
        throw new Error(response?.error?.message || 'Public users request failed');
      }
      
      const data = response.data || response;
      console.log('[UnifiedUserService] Public endpoint succeeded with', data.users?.length || 0, 'users');
      
      const users: UnifiedUser[] = (data.users || []).map((user: any) => ({
        id: user.id || user.user_id,
        user_id: user.user_id || user.id,
        full_name: user.full_name || 'Unknown User',
        email: user.email || `user@company.com`,
        role: user.role || 'member',
        job_title: user.job_title || '',
        company: user.company || '',
        avatar_url: user.avatar_url || '',
        status: user.status || 'active',
        created_at: user.created_at || new Date().toISOString(),
        last_active_at: user.last_active_at
      }));
      
      return {
        users,
        total_count: data.total_count || users.length,
        admin_count: data.admin_count || users.filter(u => u.role === 'admin').length,
        member_count: data.member_count || users.filter(u => u.role === 'member').length,
        active_count: data.active_count || users.length
      };
    } catch (publicError) {
      console.warn('[UnifiedUserService] Public endpoint failed:', publicError);
    }
    
    // Try direct database query as final fallback
    try {
      console.log('[UnifiedUserService] Trying direct database query...');
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }
      
      console.log('[UnifiedUserService] Direct query succeeded with', profiles?.length || 0, 'profiles');
      
      const users: UnifiedUser[] = (profiles || []).map(profile => ({
        id: profile.id || profile.user_id,
        user_id: profile.user_id || profile.id,
        full_name: profile.full_name || 'Unknown User',
        email: profile.email || `user@company.com`,
        role: profile.role || 'member',
        job_title: profile.job_title || '',
        company: profile.company || '',
        avatar_url: profile.avatar_url || '',
        status: profile.status || 'active',
        created_at: profile.created_at || new Date().toISOString(),
        last_active_at: profile.last_active_at
      }));
      
      return {
        users,
        total_count: users.length,
        admin_count: users.filter(u => u.role === 'admin').length,
        member_count: users.filter(u => u.role === 'member').length,
        active_count: users.filter(u => u.status === 'active').length
      };
    } catch (directError) {
      console.error('[UnifiedUserService] Direct query failed:', directError);
    }
    
    // Final fallback - return empty but functional response
    console.warn('[UnifiedUserService] All methods failed, returning empty response');
    return {
      users: [],
      total_count: 0,
      admin_count: 0,
      member_count: 0,
      active_count: 0
    };
  }

  /**
   * Get active users only (for dropdowns, assignments, etc.)
   */
  static async getActiveUsers(): Promise<UnifiedUser[]> {
    try {
      const response = await this.getAllUsers();
      return response.users.filter(user => user.status === 'active');
    } catch (error) {
      console.error('[UnifiedUserService] Failed to get active users:', error);
      return [];
    }
  }

  /**
   * Get users by role
   */
  static async getUsersByRole(role: 'admin' | 'member'): Promise<UnifiedUser[]> {
    try {
      const response = await this.getAllUsers();
      return response.users.filter(user => user.role === role && user.status === 'active');
    } catch (error) {
      console.error('[UnifiedUserService] Failed to get users by role:', error);
      return [];
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string): Promise<UnifiedUser | null> {
    try {
      const response = await this.getAllUsers();
      return response.users.find(user => user.user_id === userId) || null;
    } catch (error) {
      console.error('[UnifiedUserService] Failed to get user by ID:', error);
      return null;
    }
  }

  /**
   * Check if current user is admin
   */
  static async isCurrentUserAdmin(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      
      return profile?.role === 'admin';
    } catch (error) {
      console.error('[UnifiedUserService] Failed to check admin status:', error);
      return false;
    }
  }

  /**
   * Get current user profile
   */
  static async getCurrentUserProfile(): Promise<UnifiedUser | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      return await this.getUserById(user.id);
    } catch (error) {
      console.error('[UnifiedUserService] Failed to get current user profile:', error);
      return null;
    }
  }

  /**
   * Refresh user cache - call this after user updates
   */
  static refreshUserCache() {
    console.log('[UnifiedUserService] User cache refresh requested');
  }
}

export default UnifiedUserService;