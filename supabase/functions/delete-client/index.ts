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
        const { client_id } = await req.json();

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

        // Get client details first to ensure user owns it
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

        const client = clients[0];

        // Check if client has associated invoices
        const invoicesResponse = await fetch(
            `${supabaseUrl}/rest/v1/invoices?client_name=eq.${encodeURIComponent(client.name)}&user_id=eq.${userId}&select=count`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Prefer': 'count=exact'
                }
            }
        );

        let hasInvoices = false;
        if (invoicesResponse.ok) {
            const countHeader = invoicesResponse.headers.get('content-range');
            if (countHeader) {
                const match = countHeader.match(/\/(.+)/);
                const invoiceCount = match ? parseInt(match[1]) : 0;
                hasInvoices = invoiceCount > 0;
            }
        }

        // Warn if client has invoices (optional: prevent deletion)
        if (hasInvoices) {
            // You could choose to prevent deletion or just warn
            console.warn(`Client ${client.name} has associated invoices but proceeding with deletion`);
        }

        // Delete the client
        const deleteResponse = await fetch(`${supabaseUrl}/rest/v1/clients?id=eq.${client_id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });

        if (!deleteResponse.ok) {
            const errorText = await deleteResponse.text();
            throw new Error(`Failed to delete client: ${errorText}`);
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
                action: 'client_deleted',
                details: {
                    client_id: client.id,
                    client_name: client.name,
                    company: client.company,
                    had_invoices: hasInvoices
                },
                created_at: new Date().toISOString()
            })
        });

        return new Response(JSON.stringify({
            data: {
                success: true,
                message: 'Client deleted successfully',
                had_invoices: hasInvoices
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Delete client error:', error);

        const errorResponse = {
            error: {
                code: 'CLIENT_DELETE_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});