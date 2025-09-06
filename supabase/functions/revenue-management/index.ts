/* eslint-disable */
/* @ts-nocheck */
// deno-lint-ignore-file
// This file is a Deno Supabase Edge Function — add file-level ignores so frontend TypeScript/ESLint won't report Deno/global issues.

/* CAVEAT:
   These ignores are intentional: the file runs on Deno (remote imports, Deno globals)
   and should be validated in the functions runtime. Keeping the code here prevents
   frontend build/lint noise. Consider placing functions in a separate package/tsconfig
   if you want stricter type-checking later.
*/

import { getCorsHeaders } from '../_shared/cors.ts';

declare const Deno: any;

// Environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Simple Supabase client using native fetch
function createSupabaseClient() {
  
  return {
    from: (table: string) => ({
      select: (columns: string = '*') => createQuery('GET', table, { select: columns }),
      insert: (data: any) => createQuery('POST', table, { data }),
      update: (data: any) => createQuery('PATCH', table, { data }),
      delete: () => createQuery('DELETE', table),
      upsert: (data: any) => createQuery('POST', table, { data, upsert: true })
    }),
    auth: {
      getUser: async (token: string) => {
        try {
          const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'apikey': supabaseKey!
            }
          })
          
          if (!response.ok) {
            return { data: { user: null }, error: { message: 'Invalid token' } }
          }
          
          const user = await response.json()
          return { data: { user }, error: null }
        } catch (error) {
          return { data: { user: null }, error: { message: error.message } }
        }
      }
    }
  }

  function createQuery(method: string, table: string, options: any = {}) {
    const queryBuilder: any = {
      eq: (column: string, value: any) => {
        queryBuilder.filters = queryBuilder.filters || []
        queryBuilder.filters.push(`${column}=eq.${value}`)
        return queryBuilder
      },
      gte: (column: string, value: any) => {
        queryBuilder.filters = queryBuilder.filters || []
        queryBuilder.filters.push(`${column}=gte.${value}`)
        return queryBuilder
      },
      lte: (column: string, value: any) => {
        queryBuilder.filters = queryBuilder.filters || []
        queryBuilder.filters.push(`${column}=lte.${value}`)
        return queryBuilder
      },
      ilike: (column: string, value: any) => {
        queryBuilder.filters = queryBuilder.filters || []
        queryBuilder.filters.push(`${column}=ilike.${value}`)
        return queryBuilder
      },
      order: (column: string, opts: any = {}) => {
        queryBuilder.orderBy = `${column}.${opts.ascending === false ? 'desc' : 'asc'}`
        return queryBuilder
      },
      range: (from: number, to: number) => {
        queryBuilder.rangeFrom = from
        queryBuilder.rangeTo = to
        return queryBuilder
      },
      select: (columns: string = '*') => {
        queryBuilder.selectColumns = columns
        return queryBuilder
      },
      single: () => {
        queryBuilder.single = true
        return queryBuilder
      }
    }
    
    // Add thenable behavior
    queryBuilder.then = async (
      resolve: (value: any) => void,
      reject?: (reason?: any) => void
    ) => {
      try {
        const result = await executeQuery(method, table, options, queryBuilder)
        resolve(result)
      } catch (err) {
        if (reject) {
          reject(err)
        } else {
          // propagate so callers without reject still see the error
          throw err
        }
      }
    }
    
    return queryBuilder
  }

  async function executeQuery(method: string, table: string, options: any, queryBuilder: any) {
    let url = `${supabaseUrl}/rest/v1/${table}`
    const headers: any = {
      'apikey': supabaseKey!,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    }
    
    // Add filters to URL
    if (queryBuilder.filters && queryBuilder.filters.length > 0) {
      url += '?' + queryBuilder.filters.join('&')
    }
    
    // Add select
    if (queryBuilder.selectColumns) {
      url += (url.includes('?') ? '&' : '?') + `select=${queryBuilder.selectColumns}`
    }
    
    // Add order
    if (queryBuilder.orderBy) {
      url += (url.includes('?') ? '&' : '?') + `order=${queryBuilder.orderBy}`
    }
    
    // Add range headers
    if (queryBuilder.rangeFrom !== undefined) {
      headers['Range'] = `${queryBuilder.rangeFrom}-${queryBuilder.rangeTo}`
    }
    
    const requestOptions: any = {
      method,
      headers
    }
    
    // Add body for POST/PATCH
    if (options.data && (method === 'POST' || method === 'PATCH')) {
      requestOptions.body = JSON.stringify(options.data)
    }
    
    try {
      const response = await fetch(url, requestOptions)
      
      if (!response.ok) {
        const errorText = await response.text()
        return { data: null, error: { message: errorText } }
      }
      
      const responseText = await response.text()
      const data = responseText ? JSON.parse(responseText) : null
      
      return {
        data: queryBuilder.single ? (Array.isArray(data) ? data[0] : data) : data,
        error: null,
        count: response.headers.get('content-range')?.split('/')[1] || null
      }
    } catch (error) {
      return { data: null, error: { message: error.message } }
    }
  }
}

// Auth verification helper
async function verifyAuth(req: Request, supabase: any) {
  const authHeader = req.headers.get('Authorization')
  
  if (!authHeader) {
    return { success: false, error: 'Authorization header required' }
  }

  const token = authHeader.replace('Bearer ', '')
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return { success: false, error: 'Invalid authentication token' }
    }
    
    return { success: true, user }
  } catch (error) {
    return { success: false, error: 'Authentication verification failed' }
  }
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const supabase = createSupabaseClient();
    const authResult = await verifyAuth(req, supabase)
    
    if (!authResult.success) {
      return new Response(JSON.stringify({ error: authResult.error }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { user } = authResult
    const requestData = await req.json()
    const { action } = requestData

    switch (action) {
      case 'get_revenue':
        return await getRevenue(supabase, user, requestData)
      case 'add_revenue':
        return await addRevenue(supabase, user, requestData)
      case 'update_revenue':
        return await updateRevenue(supabase, user, requestData)
      case 'delete_revenue':
        return await deleteRevenue(supabase, user, requestData)
      case 'get_revenue_summary':
        return await getRevenueSummary(supabase, user, requestData)
      case 'get_revenue_analytics':
        return await getRevenueAnalytics(supabase, user, requestData)
      case 'set_revenue_target':
        return await setRevenueTarget(supabase, user, requestData)
      case 'get_revenue_targets':
        return await getRevenueTargets(supabase, user, requestData)
      case 'bulk_import_revenue':
        return await bulkImportRevenue(supabase, user, requestData)
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
  } catch (error) {
    console.error('Revenue management error:', error)
    return new Response(JSON.stringify({ 
      error: {
        code: 'REVENUE_ERROR',
        message: error.message
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Get revenue data with filtering and pagination
async function getRevenue(supabase: any, user: any, data: any) {
  const { 
    user_id, 
    start_date, 
    end_date, 
    revenue_type, 
    revenue_source,
    limit = 50, 
    offset = 0 
  } = data

  // Check if user is admin or requesting own data
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'
  const targetUserId = user_id || user.id

  if (!isAdmin && targetUserId !== user.id) {
    return new Response(JSON.stringify({ error: 'Access denied' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  let query = supabase
    .from('user_revenue')
    .select(`
      *,
      client:clients(name, company),
      project:projects(name),
      created_by_user:profiles!user_revenue_created_by_fkey(full_name)
    `)
    .eq('user_id', targetUserId)
    .order('transaction_date', { ascending: false })
    .range(offset, offset + limit - 1)

  if (start_date) {
    query = query.gte('transaction_date', start_date)
  }
  if (end_date) {
    query = query.lte('transaction_date', end_date)
  }
  if (revenue_type) {
    query = query.eq('revenue_type', revenue_type)
  }
  if (revenue_source) {
    query = query.ilike('revenue_source', `%${revenue_source}%`)
  }

  const { data: revenue, error, count } = await query

  if (error) {
    throw new Error(`Failed to get revenue: ${error.message}`)
  }

  return new Response(JSON.stringify({ 
    data: {
      revenue,
      total_count: count,
      has_more: count > offset + limit
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

// Add new revenue entry
async function addRevenue(supabase: any, user: any, data: any) {
  const {
    user_id,
    revenue_amount,
    revenue_source,
    revenue_type,
    revenue_category,
    client_id,
    project_id,
    invoice_id,
    transaction_date,
    period_start,
    period_end,
    currency,
    description,
    notes
  } = data

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const { data: revenue, error } = await supabase
    .from('user_revenue')
    .insert({
      user_id,
      revenue_amount,
      revenue_source,
      revenue_type,
      revenue_category,
      client_id,
      project_id,
      invoice_id,
      transaction_date,
      period_start,
      period_end,
      currency: currency || 'USD',
      description,
      notes,
      created_by: user.id
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to add revenue: ${error.message}`)
  }

  return new Response(JSON.stringify({ data: revenue }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

// Update existing revenue entry
async function updateRevenue(supabase: any, user: any, data: any) {
  const { revenue_id, updates } = data

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const { data: revenue, error } = await supabase
    .from('user_revenue')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', revenue_id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update revenue: ${error.message}`)
  }

  return new Response(JSON.stringify({ data: revenue }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

// Delete revenue entry
async function deleteRevenue(supabase: any, user: any, data: any) {
  const { revenue_id } = data

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const { error } = await supabase
    .from('user_revenue')
    .delete()
    .eq('id', revenue_id)

  if (error) {
    throw new Error(`Failed to delete revenue: ${error.message}`)
  }

  return new Response(JSON.stringify({ data: { success: true } }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

// Get revenue summary and analytics
async function getRevenueSummary(supabase: any, user: any, data: any) {
  const { user_id, period = 'monthly', start_date, end_date } = data

  // Check permissions
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'
  const targetUserId = user_id || user.id

  if (!isAdmin && targetUserId !== user.id) {
    return new Response(JSON.stringify({ error: 'Access denied' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Get revenue summaries
  let summaryQuery = supabase
    .from('revenue_summaries')
    .select('*')
    .eq('user_id', targetUserId)
    .eq('summary_period', period)
    .order('period_start', { ascending: false })

  if (start_date) {
    summaryQuery = summaryQuery.gte('period_start', start_date)
  }
  if (end_date) {
    summaryQuery = summaryQuery.lte('period_end', end_date)
  }

  const { data: summaries, error: summaryError } = await summaryQuery

  if (summaryError) {
    throw new Error(`Failed to get revenue summaries: ${summaryError.message}`)
  }

  // Get overall totals
  let totalQuery = supabase
    .from('user_revenue')
    .select('revenue_amount, revenue_type')
    .eq('user_id', targetUserId)
    .eq('status', 'active')

  if (start_date) {
    totalQuery = totalQuery.gte('transaction_date', start_date)
  }
  if (end_date) {
    totalQuery = totalQuery.lte('transaction_date', end_date)
  }

  const { data: allRevenue, error: totalError } = await totalQuery

  if (totalError) {
    throw new Error(`Failed to get total revenue: ${totalError.message}`)
  }

  const totals = {
    total_revenue: allRevenue.reduce((sum, r) => sum + parseFloat(r.revenue_amount || 0), 0),
    sales_revenue: allRevenue.filter(r => r.revenue_type === 'sales').reduce((sum, r) => sum + parseFloat(r.revenue_amount || 0), 0),
    commission_revenue: allRevenue.filter(r => r.revenue_type === 'commission').reduce((sum, r) => sum + parseFloat(r.revenue_amount || 0), 0),
    bonus_revenue: allRevenue.filter(r => r.revenue_type === 'bonus').reduce((sum, r) => sum + parseFloat(r.revenue_amount || 0), 0),
    project_revenue: allRevenue.filter(r => r.revenue_type === 'project').reduce((sum, r) => sum + parseFloat(r.revenue_amount || 0), 0),
    transaction_count: allRevenue.length
  }

  return new Response(JSON.stringify({ 
    data: {
      summaries,
      totals,
      period
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

// Get detailed revenue analytics
async function getRevenueAnalytics(supabase: any, user: any, data: any) {
  const { user_id, period = 'monthly' } = data

  // Check permissions
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  if (!isAdmin) {
    return new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Get analytics data based on user_id or all users
  let baseQuery = supabase.from('user_revenue').select(`
    *,
    user_profile:profiles!user_revenue_user_id_fkey(full_name, company)
  `)

  if (user_id) {
    baseQuery = baseQuery.eq('user_id', user_id)
  }

  const { data: revenueData, error } = await baseQuery.eq('status', 'active')

  if (error) {
    throw new Error(`Failed to get analytics data: ${error.message}`)
  }

  // Process analytics
  const analytics = processRevenueAnalytics(revenueData, period)

  return new Response(JSON.stringify({ data: analytics }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

// Set revenue targets
async function setRevenueTarget(supabase: any, user: any, data: any) {
  const {
    user_id,
    target_amount,
    target_period,
    period_start,
    period_end,
    target_type
  } = data

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const { data: target, error } = await supabase
    .from('revenue_targets')
    .upsert({
      user_id,
      target_amount,
      target_period,
      period_start,
      period_end,
      target_type: target_type || 'total',
      created_by: user.id
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to set revenue target: ${error.message}`)
  }

  return new Response(JSON.stringify({ data: target }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

// Get revenue targets
async function getRevenueTargets(supabase: any, user: any, data: any) {
  const { user_id } = data

  // Check permissions
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'
  const targetUserId = user_id || user.id

  if (!isAdmin && targetUserId !== user.id) {
    return new Response(JSON.stringify({ error: 'Access denied' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const { data: targets, error } = await supabase
    .from('revenue_targets')
    .select(`
      *,
      user_profile:profiles!revenue_targets_user_id_fkey(full_name)
    `)
    .eq('user_id', targetUserId)
    .order('period_start', { ascending: false })

  if (error) {
    throw new Error(`Failed to get revenue targets: ${error.message}`)
  }

  return new Response(JSON.stringify({ data: targets }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

// Bulk import revenue data
async function bulkImportRevenue(supabase: any, user: any, data: any) {
  const { revenue_entries } = data

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // Validate and process entries
  const processedEntries = revenue_entries.map((entry: any) => ({
    ...entry,
    created_by: user.id,
    currency: entry.currency || 'USD',
    status: entry.status || 'active'
  }))

  const { data: insertedRevenue, error } = await supabase
    .from('user_revenue')
    .insert(processedEntries)
    .select()

  if (error) {
    throw new Error(`Failed to bulk import revenue: ${error.message}`)
  }

  return new Response(JSON.stringify({ 
    data: {
      imported_count: insertedRevenue.length,
      revenue_entries: insertedRevenue
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

// Helper function to process revenue analytics
function processRevenueAnalytics(revenueData: any[], period: string) {
  // Group data by period and calculate metrics
  const groupedData = new Map()
  const userPerformance = new Map()
  
  revenueData.forEach(revenue => {
    const periodKey = getPeriodKey(revenue.transaction_date, period)
    const userId = revenue.user_id
    const amount = parseFloat(revenue.revenue_amount || 0)
    
    // Group by period
    if (!groupedData.has(periodKey)) {
      groupedData.set(periodKey, {
        period: periodKey,
        total_revenue: 0,
        sales_revenue: 0,
        commission_revenue: 0,
        bonus_revenue: 0,
        project_revenue: 0,
        transaction_count: 0
      })
    }
    
    const periodData = groupedData.get(periodKey)
    periodData.total_revenue += amount
    periodData[`${revenue.revenue_type}_revenue`] += amount
    periodData.transaction_count += 1
    
    // Group by user
    if (!userPerformance.has(userId)) {
      userPerformance.set(userId, {
        user_id: userId,
        user_name: revenue.user_profile?.full_name || 'Unknown',
        company: revenue.user_profile?.company,
        total_revenue: 0,
        transaction_count: 0,
        average_deal_size: 0
      })
    }
    
    const userData = userPerformance.get(userId)
    userData.total_revenue += amount
    userData.transaction_count += 1
    userData.average_deal_size = userData.total_revenue / userData.transaction_count
  })
  
  return {
    period_data: Array.from(groupedData.values()).sort((a, b) => a.period.localeCompare(b.period)),
    user_performance: Array.from(userPerformance.values()).sort((a, b) => b.total_revenue - a.total_revenue),
    overall_metrics: {
      total_revenue: revenueData.reduce((sum, r) => sum + parseFloat(r.revenue_amount || 0), 0),
      total_transactions: revenueData.length,
      unique_users: new Set(revenueData.map(r => r.user_id)).size,
      average_deal_size: revenueData.length > 0 ? 
        revenueData.reduce((sum, r) => sum + parseFloat(r.revenue_amount || 0), 0) / revenueData.length : 0
    }
  }
}

// Helper function to get period key
function getPeriodKey(date: string, period: string): string {
  const d = new Date(date)
  
  switch (period) {
    case 'daily':
      return d.toISOString().split('T')[0]
    case 'weekly': {
      const startOfWeek = new Date(d)
      startOfWeek.setDate(d.getDate() - d.getDay())
      return startOfWeek.toISOString().split('T')[0]
    }
    case 'monthly':
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    case 'quarterly': {
      const quarter = Math.floor(d.getMonth() / 3) + 1
      return `${d.getFullYear()}-Q${quarter}`
    }
    case 'yearly':
      return d.getFullYear().toString()
    default:
      return d.toISOString().split('T')[0]
  }
}
