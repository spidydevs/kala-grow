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
        const { permission, user_id } = await req.json();

        if (!permission) {
            throw new Error('Permission parameter is required');
        }

        // Get the service role key
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error('Supabase configuration missing');
        }

        let userId = user_id;

        // If user_id not provided, get from auth header
        if (!userId) {
            const authHeader = req.headers.get('authorization');
            if (!authHeader) {
                throw new Error('No authorization header or user_id provided');
            }

            const token = authHeader.replace('Bearer ', '');

            // Verify token and get user
            const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': serviceRoleKey
                }
            });

            if (!userResponse.ok) {
                throw new Error('Invalid token');
            }

            const userData = await userResponse.json();
            userId = userData.id;
        }

        // Get user role assignments with a simpler approach
        const roleAssignmentsResponse = await fetch(
            `${supabaseUrl}/rest/v1/user_role_assignments?user_id=eq.${userId}&is_active=eq.true`,
            {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!roleAssignmentsResponse.ok) {
            const errorText = await roleAssignmentsResponse.text();
            throw new Error(`Failed to fetch user role assignments: ${errorText}`);
        }

        const roleAssignments = await roleAssignmentsResponse.json();
        
        // Get role details for each assignment
        let hasPermission = false;
        let userRole = 'member'; // default
        
        for (const assignment of roleAssignments) {
            const roleResponse = await fetch(
                `${supabaseUrl}/rest/v1/user_roles?id=eq.${assignment.role_id}`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            if (roleResponse.ok) {
                const roles = await roleResponse.json();
                if (roles.length > 0) {
                    const role = roles[0];
                    const permissions = role.permissions || {};
                    if (permissions[permission] === true) {
                        hasPermission = true;
                        userRole = role.role_name;
                        break;
                    }
                    // Keep the highest privilege role
                    if (role.role_name === 'admin') {
                        userRole = 'admin';
                    }
                }
            }
        }

        const result = {
            data: {
                user_id: userId,
                has_permission: hasPermission,
                user_role: userRole,
                permission_checked: permission,
                role_assignments: roleAssignments.map(ra => ({
                    role_name: ra.user_roles?.role_name,
                    assigned_at: ra.assigned_at
                }))
            }
        };

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Role verification error:', error);

        const errorResponse = {
            error: {
                code: 'ROLE_VERIFICATION_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});