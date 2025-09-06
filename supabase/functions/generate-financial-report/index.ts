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
            report_type,
            start_date,
            end_date,
            include_charts = false,
            format = 'json'
        } = await req.json();

        if (!report_type) {
            throw new Error('Report type is required');
        }

        if (!start_date || !end_date) {
            throw new Error('Start date and end date are required');
        }

        const validReportTypes = ['financial_summary', 'invoice_report', 'expense_report', 'tax_report', 'client_report'];
        if (!validReportTypes.includes(report_type)) {
            throw new Error('Invalid report type');
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

        // Generate report based on type
        let reportData = {};

        switch (report_type) {
            case 'financial_summary':
                reportData = await generateFinancialSummaryReport(userId, start_date, end_date, supabaseUrl, serviceRoleKey);
                break;
            case 'invoice_report':
                reportData = await generateInvoiceReport(userId, start_date, end_date, supabaseUrl, serviceRoleKey);
                break;
            case 'expense_report':
                reportData = await generateExpenseReport(userId, start_date, end_date, supabaseUrl, serviceRoleKey);
                break;
            case 'tax_report':
                reportData = await generateTaxReport(userId, start_date, end_date, supabaseUrl, serviceRoleKey);
                break;
            case 'client_report':
                reportData = await generateClientReport(userId, start_date, end_date, supabaseUrl, serviceRoleKey);
                break;
        }

        // Add metadata to report
        const fullReport = {
            report_metadata: {
                type: report_type,
                period: {
                    start_date,
                    end_date
                },
                generated_at: new Date().toISOString(),
                generated_by: userId,
                format,
                include_charts
            },
            data: reportData
        };

        // Log report generation activity
        await fetch(`${supabaseUrl}/rest/v1/activities`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: userId,
                action: 'report_generated',
                details: {
                    report_type,
                    start_date,
                    end_date,
                    format
                },
                created_at: new Date().toISOString()
            })
        });

        return new Response(JSON.stringify({
            data: fullReport
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Generate financial report error:', error);

        const errorResponse = {
            error: {
                code: 'REPORT_GENERATION_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

// Report generation functions
async function generateFinancialSummaryReport(userId, startDate, endDate, supabaseUrl, serviceRoleKey) {
    const [invoicesResponse, expensesResponse] = await Promise.all([
        fetch(`${supabaseUrl}/rest/v1/invoices?user_id=eq.${userId}&created_at=gte.${startDate}&created_at=lte.${endDate}`, {
            headers: { 'Authorization': `Bearer ${serviceRoleKey}`, 'apikey': serviceRoleKey }
        }),
        fetch(`${supabaseUrl}/rest/v1/expenses?user_id=eq.${userId}&date=gte.${startDate}&date=lte.${endDate}`, {
            headers: { 'Authorization': `Bearer ${serviceRoleKey}`, 'apikey': serviceRoleKey }
        })
    ]);

    const invoices = invoicesResponse.ok ? await invoicesResponse.json() : [];
    const expenses = expensesResponse.ok ? await expensesResponse.json() : [];

    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const netIncome = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

    return {
        summary: {
            total_revenue: totalRevenue,
            total_expenses: totalExpenses,
            net_income: netIncome,
            profit_margin: profitMargin
        },
        invoices_summary: {
            count: invoices.length,
            paid: invoices.filter(inv => inv.status === 'paid').length,
            pending: invoices.filter(inv => inv.status === 'pending').length,
            overdue: invoices.filter(inv => inv.status === 'overdue').length
        },
        expenses_summary: {
            count: expenses.length,
            by_category: groupBy(expenses, 'category')
        }
    };
}

async function generateInvoiceReport(userId, startDate, endDate, supabaseUrl, serviceRoleKey) {
    const invoicesResponse = await fetch(
        `${supabaseUrl}/rest/v1/invoices?user_id=eq.${userId}&created_at=gte.${startDate}&created_at=lte.${endDate}&order=created_at.desc`,
        {
            headers: { 'Authorization': `Bearer ${serviceRoleKey}`, 'apikey': serviceRoleKey }
        }
    );

    const invoices = invoicesResponse.ok ? await invoicesResponse.json() : [];

    return {
        invoices,
        summary: {
            total_count: invoices.length,
            total_amount: invoices.reduce((sum, inv) => sum + inv.total_amount, 0),
            average_amount: invoices.length > 0 ? invoices.reduce((sum, inv) => sum + inv.total_amount, 0) / invoices.length : 0,
            status_breakdown: {
                paid: invoices.filter(inv => inv.status === 'paid').length,
                pending: invoices.filter(inv => inv.status === 'pending').length,
                overdue: invoices.filter(inv => inv.status === 'overdue').length
            }
        }
    };
}

async function generateExpenseReport(userId, startDate, endDate, supabaseUrl, serviceRoleKey) {
    const expensesResponse = await fetch(
        `${supabaseUrl}/rest/v1/expenses?user_id=eq.${userId}&date=gte.${startDate}&date=lte.${endDate}&order=date.desc`,
        {
            headers: { 'Authorization': `Bearer ${serviceRoleKey}`, 'apikey': serviceRoleKey }
        }
    );

    const expenses = expensesResponse.ok ? await expensesResponse.json() : [];
    const categoryBreakdown = groupBy(expenses, 'category');

    return {
        expenses,
        summary: {
            total_count: expenses.length,
            total_amount: expenses.reduce((sum, exp) => sum + exp.amount, 0),
            average_amount: expenses.length > 0 ? expenses.reduce((sum, exp) => sum + exp.amount, 0) / expenses.length : 0,
            category_breakdown: Object.entries(categoryBreakdown).map(([category, items]) => ({
                category,
                count: items.length,
                total: items.reduce((sum, item) => sum + item.amount, 0)
            }))
        }
    };
}

async function generateTaxReport(userId, startDate, endDate, supabaseUrl, serviceRoleKey) {
    const [invoicesResponse, expensesResponse] = await Promise.all([
        fetch(`${supabaseUrl}/rest/v1/invoices?user_id=eq.${userId}&created_at=gte.${startDate}&created_at=lte.${endDate}`, {
            headers: { 'Authorization': `Bearer ${serviceRoleKey}`, 'apikey': serviceRoleKey }
        }),
        fetch(`${supabaseUrl}/rest/v1/expenses?user_id=eq.${userId}&date=gte.${startDate}&date=lte.${endDate}`, {
            headers: { 'Authorization': `Bearer ${serviceRoleKey}`, 'apikey': serviceRoleKey }
        })
    ]);

    const invoices = invoicesResponse.ok ? await invoicesResponse.json() : [];
    const expenses = expensesResponse.ok ? await expensesResponse.json() : [];

    const totalTaxCollected = invoices.reduce((sum, inv) => sum + (inv.tax_amount || 0), 0);
    const deductibleExpenses = expenses.filter(exp => !exp.is_personal);
    const totalDeductions = deductibleExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    return {
        tax_summary: {
            total_income: invoices.reduce((sum, inv) => sum + inv.total_amount, 0),
            total_tax_collected: totalTaxCollected,
            total_deductions: totalDeductions,
            deductible_expenses: deductibleExpenses,
            taxable_income: Math.max(0, invoices.reduce((sum, inv) => sum + inv.total_amount, 0) - totalDeductions)
        }
    };
}

async function generateClientReport(userId, startDate, endDate, supabaseUrl, serviceRoleKey) {
    const invoicesResponse = await fetch(
        `${supabaseUrl}/rest/v1/invoices?user_id=eq.${userId}&created_at=gte.${startDate}&created_at=lte.${endDate}`,
        {
            headers: { 'Authorization': `Bearer ${serviceRoleKey}`, 'apikey': serviceRoleKey }
        }
    );

    const invoices = invoicesResponse.ok ? await invoicesResponse.json() : [];
    const clientSummary = groupBy(invoices, 'client_name');

    const clientData = Object.entries(clientSummary).map(([clientName, clientInvoices]) => ({
        client_name: clientName,
        total_invoices: clientInvoices.length,
        total_amount: clientInvoices.reduce((sum, inv) => sum + inv.total_amount, 0),
        paid_invoices: clientInvoices.filter(inv => inv.status === 'paid').length,
        pending_invoices: clientInvoices.filter(inv => inv.status === 'pending').length,
        overdue_invoices: clientInvoices.filter(inv => inv.status === 'overdue').length
    }));

    return {
        client_summary: clientData.sort((a, b) => b.total_amount - a.total_amount),
        top_clients: clientData.slice(0, 10),
        total_clients: clientData.length
    };
}

// Utility function
function groupBy(array, key) {
    return array.reduce((groups, item) => {
        const group = item[key] || 'Uncategorized';
        if (!groups[group]) {
            groups[group] = [];
        }
        groups[group].push(item);
        return groups;
    }, {});
}