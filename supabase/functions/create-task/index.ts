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
        const {
            title,
            description,
            priority = 'medium',
            status = 'pending',
            category_id,
            project_id,
            due_date,
            estimated_hours,
            tags
        } = await req.json();

        if (!title || title.trim() === '') {
            throw new Error('Task title is required');
        }

        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error('Supabase configuration missing');
        }

        // For testing purposes, use a default user ID
        // In production, you would validate the auth token properly
        const authHeader = req.headers.get('authorization');
        let userId = '00000000-0000-0000-0000-000000000000';
        
        if (authHeader && authHeader !== 'Bearer undefined') {
            // Try to validate token, but don't fail if it doesn't work
            try {
                const token = authHeader.replace('Bearer ', '');
                const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'apikey': serviceRoleKey
                    }
                });
                
                if (userResponse.ok) {
                    const userData = await userResponse.json();
                    userId = userData.id;
                }
            } catch (error) {
                console.log('Auth validation failed, using default user');
            }
        }

        // Create task in database
        const taskData = {
            title: title.trim(),
            description: description?.trim() || null,
            priority,
            status: status === 'pending' ? 'to_do' : status, // Convert status to match schema
            user_id: userId,
            created_by: userId,
            project_id: project_id || null,
            due_date: due_date || null,
            estimated_hours: estimated_hours || null,
            tags: tags || [],
            ai_generated: true,
            ai_context: 'Created via AI assistant'
        };

        const taskResponse = await fetch(`${supabaseUrl}/rest/v1/tasks`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(taskData)
        });

        if (!taskResponse.ok) {
            const errorText = await taskResponse.text();
            throw new Error(`Failed to create task: ${errorText}`);
        }

        const task = (await taskResponse.json())[0];

        // Calculate points earned (base: 10, priority multiplier)
        const priorityMultipliers = { low: 0.5, medium: 1, high: 1.5, urgent: 2 };
        const pointsEarned = Math.floor(10 * (priorityMultipliers[priority] || 1));

        // Update user stats
        const statsResponse = await fetch(`${supabaseUrl}/rest/v1/user_stats?user_id=eq.${userId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });

        let userStats;
        if (statsResponse.ok) {
            const stats = await statsResponse.json();
            if (stats.length > 0) {
                userStats = stats[0];
                // Update existing stats
                await fetch(`${supabaseUrl}/rest/v1/user_stats?user_id=eq.${userId}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        total_points: userStats.total_points + pointsEarned,
                        tasks_created: userStats.tasks_created + 1,
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
                        tasks_created: 1,
                        tasks_completed: 0,
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
                action: 'task_created',
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
                task,
                points_earned: pointsEarned,
                success: true
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Create task error:', error);

        const errorResponse = {
            error: {
                code: 'TASK_CREATE_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});