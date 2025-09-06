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
            task_id,
            title,
            description,
            priority,
            status,
            category_id,
            project_id,
            due_date,
            estimated_hours,
            tags
        } = await req.json();

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

        // Verify task exists and user owns it
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

        // Build update object with only provided fields
        const updates = {
            updated_at: new Date().toISOString()
        };

        if (title !== undefined) updates.title = title.trim();
        if (description !== undefined) updates.description = description?.trim() || null;
        if (priority !== undefined) updates.priority = priority;
        if (status !== undefined) {
            updates.status = status;
            if (status === 'completed' && tasks[0].status !== 'completed') {
                updates.completed_at = new Date().toISOString();
            }
        }
        if (category_id !== undefined) updates.category_id = category_id || null;
        if (project_id !== undefined) updates.project_id = project_id || null;
        if (due_date !== undefined) updates.due_date = due_date || null;
        if (estimated_hours !== undefined) updates.estimated_hours = estimated_hours || null;
        if (tags !== undefined) updates.tags = tags || null;

        // Update task in database
        const updateResponse = await fetch(`${supabaseUrl}/rest/v1/tasks?id=eq.${task_id}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(updates)
        });

        if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            throw new Error(`Failed to update task: ${errorText}`);
        }

        const updatedTask = (await updateResponse.json())[0];

        // Log activity
        await fetch(`${supabaseUrl}/rest/v1/activities`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: userId,
                action: 'task_updated',
                details: {
                    task_id: updatedTask.id,
                    task_title: updatedTask.title,
                    changes: Object.keys(updates).filter(k => k !== 'updated_at')
                },
                created_at: new Date().toISOString()
            })
        });

        return new Response(JSON.stringify({
            data: {
                task: updatedTask,
                success: true
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Update task error:', error);

        const errorResponse = {
            error: {
                code: 'TASK_UPDATE_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});