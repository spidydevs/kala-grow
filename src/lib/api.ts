import { supabase } from './supabase'
import { toast } from 'sonner'

// Enhanced API client with retry logic and improved error handling
export class ApiClient {
  private static retryDelays = [1000, 2000, 4000] // Progressive delays in ms
  private static maxRetries = 3
  private static requestCache = new Map<string, Promise<any>>()
  private static cacheTimeout = 5000 // 5 seconds

  // Enhanced error handling with user-friendly messages
  private static handleApiError(error: any, context: string): never {
    console.error(`API Error in ${context}:`, error)
    
    let message = 'An unexpected error occurred'
    
    if (error?.message) {
      const errorMsg = error.message.toLowerCase()
      
      if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
        message = 'Network connection error. Please check your internet connection.'
      } else if (errorMsg.includes('timeout')) {
        message = 'Request timed out. Please try again.'
      } else if (errorMsg.includes('unauthorized') || errorMsg.includes('401')) {
        message = 'Authentication required. Please log in again.'
      } else if (errorMsg.includes('forbidden') || errorMsg.includes('403')) {
        message = 'Access denied. You don\'t have permission for this action.'
      } else if (errorMsg.includes('not found') || errorMsg.includes('404')) {
        message = 'Resource not found.'
      } else if (errorMsg.includes('conflict') || errorMsg.includes('409')) {
        message = 'Data conflict. Please refresh and try again.'
      } else if (errorMsg.includes('rate limit') || errorMsg.includes('429')) {
        message = 'Too many requests. Please wait a moment and try again.'
      } else if (errorMsg.includes('server') || errorMsg.includes('500')) {
        message = 'Server error. Please try again later.'
      } else {
        message = error.message
      }
    }
    
    throw new Error(message)
  }

  // Retry logic with exponential backoff
  private static async withRetry<T>(
    operation: () => Promise<T>,
    context: string,
    maxRetries = this.maxRetries
  ): Promise<T> {
    let lastError: any
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error
        
        // Don't retry on authentication or permission errors
        if (error?.message?.includes('401') || 
            error?.message?.includes('403') || 
            error?.message?.includes('unauthorized') ||
            error?.message?.includes('forbidden')) {
          this.handleApiError(error, context)
        }
        
        // Don't retry on final attempt
        if (attempt === maxRetries) {
          this.handleApiError(error, context)
        }
        
        // Wait before retrying
        const delay = this.retryDelays[Math.min(attempt, this.retryDelays.length - 1)]
        await new Promise(resolve => setTimeout(resolve, delay))
        
        console.log(`Retrying ${context} (attempt ${attempt + 1}/${maxRetries})...`)
      }
    }
    
    this.handleApiError(lastError, context)
  }

  // Request deduplication to prevent multiple identical requests
  private static async withDeduplication<T>(
    cacheKey: string,
    operation: () => Promise<T>
  ): Promise<T> {
    // Check if request is already in progress
    if (this.requestCache.has(cacheKey)) {
      return this.requestCache.get(cacheKey)!
    }
    
    // Start new request
    const requestPromise = operation().finally(() => {
      // Clean up cache after timeout
      setTimeout(() => {
        this.requestCache.delete(cacheKey)
      }, this.cacheTimeout)
    })
    
    this.requestCache.set(cacheKey, requestPromise)
    return requestPromise
  }

  // Enhanced Edge Function invocation
  static async invokeEdgeFunction<T>(
    functionName: string,
    options?: {
      body?: any
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
      cache?: boolean
    }
  ): Promise<T> {
    const { body, method = 'POST', cache = false } = options || {}
    const context = `Edge Function: ${functionName}`
    
    const operation = async () => {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body,
        method
      })
      
      if (error) {
        throw error
      }
      
      return data
    }
    
    if (cache && method === 'GET') {
      const cacheKey = `${functionName}-${JSON.stringify(body || {})}`
      return this.withDeduplication(cacheKey, () => this.withRetry(operation, context))
    }
    
    return this.withRetry(operation, context)
  }

  // Enhanced direct Supabase query
  static async query<T>(
    queryBuilder: any,
    context: string,
    cache = false
  ): Promise<T> {
    const operation = async () => {
      const { data, error } = await queryBuilder
      
      if (error) {
        throw error
      }
      
      return data
    }
    
    if (cache) {
      const cacheKey = `query-${context}-${Date.now()}`
      return this.withDeduplication(cacheKey, () => this.withRetry(operation, context))
    }
    
    return this.withRetry(operation, context)
  }

  // Health check for connection monitoring
  static async healthCheck(): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('health-check')
      return !error
    } catch {
      return false
    }
  }

  // Connection status monitoring
  static async monitorConnection(callback: (isConnected: boolean) => void) {
    const checkConnection = async () => {
      const isConnected = await this.healthCheck()
      callback(isConnected)
    }
    
    // Initial check
    await checkConnection()
    
    // Periodic checks every 30 seconds
    return setInterval(checkConnection, 30000)
  }
}

// Enhanced query options for React Query
export const enhancedQueryOptions = {
  retry: (failureCount: number, error: any) => {
    // Don't retry auth errors
    if (error?.message?.includes('401') || 
        error?.message?.includes('403') ||
        error?.message?.includes('unauthorized') ||
        error?.message?.includes('forbidden')) {
      return false
    }
    return failureCount < 3
  },
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
  staleTime: 30000, // 30 seconds
  gcTime: 300000, // 5 minutes
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
}

// Connection monitoring hook
import { useEffect, useState } from 'react'

export function useConnectionStatus() {
  const [isConnected, setIsConnected] = useState(true)
  const [isChecking, setIsChecking] = useState(false)
  
  useEffect(() => {
    let intervalId: NodeJS.Timeout
    
    const startMonitoring = async () => {
      setIsChecking(true)
      intervalId = await ApiClient.monitorConnection((connected) => {
        setIsConnected(connected)
        setIsChecking(false)
        
        if (!connected) {
          toast.error('Connection lost. Retrying...')
        } else if (!isConnected && connected) {
          toast.success('Connection restored!')
        }
      })
    }
    
    startMonitoring()
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [])
  
  return { isConnected, isChecking }
}
