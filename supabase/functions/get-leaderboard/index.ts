Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'false'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        const url = new URL(req.url);
        const params = url.searchParams;
        
        const timeframe = params.get('timeframe') || 'month';
        const limit = parseInt(params.get('limit') || '10');

        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error('Supabase configuration missing');
        }

        // Get user from auth header
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            throw new Error('Authorization header required');
        }

        const token = authHeader.replace('Bearer ', '');
        const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': serviceRoleKey
            }
        });

        if (!userResponse.ok) {
            throw new Error('Invalid authentication token');
        }

        const userData = await userResponse.json();
        const userId = userData.id;

        // Calculate date range for leaderboard period
        let dateFilter = '';
        const now = new Date();
        let fromDate;

        switch (timeframe) {
            case 'week':
                fromDate = new Date(now.setDate(now.getDate() - 7)).toISOString();
                break;
            case 'quarter':
                fromDate = new Date(now.setMonth(now.getMonth() - 3)).toISOString();
                break;
            case 'year':
                fromDate = new Date(now.setFullYear(now.getFullYear() - 1)).toISOString();
                break;
            case 'all':
                fromDate = '2020-01-01T00:00:00.000Z'; // All time
                break;
            default: // month
                fromDate = new Date(now.setMonth(now.getMonth() - 1)).toISOString();
        }

        if (timeframe !== 'all') {
            dateFilter = `&updated_at=gte.${fromDate}`;
        }

        // Get user stats for leaderboard from user_points instead of user_stats
        const statsResponse = await fetch(
            `${supabaseUrl}/rest/v1/user_points?select=*,profiles!user_id(full_name,avatar_url)${dateFilter}&order=total_points.desc&limit=${limit}`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            }
        );

        let leaderboard = [];
        let currentUserRank = null;
        let currentUserStats = null;

        if (statsResponse.ok) {
            const stats = await statsResponse.json();
            
            leaderboard = stats.map((stat, index) => ({
                rank: index + 1,
                user_id: stat.user_id,
                name: stat.profiles?.full_name || 'Anonymous User',
                avatar_url: stat.profiles?.avatar_url || null,
                total_points: stat.total_points || 0,
                tasks_completed: 0, // Will get from separate query if needed
                tasks_created: 0, // Will get from separate query if needed
                level: calculateLevel(stat.total_points || 0),
                completion_rate: 0, // Will calculate if needed
                updated_at: stat.updated_at
            }));

            // Find current user's position
            const userIndex = stats.findIndex(stat => stat.user_id === userId);
            if (userIndex !== -1) {
                currentUserRank = userIndex + 1;
                currentUserStats = leaderboard[userIndex];
            }
        }

        // If current user is not in top results, get their stats separately
        if (!currentUserStats) {
            const userStatsResponse = await fetch(
                `${supabaseUrl}/rest/v1/user_points?user_id=eq.${userId}&select=*,profiles!user_id(full_name,avatar_url)`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                }
            );

            if (userStatsResponse.ok) {
                const userStats = await userStatsResponse.json();
                if (userStats.length > 0) {
                    const stat = userStats[0];
                    currentUserStats = {
                        rank: 'N/A', // Will calculate below
                        user_id: stat.user_id,
                        name: stat.profiles?.full_name || 'Anonymous User',
                        avatar_url: stat.profiles?.avatar_url || null,
                        total_points: stat.total_points || 0,
                        tasks_completed: 0, // Will get from separate query if needed
                        tasks_created: 0, // Will get from separate query if needed
                        level: calculateLevel(stat.total_points || 0),
                        completion_rate: 0, // Will calculate if needed
                        updated_at: stat.updated_at
                    };

                    // Get user's actual rank
                    const rankResponse = await fetch(
                        `${supabaseUrl}/rest/v1/user_points?select=user_id,total_points&total_points=gt.${stat.total_points}${dateFilter}`,
                        {
                            method: 'GET',
                            headers: {
                                'Authorization': `Bearer ${serviceRoleKey}`,
                                'apikey': serviceRoleKey
                            }
                        }
                    );

                    if (rankResponse.ok) {
                        const higherRankedUsers = await rankResponse.json();
                        currentUserRank = higherRankedUsers.length + 1;
                        currentUserStats.rank = currentUserRank;
                    }
                }
            }
        }

        // Get recent achievements (last 7 days)
        const recentDate = new Date();
        recentDate.setDate(recentDate.getDate() - 7);
        const recentActivitiesResponse = await fetch(
            `${supabaseUrl}/rest/v1/activities?user_id=eq.${userId}&created_at=gte.${recentDate.toISOString()}&action=in.(task_completed,invoice_created)&order=created_at.desc&limit=10`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            }
        );

        let recentAchievements = [];
        if (recentActivitiesResponse.ok) {
            const activities = await recentActivitiesResponse.json();
            recentAchievements = activities.map(activity => ({
                type: activity.action,
                description: formatActivityMessage(activity),
                points: activity.details?.points_earned || 0,
                date: activity.created_at
            }));
        }

        const result = {
            timeframe,
            leaderboard,
            current_user: currentUserStats,
            current_user_rank: currentUserRank,
            recent_achievements: recentAchievements,
            total_participants: leaderboard.length,
            generated_at: new Date().toISOString()
        };

        return new Response(JSON.stringify({
            data: result
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Get leaderboard error:', error);

        const errorResponse = {
            error: {
                code: 'LEADERBOARD_FETCH_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

// Helper functions
function calculateLevel(points) {
    if (points < 100) return 1;
    return Math.floor(Math.log2(points / 100) + 2);
}

function formatActivityMessage(activity) {
    switch (activity.action) {
        case 'task_completed':
            return `Completed: ${activity.details?.task_title}`;
        case 'invoice_created':
            return `Created invoice for ${activity.details?.client_name}`;
        default:
            return `Performed ${activity.action.replace('_', ' ')}`;
    }
}