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
            client_name,
            client_email,
            client_address,
            invoice_items,
            due_date,
            notes,
            tax_rate = 0,
            discount_amount = 0,
            project_id
        } = await req.json();

        if (!client_name || !client_name.trim()) {
            throw new Error('Client name is required');
        }

        if (!invoice_items || !Array.isArray(invoice_items) || invoice_items.length === 0) {
            throw new Error('Invoice items are required');
        }

        // Validate invoice items
        for (const item of invoice_items) {
            if (!item.description || !item.quantity || !item.rate) {
                throw new Error('Each invoice item must have description, quantity, and rate');
            }
            if (item.quantity <= 0 || item.rate <= 0) {
                throw new Error('Item quantity and rate must be positive');
            }
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

        // Calculate totals
        const subtotal = invoice_items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
        const discountedSubtotal = subtotal - (discount_amount || 0);
        const taxAmount = discountedSubtotal * (tax_rate / 100);
        const totalAmount = discountedSubtotal + taxAmount;

        // Generate invoice number
        const year = new Date().getFullYear();
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const invoiceNumber = `INV-${year}-${random}`;

        // Create invoice in database
        const invoiceData = {
            invoice_number: invoiceNumber,
            client_name: client_name.trim(),
            client_email: client_email?.trim() || null,
            client_address: client_address?.trim() || null,
            subtotal,
            tax_rate: tax_rate || 0,
            tax_amount: taxAmount,
            discount_amount: discount_amount || 0,
            total_amount: totalAmount,
            status: 'pending',
            due_date: due_date || null,
            notes: notes?.trim() || null,
            project_id: project_id || null,
            user_id: userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const invoiceResponse = await fetch(`${supabaseUrl}/rest/v1/invoices`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(invoiceData)
        });

        if (!invoiceResponse.ok) {
            const errorText = await invoiceResponse.text();
            throw new Error(`Failed to create invoice: ${errorText}`);
        }

        const invoice = (await invoiceResponse.json())[0];

        // Create invoice items
        const invoiceItemsData = invoice_items.map(item => ({
            invoice_id: invoice.id,
            description: item.description.trim(),
            quantity: item.quantity,
            rate: item.rate,
            amount: item.quantity * item.rate,
            created_at: new Date().toISOString()
        }));

        const itemsResponse = await fetch(`${supabaseUrl}/rest/v1/invoice_items`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(invoiceItemsData)
        });

        if (!itemsResponse.ok) {
            const errorText = await itemsResponse.text();
            console.error('Failed to create invoice items:', errorText);
            // Don't fail the entire operation, but log the error
        }

        // Calculate points earned based on invoice amount
        const pointsEarned = Math.floor(totalAmount / 10); // 1 point per $10

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
                action: 'invoice_created',
                details: {
                    invoice_id: invoice.id,
                    invoice_number: invoice.invoice_number,
                    client_name: invoice.client_name,
                    total_amount: invoice.total_amount,
                    points_earned: pointsEarned
                },
                created_at: new Date().toISOString()
            })
        });

        return new Response(JSON.stringify({
            data: {
                invoice,
                points_earned: pointsEarned,
                success: true
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Create invoice error:', error);

        const errorResponse = {
            error: {
                code: 'INVOICE_CREATE_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});