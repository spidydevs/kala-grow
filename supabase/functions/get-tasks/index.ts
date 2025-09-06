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
        
        // Parse request parameters
        let requestParams = {};
        if (req.method === 'POST') {
            requestParams = await req.json();
        } else {
            const url = new URL(req.url);
            const params = url.searchParams;
            requestParams = {
                status: params.get('status'),
                priority: params.get('priority'),
                category_id: params.get('category_id'),
                project_id: params.get('project_id'),
                limit: parseInt(params.get('limit') || '50'),
                offset: parseInt(params.get('offset') || '0'),
                sort: params.get('sort') || 'created_at'
            };
        }
        
        const { status, priority, category_id, project_id, limit = 50, offset = 0, sort = 'created_at' } = requestParams;

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

        // Build query URL
        let queryUrl = `${supabaseUrl}/rest/v1/tasks?user_id=eq.${userId}`;
        
        if (status) {
            queryUrl += `&status=eq.${status}`;
        }
        if (priority) {
            queryUrl += `&priority=eq.${priority}`;
        }
        if (category_id) {
            queryUrl += `&category_id=eq.${category_id}`;
        }
        if (project_id) {
            queryUrl += `&project_id=eq.${project_id}`;
        }

        // Add ordering
        const validSortFields = ['created_at', 'updated_at', 'due_date', 'title', 'priority', 'status'];
        const sortField = validSortFields.includes(sort) ? sort : 'created_at';
        queryUrl += `&order=${sortField}.desc`;

        // Add pagination
        const validLimit = Math.min(Math.max(limit, 1), 100); // Between 1 and 100
        const validOffset = Math.max(offset, 0);
        queryUrl += `&limit=${validLimit}&offset=${validOffset}`;

        // Fetch tasks
        const tasksResponse = await fetch(queryUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });

        if (!tasksResponse.ok) {
            const errorText = await tasksResponse.text();
            throw new Error(`Failed to fetch tasks: ${errorText}`);
        }

        const tasks = await tasksResponse.json();

        // Get total count for pagination
        let countUrl = `${supabaseUrl}/rest/v1/tasks?user_id=eq.${userId}&select=count`;
        if (status) countUrl += `&status=eq.${status}`;
        if (priority) countUrl += `&priority=eq.${priority}`;
        if (category_id) countUrl += `&category_id=eq.${category_id}`;
        if (project_id) countUrl += `&project_id=eq.${project_id}`;

        const countResponse = await fetch(countUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Prefer': 'count=exact'
            }
        });

        let totalCount = 0;
        if (countResponse.ok) {
            const countHeader = countResponse.headers.get('content-range');
            if (countHeader) {
                const match = countHeader.match(/\/(.+)/);
                totalCount = match ? parseInt(match[1]) : 0;
            }
        }

        // Calculate pagination info
        const hasNextPage = (validOffset + validLimit) < totalCount;
        const hasPrevPage = validOffset > 0;
        const totalPages = Math.ceil(totalCount / validLimit);
        const currentPage = Math.floor(validOffset / validLimit) + 1;

        // Calculate task statistics
        const statsUrl = `${supabaseUrl}/rest/v1/tasks?user_id=eq.${userId}&select=status`;
        const statsResponse = await fetch(statsUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });

        const stats = {
            total: 0,
            pending: 0,
            in_progress: 0,
            completed: 0
        };

        if (statsResponse.ok) {
            const allTasks = await statsResponse.json();
            stats.total = allTasks.length;
            
            allTasks.forEach((task: any) => {
                switch (task.status) {
                    case 'todo':
                        stats.pending++;
                        break;
                    case 'in_progress':
                        stats.in_progress++;
                        break;
                    case 'completed':
                        stats.completed++;
                        break;
                    default:
                        stats.pending++;
                        break;
                }
            });
        }

        return new Response(JSON.stringify({
            data: {
                tasks,
                stats,
                pagination: {
                    total: totalCount,
                    limit: validLimit,
                    offset: validOffset,
                    hasNextPage,
                    hasPrevPage,
                    totalPages,
                    currentPage
                },
                filters: {
                    status,
                    priority,
                    category_id,
                    project_id,
                    sort: sortField
                }
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Get tasks error:', error);

        const errorResponse = {
            error: {
                code: 'TASKS_FETCH_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});