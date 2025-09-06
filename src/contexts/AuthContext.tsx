import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, Profile } from '@/lib/supabase'
import { toast } from 'react-hot-toast'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName?: string) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    
    // Load user on mount (one-time check)
    async function loadUser() {
      if (!isMounted) return
      
      setLoading(true)
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
          throw error
        }
        
        if (!isMounted) return
        
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await loadProfile(session.user.id)
        }
      } catch (error) {
        console.error('Error loading user:', error)
        if (isMounted) {
          toast.error('Failed to load authentication state')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }
    
    loadUser()

    // Set up auth listener - KEEP SIMPLE, avoid any async operations in callback
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id)
        
        // Only update state, no async operations
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          // Use setTimeout to defer async operation outside callback
          setTimeout(() => {
            if (isMounted) {
              loadProfile(session.user.id).catch(console.error)
            }
          }, 0)
        } else {
          setProfile(null)
        }
        
        // Reset loading state when auth changes
        if (isMounted) {
          setLoading(false)
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const loadProfile = async (userId: string) => {
    try {
      console.log('Loading profile for user:', userId)
      
      // Load profile from database
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
      
      if (error) {
        console.warn('Profile loading error:', error)
      }
      
      if (profileData) {
        setProfile(profileData)
      } else {
        // Set minimal profile with proper fallback name
        const minimalProfile = {
          id: userId,
          user_id: userId,
          full_name: 'User',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        setProfile(minimalProfile)
      }
    } catch (error) {
      console.warn('Profile loading failed:', error)
      // Set minimal fallback profile
      const fallbackProfile = {
        id: userId,
        user_id: userId,
        full_name: 'User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      setProfile(fallbackProfile)
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      throw error
    }
  }

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    })

    if (error) {
      throw error
    }

    // Create profile record
    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          user_id: data.user.id,
          full_name: fullName
        })

      if (profileError) {
        console.error('Error creating profile:', profileError)
      }
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw error
    }
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) throw new Error('No user logged in')

    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .select()
      .maybeSingle()

    if (error) {
      throw error
    }

    if (data) {
      setProfile(data)
    }

    return data
  }

  const value = {
    user,
    profile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
