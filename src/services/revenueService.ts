import { supabase } from '@/lib/supabase'

export type RevenueRecord = {
  id?: string
  user_id?: string
  amount?: number
  currency?: string
  source?: string
  metadata?: any
  created_at?: string
  updated_at?: string
}

/**
 * Backwards-compatible UserRevenue shape used by existing UI components.
 */
export type UserRevenue = {
  id: string
  user_id?: string
  user_name?: string
  transaction_date: string
  revenue_source: string
  revenue_category?: string
  revenue_type: string
  revenue_amount: number
  currency?: string
  status?: string
  client?: { id?: string; name?: string; company?: string }
  project?: { id?: string; name?: string }
  company?: string
  total_revenue?: number
  transaction_count?: number
  average_deal_size?: number
  description?: string
  notes?: string
  created_at?: string
}

/** Revenue target shape used by UI */
export interface RevenueTarget {
  id?: string
  user_id: string
  target_amount: number
  target_period: 'monthly' | 'quarterly' | 'yearly'
  target_type: 'total' | 'sales' | 'commission' | 'projects'
  period_start: string
  period_end: string
  achievement_amount?: number
  created_at?: string
  updated_at?: string
}

/** Minimal legacy analytics typing used by charts */
export type RevenueSummaryOverallMetrics = {
  total_revenue?: number
  sales_revenue?: number
  commission_revenue?: number
  bonus_revenue?: number
  project_revenue?: number
  transaction_count?: number
  // legacy alias some components read
  total_transactions?: number
  unique_users?: number
  average_deal_size?: number
}

export type LegacyRevenueAnalytics = {
  series: { date: string; revenue: number }[]
  // legacy callers expect different shapes for user_performance across the codebase.
  // Accept both old compact shape `{ id,name,revenue }` and the enriched shape returned
  // by the compatibility service (user_id, user_name, company, total_revenue, transaction_count, average_deal_size).
  user_performance?: Array<
    | { id: string; name: string; revenue: number }
    | {
        user_id?: string
        user_name?: string
        company?: string
        total_revenue?: number
        transaction_count?: number
        average_deal_size?: number
      }
  >
  totals?: Record<string, number>
  // Optional legacy fields used across components
  overall_metrics?: RevenueSummaryOverallMetrics
  period_data?: any[]
}

/** Shape returned to legacy UI consumers by getRevenueSummary */
export type RevenueSummary = {
  // keep totals flexible so legacy code can read total_revenue / transaction_count directly
  totals: ({ total: number; count: number } & Partial<RevenueSummaryOverallMetrics>)
  records_count: number
  // return enriched UserRevenue-like items for legacy components
  revenue: UserRevenue[]
  // legacy UIs expect a flexible summary shape (period_start, total_revenue, sales_revenue, etc.)
  summaries?: any[]
  overall_metrics?: RevenueSummaryOverallMetrics
}

/** UI constants */
export const REVENUE_TYPES = [
  { value: 'sales', label: 'Sales' },
  { value: 'commission', label: 'Commission' },
  { value: 'bonus', label: 'Bonus' },
  { value: 'project', label: 'Project' },
  { value: 'retainer', label: 'Retainer' },
  { value: 'other', label: 'Other' }
]

export const REVENUE_CATEGORIES = ['general', 'project', 'retainer', 'other']

export const TARGET_PERIODS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' }
]

export const TARGET_TYPES = [
  { value: 'total', label: 'Total' },
  { value: 'sales', label: 'Sales' },
  { value: 'commission', label: 'Commission' },
  { value: 'projects', label: 'Projects' }
]

/** Formatting helpers (shared by revenue UI components) */
export function formatCurrency(amount: number | undefined, currency = 'USD') {
  const value = Number(amount || 0)
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value)
  } catch {
    return `${currency} ${value.toFixed(2)}`
  }
}

/** Small helpers used by target UI */
export function calculateProgress(achievement = 0, target = 0) {
  if (!target) return 0
  return Math.min(100, Math.round((Number(achievement || 0) / Number(target || 0)) * 100))
}

/** UI helpers expected by legacy components */
export function formatRevenueType(type: string | undefined) {
  const t = String(type || 'other')
  const found = REVENUE_TYPES.find((r) => r.value === t)
  return found ? found.label : t
}

export function getRevenueTypeColor(type: string | undefined) {
  // simple color mapping for legacy UIs
  const map: Record<string, string> = {
    sales: 'green',
    commission: 'blue',
    bonus: 'purple',
    project: 'teal',
    retainer: 'orange',
    other: 'gray'
  }
  return map[String(type || 'other')] || 'gray'
}

export function getTargetStatus(target: RevenueTarget) {
  const progress = calculateProgress(target.achievement_amount || 0, target.target_amount)
  if (progress >= 100) return { status: 'achieved', color: 'green', description: 'Target achieved' }
  if (progress >= 75) return { status: 'on_track', color: 'blue', description: 'On track' }
  if (progress >= 40) return { status: 'at_risk', color: 'orange', description: 'At risk' }
  return { status: 'behind', color: 'red', description: 'Behind target' }
}

/**
 * Lightweight centralized revenue service.
 * - Centralizes common DB operations and provides backward-compatible adapters
 *   for existing UI components that still use legacy field names.
 */
export const RevenueService = {
  /**
   * Accepts arbitrary params for backward compatibility (period, limit, user_id, etc.)
   * Returns a legacy-compatible object containing `revenue` array plus totals.
   *
   * Notes:
   * - This function returns enriched UserRevenue items so legacy UI components
   *   that expect `UserRevenue[]` will compile without changes.
   * - `params` is intentionally untyped to accept legacy keys like `period`, `limit`, `user_id`.
   */
  async getRevenue(params?: any): Promise<RevenueSummary> {
      const userId = (params as any)?.userId ?? (params as any)?.user_id
      let qb: any = supabase.from('revenues').select('*')
      if (userId) qb = qb.eq('user_id', userId)
      if (params?.limit) qb = qb.limit(Number(params.limit))
      if (params?.period) {
        // naive period filter: support 'monthly'|'quarterly'|'yearly' by filtering created_at
        const now = new Date()
        let start: Date | null = null
        if (params.period === 'monthly') {
          start = new Date(now.getFullYear(), now.getMonth(), 1)
        } else if (params.period === 'quarterly') {
          const q = Math.floor(now.getMonth() / 3)
          start = new Date(now.getFullYear(), q * 3, 1)
        } else if (params.period === 'yearly') {
          start = new Date(now.getFullYear(), 0, 1)
        }
        if (start) qb = qb.gte('created_at', start.toISOString())
      }
      const { data, error } = await qb
      if (error) throw error
      const records = (data || []) as RevenueRecord[]

      // Build enriched UserRevenue shape expected by legacy components
      const revenueArray: UserRevenue[] = records.map((r: any) => {
        const amount = Number(r.amount ?? r.revenue_amount ?? 0)
        const currency = r.currency ?? 'USD'
        const source = r.source ?? r.revenue_source ?? 'other'
        const created_at = r.created_at ?? r.transaction_date ?? new Date().toISOString()
        const userName = r.user_name ?? (r.user?.name) ?? (r.raw?.user?.name) ?? undefined
        return {
          id: String(r.id ?? ''),
          user_id: r.user_id,
          user_name: userName,
          transaction_date: created_at,
          revenue_source: source,
          revenue_category: r.revenue_category,
          revenue_type: r.revenue_type ?? source,
          revenue_amount: amount,
          currency,
          status: r.status,
          client: r.client,
          project: r.project,
          company: r.company ?? r.client?.company,
          total_revenue: undefined,
          transaction_count: undefined,
          average_deal_size: undefined,
          description: r.description,
          notes: r.notes,
          created_at
        }
      })

      const totals = revenueArray.reduce(
        (acc: { total: number; count: number }, r: any) => {
          acc.total += Number(r.revenue_amount || 0)
          acc.count += 1
          return acc
        },
        { total: 0, count: 0 }
      )

      // breakdown by source for legacy metrics
      const breakdown = revenueArray.reduce((acc: Record<string, number>, r: any) => {
        const s = r.revenue_source || 'other'
        acc[s] = (acc[s] || 0) + Number(r.revenue_amount || 0)
        return acc
      }, {})

      const overall_metrics: RevenueSummaryOverallMetrics = {
        total_revenue: totals.total,
        sales_revenue: breakdown['sales'] || 0,
        commission_revenue: breakdown['commission'] || 0,
        bonus_revenue: breakdown['bonus'] || 0,
        project_revenue: breakdown['project'] || 0,
        transaction_count: totals.count,
        unique_users: new Set((records || []).map((x: any) => x.user_id).filter(Boolean)).size,
        average_deal_size: totals.count ? totals.total / totals.count : 0
      }

      // Provide a simple summaries array compatible with legacy charting
      const summaries = [
        {
          period_start: records.length ? (records[0].created_at || (records[0] as any).transaction_date) : new Date().toISOString(),
          total_revenue: overall_metrics.total_revenue,
          sales_revenue: overall_metrics.sales_revenue,
          commission_revenue: overall_metrics.commission_revenue,
          bonus_revenue: overall_metrics.bonus_revenue,
          project_revenue: overall_metrics.project_revenue
        }
      ]

      // Also include aliases some components still read
      ;(overall_metrics as any).total_transactions = overall_metrics.transaction_count

      return {
        totals: { ...totals, ...overall_metrics },
        records_count: totals.count,
        revenue: revenueArray,
        summaries,
        overall_metrics
      }
  },

  async getRevenueById(id: string) {
    if (!id) throw new Error('id is required')
    const { data, error } = await supabase.from('revenues').select('*').eq('id', id).single()
    if (error) throw error
    return data as RevenueRecord
  },

  async getRevenueSummary(params?: { userId?: string; user_id?: string }): Promise<RevenueSummary> {
    // getRevenue may return either a legacy RevenueSummary or a plain array of RevenueRecord.
    const raw = await RevenueService.getRevenue(params as any)
    let records: any[] = []
    if (Array.isArray(raw)) {
      // older callers: plain array of RevenueRecord
      records = raw as any[]
    } else if ((raw as any)?.revenue && Array.isArray((raw as any).revenue)) {
      // getRevenue returned a RevenueSummary shape
      records = (raw as any).revenue.map((r: any) => r.raw ?? r)
    } else {
      records = []
    }

    const revenueArray = (records || []).map((r: any) => {
      const amount = Number(r.amount ?? r.revenue_amount ?? 0)
      const currency = r.currency ?? 'USD'
      const source = r.source ?? r.revenue_source ?? 'other'
      const created_at = r.created_at ?? (r as any).transaction_date ?? new Date().toISOString()
      const userName = r.user_name ?? (r.user?.name) ?? undefined
      return {
        id: String(r.id ?? ''),
        user_id: r.user_id,
        user_name: userName,
        transaction_date: created_at,
        revenue_source: source,
        revenue_category: r.revenue_category,
        revenue_type: r.revenue_type ?? source,
        revenue_amount: amount,
        currency,
        status: r.status,
        client: r.client,
        project: r.project,
        company: r.company ?? r.client?.company,
        description: r.description,
        notes: r.notes,
        created_at
      } as UserRevenue
    })

      const totals = revenueArray.reduce(
        (acc: { total: number; count: number }, r: any) => {
          acc.total += Number(r.revenue_amount || 0)
          acc.count += 1
          return acc
        },
        { total: 0, count: 0 }
      )

      // breakdown by source for legacy metrics
      const breakdown = revenueArray.reduce(
        (acc: Record<string, number>, r: any) => {
          const s = r.revenue_source || 'other'
          acc[s] = (acc[s] || 0) + Number(r.revenue_amount || 0)
          return acc
        },
        {}
      )

    const overall_metrics: RevenueSummaryOverallMetrics = {
      total_revenue: totals.total,
      sales_revenue: breakdown['sales'] || 0,
      commission_revenue: breakdown['commission'] || 0,
      bonus_revenue: breakdown['bonus'] || 0,
      project_revenue: breakdown['project'] || 0,
      transaction_count: totals.count,
      unique_users: new Set((records || []).map((x: any) => x.user_id).filter(Boolean)).size,
      average_deal_size: totals.count ? totals.total / totals.count : 0
    }

    const summaries = [
      { label: 'Total Revenue', value: totals.total },
      { label: 'Transactions', value: totals.count }
    ]
    // Provide legacy-compatible fields: revenue (array), summaries, overall_metrics
    return {
      totals,
      records_count: totals.count,
      revenue: revenueArray,
      summaries,
      overall_metrics
    }
  },

  async getRevenueTargets(userId?: string) {
      let qb = supabase.from('revenue_targets').select('*')
      if (userId) qb = qb.eq('user_id', userId)
      const { data, error } = await qb
      if (error) throw error
      return (data || []) as RevenueTarget[]
  },

  async setRevenueTarget(payload: Partial<RevenueTarget>) {
    if (!payload.user_id) throw new Error('user_id required')
    const { data, error } = await supabase.from('revenue_targets').insert(payload).select().single()
    if (error) throw error
    return data as RevenueTarget
  },

  async getRevenueAnalytics(params?: { period?: string; userId?: string; user_id?: string }): Promise<LegacyRevenueAnalytics> {
    // Basic analytics placeholder: groups revenue by day for the last 30 days.
      const days = 30
      const { data, error } = await supabase
        .from('revenues')
        .select('amount, created_at, source, user_id, user_name, company')
        .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      if (error) throw error

      // series by day
      const byDay: Record<string, number> = {}
      ;(data || []).forEach((r: any) => {
        const d = r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : 'unknown'
        byDay[d] = (byDay[d] || 0) + Number(r.amount || 0)
      })
      const series = Object.entries(byDay).map(([date, value]) => ({ date, revenue: value }))

      // aggregate totals and per-user performance
      const totals = (data || []).reduce(
        (acc: any, r: any) => {
          acc.total += Number(r.amount || 0)
          acc.count += 1
          const src = r.source || 'other'
          acc.breakdown[src] = (acc.breakdown[src] || 0) + Number(r.amount || 0)
          acc.users.add(r.user_id)
          // per-user aggregation
          const uid = r.user_id || 'unknown'
          if (!acc.userMap[uid]) {
            acc.userMap[uid] = {
              user_id: uid,
              user_name: r.user_name || (r.user && r.user.name) || 'Unknown',
              company: r.company || (r.client && r.client.company) || undefined,
              total_revenue: 0,
              transaction_count: 0
            }
          }
          acc.userMap[uid].total_revenue += Number(r.amount || 0)
          acc.userMap[uid].transaction_count += 1
          return acc
        },
        { total: 0, count: 0, breakdown: {} as Record<string, number>, users: new Set<string>(), userMap: {} as Record<string, any> }
      )

      const overall_metrics: RevenueSummaryOverallMetrics = {
        total_revenue: totals.total,
        transaction_count: totals.count,
        sales_revenue: totals.breakdown['sales'] || 0,
        commission_revenue: totals.breakdown['commission'] || 0,
        bonus_revenue: totals.breakdown['bonus'] || 0,
        project_revenue: totals.breakdown['project'] || 0,
        unique_users: totals.users.size,
        average_deal_size: totals.count ? totals.total / totals.count : 0
      }

      // alias expected by some legacy components
      ;(overall_metrics as any).total_transactions = overall_metrics.transaction_count

      // prepare user_performance array compatible with legacy UIs (user_id, user_name, company, total_revenue, transaction_count, average_deal_size)
      const user_performance = Object.values(totals.userMap || {}).map((u: any) => ({
        user_id: u.user_id,
        user_name: u.user_name,
        company: u.company,
        total_revenue: u.total_revenue,
        transaction_count: u.transaction_count,
        average_deal_size: u.transaction_count ? u.total_revenue / u.transaction_count : 0
      })).sort((a: any, b: any) => (b.total_revenue || 0) - (a.total_revenue || 0))

      // minimal period_data for legacy chart components
      const period_data = series.map((s) => ({ period: s.date, revenue: s.revenue }))

      return { series, overall_metrics, period_data, user_performance } as LegacyRevenueAnalytics
  },

  async createRevenue(payload: Partial<RevenueRecord> & Record<string, any>) {
    // Normalize legacy UI fields (revenue_amount -> amount, revenue_source -> source)
    const normalized: any = { ...payload }
    if ('revenue_amount' in payload) normalized.amount = Number(payload.revenue_amount)
    if ('revenue_source' in payload) normalized.source = payload.revenue_source
    if ('transaction_date' in payload) normalized.created_at = payload.transaction_date
    if ('user_id' in payload) normalized.user_id = payload.user_id
    const { data, error } = await supabase.from('revenues').insert(normalized).select().single()
    if (error) throw error
    return data as RevenueRecord
  },

  // Backwards-compatible alias used by existing components
  async addRevenue(payload: Partial<RevenueRecord> & Record<string, any>) {
    return await RevenueService.createRevenue(payload)
  },

  async updateRevenue(id: string, payload: Partial<RevenueRecord> & Record<string, any>) {
    if (!id) throw new Error('id is required')
    const normalized: any = { ...payload }
    if ('revenue_amount' in payload) normalized.amount = Number(payload.revenue_amount)
    const { data, error } = await supabase.from('revenues').update(normalized).eq('id', id).select().single()
    if (error) throw error
    return data as RevenueRecord
  },

  async deleteRevenue(id: string) {
    if (!id) throw new Error('id is required')
    const { error } = await supabase.from('revenues').delete().eq('id', id)
    if (error) throw error
    return true
  }
}

export default RevenueService
