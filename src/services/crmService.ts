import { supabase } from '@/lib/supabase'
import type { Client } from '@/lib/supabase'

// Enhanced CRM Management API Service using new Edge Functions
export class CRMService {
  // Get comprehensive dashboard data
  static async getDashboardData() {
    const { data, error } = await supabase.functions.invoke('enhanced-crm', {
      body: { action: 'get_dashboard_data' }
    })

    if (error) {
      throw new Error(error.message || 'Failed to fetch dashboard data')
    }

    return data
  }

  // Get revenue trends analytics
  static async getRevenueTrends(period = '6m') {
    const { data, error } = await supabase.functions.invoke('enhanced-crm', {
      body: { action: 'get_revenue_trends', period }
    })

    if (error) {
      throw new Error(error.message || 'Failed to fetch revenue trends')
    }

    return data
  }

  // Get top performing clients
  static async getClientPerformance(limit = 10) {
    const { data, error } = await supabase.functions.invoke('enhanced-crm', {
      body: { action: 'get_client_performance', limit }
    })

    if (error) {
      throw new Error(error.message || 'Failed to fetch client performance')
    }

    return data
  }

  // Get pipeline overview with deals by stage
  static async getPipelineOverview() {
    const { data, error } = await supabase.functions.invoke('enhanced-crm', {
      body: { action: 'get_pipeline_overview' }
    })

    if (error) {
      throw new Error(error.message || 'Failed to fetch pipeline overview')
    }

    return data
  }

  // Get client revenue summary
  static async getClientRevenueSummary(clientId: string) {
    const { data, error } = await supabase.functions.invoke('enhanced-crm', {
      body: { action: 'get_client_revenue_summary', client_id: clientId }
    })

    if (error) {
      throw new Error(error.message || 'Failed to fetch client revenue summary')
    }

    return data
  }

  // Get revenue breakdown by client
  static async getRevenueByClient(limit = 10, offset = 0) {
    const { data, error } = await supabase.functions.invoke('enhanced-crm', {
      body: { action: 'get_revenue_by_client', limit, offset }
    })

    if (error) {
      throw new Error(error.message || 'Failed to fetch revenue by client')
    }

    return data
  }

  // Update opportunity stage
  static async updateOpportunityStage(dealId: string, newStage: string, notes?: string) {
    const { data, error } = await supabase.functions.invoke('enhanced-crm', {
      body: { action: 'update_opportunity_stage', deal_id: dealId, new_stage: newStage, notes }
    })

    if (error) {
      throw new Error(error.message || 'Failed to update opportunity stage')
    }

    return data
  }

  // Get payment analytics
  static async getPaymentAnalytics(period = '30d') {
    const { data, error } = await supabase.functions.invoke('payment-management', {
      body: { action: 'get_payment_analytics', period }
    })

    if (error) {
      throw new Error(error.message || 'Failed to fetch payment analytics')
    }

    return data
  }

  // Pipeline Management Functions
  static async createPipeline(name: string, description?: string) {
    const { data, error } = await supabase.functions.invoke('enhanced-crm', {
      body: { action: 'create_pipeline', name, description }
    })

    if (error) {
      throw new Error(error.message || 'Failed to create pipeline')
    }

    return data
  }

  static async getPipelines() {
    const { data, error } = await supabase.functions.invoke('enhanced-crm', {
      body: { action: 'get_pipelines' }
    })

    if (error) {
      throw new Error(error.message || 'Failed to fetch pipelines')
    }

    return data
  }

  static async createDeal(dealData: {
    title: string
    client_id?: string
    stage_id?: string
    pipeline_id?: string
    value?: number
    probability?: number
    expected_close_date?: string
    notes?: string
  }) {
    const { data, error } = await supabase.functions.invoke('enhanced-crm', {
      body: { action: 'create_deal', ...dealData }
    })

    if (error) {
      throw new Error(error.message || 'Failed to create deal')
    }

    return data
  }

  // Legacy functions for backward compatibility
  static async createClient(clientData: {
    name: string
    email?: string
    phone?: string
    company?: string
    address?: string
    website?: string
    industry?: string
    status?: 'active' | 'inactive'
    notes?: string
    tags?: string[]
  }) {
    const { data, error } = await supabase.functions.invoke('create-client', {
      body: clientData
    })

    if (error) {
      throw new Error(error.message || 'Failed to create client')
    }

    return data
  }

  static async updateClient(clientId: string, updates: Partial<Client>) {
    const { data, error } = await supabase.functions.invoke('update-client', {
      body: {
        client_id: clientId,
        ...updates
      }
    })

    if (error) {
      throw new Error(error.message || 'Failed to update client')
    }

    return data
  }

  static async getClients(params?: {
    status?: string
    industry?: string
    search?: string
    limit?: number
    offset?: number
    sort?: string
  }) {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value))
        }
      })
    }

    const url = queryParams.toString() ? `get-clients?${queryParams.toString()}` : 'get-clients'
    const { data, error } = await supabase.functions.invoke(url, {
      method: 'GET'
    })

    if (error) {
      throw new Error(error.message || 'Failed to fetch clients')
    }

    return data
  }

  static async deleteClient(clientId: string) {
    const { data, error } = await supabase.functions.invoke('delete-client', {
      body: { client_id: clientId }
    })

    if (error) {
      throw new Error(error.message || 'Failed to delete client')
    }

    return data
  }

  // Direct database queries for deals (as fallback)
  static async getDeals(params?: {
    pipeline_id?: string
    stage_id?: string
    client_id?: string
    status?: string
    limit?: number
    offset?: number
  }) {
    let query = supabase
      .from('deals')
      .select(`
        *,
        client:clients(*),
        pipeline:pipelines(*)
      `)
      .order('position', { ascending: true })

    if (params?.pipeline_id) {
      query = query.eq('pipeline_id', params.pipeline_id)
    }
    if (params?.stage_id) {
      query = query.eq('stage_id', params.stage_id)
    }
    if (params?.client_id) {
      query = query.eq('client_id', params.client_id)
    }
    if (params?.status) {
      query = query.eq('status', params.status)
    }
    if (params?.limit) {
      query = query.limit(params.limit)
    }
    if (params?.offset) {
      query = query.range(params.offset, (params.offset || 0) + (params?.limit || 10) - 1)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(error.message || 'Failed to fetch deals')
    }

    return data
  }
}

// Custom hooks for enhanced CRM management
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

// Enhanced Analytics Hooks
export function useDashboardData() {
  return useQuery({
    queryKey: ['crm-dashboard'],
    queryFn: CRMService.getDashboardData,
    staleTime: 60000, // 1 minute
    refetchInterval: 300000, // 5 minutes
  })
}

export function useRevenueTrends(period = '6m') {
  return useQuery({
    queryKey: ['revenue-trends', period],
    queryFn: () => CRMService.getRevenueTrends(period),
    staleTime: 300000, // 5 minutes
  })
}

export function useClientPerformance(limit = 10) {
  return useQuery({
    queryKey: ['client-performance', limit],
    queryFn: () => CRMService.getClientPerformance(limit),
    staleTime: 300000, // 5 minutes
  })
}

export function usePipelineOverview() {
  return useQuery({
    queryKey: ['pipeline-overview'],
    queryFn: CRMService.getPipelineOverview,
    staleTime: 60000, // 1 minute
  })
}

export function useClientRevenueSummary(clientId: string) {
  return useQuery({
    queryKey: ['client-revenue-summary', clientId],
    queryFn: () => CRMService.getClientRevenueSummary(clientId),
    enabled: !!clientId,
    staleTime: 60000, // 1 minute
  })
}

export function useRevenueByClient(limit = 10, offset = 0) {
  return useQuery({
    queryKey: ['revenue-by-client', limit, offset],
    queryFn: () => CRMService.getRevenueByClient(limit, offset),
    staleTime: 60000, // 1 minute
  })
}

export function usePaymentAnalytics(period = '30d') {
  return useQuery({
    queryKey: ['payment-analytics', period],
    queryFn: () => CRMService.getPaymentAnalytics(period),
    staleTime: 300000, // 5 minutes
  })
}

// Pipeline Management Hooks
export function useCreatePipeline() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ name, description }: { name: string; description?: string }) => 
      CRMService.createPipeline(name, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] })
      queryClient.invalidateQueries({ queryKey: ['pipeline-overview'] })
      toast.success('Pipeline created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })
}

export function useCreateDeal() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: CRMService.createDeal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] })
      queryClient.invalidateQueries({ queryKey: ['pipeline-overview'] })
      queryClient.invalidateQueries({ queryKey: ['crm-dashboard'] })
      toast.success('Deal created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })
}

export function useUpdateOpportunityStage() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ dealId, newStage, notes }: { dealId: string; newStage: string; notes?: string }) => 
      CRMService.updateOpportunityStage(dealId, newStage, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] })
      queryClient.invalidateQueries({ queryKey: ['pipeline-overview'] })
      queryClient.invalidateQueries({ queryKey: ['crm-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['revenue-by-client'] })
      toast.success('Opportunity stage updated')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })
}

// Legacy hooks for backward compatibility
export function useClients(params?: Parameters<typeof CRMService.getClients>[0]) {
  return useQuery({
    queryKey: ['clients', params],
    queryFn: () => CRMService.getClients(params),
    staleTime: 30000, // 30 seconds
  })
}

export function useDeals(params?: Parameters<typeof CRMService.getDeals>[0]) {
  return useQuery({
    queryKey: ['deals', params],
    queryFn: () => CRMService.getDeals(params),
    staleTime: 30000,
  })
}

export function usePipelines() {
  return useQuery({
    queryKey: ['pipelines'],
    queryFn: CRMService.getPipelines,
    staleTime: 300000, // 5 minutes
  })
}

export function useCreateClient() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: CRMService.createClient,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['user-stats'] })
      queryClient.invalidateQueries({ queryKey: ['crm-dashboard'] })
      toast.success(`Client created! +${data.data?.points_earned || 0} points earned`)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })
}

export function useUpdateClient() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ clientId, updates }: { clientId: string; updates: Partial<Client> }) => 
      CRMService.updateClient(clientId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['deals'] })
      queryClient.invalidateQueries({ queryKey: ['crm-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['revenue-by-client'] })
      toast.success('Client updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })
}

export function useDeleteClient() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: CRMService.deleteClient,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['deals'] })
      queryClient.invalidateQueries({ queryKey: ['crm-dashboard'] })
      
      if (data.data?.had_invoices) {
        toast.success('Client deleted (had associated invoices)')
      } else {
        toast.success('Client deleted successfully')
      }
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })
}
