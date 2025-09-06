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
        
        const period = params.get('period') || 'month';
        const startDate = params.get('start_date');
        const endDate = params.get('end_date');

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

        // Calculate date range based on period
        let dateFilter = '';
        const now = new Date();
        let fromDate, toDate;

        if (startDate && endDate) {
            fromDate = startDate;
            toDate = endDate;
        } else {
            switch (period) {
                case 'week':
                    fromDate = new Date(now.setDate(now.getDate() - 7)).toISOString().split('T')[0];
                    toDate = new Date().toISOString().split('T')[0];
                    break;
                case 'quarter':
                    fromDate = new Date(now.setMonth(now.getMonth() - 3)).toISOString().split('T')[0];
                    toDate = new Date().toISOString().split('T')[0];
                    break;
                case 'year':
                    fromDate = new Date(now.setFullYear(now.getFullYear() - 1)).toISOString().split('T')[0];
                    toDate = new Date().toISOString().split('T')[0];
                    break;
                default: // month
                    fromDate = new Date(now.setMonth(now.getMonth() - 1)).toISOString().split('T')[0];
                    toDate = new Date().toISOString().split('T')[0];
            }
        }

        dateFilter = `&created_at=gte.${fromDate}&created_at=lte.${toDate}`;

        // Fetch invoices summary
        const invoicesResponse = await fetch(
            `${supabaseUrl}/rest/v1/invoices?user_id=eq.${userId}${dateFilter}`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            }
        );

        let invoiceData = { total: 0, count: 0, pending: 0, paid: 0, overdue: 0 };
        if (invoicesResponse.ok) {
            const invoices = await invoicesResponse.json();
            invoiceData = {
                total: invoices.reduce((sum, inv) => sum + inv.total_amount, 0),
                count: invoices.length,
                pending: invoices.filter(inv => inv.status === 'pending').length,
                paid: invoices.filter(inv => inv.status === 'paid').length,
                overdue: invoices.filter(inv => inv.status === 'overdue').length
            };
        }

        // Fetch expenses summary (using date field for expenses)
        const expensesResponse = await fetch(
            `${supabaseUrl}/rest/v1/expenses?user_id=eq.${userId}&date=gte.${fromDate}&date=lte.${toDate}`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            }
        );

        let expenseData = { total: 0, count: 0, categories: {} };
        if (expensesResponse.ok) {
            const expenses = await expensesResponse.json();
            const categorySummary = {};
            expenses.forEach(exp => {
                if (!categorySummary[exp.category]) {
                    categorySummary[exp.category] = { total: 0, count: 0 };
                }
                categorySummary[exp.category].total += exp.amount;
                categorySummary[exp.category].count += 1;
            });

            expenseData = {
                total: expenses.reduce((sum, exp) => sum + exp.amount, 0),
                count: expenses.length,
                categories: categorySummary
            };
        }

        // Calculate profit/loss
        const netIncome = invoiceData.total - expenseData.total;
        const profitMargin = invoiceData.total > 0 ? (netIncome / invoiceData.total) * 100 : 0;

        // Get recent transactions (last 10)
        const recentInvoicesResponse = await fetch(
            `${supabaseUrl}/rest/v1/invoices?user_id=eq.${userId}&order=created_at.desc&limit=5`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            }
        );

        const recentExpensesResponse = await fetch(
            `${supabaseUrl}/rest/v1/expenses?user_id=eq.${userId}&order=created_at.desc&limit=5`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            }
        );

        let recentTransactions = [];
        if (recentInvoicesResponse.ok) {
            const invoices = await recentInvoicesResponse.json();
            recentTransactions = [...recentTransactions, ...invoices.map(inv => ({
                type: 'invoice',
                id: inv.id,
                description: `Invoice for ${inv.client_name}`,
                amount: inv.total_amount,
                date: inv.created_at,
                status: inv.status
            }))];
        }

        if (recentExpensesResponse.ok) {
            const expenses = await recentExpensesResponse.json();
            recentTransactions = [...recentTransactions, ...expenses.map(exp => ({
                type: 'expense',
                id: exp.id,
                description: exp.description,
                amount: -exp.amount, // Negative for expenses
                date: exp.created_at,
                category: exp.category
            }))];
        }

        // Sort recent transactions by date
        recentTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        recentTransactions = recentTransactions.slice(0, 10);

        const summary = {
            period: {
                type: period,
                start_date: fromDate,
                end_date: toDate
            },
            revenue: {
                total: invoiceData.total,
                invoice_count: invoiceData.count,
                pending_invoices: invoiceData.pending,
                paid_invoices: invoiceData.paid,
                overdue_invoices: invoiceData.overdue
            },
            expenses: {
                total: expenseData.total,
                expense_count: expenseData.count,
                by_category: expenseData.categories
            },
            profitability: {
                net_income: netIncome,
                profit_margin: profitMargin,
                break_even: netIncome >= 0
            },
            recent_transactions: recentTransactions,
            generated_at: new Date().toISOString()
        };

        return new Response(JSON.stringify({
            data: summary
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Get financial summary error:', error);

        const errorResponse = {
            error: {
                code: 'FINANCIAL_SUMMARY_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});