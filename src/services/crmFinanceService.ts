import { ApiClient } from '@/lib/api'

export interface UnifiedFinancialSummary {
  summary: {
    total_revenue: number
    crm_revenue: number
    direct_revenue: number
    invoice_revenue: number
    total_expenses: number
    net_profit: number
    profit_margin: number
    health_score: number
  }
  client_breakdown: Array<{
    client_id: string
    client_name: string
    company?: string
    crm_revenue: number
    direct_revenue: number
    invoice_revenue: number
    total_revenue: number
  }>
  revenue_sources: {
    crm_deals: number
    direct_entries: number
    invoices: number
  }
  period: {
    type: string
    start_date: string
    end_date: string
  }
}

export interface RevenueEntry {
  id: string
  user_id: string
  revenue_amount: number
  revenue_source: string
  revenue_type: 'sales' | 'commission' | 'bonus' | 'project' | 'retainer' | 'other'
  revenue_category?: string
  client_id?: string
  project_id?: string
  invoice_id?: string
  transaction_date: string
  period_start?: string
  period_end?: string
  currency: string
  description?: string
  notes?: string
  status: 'active' | 'pending' | 'cancelled' | 'disputed'
  created_by?: string
  created_at: string
  updated_at: string
  // Relations
  client?: { name: string; company?: string }
  project?: { name: string }
  created_by_user?: { full_name: string }
}

export class CRMFinanceService {
  /**
   * Get unified financial summary including CRM, revenue, and invoice data
   */
  static async getUnifiedFinancialSummary(options: {
    user_id?: string
    period?: 'week' | 'month' | 'quarter' | 'year'
  } = {}): Promise<UnifiedFinancialSummary> {
    const response = await ApiClient.invokeEdgeFunction<{ data: UnifiedFinancialSummary }>('crm-finance-integration', {
      body: {
        action: 'get_unified_financial_summary',
        ...options
      },
      method: 'POST'
    })
    return response.data
  }

  /**
   * Sync a CRM deal to revenue when it's marked as closed_won
   */
  static async syncDealToRevenue(dealId: string, userId: string): Promise<{
    revenue: RevenueEntry
    deal: any
    message: string
  }> {
    const response = await ApiClient.invokeEdgeFunction<{ data: any }>('crm-finance-integration', {
      body: {
        action: 'sync_deal_to_revenue',
        deal_id: dealId,
        user_id: userId
      },
      method: 'POST'
    })
    return response.data
  }

  /**
   * Auto sync deal stage changes (automatically creates revenue for closed_won deals)
   */
  static async autoSyncDealStageChange(dealId: string, newStage: string, userId: string): Promise<any> {
    const response = await ApiClient.invokeEdgeFunction<{ data: any }>('crm-finance-integration', {
      body: {
        action: 'auto_sync_deal_stage_change',
        deal_id: dealId,
        new_stage: newStage,
        user_id: userId
      },
      method: 'POST'
    })
    return response.data
  }

  /**
   * Add direct revenue entry (for non-CRM revenue)
   */
  static async addRevenueEntry(revenueData: {
    user_id: string
    revenue_amount: number
    revenue_source: string
    revenue_type: RevenueEntry['revenue_type']
    revenue_category?: string
    client_id?: string
    project_id?: string
    invoice_id?: string
    transaction_date: string
    period_start?: string
    period_end?: string
    currency?: string
    description?: string
    notes?: string
  }): Promise<RevenueEntry> {
    const response = await ApiClient.invokeEdgeFunction<{ data: RevenueEntry }>('revenue-management', {
      body: {
        action: 'add_revenue',
        ...revenueData
      },
      method: 'POST'
    })
    return response.data
  }
}

// Utility functions
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount)
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function getRevenueSourceColor(source: string): string {
  if (source.toLowerCase().includes('crm')) {
    return 'bg-blue-100 text-blue-800'
  }
  if (source.toLowerCase().includes('invoice')) {
    return 'bg-green-100 text-green-800'
  }
  if (source.toLowerCase().includes('direct')) {
    return 'bg-purple-100 text-purple-800'
  }
  return 'bg-gray-100 text-gray-800'
}

export function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

export default CRMFinanceService
