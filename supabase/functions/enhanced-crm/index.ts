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
            case 'get_pipeline_overview':
                try {
                    // Get pipeline stages
                    const { data: stages, error: stagesError } = await supabaseClient
                        .from('pipeline_stages')
                        .select('*')
                        .order('position');

                    if (stagesError) throw stagesError;

                    // Get deals with client information
                    const { data: deals, error: dealsError } = await supabaseClient
                        .from('deals')
                        .select(`
                            *,
                            clients!inner (
                                id,
                                name,
                                company,
                                email
                            )
                        `)
                        .order('created_at', { ascending: false });

                    if (dealsError) throw dealsError;

                    // Group deals by stage
                    const dealsByStage = stages.map(stage => ({
                        ...stage,
                        deals: deals.filter(deal => deal.stage === stage.name),
                        total_value: deals
                            .filter(deal => deal.stage === stage.name)
                            .reduce((sum, deal) => sum + (deal.value || 0), 0),
                        expected_revenue: deals
                            .filter(deal => deal.stage === stage.name)
                            .reduce((sum, deal) => sum + (deal.expected_revenue || 0), 0)
                    }));

                    // Calculate pipeline metrics
                    const totalDeals = deals.length;
                    const totalValue = deals.reduce((sum, deal) => sum + (deal.value || 0), 0);
                    const totalExpectedRevenue = deals.reduce((sum, deal) => sum + (deal.expected_revenue || 0), 0);
                    const wonDeals = deals.filter(deal => deal.stage === 'Closed Won').length;
                    const conversionRate = totalDeals > 0 ? (wonDeals / totalDeals) * 100 : 0;

                    result = {
                        success: true,
                        stages: dealsByStage,
                        metrics: {
                            total_deals: totalDeals,
                            total_value: totalValue,
                            total_expected_revenue: totalExpectedRevenue,
                            won_deals: wonDeals,
                            conversion_rate: conversionRate
                        }
                    };
                } catch (error) {
                    throw new Error(`Failed to get pipeline overview: ${error.message}`);
                }
                break;

            case 'create_deal':
                const { dealData } = requestData;
                if (!dealData?.title || !dealData?.client_id || !dealData?.value) {
                    throw new Error('Deal title, client ID, and value are required');
                }

                try {
                    // Get default stage
                    const { data: defaultStage } = await supabaseClient
                        .from('pipeline_stages')
                        .select('name')
                        .eq('position', 1)
                        .single();

                    const newDeal = {
                        ...dealData,
                        stage: dealData.stage || defaultStage?.name || 'New',
                        probability: dealData.probability || 50,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };

                    const { data: deal, error: dealError } = await supabaseClient
                        .from('deals')
                        .insert(newDeal)
                        .select()
                        .single();

                    if (dealError) throw dealError;

                    result = {
                        success: true,
                        deal
                    };
                } catch (error) {
                    throw new Error(`Failed to create deal: ${error.message}`);
                }
                break;

            case 'update_deal':
                const { dealId, updates } = requestData;
                if (!dealId) {
                    throw new Error('Deal ID is required');
                }

                try {
                    const updateData = {
                        ...updates,
                        updated_at: new Date().toISOString()
                    };

                    const { data: deal, error: updateError } = await supabaseClient
                        .from('deals')
                        .update(updateData)
                        .eq('id', dealId)
                        .select()
                        .single();

                    if (updateError) throw updateError;

                    result = {
                        success: true,
                        deal
                    };
                } catch (error) {
                    throw new Error(`Failed to update deal: ${error.message}`);
                }
                break;

            default:
                throw new Error(`Unsupported action: ${action}`);
        }

        return new Response(JSON.stringify({ data: result }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Enhanced CRM error:', error);

        const errorResponse = {
            success: false,
            error: {
                code: 'ENHANCED_CRM_ERROR',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
