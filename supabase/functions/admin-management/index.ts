import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

declare const Deno: any;

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
}

const supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const requestBody = await (async () => {
      try {
        return await req.json();
      } catch {
        return {};
      }
    })();

    const { action, user_id, email } = requestBody;

    let result: any = {};

    switch (action) {
      case 'assign_admin': {
        if (!user_id && !email) {
          throw new Error('Either user_id or email is required');
        }

        let targetUserId = user_id;

        if (!targetUserId && email) {
          const { data: authUsers, error: authError } = await supabaseClient.auth.admin.listUsers();
          if (authError) throw new Error(`Failed to list users: ${authError.message}`);

          const targetUser = authUsers.users.find((u: any) => u.email === email);
          if (!targetUser) {
            throw new Error(`User with email ${email} not found`);
          }
          targetUserId = targetUser.id;
        }

        const { data: assignResult, error: assignError } = await supabaseClient
          .rpc('assign_admin_role', { target_user_id: targetUserId });

        if (assignError) {
          throw new Error(`Failed to assign admin role: ${assignError.message}`);
        }

        result = {
          success: true,
          message: 'Admin role assigned successfully',
          user_id: targetUserId,
          result: assignResult
        };
        break;
      }

      case 'emergency_admin': {
        const { data: emergencyResult, error: emergencyError } = await supabaseClient
          .rpc('emergency_admin_assignment');

        if (emergencyError) {
          throw new Error(`Emergency admin assignment failed: ${emergencyError.message}`);
        }

        result = {
          success: true,
          message: 'Emergency admin assignment completed',
          result: emergencyResult
        };
        break;
      }

      case 'check_admin': {
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
          throw new Error('No authorization header');
        }

        const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
          headers: {
            'Authorization': authHeader,
            'apikey': Deno.env.get('SUPABASE_ANON_KEY') || ''
          }
        });

        if (!userResponse.ok) {
          throw new Error('Failed to get user info');
        }

        const userData = await userResponse.json();
        const currentUserId = userData.id;

        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('role, full_name')
          .eq('user_id', currentUserId)
          .single();

        const isAdmin = profile?.role === 'admin';

        result = {
          success: true,
          user_id: currentUserId,
          full_name: profile?.full_name,
          role: profile?.role || 'member',
          is_admin: isAdmin
        };
        break;
      }

      case 'list_admins': {
        const { data: adminProfiles, error: listError } = await supabaseClient
          .from('profiles')
          .select('user_id, full_name, role, status, updated_at')
          .eq('role', 'admin')
          .eq('status', 'active')
          .order('updated_at', { ascending: false });

        if (listError) {
          throw new Error(`Failed to list admins: ${listError.message}`);
        }

        result = {
          success: true,
          admins: adminProfiles,
          count: adminProfiles?.length || 0
        };
        break;
      }

      default:
        throw new Error(`Unsupported action: ${action}`);
    }

    return new Response(JSON.stringify({ data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Admin management error:', error);

    const errorResponse = {
      success: false,
      error: {
        code: 'ADMIN_MANAGEMENT_ERROR',
        message: error instanceof Error ? error.message : String(error)
      }
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
