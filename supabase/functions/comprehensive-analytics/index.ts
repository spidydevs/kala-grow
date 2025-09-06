import { getCorsHeaders } from '../_shared/cors.ts';

declare const Deno: any;

// Environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Simple Supabase client using native fetch
function createSupabaseClient() {
  
  async function query(sql: string, params: any[] = []) {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/execute_sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey!,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: sql, params })
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`SQL query failed: ${error}`)
    }
    
    return await response.json()
  }

  async function select(table: string, options: any = {}) {
    let url = `${supabaseUrl}/rest/v1/${table}`
    const params = new URLSearchParams()
    
    if (options.select) params.append('select', options.select)
    if (options.eq) {
      Object.entries(options.eq).forEach(([key, value]) => {
        params.append(key, `eq.${value}`)
      })
    }
    if (options.gte) {
      Object.entries(options.gte).forEach(([key, value]) => {
        params.append(key, `gte.${value}`)
      })
    }
    if (options.lte) {
      Object.entries(options.lte).forEach(([key, value]) => {
        params.append(key, `lte.${value}`)
      })
    }
    if (options.order) params.append('order', options.order)
    if (options.limit) params.append('limit', options.limit.toString())
    
    if (params.toString()) {
      url += '?' + params.toString()
    }
    
    const response = await fetch(url, {
      headers: {
        'apikey': supabaseKey!,
        'Authorization': `Bearer ${supabaseKey}`
      }
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Query failed: ${error}`)
    }
    
    return await response.json()
  }
  
  return { query, select }
}

// Auth verification helper
async function verifyAuth(req: Request) {
  const authHeader = req.headers.get('Authorization')
  
  if (!authHeader) {
    return { success: false, error: 'Authorization header required' }
  }

  const token = authHeader.replace('Bearer ', '')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': serviceRoleKey!
      }
    })
    
    if (!response.ok) {
      return { success: false, error: 'Invalid authentication token' }
    }
    
    const user = await response.json()
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
    const authResult = await verifyAuth(req)
    
    if (!authResult.success) {
      return new Response(JSON.stringify({ error: authResult.error }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { user } = authResult
    const requestData = await req.json()
    const { action, params = {} } = requestData

    switch (action) {
      case 'get_comprehensive_analytics':
        return await getComprehensiveAnalytics(supabase, user, params)
      case 'get_task_analytics':
        return await getTaskAnalytics(supabase, user, params)
      case 'get_revenue_analytics':
        return await getRevenueAnalytics(supabase, user, params)
      case 'get_user_performance':
        return await getUserPerformance(supabase, user, params)
      case 'get_notification_analytics':
        return await getNotificationAnalytics(supabase, user, params)
      case 'get_real_time_dashboard':
        return await getRealTimeDashboard(supabase, user, params)
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
  } catch (error) {
    console.error('Comprehensive analytics error:', error)
    return new Response(JSON.stringify({ 
      error: {
        code: 'ANALYTICS_ERROR',
        message: error.message
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Get comprehensive analytics combining all data sources
async function getComprehensiveAnalytics(supabase: any, user: any, params: any) {
  const { start_date, end_date, include_charts = true } = params
  
  // Get user profile and role
  const profile = await supabase.select('profiles', {
    select: 'user_id, full_name, role, company, job_title',
    eq: { user_id: user.id }
  })
  
  const isAdmin = profile[0]?.role === 'admin'
  const targetUserId = isAdmin && params.user_id ? params.user_id : user.id
  
  // Calculate date range
  const endDate = end_date ? new Date(end_date) : new Date()
  const startDate = start_date ? new Date(start_date) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  
  const startDateStr = startDate.toISOString()
  const endDateStr = endDate.toISOString()
  
  try {
    // Get all data sources in parallel
    const [tasks, userStats, revenue, notifications, activities, achievements, clients, deals, invoices, payments] = await Promise.all([
      // Tasks data
      supabase.select('tasks', {
        select: '*',
        ...(isAdmin ? {} : { eq: { user_id: targetUserId } }),
        gte: { created_at: startDateStr }
      }).catch(() => []),
      
      // User stats
      supabase.select('user_stats', {
        select: '*',
        ...(isAdmin ? {} : { eq: { user_id: targetUserId } })
      }).catch(() => []),
      
      // Revenue data
      supabase.select('user_revenue', {
        select: '*',
        ...(isAdmin ? {} : { eq: { user_id: targetUserId } }),
        gte: { transaction_date: startDateStr }
      }).catch(() => []),
      
      // Notifications
      supabase.select('notifications', {
        select: '*',
        ...(isAdmin ? {} : { eq: { user_id: targetUserId } }),
        gte: { created_at: startDateStr }
      }).catch(() => []),
      
      // Activity feed
      supabase.select('activity_feed', {
        select: '*',
        ...(isAdmin ? {} : { eq: { user_id: targetUserId } }),
        gte: { created_at: startDateStr }
      }).catch(() => []),
      
      // Achievements
      supabase.select('user_achievements', {
        select: '*',
        ...(isAdmin ? {} : { eq: { user_id: targetUserId } })
      }).catch(() => []),
      
      // CRM data - Clients
      supabase.select('clients', {
        select: '*',
        gte: { created_at: startDateStr }
      }).catch(() => []),
      
      // CRM data - Deals
      supabase.select('deals', {
        select: '*',
        gte: { created_at: startDateStr }
      }).catch(() => []),
      
      // Finance data - Invoices
      supabase.select('invoices', {
        select: '*',
        gte: { created_at: startDateStr }
      }).catch(() => []),
      
      // Finance data - Payments
      supabase.select('client_payments', {
        select: '*',
        gte: { created_at: startDateStr }
      }).catch(() => [])
    ])
    
    // Calculate comprehensive metrics
    const analytics = {
      // Task Analytics
      tasks: {
        total: tasks.length,
        completed: tasks.filter(t => t.status === 'completed').length,
        in_progress: tasks.filter(t => t.status === 'in_progress').length,
        todo: tasks.filter(t => t.status === 'todo').length,
        completion_rate: tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100) : 0,
        total_points: tasks.reduce((sum, t) => sum + (t.points || 0), 0),
        average_completion_time: calculateAverageCompletionTime(tasks)
      },
      
      // Revenue Analytics (Enhanced with CRM/Finance data)
      revenue: {
        total: revenue.reduce((sum, r) => sum + (r.revenue_amount || 0), 0) + 
               deals.filter(d => d.stage === 'Closed Won').reduce((sum, d) => sum + (parseFloat(d.value) || 0), 0),
        sales: revenue.filter(r => r.revenue_type === 'sales').reduce((sum, r) => sum + r.revenue_amount, 0),
        commission: revenue.filter(r => r.revenue_type === 'commission').reduce((sum, r) => sum + r.revenue_amount, 0),
        bonus: revenue.filter(r => r.revenue_type === 'bonus').reduce((sum, r) => sum + r.revenue_amount, 0),
        project: revenue.filter(r => r.revenue_type === 'project').reduce((sum, r) => sum + r.revenue_amount, 0),
        transaction_count: revenue.length + payments.filter(p => p.payment_status === 'completed').length,
        average_deal_size: deals.length > 0 ? deals.reduce((sum, d) => sum + (parseFloat(d.value) || 0), 0) / deals.length : 0,
        crm_revenue: deals.filter(d => d.stage === 'Closed Won').reduce((sum, d) => sum + (parseFloat(d.value) || 0), 0),
        total_invoiced: invoices.reduce((sum, i) => sum + (parseFloat(i.total_amount) || 0), 0),
        total_paid: payments.filter(p => p.payment_status === 'completed').reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
      },
      
      // CRM Analytics
      crm: {
        total_clients: clients.length,
        total_deals: deals.length,
        won_deals: deals.filter(d => d.stage === 'Closed Won').length,
        lost_deals: deals.filter(d => d.stage === 'Closed Lost').length,
        active_deals: deals.filter(d => d.stage !== 'Closed Won' && d.stage !== 'Closed Lost').length,
        conversion_rate: deals.length > 0 ? Math.round((deals.filter(d => d.stage === 'Closed Won').length / deals.length) * 100) : 0,
        average_deal_value: deals.length > 0 ? deals.reduce((sum, d) => sum + (parseFloat(d.value) || 0), 0) / deals.length : 0,
        pipeline_value: deals.filter(d => d.stage !== 'Closed Won' && d.stage !== 'Closed Lost').reduce((sum, d) => sum + (parseFloat(d.value) || 0), 0)
      },
      
      // Finance Analytics  
      finance: {
        total_invoices: invoices.length,
        paid_invoices: invoices.filter(i => i.status === 'paid').length,
        pending_invoices: invoices.filter(i => i.status === 'pending').length,
        overdue_invoices: invoices.filter(i => i.status === 'overdue' || (i.due_date && new Date(i.due_date) < new Date())).length,
        total_invoice_amount: invoices.reduce((sum, i) => sum + (parseFloat(i.total_amount) || 0), 0),
        paid_amount: payments.filter(p => p.payment_status === 'completed').reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0),
        outstanding_amount: invoices.reduce((sum, i) => sum + (parseFloat(i.total_amount) || 0), 0) - 
                           payments.filter(p => p.payment_status === 'completed').reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0),
        payment_completion_rate: invoices.length > 0 ? Math.round((invoices.filter(i => i.status === 'paid').length / invoices.length) * 100) : 0
      },
      
      // User Performance
      performance: {
        total_points: userStats.reduce((sum, s) => sum + (s.total_points || 0), 0),
        productivity_score: calculateProductivityScore(tasks, userStats[0]),
        achievements_count: achievements.length,
        activity_score: calculateActivityScore(activities, tasks)
      },
      
      // Notification Analytics
      notifications: {
        total: notifications.length,
        read: notifications.filter(n => n.read_at).length,
        unread: notifications.filter(n => !n.read_at).length,
        engagement_rate: notifications.length > 0 ? Math.round((notifications.filter(n => n.read_at).length / notifications.length) * 100) : 0
      },
      
      // Time Analytics
      time: {
        active_days: calculateActiveDays(tasks, activities, startDate, endDate),
        most_productive_day: calculateMostProductiveDay(tasks),
        most_productive_hour: calculateMostProductiveHour(tasks)
      }
    }
    
    // Generate chart data if requested
    let charts = {}
    if (include_charts) {
      charts = {
        task_completion_trend: generateTaskCompletionChart(tasks, startDate, endDate),
        revenue_trend: generateRevenueChart(revenue, deals, payments, startDate, endDate),
        crm_pipeline_chart: generateCRMPipelineChart(deals),
        finance_overview_chart: generateFinanceChart(invoices, payments, startDate, endDate),
        productivity_overview: generateProductivityChart(tasks, activities, startDate, endDate),
        performance_metrics: generatePerformanceChart(tasks, userStats[0], achievements)
      }
    }
    
    // Generate insights
    const insights = generateInsights(analytics, isAdmin)
    
    return new Response(JSON.stringify({ 
      data: {
        analytics,
        charts,
        insights,
        period: {
          start_date: startDateStr,
          end_date: endDateStr,
          days: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        },
        user_info: {
          id: user.id,
          name: profile[0]?.full_name || 'Unknown User',
          role: profile[0]?.role || 'user',
          is_admin: isAdmin
        }
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    throw new Error(`Failed to get comprehensive analytics: ${error.message}`)
  }
}

// Get task-specific analytics
async function getTaskAnalytics(supabase: any, user: any, params: any) {
  // Implementation for detailed task analytics
  const analytics = await getComprehensiveAnalytics(supabase, user, params)
  const data = JSON.parse(await analytics.text())
  
  return new Response(JSON.stringify({ 
    data: {
      task_analytics: data.data.analytics.tasks,
      charts: { task_completion_trend: data.data.charts.task_completion_trend },
      insights: data.data.insights.filter((i: any) => i.category === 'tasks')
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

// Get revenue-specific analytics
async function getRevenueAnalytics(supabase: any, user: any, params: any) {
  const analytics = await getComprehensiveAnalytics(supabase, user, params)
  const data = JSON.parse(await analytics.text())
  
  return new Response(JSON.stringify({ 
    data: {
      revenue_analytics: data.data.analytics.revenue,
      crm_analytics: data.data.analytics.crm,
      finance_analytics: data.data.analytics.finance,
      charts: { 
        revenue_trend: data.data.charts.revenue_trend,
        crm_pipeline_chart: data.data.charts.crm_pipeline_chart,
        finance_overview_chart: data.data.charts.finance_overview_chart
      },
      insights: data.data.insights.filter((i: any) => ['revenue', 'crm', 'finance'].includes(i.category))
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

// Get user performance analytics
async function getUserPerformance(supabase: any, user: any, params: any) {
  const analytics = await getComprehensiveAnalytics(supabase, user, params)
  const data = JSON.parse(await analytics.text())
  
  return new Response(JSON.stringify({ 
    data: {
      performance: data.data.analytics.performance,
      charts: { performance_metrics: data.data.charts.performance_metrics },
      insights: data.data.insights.filter((i: any) => i.category === 'performance')
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

// Get notification analytics
async function getNotificationAnalytics(supabase: any, user: any, params: any) {
  const analytics = await getComprehensiveAnalytics(supabase, user, params)
  const data = JSON.parse(await analytics.text())
  
  return new Response(JSON.stringify({ 
    data: {
      notification_analytics: data.data.analytics.notifications,
      insights: data.data.insights.filter((i: any) => i.category === 'notifications')
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

// Get real-time dashboard data
async function getRealTimeDashboard(supabase: any, user: any, params: any) {
  return await getComprehensiveAnalytics(supabase, user, {
    ...params,
    start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Last 7 days
    include_charts: true
  })
}

// Helper functions
function calculateAverageCompletionTime(tasks: any[]) {
  const completedTasks = tasks.filter(t => t.status === 'completed' && t.completed_at && t.created_at)
  if (completedTasks.length === 0) return 0
  
  const totalTime = completedTasks.reduce((sum, task) => {
    const created = new Date(task.created_at).getTime()
    const completed = new Date(task.completed_at).getTime()
    return sum + (completed - created)
  }, 0)
  
  return Math.round(totalTime / completedTasks.length / (1000 * 60 * 60 * 24)) // Days
}

function calculateProductivityScore(tasks: any[], userStats: any) {
  const completionRate = tasks.length > 0 ? (tasks.filter(t => t.status === 'completed').length / tasks.length) * 100 : 0
  const pointsMultiplier = Math.min((userStats?.total_points || 0) / 1000, 1) * 100
  const activityMultiplier = Math.min(tasks.length / 10, 1) * 100
  
  return Math.round((completionRate * 0.5) + (pointsMultiplier * 0.3) + (activityMultiplier * 0.2))
}

function calculateActivityScore(activities: any[], tasks: any[]) {
  const recentActivities = activities.filter(a => {
    const activityDate = new Date(a.created_at)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    return activityDate >= weekAgo
  }).length
  
  const recentTasks = tasks.filter(t => {
    const taskDate = new Date(t.created_at)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    return taskDate >= weekAgo
  }).length
  
  return Math.min(recentActivities + recentTasks, 100)
}

function calculateActiveDays(tasks: any[], activities: any[], startDate: Date, endDate: Date) {
  const activeDates = new Set()
  
  tasks.forEach(task => {
    const taskDate = new Date(task.created_at)
    if (taskDate >= startDate && taskDate <= endDate) {
      activeDates.add(taskDate.toDateString())
    }
  })
  
  activities.forEach(activity => {
    const activityDate = new Date(activity.created_at)
    if (activityDate >= startDate && activityDate <= endDate) {
      activeDates.add(activityDate.toDateString())
    }
  })
  
  return activeDates.size
}

function calculateMostProductiveDay(tasks: any[]) {
  const dayCount = tasks.reduce((acc, task) => {
    const day = new Date(task.created_at).toLocaleDateString('en-US', { weekday: 'long' })
    acc[day] = (acc[day] || 0) + 1
    return acc
  }, {})
  
  return Object.keys(dayCount).reduce((a, b) => dayCount[a] > dayCount[b] ? a : b, 'Monday')
}

function calculateMostProductiveHour(tasks: any[]) {
  const hourCount = tasks.reduce((acc, task) => {
    const hour = new Date(task.created_at).getHours()
    acc[hour] = (acc[hour] || 0) + 1
    return acc
  }, {})
  
  return Object.keys(hourCount).reduce((a, b) => hourCount[a] > hourCount[b] ? a : b, '10')
}

function generateTaskCompletionChart(tasks: any[], startDate: Date, endDate: Date) {
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const data = []
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]
    
    const dayTasks = tasks.filter(t => t.created_at.startsWith(dateStr))
    const completedTasks = dayTasks.filter(t => t.status === 'completed').length
    
    data.push({
      date: dateStr,
      created: dayTasks.length,
      completed: completedTasks,
      completion_rate: dayTasks.length > 0 ? Math.round((completedTasks / dayTasks.length) * 100) : 0
    })
  }
  
  return data
}

function generateRevenueChart(revenue: any[], deals: any[], payments: any[], startDate: Date, endDate: Date) {
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const data = []
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]
    
    const dayRevenue = revenue.filter(r => r.transaction_date && r.transaction_date.startsWith(dateStr))
    const dayDeals = deals.filter(d => d.created_at.startsWith(dateStr) && d.stage === 'Closed Won')
    const dayPayments = payments.filter(p => p.created_at.startsWith(dateStr) && p.payment_status === 'completed')
    
    const totalRevenue = dayRevenue.reduce((sum, r) => sum + (r.revenue_amount || 0), 0) +
                        dayDeals.reduce((sum, d) => sum + (parseFloat(d.value) || 0), 0) +
                        dayPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
    
    data.push({
      date: dateStr,
      revenue: totalRevenue,
      transactions: dayRevenue.length + dayDeals.length + dayPayments.length
    })
  }
  
  return data
}

function generateCRMPipelineChart(deals: any[]) {
  const stageData = deals.reduce((acc, deal) => {
    const stage = deal.stage || 'Unknown'
    acc[stage] = (acc[stage] || 0) + (parseFloat(deal.value) || 0)
    return acc
  }, {})
  
  return Object.entries(stageData).map(([stage, value]) => ({
    stage,
    value,
    count: deals.filter(d => d.stage === stage).length
  }))
}

function generateFinanceChart(invoices: any[], payments: any[], startDate: Date, endDate: Date) {
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const data = []
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]
    
    const dayInvoices = invoices.filter(inv => inv.created_at.startsWith(dateStr))
    const dayPayments = payments.filter(p => p.created_at.startsWith(dateStr) && p.payment_status === 'completed')
    
    data.push({
      date: dateStr,
      invoiced: dayInvoices.reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0),
      paid: dayPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0),
      invoice_count: dayInvoices.length,
      payment_count: dayPayments.length
    })
  }
  
  return data
}

function generateProductivityChart(tasks: any[], activities: any[], startDate: Date, endDate: Date) {
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const data = []
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]
    
    const dayTasks = tasks.filter(t => t.created_at.startsWith(dateStr))
    const dayActivities = activities.filter(a => a.created_at.startsWith(dateStr))
    
    data.push({
      date: dateStr,
      tasks: dayTasks.length,
      activities: dayActivities.length,
      productivity_score: Math.min(dayTasks.length * 10 + dayActivities.length * 5, 100)
    })
  }
  
  return data
}

function generatePerformanceChart(tasks: any[], userStats: any, achievements: any[]) {
  return {
    completion_rate: tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100) : 0,
    total_points: userStats?.total_points || 0,
    achievements: achievements.length,
    productivity_score: calculateProductivityScore(tasks, userStats)
  }
}

function generateInsights(analytics: any, isAdmin: boolean) {
  const insights = []
  
  // Task insights
  if (analytics.tasks.completion_rate >= 80) {
    insights.push({
      category: 'tasks',
      type: 'success',
      title: 'Excellent Task Completion',
      description: `Outstanding ${analytics.tasks.completion_rate}% completion rate. Keep up the great work!`,
      priority: 'low'
    })
  } else if (analytics.tasks.completion_rate < 50) {
    insights.push({
      category: 'tasks',
      type: 'warning',
      title: 'Low Task Completion Rate',
      description: `Only ${analytics.tasks.completion_rate}% of tasks are completed. Consider focusing on fewer, high-priority tasks.`,
      priority: 'high'
    })
  }
  
  // CRM insights
  if (analytics.crm.conversion_rate >= 20) {
    insights.push({
      category: 'crm',
      type: 'success',
      title: 'Strong Deal Conversion',
      description: `Excellent ${analytics.crm.conversion_rate}% deal conversion rate. Your sales process is working well.`,
      priority: 'low'
    })
  } else if (analytics.crm.conversion_rate < 10) {
    insights.push({
      category: 'crm',
      type: 'warning',
      title: 'Low Deal Conversion Rate',
      description: `Only ${analytics.crm.conversion_rate}% of deals are being won. Consider reviewing your sales process.`,
      priority: 'high'
    })
  }
  
  // Finance insights
  if (analytics.finance.payment_completion_rate >= 90) {
    insights.push({
      category: 'finance',
      type: 'success',
      title: 'Excellent Payment Collection',
      description: `${analytics.finance.payment_completion_rate}% of invoices are paid. Great cash flow management!`,
      priority: 'low'
    })
  } else if (analytics.finance.outstanding_amount > analytics.finance.paid_amount) {
    insights.push({
      category: 'finance',
      type: 'warning',
      title: 'High Outstanding Amount',
      description: `You have $${analytics.finance.outstanding_amount.toLocaleString()} in outstanding payments. Consider following up on overdue invoices.`,
      priority: 'high'
    })
  }
  
  // Revenue insights
  if (analytics.revenue.total > 0) {
    insights.push({
      category: 'revenue',
      type: 'info',
      title: 'Revenue Performance',
      description: `Generated $${analytics.revenue.total.toLocaleString()} in total revenue with ${analytics.revenue.transaction_count} transactions.`,
      priority: 'medium'
    })
  }
  
  // Performance insights
  if (analytics.performance.productivity_score >= 80) {
    insights.push({
      category: 'performance',
      type: 'success',
      title: 'High Productivity Score',
      description: `Your productivity score of ${analytics.performance.productivity_score} shows excellent performance.`,
      priority: 'low'
    })
  }
  
  return insights
}
