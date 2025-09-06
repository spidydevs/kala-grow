import { supabase } from '../lib/supabase';

export interface CreateUserData {
  email: string;
  password: string;
  fullName: string;
  role?: 'admin' | 'member';
  jobTitle?: string;
  department?: string;
  phone?: string;
}

export interface UpdateUserData {
  email?: string;
  fullName?: string;
  role?: 'admin' | 'member';
  jobTitle?: string;
  department?: string;
  status?: 'active' | 'inactive' | 'deleted';
}

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'member';
  job_title?: string;
  company?: string;
  avatar_url?: string;
  status: 'active' | 'inactive' | 'deleted';
  email_confirmed: boolean;
  last_sign_in?: string;
  created_at: string;
  last_active_at?: string;
}

export interface UsersResponse {
  users: UserProfile[];
  total_count: number;
  admin_count: number;
  member_count: number;
  active_count: number;
}

class UserManagementService {
  private async callUserManagement(action: string, data: any = {}): Promise<any> {
    try {
      console.log(`[UserManagementService] Calling action: ${action}`);
      
      const { data: response, error } = await supabase.functions.invoke('user-management', {
        body: {
          action,
          ...data
        }
      });

      console.log(`[UserManagementService] Raw response for ${action}:`, response);
      console.log(`[UserManagementService] Error for ${action}:`, error);

      if (error) {
        console.error(`[UserManagementService] Supabase function error:`, error);
        throw new Error(`Supabase function error: ${error.message || 'Unknown error'}`);
      }

      if (!response) {
        throw new Error('No response received from user management function');
      }

      // Check if response has error
      if (response.error) {
        console.error(`[UserManagementService] Function returned error:`, response.error);
        throw new Error(response.error.message || 'User management operation failed');
      }

      // Check if response indicates failure
      if (response.success === false) {
        console.error(`[UserManagementService] Operation failed:`, response);
        throw new Error(response.error?.message || 'Operation failed');
      }

      // Return the data portion of the response
      const result = response.data || response;
      console.log(`[UserManagementService] Processed result for ${action}:`, result);
      
      return result;
    } catch (err) {
      console.error(`[UserManagementService] Error in ${action}:`, err);
      throw err;
    }
  }

  // Get all users
  async getAllUsers(): Promise<UsersResponse> {
    try {
      console.log('[UserManagementService] Getting all users...');
      const result = await this.callUserManagement('get_all_users');
      
      // Ensure we have the right structure
      if (!result || !Array.isArray(result.users)) {
        console.error('[UserManagementService] Invalid response structure:', result);
        throw new Error('Invalid response structure from user management service');
      }
      
      console.log('[UserManagementService] Successfully got users:', result.users.length);
      
      return {
        users: result.users || [],
        total_count: result.total_count || 0,
        admin_count: result.admin_count || 0,
        member_count: result.member_count || 0,
        active_count: result.active_count || 0
      };
    } catch (error) {
      console.error('[UserManagementService] getAllUsers failed:', error);
      throw new Error(`Failed to load users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Create a new user
  async createUser(userData: CreateUserData): Promise<{ user: any; profile: UserProfile; message: string }> {
    try {
      return await this.callUserManagement('create_user', { userData });
    } catch (error) {
      console.error('[UserManagementService] createUser failed:', error);
      throw new Error(`Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Update user information
  async updateUser(userId: string, updateData: UpdateUserData): Promise<{ profile: UserProfile; message: string }> {
    try {
      return await this.callUserManagement('update_user', { userId, updateData });
    } catch (error) {
      console.error('[UserManagementService] updateUser failed:', error);
      throw new Error(`Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Change user role
  async changeUserRole(userId: string, role: 'admin' | 'member'): Promise<{ profile: UserProfile; message: string }> {
    try {
      return await this.callUserManagement('change_user_role', { userId, updateData: { role } });
    } catch (error) {
      console.error('[UserManagementService] changeUserRole failed:', error);
      throw new Error(`Failed to change user role: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Toggle user status
  async toggleUserStatus(userId: string): Promise<{ profile: UserProfile; message: string }> {
    try {
      return await this.callUserManagement('toggle_user_status', { userId });
    } catch (error) {
      console.error('[UserManagementService] toggleUserStatus failed:', error);
      throw new Error(`Failed to toggle user status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Delete user
  async deleteUser(userId: string): Promise<{ profile: UserProfile; message: string }> {
    try {
      return await this.callUserManagement('delete_user', { userId });
    } catch (error) {
      console.error('[UserManagementService] deleteUser failed:', error);
      throw new Error(`Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Generate secure password
  generateSecurePassword(length: number = 12): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*';
    
    const allChars = uppercase + lowercase + numbers + symbols;
    let password = '';
    
    // Ensure at least one character from each set
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  // Validate email format
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validate password strength
  validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*]/.test(password)) {
      errors.push('Password must contain at least one special character (!@#$%^&*)');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const userManagementService = new UserManagementService();
export default userManagementService;