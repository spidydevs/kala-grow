import { supabase } from '@/lib/supabase'
import { ApiClient, enhancedQueryOptions } from '@/lib/api'
import type { Invoice, InvoiceItem, Expense } from '@/lib/supabase'

// Finance Management API Service
export class FinanceService {
  // Create a new invoice
  static async createInvoice(invoiceData: {
    client_name: string
    client_email?: string
    client_address?: string
    invoice_items: InvoiceItem[]
    due_date?: string
    notes?: string
    tax_rate?: number
    discount_amount?: number
    project_id?: string
  }) {
    return ApiClient.invokeEdgeFunction('finance', {
      body: { action: 'create_invoice', ...invoiceData }
    })
  }

  // Create a new expense
  static async createExpense(expenseData: {
    description: string
    amount: number
    category: string
    date?: string
    receipt_url?: string
    notes?: string
    project_id?: string
    is_billable?: boolean
    vendor?: string
    payment_method?: string
  }) {
    return ApiClient.invokeEdgeFunction('finance', {
      body: { action: 'create_expense', ...expenseData }
    })
  }

  // Get financial summary
  static async getFinancialSummary(params?: {
    period?: 'week' | 'month' | 'quarter' | 'year'
    start_date?: string
    end_date?: string
  }) {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) {
          queryParams.append(key, value)
        }
      })
    }

    return ApiClient.invokeEdgeFunction('finance', {
      body: { action: 'get_financial_summary', ...params },
      method: 'POST',
      cache: true
    })
  }

  // Export invoice as PDF or HTML
  static async exportInvoice(invoiceId: string, format: 'pdf' | 'html' = 'pdf') {
    return ApiClient.invokeEdgeFunction('export-invoice', {
      body: { invoice_id: invoiceId, format }
    })
  }

  // Generate financial report
  static async generateFinancialReport(reportData: {
    report_type: 'financial_summary' | 'invoice_report' | 'expense_report' | 'tax_report' | 'client_report'
    start_date: string
    end_date: string
    include_charts?: boolean
    format?: 'json' | 'pdf' | 'csv'
  }) {
    return ApiClient.invokeEdgeFunction('finance', {
      body: { action: 'generate_financial_report', ...reportData }
    })
  }

  // Get invoices from database
  static async getInvoices(params?: {
    status?: string
    client_name?: string
    limit?: number
    offset?: number
  }) {
    let query = supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false })

    if (params?.status) {
      query = query.eq('status', params.status)
    }
    
    if (params?.client_name) {
      query = query.ilike('client_name', `%${params.client_name}%`)
    }

    if (params?.limit) {
      query = query.limit(params.limit)
    }

    if (params?.offset) {
      query = query.range(params.offset, (params.offset || 0) + (params?.limit || 10) - 1)
    }

    return ApiClient.query(query, 'fetch invoices', true)
  }

  // Get expenses from database
  static async getExpenses(params?: {
    category?: string
    start_date?: string
    end_date?: string
    is_billable?: boolean
    limit?: number
    offset?: number
  }) {
    let query = supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false })

    if (params?.category) {
      query = query.eq('category', params.category)
    }
    
    if (params?.start_date) {
      query = query.gte('date', params.start_date)
    }
    
    if (params?.end_date) {
      query = query.lte('date', params.end_date)
    }

    if (params?.is_billable !== undefined) {
      query = query.eq('is_billable', params.is_billable)
    }

    if (params?.limit) {
      query = query.limit(params.limit)
    }

    if (params?.offset) {
      query = query.range(params.offset, (params.offset || 0) + (params?.limit || 10) - 1)
    }

    return ApiClient.query(query, 'fetch expenses', true)
  }
}

// Custom hooks for finance management
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export function useFinancialSummary(params?: Parameters<typeof FinanceService.getFinancialSummary>[0]) {
  return useQuery({
    queryKey: ['financial-summary', params],
    queryFn: () => FinanceService.getFinancialSummary(params),
    staleTime: 60000, // 1 minute
  })
}

export function useInvoices(params?: Parameters<typeof FinanceService.getInvoices>[0]) {
  return useQuery({
    queryKey: ['invoices', params],
    queryFn: () => FinanceService.getInvoices(params),
    staleTime: 30000,
  })
}

export function useExpenses(params?: Parameters<typeof FinanceService.getExpenses>[0]) {
  return useQuery({
    queryKey: ['expenses', params],
    queryFn: () => FinanceService.getExpenses(params),
    staleTime: 30000,
  })
}

export function useCreateInvoice() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: FinanceService.createInvoice,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] })
      queryClient.invalidateQueries({ queryKey: ['user-stats'] })
      toast.success(`Invoice created successfully! +${(data as any)?.points_earned || 0} points earned`)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })
}

export function useCreateExpense() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: FinanceService.createExpense,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] })
      queryClient.invalidateQueries({ queryKey: ['user-stats'] })
      
      const monthlyTotal = (data as any)?.monthly_category_total || 0
      toast.success(`Expense recorded! +${(data as any)?.points_earned || 0} points earned`)
      
      if (monthlyTotal > 1000) {
        toast.info(`Monthly ${(data as any)?.expense?.category || 'expense'} spending: $${monthlyTotal.toFixed(2)}`)
      }
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })
}

export function useExportInvoice() {
  return useMutation({
    mutationFn: ({ invoiceId, format }: { invoiceId: string; format?: 'pdf' | 'html' }) => 
      FinanceService.exportInvoice(invoiceId, format),
    onSuccess: (data, variables) => {
      if (variables.format === 'html' || (data as any)?.html_content) {
        // Create and download HTML file
        const htmlContent = (data as any)?.html_content || data
        const blob = new Blob([htmlContent], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `invoice-${(data as any)?.invoice_number || 'export'}.html`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        toast.success('Invoice exported successfully!')
      } else {
        toast.success('Invoice exported successfully!')
      }
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })
}

export function useGenerateFinancialReport() {
  return useMutation({
    mutationFn: FinanceService.generateFinancialReport,
    onSuccess: (data) => {
      toast.success('Financial report generated successfully!')
      return data
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })
}