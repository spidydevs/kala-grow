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
        const { action, user_id, task_id, points, description } = await req.json();

        if (!action || !user_id) {
            throw new Error('Action and user_id are required');
        }

        // Get the service role key
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error('Supabase configuration missing');
        }

        // Get user from auth header
        const authHeader = req.headers.get('authorization');
        let currentUserId = null;
        
        if (authHeader) {
            const token = authHeader.replace('Bearer ', '');
            const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': serviceRoleKey
                }
            });
            
            if (userResponse.ok) {
                const userData = await userResponse.json();
                currentUserId = userData.id;
            }
        }

        let pointsAmount = 0;
        let transactionType = '';
        let transactionDescription = description || '';

        // Determine action type and points
        switch (action) {
            case 'AWARD_TASK_COMPLETION':
                pointsAmount = points || 10; // Default 10 points for task completion
                transactionType = 'earned';
                transactionDescription = transactionDescription || `Task completion points for task ${task_id}`;
                break;
                
            case 'DEDUCT_TASK_INCOMPLETION':
                pointsAmount = -(points || 10); // Deduct points when task moved from completed
                transactionType = 'deducted';
                transactionDescription = transactionDescription || `Points deducted for task incompletion ${task_id}`;
                break;
                
            case 'MANUAL_ADJUSTMENT':
                pointsAmount = points || 0;
                transactionType = pointsAmount >= 0 ? 'earned' : 'deducted';
                transactionDescription = transactionDescription || 'Manual point adjustment by admin';
                break;
                
            default:
                throw new Error('Invalid action type');
        }

        // Begin transaction by checking current points
        const currentPointsResponse = await fetch(
            `${supabaseUrl}/rest/v1/user_points?user_id=eq.${user_id}`,
            {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                }
            }
        );

        let userPoints;
        if (currentPointsResponse.ok) {
            const pointsData = await currentPointsResponse.json();
            userPoints = pointsData[0] || null;
        } else {
            const errorText = await currentPointsResponse.text();
            throw new Error(`Failed to fetch user points: ${errorText}`);
        }

        // Create user points record if it doesn't exist
        if (!userPoints) {
            const createPointsResponse = await fetch(`${supabaseUrl}/rest/v1/user_points`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({
                    user_id: user_id,
                    total_points: 0,
                    points_earned: 0,
                    points_spent: 0
                })
            });

            if (!createPointsResponse.ok) {
                const errorText = await createPointsResponse.text();
                throw new Error(`Failed to create user points record: ${errorText}`);
            }

            const newPoints = await createPointsResponse.json();
            userPoints = newPoints[0];
        }

        // Calculate new totals
        const newTotalPoints = userPoints.total_points + pointsAmount;
        const newPointsEarned = pointsAmount > 0 ? userPoints.points_earned + pointsAmount : userPoints.points_earned;
        const newPointsSpent = pointsAmount < 0 ? userPoints.points_spent + Math.abs(pointsAmount) : userPoints.points_spent;

        // Prevent negative points
        if (newTotalPoints < 0) {
            throw new Error('Cannot deduct points: would result in negative balance');
        }

        // Update user points
        const updatePointsResponse = await fetch(
            `${supabaseUrl}/rest/v1/user_points?user_id=eq.${user_id}`,
            {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({
                    total_points: newTotalPoints,
                    points_earned: newPointsEarned,
                    points_spent: newPointsSpent,
                    last_point_activity: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
            }
        );

        if (!updatePointsResponse.ok) {
            const errorText = await updatePointsResponse.text();
            throw new Error(`Failed to update user points: ${errorText}`);
        }

        const updatedPoints = await updatePointsResponse.json();

        // Create transaction record
        const transactionResponse = await fetch(`${supabaseUrl}/rest/v1/point_transactions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                user_id: user_id,
                task_id: task_id || null,
                transaction_type: transactionType,
                points_amount: pointsAmount,
                description: transactionDescription,
                created_by: currentUserId,
                metadata: {
                    action: action,
                    previous_total: userPoints.total_points,
                    new_total: newTotalPoints
                }
            })
        });

        if (!transactionResponse.ok) {
            const errorText = await transactionResponse.text();
            throw new Error(`Failed to create transaction record: ${errorText}`);
        }

        const transaction = await transactionResponse.json();

        const result = {
            data: {
                success: true,
                user_id: user_id,
                action: action,
                points_change: pointsAmount,
                new_total_points: newTotalPoints,
                transaction_id: transaction[0].id,
                user_points: updatedPoints[0]
            }
        };

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Points manager error:', error);

        const errorResponse = {
            error: {
                code: 'POINTS_MANAGEMENT_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});