// System prompts and function definitions for the enhanced AI assistant
const SYSTEM_PROMPT = `You are Kala, an intelligent AI assistant for a productivity platform called Kala Grow. You help users manage their tasks efficiently through natural conversation.

You have access to two main functions:
1. create_task - Create new tasks from user requests
2. get_tasks - Retrieve and filter existing tasks based on user queries

CORE CAPABILITIES:
- Understand natural language for task creation and querying
- Parse various date formats ("tomorrow", "Aug 16", "next Tuesday", "in 3 days")
- Extract multiple parameters from single commands
- Provide direct, action-oriented responses
- Minimize confirmation requests unless critical information is missing
- Support multi-user task assignments (admin only)
- Integrate with gamification points system
- Respect role-based access controls

DATE PARSING RULES:
- Convert all dates to YYYY-MM-DD format
- "today" = current date
- "tomorrow" = current date + 1 day
- "next Tuesday" = next occurrence of Tuesday
- "Aug 16", "16 Aug", "August 16" = 2025-08-16
- "in 3 days" = current date + 3 days

PRIORITY DETECTION:
- "urgent", "asap", "critical" = urgent (25 points)
- "important", "high priority" = high (20 points)
- "medium", "normal" = medium (15 points)
- "low", "minor", "when possible" = low (10 points)

ENTERPRISE FEATURES:
- Role-based task visibility (admin sees all, members see assigned)
- Points system for gamification
- Multi-user task assignments (admin only)
- Secure role verification

BE CONVERSATIONAL BUT EFFICIENT:
- Act directly when you have enough information
- Only ask for clarification if truly needed
- Provide helpful context in responses
- Use encouraging, productive language
- Mention points earned for task completion

CURRENT DATE: ${new Date().toISOString().split('T')[0]}`;

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
        const startTime = Date.now();
        const { prompt } = await req.json();

        if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
            throw new Error('Prompt is required for AI assistant');
        }

        // Get environment variables
        const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwdmRvY3Nlemt0Z2VzamxvdHp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyNTgwNDEsImV4cCI6MjA3MDgzNDA0MX0.hJjRWzG1J5qTZEKgQ1bO0X0xVt_76oCiOQ-dkerH5Os';

        if (!geminiApiKey || !serviceRoleKey) {
            throw new Error('Required environment variables not configured');
        }

        // Get user from auth header with fallback
        const authHeader = req.headers.get('authorization');
        let userId = null;
        let token = null;

        if (authHeader) {
            token = authHeader.replace('Bearer ', '');
            
            try {
                const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'apikey': anonKey
                    }
                });

                if (userResponse.ok) {
                    const userData = await userResponse.json();
                    userId = userData.id;
                } else if (token === anonKey) {
                    // Fallback for testing with anon key
                    userId = 'ec23b020-9ba0-4a94-a58f-0e9390be9cd6';
                }
            } catch (authError) {
                if (token === anonKey) {
                    userId = 'ec23b020-9ba0-4a94-a58f-0e9390be9cd6';
                } else {
                    throw new Error('Authentication failed');
                }
            }
        }

        if (!userId) {
            throw new Error('Unable to determine user ID');
        }

        // Check user role and permissions first
        let userRole = 'member'; // default
        let hasTaskAssignPermission = false;
        
        try {
            const roleCheckResponse = await fetch(`${supabaseUrl}/functions/v1/role-verification`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token || serviceRoleKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    permission: 'can_assign_tasks',
                    user_id: userId
                })
            });
            
            if (roleCheckResponse.ok) {
                const roleData = await roleCheckResponse.json();
                userRole = roleData.data.user_role || 'member';
                hasTaskAssignPermission = roleData.data.has_permission || false;
            }
        } catch (roleError) {
            console.warn('Role verification failed:', roleError);
        }

        // Enhanced AI prompt for Gemini with enterprise features
        const enhancedPrompt = `${SYSTEM_PROMPT}

User Request: "${prompt}"
User Role: ${userRole}
Can Assign Tasks: ${hasTaskAssignPermission}

Analyze the user's request and determine the appropriate action. Respond with a JSON object containing:

1. If the user wants to CREATE a task, respond with:
{
  "action": "CREATE_TASK",
  "function_call": {
    "name": "create_task",
    "arguments": {
      "title": "extracted title",
      "description": "optional description",
      "priority": "low|medium|high|urgent",
      "due_date": "YYYY-MM-DD format if mentioned",
      "estimated_hours": number_or_null,
      "tags": ["relevant", "tags"],
      "points": number_based_on_priority,
      "assigned_to": ["user_ids_if_mentioned_and_user_has_permission"]
    }
  },
  "message": "Confirmation message about task creation"
}

2. If the user wants to QUERY/FETCH tasks, respond with:
{
  "action": "FETCH_DATA",
  "function_call": {
    "name": "get_tasks",
    "arguments": {
      "status": "todo|in_progress|review|done (if mentioned)",
      "priority": "low|medium|high|urgent (if mentioned)",
      "due_date": "YYYY-MM-DD (if specific date mentioned)",
      "due_date_operator": "eq|lt|lte|gt|gte (based on context)",
      "limit": 10
    }
  },
  "message": "Message about what tasks are being retrieved with points context"
}

3. For general conversation, respond with:
{
  "action": "ANSWER_QUERY",
  "message": "Helpful response to the user"
}

Be intelligent about extracting information from natural language. Examples:
- "due tomorrow" = tomorrow's date in YYYY-MM-DD
- "high priority" = priority: "high"
- "what's pending" = status: "todo"
- "show me urgent tasks" = priority: "urgent"

Respond with ONLY the JSON object, no additional text.`;

        // Call Gemini API for intelligent processing
        const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: enhancedPrompt }]
                }],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 800
                }
            })
        });

        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            throw new Error(`Gemini API error: ${errorText}`);
        }

        const geminiData = await geminiResponse.json();
        const aiResponseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!aiResponseText) {
            throw new Error('No response from AI service');
        }

        // Parse AI response
        let aiDecision;
        try {
            const jsonMatch = aiResponseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No valid JSON found in AI response');
            }
            aiDecision = JSON.parse(jsonMatch[0]);
        } catch (parseError) {
            throw new Error(`Failed to parse AI response: ${parseError.message}`);
        }

        let result = {};
        const responseMessage = aiDecision.message || "I'm here to help you manage your tasks!";
        let actionType = aiDecision.action || 'ANSWER_QUERY';

        // Handle function calls based on AI decision
        if (aiDecision.function_call) {
            const functionName = aiDecision.function_call.name;
            const functionArgs = aiDecision.function_call.arguments;

            if (functionName === 'create_task') {
                // Create task with enterprise features
                const defaultPoints = functionArgs.priority === 'urgent' ? 25 : functionArgs.priority === 'high' ? 20 : functionArgs.priority === 'medium' ? 15 : 10;
                
                const taskData = {
                    user_id: userId,
                    title: functionArgs.title,
                    description: functionArgs.description || null,
                    priority: functionArgs.priority || 'medium',
                    status: 'todo',
                    due_date: functionArgs.due_date ? new Date(functionArgs.due_date + 'T23:59:59.999Z').toISOString() : null,
                    estimated_hours: functionArgs.estimated_hours || null,
                    tags: functionArgs.tags || [],
                    points: functionArgs.points || defaultPoints,
                    assigned_to: functionArgs.assigned_to && hasTaskAssignPermission ? functionArgs.assigned_to : [userId],
                    assignment_notes: hasTaskAssignPermission && functionArgs.assigned_to && functionArgs.assigned_to.length > 1 ? 'Multi-user assignment via AI' : null,
                    points_awarded: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                const insertResponse = await fetch(`${supabaseUrl}/rest/v1/tasks`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(taskData)
                });

                if (!insertResponse.ok) {
                    const errorText = await insertResponse.text();
                    throw new Error(`Failed to create task: ${errorText}`);
                }

                const createdTask = await insertResponse.json();
                const task = createdTask[0];
                
                // Create task assignments for multiple users if specified
                if (hasTaskAssignPermission && functionArgs.assigned_to && Array.isArray(functionArgs.assigned_to)) {
                    const assignments = [];
                    for (const assignedUserId of functionArgs.assigned_to) {
                        if (assignedUserId !== userId) { // Don't create assignment for creator
                            assignments.push({
                                task_id: task.id,
                                assigned_to_user_id: assignedUserId,
                                assigned_by_user_id: userId,
                                notes: 'Assigned via AI assistant'
                            });
                        }
                    }
                    
                    if (assignments.length > 0) {
                        try {
                            await fetch(`${supabaseUrl}/rest/v1/task_assignments`, {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${serviceRoleKey}`,
                                    'apikey': serviceRoleKey,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify(assignments)
                            });
                        } catch (assignmentError) {
                            console.warn('Failed to create task assignments:', assignmentError);
                        }
                    }
                }
                
                result = { 
                    task: task,
                    assignments_created: hasTaskAssignPermission && functionArgs.assigned_to ? functionArgs.assigned_to.length : 1,
                    points_value: task.points
                };
                actionType = 'CREATE_TASK';

            } else if (functionName === 'get_tasks') {
                // Build query parameters with role-based filtering
                let query;
                
                if (userRole === 'admin') {
                    // Admins can see all tasks
                    query = `${supabaseUrl}/rest/v1/tasks?select=id,title,description,priority,status,due_date,estimated_hours,tags,points,assigned_to,created_at,updated_at,user_id`;
                } else {
                    // Members see only their tasks and tasks assigned to them
                    query = `${supabaseUrl}/rest/v1/tasks?or=(user_id.eq.${userId},assigned_to.cs.{${userId}})&select=id,title,description,priority,status,due_date,estimated_hours,tags,points,assigned_to,created_at,updated_at`;
                }
                
                if (functionArgs.status) {
                    query += `&status=eq.${functionArgs.status}`;
                }
                if (functionArgs.priority) {
                    query += `&priority=eq.${functionArgs.priority}`;
                }
                if (functionArgs.due_date && functionArgs.due_date_operator) {
                    query += `&due_date=${functionArgs.due_date_operator}.${functionArgs.due_date}`;
                }
                
                const limit = functionArgs.limit || 10;
                query += `&limit=${limit}&order=created_at.desc`;

                const tasksResponse = await fetch(query, {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                });

                if (!tasksResponse.ok) {
                    const errorText = await tasksResponse.text();
                    throw new Error(`Failed to fetch tasks: ${errorText}`);
                }

                const tasks = await tasksResponse.json();
                
                // Get user points for context
                let userPoints = null;
                try {
                    const pointsResponse = await fetch(
                        `${supabaseUrl}/rest/v1/user_points?user_id=eq.${userId}&select=total_points,points_earned`,
                        {
                            headers: {
                                'Authorization': `Bearer ${serviceRoleKey}`,
                                'apikey': serviceRoleKey
                            }
                        }
                    );
                    
                    if (pointsResponse.ok) {
                        const pointsData = await pointsResponse.json();
                        userPoints = pointsData[0] || { total_points: 0, points_earned: 0 };
                    }
                } catch (pointsError) {
                    console.warn('Failed to fetch user points:', pointsError);
                }
                
                result = { 
                    tasks: tasks, 
                    count: tasks.length,
                    user_role: userRole,
                    user_points: userPoints
                };
                actionType = 'FETCH_DATA';
            }
        }

        const processingTime = Date.now() - startTime;

        // Log AI interaction with enterprise context
        try {
            await fetch(`${supabaseUrl}/rest/v1/ai_task_history`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: userId,
                    input_text: prompt,
                    created_task_id: result.task?.id || null,
                    ai_response: responseMessage,
                    processing_time_ms: processingTime,
                    success: true,
                    action_type: actionType,
                    user_role: userRole,
                    enterprise_features_used: {
                        multi_user_assignment: hasTaskAssignPermission && result.assignments_created > 1,
                        points_assigned: result.task?.points || 0,
                        role_based_access: userRole !== 'member'
                    }
                })
            });
        } catch (logError) {
            console.warn('Failed to log AI interaction:', logError);
        }

        return new Response(JSON.stringify({
            data: {
                message: responseMessage,
                action: actionType,
                result: result,
                processing_time_ms: processingTime,
                model_info: {
                    selected: 'gemini-1.5-flash',
                    used: 'gemini-1.5-flash',
                    complexity_mode: 'auto',
                    fallback_attempts: 0
                },
                enterprise_context: {
                    user_role: userRole,
                    can_assign_tasks: hasTaskAssignPermission,
                    features_available: {
                        multi_user_assignments: hasTaskAssignPermission,
                        points_system: true,
                        role_based_access: true
                    }
                }
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Enhanced AI assistant error:', error);

        const errorResponse = {
            error: {
                code: 'AI_ASSISTANT_ERROR',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
