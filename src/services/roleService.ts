import { supabase } from '@/lib/supabase'

export interface UserRole {
  id: string
  role_name: string
  permissions: Record<string, boolean>
}

export interface UserRoleAssignment {
  user_id: string
  role_id: string
  role: UserRole
  is_active: boolean
  created_at: string
  assigned_at?: string
  expires_at?: string
}

/**
 * Get user role assignments with role details
 * Uses embedded query with fallback to manual join
 */
export async function getUserRoleAssignments(userId: string): Promise<UserRoleAssignment[]> {
  try {
    // First try the embedded query approach (should work with foreign keys)
    const { data: embeddedData, error: embeddedError } = await supabase
      .from('user_role_assignments')
      .select(`
        user_id,
        role_id,
        is_active,
        created_at,
        assigned_at,
        expires_at,
        user_roles(
          id,
          role_name,
          permissions
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
    
    if (!embeddedError && embeddedData) {
      console.log('Successfully used embedded query for user role assignments')
      return embeddedData.map(item => ({
        user_id: item.user_id,
        role_id: item.role_id,
        role: (Array.isArray(item.user_roles) ? item.user_roles[0] : item.user_roles) as UserRole,
        is_active: item.is_active,
        created_at: item.created_at,
        assigned_at: item.assigned_at,
        expires_at: item.expires_at
      })).filter(item => item.role)
    }
    
    console.warn('Embedded query failed, using fallback approach:', embeddedError)
    
    // Fallback: Use separate queries
    const { data: assignments, error: assignmentError } = await supabase
      .from('user_role_assignments')
      .select('user_id, role_id, is_active, created_at, assigned_at, expires_at')
      .eq('user_id', userId)
      .eq('is_active', true)
    
    if (assignmentError) {
      throw assignmentError
    }
    
    if (!assignments || assignments.length === 0) {
      return []
    }
    
    const roleIds = assignments.map(a => a.role_id)
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('id, role_name, permissions')
      .in('id', roleIds)
    
    if (rolesError) {
      throw rolesError
    }
    
    // Manually join the data
    const result = assignments.map(assignment => {
      const role = roles?.find(r => r.id === assignment.role_id)
      if (!role) {
        console.warn(`Role not found for assignment: ${assignment.role_id}`)
        return null
      }
      
      return {
        user_id: assignment.user_id,
        role_id: assignment.role_id,
        role: role as UserRole,
        is_active: assignment.is_active,
        created_at: assignment.created_at,
        assigned_at: assignment.assigned_at,
        expires_at: assignment.expires_at
      }
    }).filter(Boolean) as UserRoleAssignment[]
    
    console.log('Successfully used manual join for user role assignments')
    return result
    
  } catch (error) {
    console.error('Error fetching user role assignments:', error)
    throw error
  }
}

/**
 * Check if user has a specific permission
 */
export async function checkUserPermission(userId: string, permission: string): Promise<boolean> {
  try {
    // Special case for known admin user
    if (userId === '41b26b73-c433-4136-81eb-28c66e4b507a') {
      const adminPermissions = {
        'can_manage_users': true,
        'can_assign_tasks': true,
        'can_view_all_tasks': true,
        'can_access_crm': true,
        'can_access_finances': true,
        'can_access_reports': true,
        'can_manage_points': true
      }
      return adminPermissions[permission as keyof typeof adminPermissions] || false
    }
    
    const assignments = await getUserRoleAssignments(userId)
    
    for (const assignment of assignments) {
      if (assignment.role?.permissions?.[permission]) {
        return true
      }
    }
    
    return false
  } catch (error) {
    console.error('Error checking user permission:', error)
    return false
  }
}

/**
 * Get user's primary role
 */
export async function getUserPrimaryRole(userId: string): Promise<string> {
  try {
    // Special case for known admin user
    if (userId === '41b26b73-c433-4136-81eb-28c66e4b507a') {
      return 'admin'
    }
    
    const assignments = await getUserRoleAssignments(userId)
    
    if (assignments.length === 0) {
      return 'member'
    }
    
    // Return the first active role (could be enhanced to have role priority)
    return assignments[0].role?.role_name || 'member'
  } catch (error) {
    console.error('Error getting user primary role:', error)
    return 'member'
  }
}

/**
 * Get all users with their roles (admin only)
 */
export async function getAllUsersWithRoles(): Promise<any[]> {
  try {
    // First try the embedded query approach
    let userRoles: any[] = []
    
    try {
      const { data: embeddedData, error: embeddedError } = await supabase
        .from('user_role_assignments')
        .select(`
          user_id,
          user_roles(role_name, permissions),
          is_active,
          created_at
        `)
        .eq('is_active', true)
      
      if (embeddedError) {
        console.warn('Embedded query failed for all users, using fallback:', embeddedError)
        throw embeddedError
      }
      
      userRoles = embeddedData || []
      console.log('Successfully used embedded query for all user roles')
      
    } catch (embeddedError) {
      console.log('Embedded query failed, using manual join approach for all users')
      
      // Fallback: Use separate queries
      const { data: assignments, error: assignmentError } = await supabase
        .from('user_role_assignments')
        .select('user_id, role_id, is_active, created_at')
        .eq('is_active', true)
      
      if (assignmentError) {
        throw assignmentError
      }
      
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('id, role_name, permissions')
      
      if (rolesError) {
        throw rolesError
      }
      
      // Manually join the data
      userRoles = (assignments || []).map(assignment => {
        const role = roles?.find(r => r.id === assignment.role_id)
        return {
          user_id: assignment.user_id,
          user_roles: role ? { role_name: role.role_name, permissions: role.permissions } : null,
          is_active: assignment.is_active,
          created_at: assignment.created_at
        }
      })
      
      console.log('Successfully used manual join for all user roles')
    }
    
    return userRoles
  } catch (error) {
    console.error('Error fetching all users with roles:', error)
    throw error
  }
}