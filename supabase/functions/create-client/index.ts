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
            name,
            email,
            phone,
            company,
            address,
            website,
            industry,
            status = 'active',
            notes,
            tags
        } = await req.json();

        if (!name || name.trim() === '') {
            throw new Error('Client name is required');
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

        // Check for duplicate email if provided
        if (email && email.trim()) {
            const duplicateResponse = await fetch(`${supabaseUrl}/rest/v1/clients?user_id=eq.${userId}&email=eq.${email.trim()}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            });

            if (duplicateResponse.ok) {
                const duplicates = await duplicateResponse.json();
                if (duplicates.length > 0) {
                    throw new Error('A client with this email already exists');
                }
            }
        }

        // Create client in database
        const clientData = {
            name: name.trim(),
            email: email?.trim() || null,
            phone: phone?.trim() || null,
            company: company?.trim() || null,
            address: address?.trim() || null,
            website: website?.trim() || null,
            industry: industry?.trim() || null,
            status,
            notes: notes?.trim() || null,
            tags: tags || null,
            user_id: userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const clientResponse = await fetch(`${supabaseUrl}/rest/v1/clients`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(clientData)
        });

        if (!clientResponse.ok) {
            const errorText = await clientResponse.text();
            throw new Error(`Failed to create client: ${errorText}`);
        }

        const client = (await clientResponse.json())[0];

        // Calculate points earned
        const pointsEarned = 15; // Base points for adding a client

        // Update user stats
        const statsResponse = await fetch(`${supabaseUrl}/rest/v1/user_stats?user_id=eq.${userId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });

        if (statsResponse.ok) {
            const stats = await statsResponse.json();
            if (stats.length > 0) {
                const userStats = stats[0];
                await fetch(`${supabaseUrl}/rest/v1/user_stats?user_id=eq.${userId}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        total_points: userStats.total_points + pointsEarned,
                        updated_at: new Date().toISOString()
                    })
                });
            } else {
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
                        tasks_completed: 0,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                });
            }
        }

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
                action: 'client_created',
                details: {
                    client_id: client.id,
                    client_name: client.name,
                    company: client.company,
                    points_earned: pointsEarned
                },
                created_at: new Date().toISOString()
            })
        });

        return new Response(JSON.stringify({
            data: {
                client,
                points_earned: pointsEarned,
                success: true
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Create client error:', error);

        const errorResponse = {
            error: {
                code: 'CLIENT_CREATE_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});