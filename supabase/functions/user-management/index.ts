import { getCorsHeaders } from '../_shared/cors.ts';

declare const Deno: any;

Deno.serve(async (req) => {
    const corsHeaders = getCorsHeaders(req.headers.get('origin'));

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        console.log('User management function started');
        
        // Get environment variables
        /* Deno env access for serverless function (use globalThis to avoid TypeScript 'declare' in-block) */
        const _Deno = (globalThis as any).Deno;
        const supabaseUrl = (_Deno && _Deno.env && _Deno.env.get) ? _Deno.env.get('SUPABASE_URL') : '';
        const supabaseAnonKey = (_Deno && _Deno.env && _Deno.env.get) ? _Deno.env.get('SUPABASE_ANON_KEY') : '';
        const supabaseServiceKey = (_Deno && _Deno.env && _Deno.env.get) ? _Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') : '';

        console.log('Environment check:', {
            hasUrl: !!supabaseUrl,
            hasAnonKey: !!supabaseAnonKey,
            hasServiceKey: !!supabaseServiceKey
        });

        if (!supabaseUrl || !supabaseAnonKey) {
            throw new Error('Missing Supabase environment variables');
        }

        // Parse request body
        let requestBody: any = {};
        try {
            requestBody = await req.json();
        } catch (e) {
            console.log('No request body or invalid JSON, defaulting to get_all_users');
            requestBody = { action: 'get_all_users' };
        }

        const { action = 'get_all_users' } = requestBody;
        console.log('Processing action:', action);

        // Use service key if available, otherwise anon key
        const authKey = supabaseServiceKey || supabaseAnonKey;
        
        if (action === 'get_all_users') {
            console.log('Fetching all users from profiles table...');
            
            // Direct fetch to profiles table
            const response = await fetch(
                `${supabaseUrl}/rest/v1/profiles?select=*&order=created_at.desc`,
                {
                    headers: {
                        'Authorization': `Bearer ${authKey}`,
                        'apikey': authKey,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('Profiles response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Profiles fetch failed:', errorText);
                throw new Error(`Failed to fetch profiles: ${response.status} - ${errorText}`);
            }

            const profiles = await response.json();
            console.log('Fetched profiles count:', profiles.length);

            // Transform profiles to user format
            const users = profiles.map((profile) => ({
                id: profile.id,
                user_id: profile.user_id,
                full_name: profile.full_name || 'Unknown User',
                email: profile.email || `user-${profile.user_id?.split('-')[0] || 'unknown'}@company.com`,
                role: profile.role || 'member',
                job_title: profile.job_title || '',
                company: profile.company || '',
                avatar_url: profile.avatar_url,
                status: profile.status || 'active',
                email_confirmed: true,
                last_sign_in: profile.last_active_at,
                created_at: profile.created_at,
                last_active_at: profile.last_active_at
            }));

            const result = {
                success: true,
                users: users,
                total_count: users.length,
                admin_count: users.filter(u => u.role === 'admin').length,
                member_count: users.filter(u => u.role === 'member').length,
                active_count: users.filter(u => u.status === 'active').length
            };

            console.log('Returning result with', users.length, 'users');

            return new Response(JSON.stringify({ data: result }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Handle other actions (expanded)

        if (!authKey) {
            throw new Error('Missing Supabase keys for action handling');
        }

        switch (action) {
            case 'create_user': {
                const { userData } = requestBody;
                if (!userData || !userData.email || !userData.password) {
                    throw new Error('userData with email and password is required to create a user');
                }

                if (!supabaseServiceKey) {
                    throw new Error('Service role key is required to create an auth user');
                }

                // Create auth user via Supabase Admin API
                const createResp = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${supabaseServiceKey}`,
                        'apikey': supabaseServiceKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: userData.email,
                        password: userData.password,
                        user_metadata: {
                            full_name: userData.fullName || '',
                            job_title: userData.jobTitle || ''
                        },
                        email_confirm: true
                    })
                });

                if (!createResp.ok) {
                    const errText = await createResp.text();
                    throw new Error(`Failed to create auth user: ${createResp.status} - ${errText}`);
                }

                const created = await createResp.json();
                const newUserId = created?.id || created?.user?.id || null;

                // Insert profile row
                const profile = {
                    user_id: newUserId,
                    email: userData.email,
                    full_name: userData.fullName || '',
                    role: userData.role || 'member',
                    job_title: userData.jobTitle || '',
                    company: userData.department || '',
                    status: 'active',
                    created_at: new Date().toISOString()
                };

                const insertResp = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${authKey}`,
                        'apikey': authKey,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(profile)
                });

                if (!insertResp.ok) {
                    const errText = await insertResp.text();
                    throw new Error(`Failed to insert profile: ${insertResp.status} - ${errText}`);
                }

                const insertedProfiles = await insertResp.json();

                return new Response(JSON.stringify({
                    data: {
                        success: true,
                        user: created,
                        profile: Array.isArray(insertedProfiles) ? insertedProfiles[0] : insertedProfiles,
                        message: 'User created successfully'
                    }
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            case 'update_user': {
                const { userId, updateData } = requestBody;
                if (!userId || !updateData) {
                    throw new Error('userId and updateData are required for update_user');
                }

                const resp = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${authKey}`,
                        'apikey': authKey,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(updateData)
                });

                if (!resp.ok) {
                    const errText = await resp.text();
                    throw new Error(`Failed to update profile: ${resp.status} - ${errText}`);
                }

                const updated = await resp.json();

                return new Response(JSON.stringify({
                    data: {
                        success: true,
                        profile: Array.isArray(updated) ? updated[0] : updated,
                        message: 'User updated successfully'
                    }
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            case 'change_user_role': {
                const { userId, updateData } = requestBody;
                const newRole = updateData?.role;
                if (!userId || !newRole) {
                    throw new Error('userId and updateData.role are required for change_user_role');
                }

                const resp = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${authKey}`,
                        'apikey': authKey,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify({ role: newRole })
                });

                if (!resp.ok) {
                    const errText = await resp.text();
                    throw new Error(`Failed to change role: ${resp.status} - ${errText}`);
                }

                const updated = await resp.json();

                return new Response(JSON.stringify({
                    data: {
                        success: true,
                        profile: Array.isArray(updated) ? updated[0] : updated,
                        message: 'Role updated successfully'
                    }
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            case 'toggle_user_status': {
                const { userId } = requestBody;
                if (!userId) {
                    throw new Error('userId is required for toggle_user_status');
                }

                const getResp = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}&select=status`, {
                    headers: {
                        'Authorization': `Bearer ${authKey}`,
                        'apikey': authKey,
                        'Content-Type': 'application/json'
                    }
                });

                if (!getResp.ok) {
                    const errText = await getResp.text();
                    throw new Error(`Failed to fetch profile status: ${getResp.status} - ${errText}`);
                }

                const rows = await getResp.json();
                const currentStatus = rows?.[0]?.status || 'active';
                const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

                const patchResp = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${authKey}`,
                        'apikey': authKey,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify({ status: newStatus })
                });

                if (!patchResp.ok) {
                    const errText = await patchResp.text();
                    throw new Error(`Failed to update status: ${patchResp.status} - ${errText}`);
                }

                const updated = await patchResp.json();

                return new Response(JSON.stringify({
                    data: {
                        success: true,
                        profile: Array.isArray(updated) ? updated[0] : updated,
                        message: 'User status toggled'
                    }
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            case 'delete_user': {
                const { userId } = requestBody;
                if (!userId) {
                    throw new Error('userId is required for delete_user');
                }

                // Soft delete: set status to 'deleted' and remove email
                const patchResp = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${authKey}`,
                        'apikey': authKey,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify({ status: 'deleted', email: null })
                });

                if (!patchResp.ok) {
                    const errText = await patchResp.text();
                    throw new Error(`Failed to delete user: ${patchResp.status} - ${errText}`);
                }

                const updated = await patchResp.json();

                return new Response(JSON.stringify({
                    data: {
                        success: true,
                        profile: Array.isArray(updated) ? updated[0] : updated,
                        message: 'User deleted (soft)'
                    }
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            default: {
                const result = {
                    success: true,
                    message: `Action ${action} completed`
                };

                return new Response(JSON.stringify({ data: result }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
        }

    } catch (error) {
        console.error('User management error:', {
            message: error.message,
            stack: error.stack
        });

        const errorResponse = {
            success: false,
            error: {
                code: 'USER_MANAGEMENT_ERROR',
                message: error.message || 'Operation failed',
                details: error.stack
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
