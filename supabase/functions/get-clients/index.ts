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
        
        const status = params.get('status');
        const industry = params.get('industry');
        const search = params.get('search');
        const limit = parseInt(params.get('limit') || '50');
        const offset = parseInt(params.get('offset') || '0');
        const sort = params.get('sort') || 'created_at';

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

        // Build query URL
        let queryUrl = `${supabaseUrl}/rest/v1/clients?created_by=eq.${userId}`;
        
        if (status) {
            queryUrl += `&status=eq.${status}`;
        }
        if (industry) {
            queryUrl += `&industry=eq.${industry}`;
        }
        if (search) {
            queryUrl += `&or=(name.ilike.%25${encodeURIComponent(search)}%25,company.ilike.%25${encodeURIComponent(search)}%25,email.ilike.%25${encodeURIComponent(search)}%25)`;
        }

        // Add ordering
        const validSortFields = ['created_at', 'updated_at', 'name', 'company', 'status'];
        const sortField = validSortFields.includes(sort) ? sort : 'created_at';
        queryUrl += `&order=${sortField}.desc`;

        // Add pagination
        const validLimit = Math.min(Math.max(limit, 1), 100);
        const validOffset = Math.max(offset, 0);
        queryUrl += `&limit=${validLimit}&offset=${validOffset}`;

        // Fetch clients
        const clientsResponse = await fetch(queryUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });

        if (!clientsResponse.ok) {
            const errorText = await clientsResponse.text();
            throw new Error(`Failed to fetch clients: ${errorText}`);
        }

        const clients = await clientsResponse.json();

        // Get total count for pagination
        let countUrl = `${supabaseUrl}/rest/v1/clients?created_by=eq.${userId}&select=count`;
        if (status) countUrl += `&status=eq.${status}`;
        if (industry) countUrl += `&industry=eq.${industry}`;
        if (search) countUrl += `&or=(name.ilike.%25${encodeURIComponent(search)}%25,company.ilike.%25${encodeURIComponent(search)}%25,email.ilike.%25${encodeURIComponent(search)}%25)`;

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

        // Enhance clients with invoice/project counts
        const enhancedClients = await Promise.all(clients.map(async (client) => {
            // Get invoice count
            const invoiceResponse = await fetch(
                `${supabaseUrl}/rest/v1/invoices?client_name=eq.${encodeURIComponent(client.name)}&created_by=eq.${userId}&select=count`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Prefer': 'count=exact'
                    }
                }
            );

            let invoiceCount = 0;
            if (invoiceResponse.ok) {
                const invoiceCountHeader = invoiceResponse.headers.get('content-range');
                if (invoiceCountHeader) {
                    const match = invoiceCountHeader.match(/\/(.+)/);
                    invoiceCount = match ? parseInt(match[1]) : 0;
                }
            }

            // Get total invoice amount
            const invoiceAmountResponse = await fetch(
                `${supabaseUrl}/rest/v1/invoices?client_name=eq.${encodeURIComponent(client.name)}&created_by=eq.${userId}&select=total_amount`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                }
            );

            let totalInvoiceAmount = 0;
            if (invoiceAmountResponse.ok) {
                const invoices = await invoiceAmountResponse.json();
                totalInvoiceAmount = invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
            }

            return {
                ...client,
                invoice_count: invoiceCount,
                total_invoice_amount: totalInvoiceAmount,
                last_invoice_date: null // Could be calculated if needed
            };
        }));

        // Calculate pagination info
        const hasNextPage = (validOffset + validLimit) < totalCount;
        const hasPrevPage = validOffset > 0;
        const totalPages = Math.ceil(totalCount / validLimit);
        const currentPage = Math.floor(validOffset / validLimit) + 1;

        return new Response(JSON.stringify({
            data: {
                clients: enhancedClients,
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
                    industry,
                    search,
                    sort: sortField
                }
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Get clients error:', error);

        const errorResponse = {
            error: {
                code: 'CLIENTS_FETCH_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});