import { supabase } from '@/lib/supabase'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

// Types for enhanced CRM functionality
export interface Client {
  id: string
  name: string
  email?: string
  phone?: string
  company?: string
  address?: string
  contact_person?: string
  notes?: string
  industry?: string
  website?: string
  payment_terms: string
  credit_limit: number
  preferred_payment_method: string
  tags?: string[]
  revenue_ytd: number
  revenue_last_12m: number
  lifetime_value: number
  status: 'active' | 'inactive' | 'prospect'
  last_contact_date?: string
  next_follow_up_date?: string
  user_id: string
  created_at: string
  updated_at: string
}

export interface Pipeline {
  id: string
  name: string
  description?: string
  color: string
  position: number
  is_closed: boolean
  is_won: boolean
  probability_percentage: number
  deal_count: number
  total_value: number
  weighted_value: number
  created_at: string
  updated_at: string
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
  priority: 'low' | 'medium' | 'high' | 'urgent'
  tags?: string[]
  next_activity_date?: string
  next_activity_type?: string
  assigned_to?: string
  expected_revenue: number
  lost_reason?: string
  created_at: string
  updated_at: string
  client?: {
    id: string
    name: string
    company?: string
    email?: string
  }
}

export interface Invoice {
  id: string
  user_id: string
  client_id: string
  invoice_number: string
  title: string
  description?: string
  amount: number
  tax_rate: number
  tax_amount: number
  total_amount: number
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'partially_paid'
  due_date?: string
  paid_date?: string
  file_url?: string
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  client_id: string
  invoice_id?: string
  deal_id?: string
  amount: number
  payment_method: 'cash' | 'credit_card' | 'bank_transfer' | 'check' | 'wire_transfer'
  payment_status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded'
  payment_date?: string
  reference_number?: string
  notes?: string
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface ClientInteraction {
  id: string
  client_id: string
  user_id: string
  interaction_type: 'call' | 'email' | 'meeting' | 'demo' | 'proposal' | 'follow_up'
  subject?: string
  description?: string
  interaction_date: string
  duration_minutes?: number
  outcome?: 'positive' | 'negative' | 'neutral' | 'follow_up_needed'
  next_action?: string
  next_action_date?: string
  created_at: string
}

export interface ClientMetrics {
  total_deals: number
  active_deals: number
  won_deals: number
  lost_deals: number
  total_deals_value: number
  won_deals_value: number
  lost_deals_value: number
  win_rate: number
  total_invoices: number
  total_invoiced: number
  paid_invoices: number
  overdue_invoices: number
  total_payments: number
  total_paid: number
  pending_payments: number
  outstanding_balance: number
  payment_completion_rate: number
  revenue_ytd: number
  revenue_last_12m: number
}

export interface PaymentAnalytics {
  period: string
  summary: {
    total_payments: number
    completed_count: number
    pending_count: number
    total_amount: number
    average_payment: number
    completion_rate: number
  }
  payment_methods: Record<string, number>
  daily_trends: Record<string, number>
  recent_payments: Payment[]
}

// Enhanced CRM Service Class
export class EnhancedCRMService {
  // Client Management
  static async createClient(clientData: Partial<Client>) {
    const session = await supabase.auth.getSession()
    if (!session.data.session?.access_token) {
      throw new Error('Authentication required')
    }

    return supabase.functions.invoke('client-management', {
      body: { action: 'create_client', ...clientData }
    })
  }

  static async updateClient(clientId: string, updates: Partial<Client>) {
    const session = await supabase.auth.getSession()
    if (!session.data.session?.access_token) {
      throw new Error('Authentication required')
    }

    return supabase.functions.invoke('client-management', {
      body: { action: 'update_client', client_id: clientId, ...updates }
    })
  }

  static async getClient(clientId: string) {
    const session = await supabase.auth.getSession()
    if (!session.data.session?.access_token) {
      throw new Error('Authentication required')
    }

    return supabase.functions.invoke('client-management', {
      body: { action: 'get_client', client_id: clientId }
    })
  }

  static async listClients(options: {
    limit?: number
    offset?: number
    search?: string
    status?: string
    sort_by?: string
    sort_order?: 'asc' | 'desc'
  } = {}) {
    const session = await supabase.auth.getSession()
    if (!session.data.session?.access_token) {
      throw new Error('Authentication required')
    }

    return supabase.functions.invoke('client-management', {
      body: { action: 'list_clients', ...options }
    })
  }

  static async recordInteraction(interactionData: Partial<ClientInteraction>) {
    const session = await supabase.auth.getSession()
    if (!session.data.session?.access_token) {
      throw new Error('Authentication required')
    }

    return supabase.functions.invoke('client-management', {
      body: { action: 'record_interaction', ...interactionData }
    })
  }

  // Pipeline & Deal Management
  static async getPipelineOverview() {
    const session = await supabase.auth.getSession()
    if (!session.data.session?.access_token) {
      throw new Error('Authentication required')
    }

    return supabase.functions.invoke('crm-management', {
      body: { action: 'get_pipeline_overview' }
    })
  }

  static async updateOpportunityStage(dealId: string, newStage: string, notes?: string) {
    const session = await supabase.auth.getSession()
    if (!session.data.session?.access_token) {
      throw new Error('Authentication required')
    }

    return supabase.functions.invoke('crm-management', {
      body: { action: 'update_opportunity_stage', deal_id: dealId, new_stage: newStage, notes }
    })
  }

  static async getClientRevenueSummary(clientId: string) {
    const session = await supabase.auth.getSession()
    if (!session.data.session?.access_token) {
      throw new Error('Authentication required')
    }

    return supabase.functions.invoke('crm-management', {
      body: { action: 'get_client_revenue_summary', client_id: clientId }
    })
  }

  static async getRevenueByClient(options: { limit?: number; offset?: number } = {}) {
    const session = await supabase.auth.getSession()
    if (!session.data.session?.access_token) {
      throw new Error('Authentication required')
    }

    return supabase.functions.invoke('crm-management', {
      body: { action: 'get_revenue_by_client', ...options }
    })
  }

  // Invoice & Payment Management
  static async createInvoiceFromDeal(dealId: string, options: {
    custom_amount?: number
    tax_rate?: number
    due_days?: number
    notes?: string
  } = {}) {
    const session = await supabase.auth.getSession()
    if (!session.data.session?.access_token) {
      throw new Error('Authentication required')
    }

    return supabase.functions.invoke('invoice-payment-management', {
      body: { action: 'create_invoice_from_deal', deal_id: dealId, ...options }
    })
  }

  static async recordPayment(paymentData: {
    invoice_id?: string
    client_id?: string
    deal_id?: string
    amount: number
    payment_method?: string
    payment_date?: string
    reference_number?: string
    payment_notes?: string
  }) {
    const session = await supabase.auth.getSession()
    if (!session.data.session?.access_token) {
      throw new Error('Authentication required')
    }

    return supabase.functions.invoke('invoice-payment-management', {
      body: { action: 'record_payment', ...paymentData }
    })
  }

  static async updateInvoiceStatus(invoiceId: string, status: string, paidDate?: string) {
    const session = await supabase.auth.getSession()
    if (!session.data.session?.access_token) {
      throw new Error('Authentication required')
    }

    return supabase.functions.invoke('invoice-payment-management', {
      body: { action: 'update_invoice_status', invoice_id: invoiceId, status, paid_date: paidDate }
    })
  }

  static async getOverdueInvoices() {
    const session = await supabase.auth.getSession()
    if (!session.data.session?.access_token) {
      throw new Error('Authentication required')
    }

    return supabase.functions.invoke('invoice-payment-management', {
      body: { action: 'get_overdue_invoices' }
    })
  }

  static async getPaymentAnalytics(options: {
    period?: '7d' | '30d' | '90d' | '12m'
    client_id?: string
  } = {}) {
    const session = await supabase.auth.getSession()
    if (!session.data.session?.access_token) {
      throw new Error('Authentication required')
    }

    return supabase.functions.invoke('invoice-payment-management', {
      body: { action: 'get_payment_analytics', ...options }
    })
  }

  static async generateInvoiceNumber() {
    const session = await supabase.auth.getSession()
    if (!session.data.session?.access_token) {
      throw new Error('Authentication required')
    }

    return supabase.functions.invoke('invoice-payment-management', {
      body: { action: 'generate_invoice_number' }
    })
  }

  static async processBulkPayments(payments: Array<{
    client_id: string
    invoice_id?: string
    amount: number
    payment_method?: string
    payment_date?: string
    reference_number?: string
    notes?: string
  }>) {
    const session = await supabase.auth.getSession()
    if (!session.data.session?.access_token) {
      throw new Error('Authentication required')
    }

    return supabase.functions.invoke('invoice-payment-management', {
      body: { action: 'bulk_payment_processing', payments }
    })
  }
}

// React Query Hooks for enhanced CRM functionality
export function useClients(options: {
  limit?: number
  offset?: number
  search?: string
  status?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
} = {}) {
  return useQuery({
    queryKey: ['clients', options],
    queryFn: () => EnhancedCRMService.listClients(options),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

export function useClient(clientId: string) {
  return useQuery({
    queryKey: ['client', clientId],
    queryFn: () => EnhancedCRMService.getClient(clientId),
    enabled: !!clientId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export function useClientRevenueSummary(clientId: string) {
  return useQuery({
    queryKey: ['client-revenue', clientId],
    queryFn: () => EnhancedCRMService.getClientRevenueSummary(clientId),
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function usePipelineOverview() {
  return useQuery({
    queryKey: ['pipeline-overview'],
    queryFn: () => EnhancedCRMService.getPipelineOverview(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  })
}

export function useRevenueByClient(options: { limit?: number; offset?: number } = {}) {
  return useQuery({
    queryKey: ['revenue-by-client', options],
    queryFn: () => EnhancedCRMService.getRevenueByClient(options),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useOverdueInvoices() {
  return useQuery({
    queryKey: ['overdue-invoices'],
    queryFn: () => EnhancedCRMService.getOverdueInvoices(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

export function usePaymentAnalytics(options: {
  period?: '7d' | '30d' | '90d' | '12m'
  client_id?: string
} = {}) {
  return useQuery({
    queryKey: ['payment-analytics', options],
    queryFn: () => EnhancedCRMService.getPaymentAnalytics(options),
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Mutation Hooks
export function useCreateClient() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: EnhancedCRMService.createClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      toast.success('Client created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create client: ${error.message}`)
    }
  })
}

export function useUpdateClient() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ clientId, updates }: { clientId: string; updates: Partial<Client> }) => 
      EnhancedCRMService.updateClient(clientId, updates),
    onSuccess: (_, { clientId }) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['client', clientId] })
      toast.success('Client updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update client: ${error.message}`)
    }
  })
}

export function useRecordInteraction() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: EnhancedCRMService.recordInteraction,
    onSuccess: (_, variables) => {
      if (variables.client_id) {
        queryClient.invalidateQueries({ queryKey: ['client', variables.client_id] })
      }
      toast.success('Interaction recorded successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to record interaction: ${error.message}`)
    }
  })
}

export function useUpdateOpportunityStage() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ dealId, newStage, notes }: { dealId: string; newStage: string; notes?: string }) => 
      EnhancedCRMService.updateOpportunityStage(dealId, newStage, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-overview'] })
      queryClient.invalidateQueries({ queryKey: ['revenue-by-client'] })
      toast.success('Deal stage updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update deal stage: ${error.message}`)
    }
  })
}

export function useRecordPayment() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: EnhancedCRMService.recordPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-analytics'] })
      queryClient.invalidateQueries({ queryKey: ['overdue-invoices'] })
      queryClient.invalidateQueries({ queryKey: ['revenue-by-client'] })
      toast.success('Payment recorded successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to record payment: ${error.message}`)
    }
  })
}

export function useCreateInvoiceFromDeal() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ dealId, options }: { dealId: string; options?: any }) => 
      EnhancedCRMService.createInvoiceFromDeal(dealId, options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overdue-invoices'] })
      toast.success('Invoice created from deal successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create invoice: ${error.message}`)
    }
  })
}

export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ invoiceId, status, paidDate }: { invoiceId: string; status: string; paidDate?: string }) => 
      EnhancedCRMService.updateInvoiceStatus(invoiceId, status, paidDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overdue-invoices'] })
      queryClient.invalidateQueries({ queryKey: ['payment-analytics'] })
      toast.success('Invoice status updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update invoice status: ${error.message}`)
    }
  })
}