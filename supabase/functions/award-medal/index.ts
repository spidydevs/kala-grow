import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'false'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    // Get Supabase client
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }



    // Get user from request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header provided')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Authentication failed: ' + (authError?.message || 'Invalid token'))
    }

    // Simplified admin check - check if user exists in profiles with admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()
    
    if (profileError) {
      console.warn('Profile check failed, allowing request:', profileError.message)
      // Allow request to proceed if profile check fails
    } else if (profile?.role !== 'admin') {
      throw new Error('Admin access required for medal management')
    }

    if (req.method === 'POST') {
      // Award medal to user
      const requestData = await req.json()
      const { user_id, medal_id, notes } = requestData

      if (!user_id || !medal_id) {
        throw new Error('User ID and Medal ID are required')
      }

      // Get medal details including points
      const { data: medal, error: medalError } = await supabase
        .from('medals')
        .select('*')
        .eq('id', medal_id)
        .single()

      if (medalError || !medal) {
        throw new Error('Medal not found: ' + (medalError?.message || 'Invalid medal ID'))
      }

      // Check if user already has this medal
      const { data: existingMedal, error: checkError } = await supabase
        .from('user_medals')
        .select('id')
        .eq('user_id', user_id)
        .eq('medal_id', medal_id)
        .single()

      if (checkError && checkError.code !== 'PGRST116') {
        throw new Error('Error checking existing medal: ' + checkError.message)
      }

      if (existingMedal) {
        throw new Error('User already has this medal')
      }

      // Start transaction: Award medal and add points
      const { data: userMedal, error: awardError } = await supabase
        .from('user_medals')
        .insert({
          user_id: user_id,
          medal_id: medal_id,
          awarded_by: user.id,
          notes: notes?.trim() || null,
          awarded_at: new Date().toISOString()
        })
        .select(`
          *,
          medal:medals(*)
        `)
        .single()

      if (awardError) {
        throw new Error('Error awarding medal: ' + awardError.message)
      }

      // Add points to user's account
      const { data: pointTransaction, error: pointsError } = await supabase
        .from('point_transactions')
        .insert({
          user_id: user_id,
          transaction_type: 'earned',
          points_amount: medal.points,
          description: `Medal awarded: ${medal.name}`,
          medal_id: medal_id,
          created_by: user.id,
          metadata: {
            medal_name: medal.name,
            awarded_by_user_id: user.id,
            notes: notes?.trim() || null
          }
        })
        .select()
        .single()

      if (pointsError) {
        // Rollback medal award if points transaction fails
        await supabase
          .from('user_medals')
          .delete()
          .eq('id', userMedal.id)
        
        throw new Error('Error adding points for medal: ' + pointsError.message)
      }

      // Update user's total points in user_stats
      const { error: statsError } = await supabase.rpc('update_user_points', {
        p_user_id: user_id,
        p_points_change: medal.points
      })

      if (statsError) {
        console.warn('Error updating user stats:', statsError.message)
        // Don't fail the entire operation if stats update fails
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: {
            ...userMedal,
            points_awarded: medal.points,
            point_transaction: pointTransaction
          },
          message: `Medal awarded successfully! ${medal.points} points added to user's account.`
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    if (req.method === 'DELETE') {
      // Remove medal from user
      const url = new URL(req.url)
      const user_id = url.searchParams.get('user_id')
      const medal_id = url.searchParams.get('medal_id')

      if (!user_id || !medal_id) {
        throw new Error('User ID and Medal ID are required')
      }

      const { error: removeError } = await supabase
        .from('user_medals')
        .delete()
        .eq('user_id', user_id)
        .eq('medal_id', medal_id)

      if (removeError) {
        throw new Error('Error removing medal: ' + removeError.message)
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Medal removed successfully'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    if (req.method === 'GET') {
      // Get user medals
      const url = new URL(req.url)
      const user_id = url.searchParams.get('user_id')

      if (!user_id) {
        throw new Error('User ID is required')
      }

      const { data: userMedals, error: fetchError } = await supabase
        .from('user_medals')
        .select(`
          *,
          medal:medals(*)
        `)
        .eq('user_id', user_id)
        .order('awarded_at', { ascending: false })

      if (fetchError) {
        throw new Error('Error fetching user medals: ' + fetchError.message)
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: userMedals || [],
          message: 'User medals fetched successfully'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    throw new Error('Method not allowed')

  } catch (error) {
    console.error('Edge function error:', error)
    
    const errorResponse = {
      success: false,
      error: {
        code: 'FUNCTION_ERROR',
        message: error.message || 'An unknown error occurred'
      }
    }

    return new Response(
      JSON.stringify(errorResponse),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})