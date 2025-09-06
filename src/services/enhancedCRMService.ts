import { ApiClient } from '@/lib/api'

export interface PipelineStage {
  id: string
  name: string
  description?: string
  color: string
  position: number
  is_closed: boolean
  is_won: boolean
  probability_percentage: number
}

export interface Deal {
  id: string
  user_id: string
  client_id: string
  title: string
  description?: string
  value: number
  stage: string
  probability: number
  expected_close_date?: string
  closed_date?: string
  source?: string
  priority: string
  tags?: string[]
  next_activity_date?: string
  next_activity_type?: string
  assigned_to?: string
  expected_revenue: number
  lost_reason?: string
  created_at: string
  updated_at: string
  clients?: {
    id: string
    name: string
    company?: string
    email?: string
  }
}

export interface ClientPayment {
  id: string
  client_id: string
  invoice_id?: string
  deal_id?: string
  amount: number
  payment_method: string
  payment_status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded'
  payment_date?: string
  reference_number?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface ClientRevenueSummary {
  id: string
  client_id: string
  total_revenue: number
  total_paid: number
  total_pending: number
  total_invoices: number
  total_deals: number
  won_deals: number
  average_deal_size: number
  last_payment_date?: string
  last_updated: string
}

export interface RevenueAnalytics {
  metrics: {
    total_revenue: number
    total_pending: number
    total_clients: number
    average_client_value: number
  }
  top_clients: Array<{
    client_id: string
    total_revenue: number
    clients: {
      name: string
      company?: string
    }
  }>
  monthly_trends: Array<{
    month: string
    amount: number
  }>
}

export class EnhancedCRMService {
  // Pipeline Management
  static async getPipelineOverview() {
    return ApiClient.invokeEdgeFunction('enhanced-crm', {
      body: { action: 'get_pipeline_overview' },
      method: 'POST'
    })
  }

  static async createDeal(dealData: Partial<Deal>) {
    return ApiClient.invokeEdgeFunction('enhanced-crm', {
      body: { action: 'create_deal', dealData },
      method: 'POST'
    })
  }

  static async updateDeal(dealId: string, updates: Partial<Deal>) {
    return ApiClient.invokeEdgeFunction('enhanced-crm', {
      body: { action: 'update_deal', dealId, updates },
      method: 'POST'
    })
  }

  static async moveDealStage(dealId: string, newStage: string, notes?: string) {
    return ApiClient.invokeEdgeFunction('enhanced-crm', {
      body: { action: 'move_deal_stage', dealId, newStage, notes },
      method: 'POST'
    })
  }

  // Revenue Analytics
  static async getClientRevenue(clientId: string) {
    return ApiClient.invokeEdgeFunction('enhanced-crm', {
      body: { action: 'get_client_revenue', clientId },
      method: 'POST'
    })
  }

  static async getRevenueAnalytics() {
    return ApiClient.invokeEdgeFunction('enhanced-crm', {
      body: { action: 'get_revenue_analytics' },
      method: 'POST'
    })
  }

  // Payment Management
  static async recordPayment(paymentData: Partial<ClientPayment>) {
    return ApiClient.invokeEdgeFunction('payment-management', {
      body: { action: 'record_payment', paymentData },
      method: 'POST'
    })
  }

  static async updatePaymentStatus(paymentId: string, status: string, notes?: string) {
    return ApiClient.invokeEdgeFunction('payment-management', {
      body: { action: 'update_payment_status', paymentId, status, notes },
      method: 'POST'
    })
  }

  static async getClientPayments(clientId: string, limit = 50, offset = 0) {
    return ApiClient.invokeEdgeFunction('payment-management', {
      body: { action: 'get_client_payments', clientId, limit, offset },
      method: 'POST'
    })
  }

  static async getPendingPayments(limit = 50, offset = 0) {
    return ApiClient.invokeEdgeFunction('payment-management', {
      body: { action: 'get_pending_payments', limit, offset },
      method: 'POST'
    })
  }

  static async reconcilePayment(paymentId: string, invoiceId?: string, dealId?: string) {
    return ApiClient.invokeEdgeFunction('payment-management', {
      body: { action: 'reconcile_payment', paymentId, invoiceId, dealId },
      method: 'POST'
    })
  }

  static async getPaymentAnalytics() {
    return ApiClient.invokeEdgeFunction('payment-management', {
      body: { action: 'get_payment_analytics' },
      method: 'POST'
    })
  }
}

// React Query Hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { enhancedQueryOptions } from '@/lib/api'
import { toast } from 'sonner'

export function usePipelineOverview() {
  return useQuery({
    queryKey: ['pipeline-overview'],
    queryFn: () => EnhancedCRMService.getPipelineOverview(),
    ...enhancedQueryOptions,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useCreateDeal() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: EnhancedCRMService.createDeal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-overview'] })
      toast.success('Deal created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })
}

export function useUpdateDeal() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ dealId, updates }: { dealId: string; updates: Partial<Deal> }) => 
      EnhancedCRMService.updateDeal(dealId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-overview'] })
      toast.success('Deal updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })
}

export function useMoveDealStage() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ dealId, newStage, notes }: { dealId: string; newStage: string; notes?: string }) => 
      EnhancedCRMService.moveDealStage(dealId, newStage, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-overview'] })
      queryClient.invalidateQueries({ queryKey: ['revenue-analytics'] })
      toast.success('Deal stage updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })
}

export function useClientRevenue(clientId: string) {
  return useQuery({
    queryKey: ['client-revenue', clientId],
    queryFn: () => EnhancedCRMService.getClientRevenue(clientId),
    ...enhancedQueryOptions,
    enabled: !!clientId,
  })
}

export function useRevenueAnalytics() {
  return useQuery({
    queryKey: ['revenue-analytics'],
    queryFn: () => EnhancedCRMService.getRevenueAnalytics(),
    ...enhancedQueryOptions,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

export function useRecordPayment() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: EnhancedCRMService.recordPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenue-analytics'] })
      queryClient.invalidateQueries({ queryKey: ['pending-payments'] })
      toast.success('Payment recorded successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })
}

export function usePendingPayments() {
  return useQuery({
    queryKey: ['pending-payments'],
    queryFn: () => EnhancedCRMService.getPendingPayments(),
    ...enhancedQueryOptions,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}