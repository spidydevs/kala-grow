import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

declare const Deno: any;

interface AIRequest {
  message: string;
  context: string;
}

interface SuggestedAction {
  type: 'create_task' | 'create_client' | 'create_invoice' | 'view_reports' | 'time_tracking';
  data?: any;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200, 
      headers: corsHeaders 
    });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    // Parse request data
    const { message, context }: AIRequest = await req.json();

    if (!message || message.trim() === '') {
      return new Response(
        JSON.stringify({ 
          error: 'Message is required' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    const userMessage = message.toLowerCase().trim();
    let aiResponse = '';
    const suggestedActions: SuggestedAction[] = [];

    // Analyze user message for intent
    if (userMessage.includes('create') && (userMessage.includes('task') || userMessage.includes('todo'))) {
      // Task creation intent - ACTUALLY CREATE THE TASK IMMEDIATELY
      const taskTitle = extractTaskTitle(message);
      const priority = extractPriority(message);
      
      try {
        // Call the create-task API directly
        const taskResponse = await fetch(`${supabaseUrl}/functions/v1/create-task`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({
            title: taskTitle,
            description: '',
            priority: priority,
            status: 'pending'
          })
        });
        
        if (taskResponse.ok) {
          const taskData = await taskResponse.json();
          if (taskData.data && taskData.data.task) {
            aiResponse = `✅ Task "${taskTitle}" created successfully! It now appears in your My Tasks menu with ${priority} priority.`;
          } else {
            aiResponse = `✅ Task "${taskTitle}" created successfully!`;
          }
        } else {
          const errorData = await taskResponse.json();
          aiResponse = `❌ Failed to create task "${taskTitle}". Error: ${errorData.error?.message || 'Unknown error'}`;
        }
      } catch (error) {
        console.error('Task creation error:', error);
        aiResponse = `❌ Failed to create task "${taskTitle}". Please try again or check your connection.`;
      }
    } 
    else if (userMessage.includes('client') && userMessage.includes('create')) {
      // Client creation intent
      aiResponse = 'I understand you want to create a new client. For client creation, please use the CRM page where you can add all their details including contact information, company details, and project requirements.';
      // No suggested actions - direct guidance instead of navigation
    }
    else if (userMessage.includes('invoice') && userMessage.includes('create')) {
      // Invoice creation intent
      aiResponse = 'I understand you want to create a new invoice. For invoice creation, please use the Finance page where you can select clients, add line items, set amounts, and configure payment terms.';
      // No suggested actions - direct guidance instead of navigation
    }
    else if (userMessage.includes('report') || userMessage.includes('analytics') || userMessage.includes('productivity')) {
      // Reports intent
      aiResponse = 'You can view your productivity reports and analytics on the Reports page. The reports show real-time data including task completion rates, time tracking metrics, and productivity trends.';
      // No suggested actions - direct guidance instead of navigation
    }
    else if (userMessage.includes('time') && (userMessage.includes('track') || userMessage.includes('timer'))) {
      // Time tracking intent
      aiResponse = 'For time tracking, go to the Tasks page where you can start/stop timers for individual tasks. Time is automatically tracked and contributes to your productivity analytics.';
      // No suggested actions - direct guidance instead of navigation
    }
    else if (userMessage.includes('help') || userMessage.includes('what can you do')) {
      // Help intent
      aiResponse = `I'm your productivity assistant! Here's what I can do:\n\n✅ **AUTOMATIC ACTIONS:**\n• Create tasks instantly ("Create a task: Design landing page")\n• Parse task priorities and details automatically\n\n📍 **GUIDANCE & NAVIGATION:**\n• Help with CRM and client management\n• Guide you to invoice creation\n• Explain time tracking features\n• Direct you to reports and analytics\n\nJust tell me what you want to do! For tasks, I'll create them immediately. For other features, I'll guide you to the right place.`;
    }
    else {
      // General response
      aiResponse = `I understand you want to: "${message}". \n\nI can automatically create tasks for you - just say "Create a task: [title]" and I'll do it immediately!\n\nFor other features like CRM, invoicing, or analytics, I can guide you to the right place. What specifically would you like me to help with?`;
    }

    // Return response (no suggested_actions for task creation since it's executed directly)
    return new Response(
      JSON.stringify({
        data: {
          message: aiResponse,
          suggested_actions: suggestedActions, // Empty for task creation, guidance only for others
          context: context,
          processed_at: new Date().toISOString(),
          action_executed: userMessage.includes('create') && (userMessage.includes('task') || userMessage.includes('todo'))
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('AI Assistant Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

// Helper function to extract task title from message
function extractTaskTitle(message: string): string {
  // Look for patterns like "Create a task: Title" or "Create high priority task: Title"
  const patterns = [
    /create\s+(?:a\s+)?(?:high\s+priority\s+|low\s+priority\s+|urgent\s+|important\s+)?task[:\s]+(.+)/i,
    /create\s+(?:high\s+priority\s+|low\s+priority\s+|urgent\s+|important\s+)?[:\s]*(.+)/i,
    /task[:\s]+(.+)/i
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      let title = match[1].trim();
      // Remove any remaining priority keywords from the title
      title = title.replace(/^(high\s+priority\s+|low\s+priority\s+|urgent\s+|important\s+)/i, '').trim();
      return title;
    }
  }
  
  // Fallback: remove common create/task/priority words
  return message
    .replace(/create\s+(?:a\s+)?(?:high\s+priority\s+|low\s+priority\s+|urgent\s+|important\s+)?task[:\s]*/i, '')
    .replace(/create[:\s]*/i, '')
    .replace(/task[:\s]*/i, '')
    .replace(/^(high\s+priority\s+|low\s+priority\s+|urgent\s+|important\s+)/i, '')
    .trim() || 'New Task';
}

// Helper function to extract priority from message
function extractPriority(message: string): 'low' | 'medium' | 'high' | 'urgent' {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('urgent') || lowerMessage.includes('critical')) {
    return 'urgent';
  }
  if (lowerMessage.includes('high') || lowerMessage.includes('important')) {
    return 'high';
  }
  if (lowerMessage.includes('low')) {
    return 'low';
  }
  
  return 'medium'; // default
}
