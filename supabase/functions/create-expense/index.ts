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
            description,
            amount,
            category,
            date,
            receipt_url,
            notes,
            project_id,
            is_billable = false,
            vendor,
            payment_method
        } = await req.json();

        if (!description || !description.trim()) {
            throw new Error('Expense description is required');
        }

        if (!amount || amount <= 0) {
            throw new Error('Valid expense amount is required');
        }

        if (!category || !category.trim()) {
            throw new Error('Expense category is required');
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

        // Create expense in database
        const expenseData = {
            description: description.trim(),
            amount: parseFloat(amount),
            category: category.trim(),
            date: date || new Date().toISOString().split('T')[0],
            receipt_url: receipt_url?.trim() || null,
            notes: notes?.trim() || null,
            project_id: project_id || null,
            is_billable: Boolean(is_billable),
            vendor: vendor?.trim() || null,
            payment_method: payment_method?.trim() || null,
            user_id: userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const expenseResponse = await fetch(`${supabaseUrl}/rest/v1/expenses`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(expenseData)
        });

        if (!expenseResponse.ok) {
            const errorText = await expenseResponse.text();
            throw new Error(`Failed to create expense: ${errorText}`);
        }

        const expense = (await expenseResponse.json())[0];

        // Calculate points earned (smaller amounts for expenses)
        const pointsEarned = Math.floor(amount / 50) + 5; // Base 5 points + 1 per $50

        // Get monthly category total for insights
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
        const monthlyResponse = await fetch(
            `${supabaseUrl}/rest/v1/expenses?user_id=eq.${userId}&category=eq.${category}&date=gte.${currentMonth}-01&date=lt.${currentMonth}-32`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            }
        );

        let monthlyTotal = amount;
        if (monthlyResponse.ok) {
            const monthlyExpenses = await monthlyResponse.json();
            monthlyTotal = monthlyExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        }

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
                action: 'expense_created',
                details: {
                    expense_id: expense.id,
                    description: expense.description,
                    amount: expense.amount,
                    category: expense.category,
                    points_earned: pointsEarned
                },
                created_at: new Date().toISOString()
            })
        });

        return new Response(JSON.stringify({
            data: {
                expense,
                points_earned: pointsEarned,
                monthly_category_total: monthlyTotal,
                success: true
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Create expense error:', error);

        const errorResponse = {
            error: {
                code: 'EXPENSE_CREATE_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});