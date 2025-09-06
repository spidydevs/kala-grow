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
            client_id,
            name,
            email,
            phone,
            company,
            address,
            website,
            industry,
            status,
            notes,
            tags
        } = await req.json();

        if (!client_id) {
            throw new Error('Client ID is required');
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

        // Verify client exists and user owns it
        const clientResponse = await fetch(`${supabaseUrl}/rest/v1/clients?id=eq.${client_id}&user_id=eq.${userId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });

        if (!clientResponse.ok) {
            throw new Error('Failed to fetch client');
        }

        const clients = await clientResponse.json();
        if (clients.length === 0) {
            throw new Error('Client not found or not authorized');
        }

        // Check for duplicate email if email is being updated
        if (email && email.trim() && email !== clients[0].email) {
            const duplicateResponse = await fetch(
                `${supabaseUrl}/rest/v1/clients?user_id=eq.${userId}&email=eq.${email.trim()}&id=neq.${client_id}`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                }
            );

            if (duplicateResponse.ok) {
                const duplicates = await duplicateResponse.json();
                if (duplicates.length > 0) {
                    throw new Error('A client with this email already exists');
                }
            }
        }

        // Build update object with only provided fields
        const updates = {
            updated_at: new Date().toISOString()
        };

        if (name !== undefined) updates.name = name.trim();
        if (email !== undefined) updates.email = email?.trim() || null;
        if (phone !== undefined) updates.phone = phone?.trim() || null;
        if (company !== undefined) updates.company = company?.trim() || null;
        if (address !== undefined) updates.address = address?.trim() || null;
        if (website !== undefined) updates.website = website?.trim() || null;
        if (industry !== undefined) updates.industry = industry?.trim() || null;
        if (status !== undefined) updates.status = status;
        if (notes !== undefined) updates.notes = notes?.trim() || null;
        if (tags !== undefined) updates.tags = tags || null;

        // Update client in database
        const updateResponse = await fetch(`${supabaseUrl}/rest/v1/clients?id=eq.${client_id}`, {
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
            throw new Error(`Failed to update client: ${errorText}`);
        }

        const updatedClient = (await updateResponse.json())[0];

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
                action: 'client_updated',
                details: {
                    client_id: updatedClient.id,
                    client_name: updatedClient.name,
                    company: updatedClient.company,
                    changes: Object.keys(updates).filter(k => k !== 'updated_at')
                },
                created_at: new Date().toISOString()
            })
        });

        return new Response(JSON.stringify({
            data: {
                client: updatedClient,
                success: true
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Update client error:', error);

        const errorResponse = {
            error: {
                code: 'CLIENT_UPDATE_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});