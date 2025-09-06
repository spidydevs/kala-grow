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
        console.log('Public users function started');

        // Get environment variables

        if (!supabaseUrl || !supabaseAnonKey) {
            throw new Error('Missing Supabase environment variables');
        }

        console.log('Fetching public users...');

        // Use service key if available, otherwise anon key
        const authKey = supabaseServiceKey || supabaseAnonKey;
        
        // Fetch active users from profiles
        const response = await fetch(
            `${supabaseUrl}/rest/v1/profiles?select=user_id,full_name,role,job_title,company,status&status=eq.active&order=full_name.asc`,
            {
                headers: {
                    'Authorization': `Bearer ${authKey}`,
                    'apikey': authKey,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('Public users response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Public users fetch failed:', errorText);
            throw new Error(`Failed to fetch public users: ${response.status} - ${errorText}`);
        }

        const profiles = await response.json();
        console.log('Public users fetched:', profiles.length);

        // Transform to expected format
        const users = profiles.map((profile) => ({
            id: profile.user_id,
            user_id: profile.user_id,
            full_name: profile.full_name || 'Unknown User',
            role: profile.role || 'member',
            job_title: profile.job_title || '',
            company: profile.company || '',
            status: profile.status || 'active',
            email: `${(profile.full_name || 'user').toLowerCase().replace(/\s+/g, '.')}@company.com`
        }));

        const result = {
            success: true,
            users: users,
            total_count: users.length,
            admin_count: users.filter(u => u.role === 'admin').length,
            member_count: users.filter(u => u.role === 'member').length,
            active_count: users.length
        };

        console.log('Returning public users result with', users.length, 'users');

        return new Response(JSON.stringify({ data: result }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Public users error:', {
            message: error.message,
            stack: error.stack
        });

        const errorResponse = {
            success: false,
            error: {
                code: 'PUBLIC_USERS_ERROR',
                message: error.message || 'Failed to fetch users',
                details: error.stack
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});