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
        const { task_id } = await req.json();

        if (!task_id) {
            throw new Error('Task ID is required');
        }

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

        // Get task details first
        const taskResponse = await fetch(`${supabaseUrl}/rest/v1/tasks?id=eq.${task_id}&user_id=eq.${userId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });

        if (!taskResponse.ok) {
            throw new Error('Failed to fetch task');
        }

        const tasks = await taskResponse.json();
        if (tasks.length === 0) {
            throw new Error('Task not found or not authorized');
        }

        const task = tasks[0];
        if (task.status === 'completed') {
            throw new Error('Task is already completed');
        }

        // Update task status to completed
        const updateResponse = await fetch(`${supabaseUrl}/rest/v1/tasks?id=eq.${task_id}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                status: 'completed',
                completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
        });

        if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            throw new Error(`Failed to complete task: ${errorText}`);
        }

        const updatedTask = (await updateResponse.json())[0];

        // Calculate completion points (base: 25, priority multiplier)
        const priorityMultipliers = { low: 0.8, medium: 1, high: 1.5, urgent: 2.5 };
        const basePoints = task.estimated_hours ? Math.min(task.estimated_hours * 5, 50) : 25;
        const pointsEarned = Math.floor(basePoints * (priorityMultipliers[task.priority] || 1));

        // Update user stats
        const statsResponse = await fetch(`${supabaseUrl}/rest/v1/user_stats?user_id=eq.${userId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });

        const achievements = [];
        if (statsResponse.ok) {
            const stats = await statsResponse.json();
            if (stats.length > 0) {
                const userStats = stats[0];
                const newTaskCount = userStats.tasks_completed + 1;
                const newTotalPoints = userStats.total_points + pointsEarned;

                // Check for achievements
                if (newTaskCount === 10) achievements.push('First 10 Tasks Completed');
                if (newTaskCount === 50) achievements.push('Task Master');
                if (newTaskCount === 100) achievements.push('Productivity Expert');
                if (newTotalPoints >= 1000 && userStats.total_points < 1000) achievements.push('Point Millionaire');

                // Update stats
                await fetch(`${supabaseUrl}/rest/v1/user_stats?user_id=eq.${userId}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        total_points: newTotalPoints,
                        tasks_completed: newTaskCount,
                        updated_at: new Date().toISOString()
                    })
                });
            } else {
                // Create new stats
                await fetch(`${supabaseUrl}/rest/v1/user_stats`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        user_id: userId,
                        total_points: pointsEarned,
                        tasks_created: 0,
                        tasks_completed: 1,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                });
            }
        }

        // Log activity
        await fetch(`${supabaseUrl}/rest/v1/activity_feed`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: userId,
                action: 'task_completed',
                details: {
                    task_id: task.id,
                    task_title: task.title,
                    points_earned: pointsEarned,
                    priority: task.priority
                },
                created_at: new Date().toISOString()
            })
        });

        return new Response(JSON.stringify({
            data: {
                task: updatedTask,
                points_earned: pointsEarned,
                achievements,
                success: true
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Complete task error:', error);

        const errorResponse = {
            error: {
                code: 'TASK_COMPLETE_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});