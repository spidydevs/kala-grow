import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'false'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }


    // Get the authenticated user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Authorization header required')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      throw new Error('Authentication failed')
    }

    const userId = user.id
    const exportData: any = {
      export_info: {
        user_id: userId,
        export_date: new Date().toISOString(),
        format: 'json'
      },
      data: {}
    }

    // Export user profile and preferences
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    const { data: userPreferences } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)

    const { data: aiPreferences } = await supabase
      .from('user_ai_preferences')
      .select('*')
      .eq('user_id', userId)

    const { data: notificationPrefs } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', userId)

    exportData.data.profile = {
      profile,
      preferences: userPreferences,
      ai_preferences: aiPreferences,
      notification_preferences: notificationPrefs
    }

    // Export task data
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)

    const { data: timeEntries } = await supabase
      .from('time_entries')
      .select('*')
      .eq('user_id', userId)

    const { data: focusSessions } = await supabase
      .from('focus_sessions')
      .select('*')
      .eq('user_id', userId)

    const { data: taskAssignments } = await supabase
      .from('task_assignments')
      .select('*')
      .eq('assigned_to', userId)

    exportData.data.productivity = {
      tasks,
      time_entries: timeEntries,
      focus_sessions: focusSessions,
      task_assignments: taskAssignments
    }

    // Export financial data
    const { data: clients } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', userId)

    const { data: invoices } = await supabase
      .from('invoices')
      .select('*')
      .eq('user_id', userId)

    const { data: expenses } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', userId)

    const { data: deals } = await supabase
      .from('deals')
      .select('*')
      .eq('user_id', userId)

    const { data: userRevenue } = await supabase
      .from('user_revenue')
      .select('*')
      .eq('user_id', userId)

    const { data: revenueTargets } = await supabase
      .from('revenue_targets')
      .select('*')
      .eq('user_id', userId)

    exportData.data.financial = {
      clients,
      invoices,
      expenses,
      deals,
      revenue_data: userRevenue,
      revenue_targets: revenueTargets
    }

    // Export gamification data
    const { data: userPoints } = await supabase
      .from('user_points')
      .select('*')
      .eq('user_id', userId)

    const { data: pointTransactions } = await supabase
      .from('point_transactions')
      .select('*')
      .eq('user_id', userId)

    const { data: userMedals } = await supabase
      .from('user_medals')
      .select(`
        *,
        medals (
          id,
          name,
          description,
          icon,
          requirement_type,
          requirement_value
        )
      `)
      .eq('user_id', userId)

    const { data: userAchievements } = await supabase
      .from('user_achievements')
      .select(`
        *,
        achievements (
          id,
          name,
          description,
          icon,
          requirement_type,
          requirement_value
        )
      `)
      .eq('user_id', userId)

    exportData.data.gamification = {
      user_points: userPoints,
      point_transactions: pointTransactions,
      medals: userMedals,
      achievements: userAchievements
    }

    // Export activity and interaction data
    const { data: activityFeed } = await supabase
      .from('activity_feed')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100) // Limit to last 100 activities

    const { data: notifications } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50) // Limit to last 50 notifications

    const { data: userStats } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)

    exportData.data.activity = {
      activity_feed: activityFeed,
      notifications,
      user_stats: userStats
    }

    // Export projects if any
    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)

    if (projects && projects.length > 0) {
      exportData.data.projects = projects
    }

    // Export AI interaction history if any
    const { data: aiHistory } = await supabase
      .from('ai_task_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50) // Limit to last 50 AI interactions

    if (aiHistory && aiHistory.length > 0) {
      exportData.data.ai_interactions = aiHistory
    }

    // Create download link for the exported data
    const exportJson = JSON.stringify(exportData, null, 2)
    const filename = `kala-grow-data-export-${userId}-${new Date().toISOString().split('T')[0]}.json`
    
    // Return the data with appropriate headers for download
    return new Response(exportJson, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': exportJson.length.toString()
      }
    })

  } catch (error: any) {
    console.error('Data export error:', error)
    return new Response(
      JSON.stringify({
        error: {
          code: 'EXPORT_ERROR',
          message: error.message || 'Failed to export data'
        }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})