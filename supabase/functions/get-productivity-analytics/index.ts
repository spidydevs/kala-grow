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
        
        const startDate = params.get('start_date');
        const endDate = params.get('end_date');
        const includeCharts = params.get('include_charts') === 'true';

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

        // Calculate date range (default to last 30 days)
        let fromDate, toDate;
        if (startDate && endDate) {
            fromDate = startDate;
            toDate = endDate;
        } else {
            const now = new Date();
            toDate = now.toISOString().split('T')[0];
            fromDate = new Date(now.setDate(now.getDate() - 30)).toISOString().split('T')[0];
        }

        // Fetch all relevant data
        const [tasksResponse, activitiesResponse, userStatsResponse, timeEntriesResponse] = await Promise.all([
            // Tasks data
            fetch(`${supabaseUrl}/rest/v1/tasks?user_id=eq.${userId}&created_at=gte.${fromDate}&created_at=lte.${toDate}`, {
                headers: { 'Authorization': `Bearer ${serviceRoleKey}`, 'apikey': serviceRoleKey }
            }),
            // Activities data
            fetch(`${supabaseUrl}/rest/v1/activities?user_id=eq.${userId}&created_at=gte.${fromDate}&created_at=lte.${toDate}&order=created_at.desc`, {
                headers: { 'Authorization': `Bearer ${serviceRoleKey}`, 'apikey': serviceRoleKey }
            }),
            // User stats
            fetch(`${supabaseUrl}/rest/v1/user_stats?user_id=eq.${userId}`, {
                headers: { 'Authorization': `Bearer ${serviceRoleKey}`, 'apikey': serviceRoleKey }
            }),
            // Time tracking data
            fetch(`${supabaseUrl}/rest/v1/time_entries?user_id=eq.${userId}&start_time=gte.${fromDate}&start_time=lte.${toDate}`, {
                headers: { 'Authorization': `Bearer ${serviceRoleKey}`, 'apikey': serviceRoleKey }
            })
        ]);

        const tasks = tasksResponse.ok ? await tasksResponse.json() : [];
        const activities = activitiesResponse.ok ? await activitiesResponse.json() : [];
        const userStatsData = userStatsResponse.ok ? await userStatsResponse.json() : [];
        const timeEntries = timeEntriesResponse.ok ? await timeEntriesResponse.json() : [];
        
        const userStats = userStatsData.length > 0 ? userStatsData[0] : {
            total_points: 0,
            tasks_created: 0,
            tasks_completed: 0
        };

        // Calculate productivity metrics
        const completedTasks = tasks.filter(task => task.status === 'completed');
        const pendingTasks = tasks.filter(task => task.status === 'pending');
        const inProgressTasks = tasks.filter(task => task.status === 'in_progress');
        
        const completionRate = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;
        const averageTaskCompletionTime = calculateAverageCompletionTime(completedTasks);
        
        // Priority distribution
        const priorityDistribution = {
            urgent: tasks.filter(task => task.priority === 'urgent').length,
            high: tasks.filter(task => task.priority === 'high').length,
            medium: tasks.filter(task => task.priority === 'medium').length,
            low: tasks.filter(task => task.priority === 'low').length
        };

        // Daily productivity trend
        const dailyProductivity = calculateDailyProductivity(tasks, activities, fromDate, toDate);
        
        // Time tracking analysis
        const totalTimeTracked = timeEntries.reduce((sum, entry) => {
            if (entry.end_time) {
                const duration = new Date(entry.end_time) - new Date(entry.start_time);
                return sum + (duration / (1000 * 60 * 60)); // Convert to hours
            }
            return sum;
        }, 0);

        const averageDailyHours = totalTimeTracked / getDaysBetween(fromDate, toDate);
        
        // Focus sessions analysis
        const focusSessions = timeEntries.filter(entry => entry.is_focus_session);
        const totalFocusTime = focusSessions.reduce((sum, session) => {
            if (session.end_time) {
                const duration = new Date(session.end_time) - new Date(session.start_time);
                return sum + (duration / (1000 * 60 * 60));
            }
            return sum;
        }, 0);

        // Calculate productivity score
        const productivityScore = calculateProductivityScore({
            completionRate,
            totalPoints: userStats.total_points,
            tasksCompleted: completedTasks.length,
            focusTime: totalFocusTime,
            averageCompletionTime: averageTaskCompletionTime
        });

        // Activity pattern analysis
        const activityPatterns = analyzeActivityPatterns(activities);
        
        // Recent achievements and milestones
        const recentAchievements = activities
            .filter(activity => ['task_completed', 'invoice_created', 'report_generated'].includes(activity.action))
            .slice(0, 10)
            .map(activity => ({
                type: activity.action,
                description: formatActivityMessage(activity),
                date: activity.created_at,
                points: activity.details?.points_earned || 0
            }));

        const analytics = {
            period: {
                start_date: fromDate,
                end_date: toDate,
                days: getDaysBetween(fromDate, toDate)
            },
            overview: {
                productivity_score: productivityScore,
                total_points: userStats.total_points,
                level: calculateLevel(userStats.total_points),
                tasks_created: tasks.length,
                tasks_completed: completedTasks.length,
                completion_rate: completionRate,
                total_time_tracked: totalTimeTracked,
                average_daily_hours: averageDailyHours,
                total_focus_time: totalFocusTime
            },
            task_analytics: {
                total_tasks: tasks.length,
                completed: completedTasks.length,
                pending: pendingTasks.length,
                in_progress: inProgressTasks.length,
                average_completion_time_hours: averageTaskCompletionTime,
                priority_distribution: priorityDistribution
            },
            time_analytics: {
                total_hours: totalTimeTracked,
                average_daily_hours: averageDailyHours,
                focus_sessions_count: focusSessions.length,
                total_focus_hours: totalFocusTime,
                focus_percentage: totalTimeTracked > 0 ? (totalFocusTime / totalTimeTracked) * 100 : 0
            },
            trends: {
                daily_productivity: dailyProductivity,
                activity_patterns: activityPatterns
            },
            achievements: {
                recent_activities: recentAchievements,
                total_activities: activities.length
            },
            insights: generateProductivityInsights({
                completionRate,
                averageCompletionTime: averageTaskCompletionTime,
                focusTime: totalFocusTime,
                productivityScore,
                priorityDistribution
            })
        };

        return new Response(JSON.stringify({
            data: analytics
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Get productivity analytics error:', error);

        const errorResponse = {
            error: {
                code: 'PRODUCTIVITY_ANALYTICS_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

// Helper functions
function calculateAverageCompletionTime(completedTasks) {
    if (completedTasks.length === 0) return 0;
    
    const totalTime = completedTasks.reduce((sum, task) => {
        if (task.completed_at && task.created_at) {
            const completionTime = new Date(task.completed_at) - new Date(task.created_at);
            return sum + (completionTime / (1000 * 60 * 60)); // Convert to hours
        }
        return sum;
    }, 0);
    
    return totalTime / completedTasks.length;
}

function calculateDailyProductivity(tasks, activities, fromDate, toDate) {
    const days = getDaysBetween(fromDate, toDate);
    const dailyData = [];
    
    for (let i = 0; i < days; i++) {
        const date = new Date(fromDate);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayTasks = tasks.filter(task => task.created_at.startsWith(dateStr));
        const dayActivities = activities.filter(activity => activity.created_at.startsWith(dateStr));
        const completedTasks = dayTasks.filter(task => task.status === 'completed').length;
        
        dailyData.push({
            date: dateStr,
            tasks_created: dayTasks.length,
            tasks_completed: completedTasks,
            activities_count: dayActivities.length,
            productivity_score: dayTasks.length > 0 ? (completedTasks / dayTasks.length) * 100 : 0
        });
    }
    
    return dailyData;
}

function getDaysBetween(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
}

function calculateLevel(points) {
    if (points < 100) return 1;
    return Math.floor(Math.log2(points / 100) + 2);
}

function calculateProductivityScore(metrics) {
    let score = 0;
    
    // Completion rate (40% of score)
    score += (metrics.completionRate / 100) * 40;
    
    // Tasks completed (30% of score)
    score += Math.min(metrics.tasksCompleted / 10, 1) * 30;
    
    // Focus time (20% of score) 
    score += Math.min(metrics.focusTime / 20, 1) * 20;
    
    // Average completion time (10% of score - lower is better)
    const timeScore = metrics.averageCompletionTime > 0 ? Math.max(0, 1 - metrics.averageCompletionTime / 48) : 0;
    score += timeScore * 10;
    
    return Math.round(score);
}

function analyzeActivityPatterns(activities) {
    const hourlyDistribution = new Array(24).fill(0);
    const dailyDistribution = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    activities.forEach(activity => {
        const date = new Date(activity.created_at);
        const hour = date.getHours();
        const day = dayNames[date.getDay()];
        
        hourlyDistribution[hour]++;
        dailyDistribution[day]++;
    });
    
    return {
        hourly_distribution: hourlyDistribution,
        daily_distribution: dailyDistribution,
        peak_hour: hourlyDistribution.indexOf(Math.max(...hourlyDistribution)),
        most_active_day: Object.keys(dailyDistribution).reduce((a, b) => 
            dailyDistribution[a] > dailyDistribution[b] ? a : b
        )
    };
}

function generateProductivityInsights(metrics) {
    const insights = [];
    
    if (metrics.completionRate > 80) {
        insights.push({
            type: 'positive',
            message: 'Excellent task completion rate! You\'re consistently finishing what you start.'
        });
    } else if (metrics.completionRate < 50) {
        insights.push({
            type: 'improvement',
            message: 'Consider breaking down large tasks into smaller, manageable chunks to improve completion rate.'
        });
    }
    
    if (metrics.focusTime > 15) {
        insights.push({
            type: 'positive',
            message: 'Great focus time! Your deep work sessions are contributing to high productivity.'
        });
    } else if (metrics.focusTime < 5) {
        insights.push({
            type: 'improvement',
            message: 'Try scheduling dedicated focus blocks to increase your deep work time.'
        });
    }
    
    if (metrics.priorityDistribution.urgent > metrics.priorityDistribution.high + metrics.priorityDistribution.medium) {
        insights.push({
            type: 'warning',
            message: 'You have many urgent tasks. Consider better planning to avoid last-minute rushes.'
        });
    }
    
    if (metrics.productivityScore >= 80) {
        insights.push({
            type: 'achievement',
            message: 'Outstanding productivity score! You\'re operating at peak efficiency.'
        });
    }
    
    return insights;
}

function formatActivityMessage(activity) {
    switch (activity.action) {
        case 'task_completed':
            return `Completed: ${activity.details?.task_title}`;
        case 'invoice_created':
            return `Created invoice for ${activity.details?.client_name}`;
        case 'report_generated':
            return `Generated ${activity.details?.report_type} report`;
        default:
            return `Performed ${activity.action.replace('_', ' ')}`;
    }
}