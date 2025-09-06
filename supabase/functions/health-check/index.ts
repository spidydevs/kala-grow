import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200, 
      headers: corsHeaders 
    });
  }

  // Simple health check
  return new Response(
    JSON.stringify({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'Kala Grow API'
    }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 
    }
  );
});