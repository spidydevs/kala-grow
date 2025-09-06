import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

declare const Deno: any;

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface Task {
  id?: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  estimated_hours?: number;
  user_id?: string;
  client_id?: string;
  project_id?: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
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

    // Parse request data
    let requestData: any = {};
    if (req.method !== 'GET') {
      try {
        requestData = await req.json();
      } catch {
        requestData = {};
      }
    }

    const { action, taskId, task, filters } = requestData;
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const id = pathParts[pathParts.length - 1];

    // Handle different HTTP methods and actions
    switch (req.method) {
      case 'GET': {
        // Get all tasks with optional filters
        const statusFilter = url.searchParams.get('status');
        const priorityFilter = url.searchParams.get('priority');
        const clientIdFilter = url.searchParams.get('client_id');
        const userIdFilter = url.searchParams.get('user_id');
        
        let query = supabase.from('tasks').select('*');

        if (statusFilter) {
          query = query.eq('status', statusFilter);
        }
        if (priorityFilter) {
          query = query.eq('priority', priorityFilter);
        }
        if (clientIdFilter) {
          query = query.eq('client_id', clientIdFilter);
        }
        if (userIdFilter) {
          query = query.eq('user_id', userIdFilter);
        }

        const { data: tasks, error } = await query.order('created_at', { ascending: false });

        if (error) {
          throw new Error(`Failed to fetch tasks: ${error.message}`);
        }

        return new Response(
          JSON.stringify({ success: true, data: tasks }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        );
      }
      break;

      case 'POST':
        if (action === 'get') {
          // Handle POST requests with action 'get' for compatibility
          console.log('Tasks GET request with filters:', filters);
          
          // For now, get all tasks without user filtering for debugging
          let query = supabase.from('tasks').select('*');

          if (filters) {
            if (filters.status) {
              query = query.eq('status', filters.status);
            }
            if (filters.priority) {
              query = query.eq('priority', filters.priority);
            }
            if (filters.client_id) {
              query = query.eq('client_id', filters.client_id);
            }
            if (filters.user_id) {
              query = query.eq('user_id', filters.user_id);
            }
          }

          const { data: tasks, error } = await query.order('created_at', { ascending: false });

          if (error) {
            console.error('Database error fetching tasks:', error);
            throw new Error(`Failed to fetch tasks: ${error.message}`);
          }

          console.log('Tasks fetched successfully:', tasks?.length || 0, 'tasks');
          
          return new Response(
            JSON.stringify({ success: true, data: tasks }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200 
            }
          );
        }
        
        if (action === 'create') {
          // Create new task
          const newTask: Partial<Task> = {
            title: task.title,
            description: task.description,
            status: task.status || 'todo',
            priority: task.priority || 'medium',
            due_date: task.due_date,
            estimated_hours: task.estimated_hours,
            user_id: task.user_id,
            client_id: task.client_id,
            project_id: task.project_id,
            tags: task.tags || []
          };

          const { data: createdTask, error } = await supabase
            .from('tasks')
            .insert([newTask])
            .select()
            .single();

          if (error) {
            throw new Error(`Failed to create task: ${error.message}`);
          }

          return new Response(
            JSON.stringify({ success: true, data: createdTask }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 201 
            }
          );
        }
        break;

      case 'PUT':
        if (action === 'update' && taskId) {
          // Update existing task
          const updates: Partial<Task> = {
            ...task,
            updated_at: new Date().toISOString()
          };

          const { data: updatedTask, error } = await supabase
            .from('tasks')
            .update(updates)
            .eq('id', taskId)
            .select()
            .single();

          if (error) {
            throw new Error(`Failed to update task: ${error.message}`);
          }

          return new Response(
            JSON.stringify({ success: true, data: updatedTask }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200 
            }
          );
        }

        if (action === 'complete' && taskId) {
          // Mark task as completed
          const { data: completedTask, error } = await supabase
            .from('tasks')
            .update({ 
              status: 'completed',
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', taskId)
            .select()
            .single();

          if (error) {
            throw new Error(`Failed to complete task: ${error.message}`);
          }

          return new Response(
            JSON.stringify({ success: true, data: completedTask }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200 
            }
          );
        }
        break;

      case 'DELETE':
        if (action === 'delete' && taskId) {
          // Delete task
          const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', taskId);

          if (error) {
            throw new Error(`Failed to delete task: ${error.message}`);
          }

          return new Response(
            JSON.stringify({ success: true, message: 'Task deleted successfully' }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200 
            }
          );
        }
        break;

      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Method not allowed' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 405 
          }
        );
    }

    // If no valid action was found
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action or missing parameters' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );

  } catch (error) {
    console.error('Tasks API Error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
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
