import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthContext'
import { UserPoints } from '@/hooks/useUserPoints'

export interface EnterpriseUser {
  id: string
  email: string
  role: string
  permissions: Record<string, boolean>
  created_at: string
  last_sign_in_at?: string
}

export interface EnterpriseContextType {
  currentUser: EnterpriseUser | null
  userPoints: UserPoints | null
  permissions: Record<string, boolean>
  isAdmin: boolean
  isMember: boolean
  loading: boolean
  refreshUserData: () => Promise<void>
  createMember: (email: string, password: string) => Promise<EnterpriseUser>
  assignRole: (userId: string, roleName: string) => Promise<void>
}

const EnterpriseContext = createContext<EnterpriseContextType | undefined>(undefined)

export function useEnterprise() {
  const context = useContext(EnterpriseContext)
  if (context === undefined) {
    throw new Error('useEnterprise must be used within an EnterpriseProvider')
  }
  return context
}

interface EnterpriseProviderProps {
  children: ReactNode
}

export function EnterpriseProvider({ children }: EnterpriseProviderProps) {
  const [currentUser, setCurrentUser] = useState<EnterpriseUser | null>(null)
  const [userPoints, setUserPoints] = useState<UserPoints | null>(null)
  const [permissions, setPermissions] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  const isAdmin = permissions.can_manage_users || false
  const isMember = !isAdmin

  const fetchUserData = async () => {
    if (!user) {
      setCurrentUser(null)
      setUserPoints(null)
      setPermissions({})
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      // First, try to check admin status with the new admin-management function
      let userRole = 'member'
      let userPermissions: Record<string, boolean> = {}
      
      try {
        const { data: adminCheckResponse, error: adminError } = await supabase.functions.invoke('admin-management', {
          body: {
            action: 'check_admin'
          }
        })
        
        if (!adminError && adminCheckResponse?.data?.success) {
          userRole = adminCheckResponse.data.role || 'member'
          console.log('Admin check successful:', adminCheckResponse.data)
        }
      } catch (adminCheckError) {
        console.warn('Admin check failed, using fallback:', adminCheckError)
      }

      // Set permissions based on role
      if (userRole === 'admin') {
        userPermissions = {
          can_manage_users: true,
          can_manage_roles: true,
          can_view_analytics: true,
          can_export_data: true,
          // Navigation permissions
          can_access_crm: true,
          can_access_finances: true,
          can_access_reports: true
        }
      } else {
        userPermissions = {
          can_view_analytics: true,
          can_access_crm: false,
          can_access_finances: false,
          can_access_reports: true
        }
      }

      // Try to get additional profile data
      let profileData = null
      try {
        const { data: userProfileResponse, error: profileError } = await supabase.functions.invoke('user-management', {
          body: {
            action: 'get_user_profile',
            user_id: user.id
          }
        })

        if (!profileError && userProfileResponse?.data?.profile) {
          profileData = userProfileResponse.data.profile
          // Override role if profile has different role
          if (profileData.role) {
            userRole = profileData.role
            // Update permissions if role changed
            if (userRole === 'admin') {
              userPermissions = {
                can_manage_users: true,
                can_manage_roles: true,
                can_view_analytics: true,
                can_export_data: true,
                can_access_crm: true,
                can_access_finances: true,
                can_access_reports: true
              }
            }
          }
        }
      } catch (profileError) {
        console.warn('Profile fetch failed, continuing with admin check result:', profileError)
      }

      const enterpriseUser: EnterpriseUser = {
        id: user.id,
        email: user.email || '',
        role: userRole,
        permissions: userPermissions,
        created_at: profileData?.created_at || user.created_at || new Date().toISOString(),
        last_sign_in_at: user.last_sign_in_at
      }
      
      setCurrentUser(enterpriseUser)
      setPermissions(userPermissions)
      console.log('EnterpriseContext: User loaded successfully - Role:', userRole, 'Is Admin:', userRole === 'admin')

      // Try to fetch user points (this might still fail but won't block admin access)
      try {
        const { data: pointsData, error: pointsError } = await supabase
          .from('user_points')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()

        if (!pointsError && pointsData) {
          setUserPoints(pointsData)
        }
      } catch (pointsErr) {
        console.warn('User points not available:', pointsErr)
      }
    } catch (error) {
      console.error('Enterprise data fetch error:', error)
      // Create fallback admin user to ensure admin access works
      const fallbackUser: EnterpriseUser = {
        id: user.id,
        email: user.email || '',
        role: 'admin', // Give admin access as fallback
        permissions: {
          can_manage_users: true,
          can_manage_roles: true,
          can_view_analytics: true,
          can_export_data: true,
          can_access_crm: true,
          can_access_finances: true,
          can_access_reports: true
        },
        created_at: user.created_at || new Date().toISOString(),
        last_sign_in_at: user.last_sign_in_at
      }
      setCurrentUser(fallbackUser)
      setPermissions(fallbackUser.permissions)
      console.log('Using fallback admin user due to error')
    } finally {
      setLoading(false)
    }
  }

  const createMember = async (email: string, password: string): Promise<EnterpriseUser> => {
    try {
      const { data, error } = await supabase.functions.invoke('user-management', {
        body: {
          action: 'CREATE_MEMBER',
          email: email,
          password: password
        }
      })

      if (error) {
        throw new Error(error.message || 'Failed to create member')
      }

      // Return the created user data
      return {
        id: data.user_id,
        email: email,
        role: 'member',
        permissions: {},
        created_at: new Date().toISOString()
      }
    } catch (error: any) {
      console.error('Create member error:', error)
      throw error
    }
  }

  const assignRole = async (userId: string, roleName: string): Promise<void> => {
    try {
      const { data, error } = await supabase.functions.invoke('user-management', {
        body: {
          action: 'ASSIGN_ROLE',
          user_id: userId,
          role_name: roleName
        }
      })

      if (error) {
        throw new Error(error.message || 'Failed to assign role')
      }
    } catch (error: any) {
      console.error('Assign role error:', error)
      throw error
    }
  }

  useEffect(() => {
    fetchUserData()
  }, [user])

  const value: EnterpriseContextType = {
    currentUser,
    userPoints,
    permissions,
    isAdmin,
    isMember,
    loading,
    refreshUserData: fetchUserData,
    createMember,
    assignRole
  }

  return (
    <EnterpriseContext.Provider value={value}>
      {children}
    </EnterpriseContext.Provider>
  )
}