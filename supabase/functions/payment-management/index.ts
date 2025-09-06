/* eslint-disable */
// deno-lint-ignore-file
// @ts-nocheck
import { getCorsHeaders } from '../_shared/cors.ts';

declare const Deno: any;

Deno.serve(async (req) => {
    const corsHeaders = getCorsHeaders(req.headers.get('origin'));

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        const requestData = await req.json();
        const { action } = requestData;

        if (!action) {
            throw new Error('Action is required');
        }

        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!serviceRoleKey) {
            throw new Error('Service role key not available');
        }

        // Initialize Supabase client
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        let result = {};

        switch (action) {
            case 'record_payment':
                const { paymentData } = requestData;
                if (!paymentData?.client_id || !paymentData?.amount) {
                    throw new Error('Client ID and amount are required');
                }

                try {
                    const newPayment = {
                        ...paymentData,
                        payment_status: paymentData.payment_status || 'completed',
                        payment_date: paymentData.payment_date || new Date().toISOString().split('T')[0],
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };

                    const { data: payment, error: paymentError } = await supabaseClient
                        .from('client_payments')
                        .insert(newPayment)
                        .select()
                        .single();

                    if (paymentError) throw paymentError;

                    // Update client revenue summary
                    await supabaseClient.rpc('update_client_revenue_summary', {
                        client_uuid: paymentData.client_id
                    });

                    result = {
                        success: true,
                        payment
                    };
                } catch (error) {
                    throw new Error(`Failed to record payment: ${error.message}`);
                }
                break;

            case 'update_payment_status':
                const { paymentId, status, notes } = requestData;
                if (!paymentId || !status) {
                    throw new Error('Payment ID and status are required');
                }

                try {
                    const updateData = {
                        payment_status: status,
                        updated_at: new Date().toISOString()
                    };

                    if (notes) {
                        updateData.notes = notes;
                    }

                    if (status === 'completed' && !paymentData?.payment_date) {
                        updateData.payment_date = new Date().toISOString().split('T')[0];
                    }

                    const { data: payment, error: updateError } = await supabaseClient
                        .from('client_payments')
                        .update(updateData)
                        .eq('id', paymentId)
                        .select(`
                            *,
                            clients!inner (
                                id
                            )
                        `)
                        .single();

                    if (updateError) throw updateError;

                    // Update client revenue summary
                    await supabaseClient.rpc('update_client_revenue_summary', {
                        client_uuid: payment.clients.id
                    });

                    result = {
                        success: true,
                        payment
                    };
                } catch (error) {
                    throw new Error(`Failed to update payment status: ${error.message}`);
                }
                break;

            case 'get_client_payments':
                const { clientId, limit = 50, offset = 0 } = requestData;
                if (!clientId) {
                    throw new Error('Client ID is required');
                }

                try {
                    const { data: payments, error: paymentsError } = await supabaseClient
                        .from('client_payments')
                        .select(`
                            *,
                            invoices (
                                invoice_number,
                                title
                            ),
                            deals (
                                title,
                                value
                            )
                        `)
                        .eq('client_id', clientId)
                        .order('created_at', { ascending: false })
                        .range(offset, offset + limit - 1);

                    if (paymentsError) throw paymentsError;

                    // Get total count
                    const { count, error: countError } = await supabaseClient
                        .from('client_payments')
                        .select('id', { count: 'exact' })
                        .eq('client_id', clientId);

                    result = {
                        success: true,
                        payments: payments || [],
                        total_count: count || 0
                    };
                } catch (error) {
                    throw new Error(`Failed to get client payments: ${error.message}`);
                }
                break;

            case 'get_pending_payments':
                const { limit: pendingLimit = 50, offset: pendingOffset = 0 } = requestData;

                try {
                    const { data: pendingPayments, error: pendingError } = await supabaseClient
                        .from('client_payments')
                        .select(`
                            *,
                            clients!inner (
                                name,
                                company,
                                email
                            ),
                            invoices (
                                invoice_number,
                                title,
                                due_date
                            )
                        `)
                        .in('payment_status', ['pending', 'processing'])
                        .order('created_at', { ascending: false })
                        .range(pendingOffset, pendingOffset + pendingLimit - 1);

                    if (pendingError) throw pendingError;

                    result = {
                        success: true,
                        payments: pendingPayments || []
                    };
                } catch (error) {
                    throw new Error(`Failed to get pending payments: ${error.message}`);
                }
                break;

            case 'reconcile_payment':
                const { paymentId: reconcileId, invoiceId, dealId } = requestData;
                if (!reconcileId) {
                    throw new Error('Payment ID is required');
                }

                try {
                    const updateData = {
                        updated_at: new Date().toISOString()
                    };

                    if (invoiceId) {
                        updateData.invoice_id = invoiceId;
                        
                        // Update invoice status to paid
                        await supabaseClient
                            .from('invoices')
                            .update({
                                status: 'paid',
                                paid_date: new Date().toISOString(),
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', invoiceId);
                    }

                    if (dealId) {
                        updateData.deal_id = dealId;
                    }

                    const { data: payment, error: reconcileError } = await supabaseClient
                        .from('client_payments')
                        .update(updateData)
                        .eq('id', reconcileId)
                        .select()
                        .single();

                    if (reconcileError) throw reconcileError;

                    result = {
                        success: true,
                        payment
                    };
                } catch (error) {
                    throw new Error(`Failed to reconcile payment: ${error.message}`);
                }
                break;

            case 'get_payment_analytics':
                try {
                    // Get payment status distribution
                    const { data: statusDistribution, error: statusError } = await supabaseClient
                        .from('client_payments')
                        .select('payment_status, amount');

                    if (statusError) throw statusError;

                    // Group by status
                    const statusSummary = (statusDistribution || []).reduce((acc, payment) => {
                        const status = payment.payment_status;
                        if (!acc[status]) {
                            acc[status] = { count: 0, total_amount: 0 };
                        }
                        acc[status].count += 1;
                        acc[status].total_amount += payment.amount;
                        return acc;
                    }, {});

                    // Get recent payment trends (last 12 months)
                    const { data: recentPayments, error: recentError } = await supabaseClient
                        .from('client_payments')
                        .select('amount, payment_date, payment_status')
                        .gte('payment_date', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
                        .eq('payment_status', 'completed');

                    let monthlyTrends = [];
                    if (!recentError && recentPayments) {
                        const monthlyData = recentPayments.reduce((acc, payment) => {
                            const month = payment.payment_date.substring(0, 7); // YYYY-MM
                            acc[month] = (acc[month] || 0) + payment.amount;
                            return acc;
                        }, {});

                        monthlyTrends = Object.entries(monthlyData).map(([month, amount]) => ({
                            month,
                            amount
                        })).sort((a, b) => a.month.localeCompare(b.month));
                    }

                    result = {
                        success: true,
                        status_summary: statusSummary,
                        monthly_trends: monthlyTrends
                    };
                } catch (error) {
                    throw new Error(`Failed to get payment analytics: ${error.message}`);
                }
                break;

            default:
                throw new Error(`Unsupported action: ${action}`);
        }

        return new Response(JSON.stringify({ data: result }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Payment management error:', error);

        const errorResponse = {
            success: false,
            error: {
                code: 'PAYMENT_MANAGEMENT_ERROR',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
