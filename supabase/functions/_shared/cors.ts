/* eslint-disable */
/* @ts-nocheck */
// deno-lint-ignore-file
// This file is a Deno Supabase Edge helper. It intentionally uses Deno globals
// and runtime env variables. We disable frontend TS/ESLint checks here to avoid
// build noise. For stricter checks, move functions to a separate package with
// its own tsconfig/eslint config.

/*
  Define runtime-backed references used by Deno functions so editors/typecheckers
  inside the frontend workspace don't report "Cannot find name" errors.
  These read from Deno.env at runtime, but fall back to safe defaults for editor/CI.
*/
// Provide a lightweight declaration so editors/TS don't error on the Deno global
declare const Deno: any

const supabaseUrl: string = typeof Deno !== 'undefined' ? Deno.env.get('SUPABASE_URL') || '' : ''
const supabaseKey: string | undefined = typeof Deno !== 'undefined' ? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') : undefined

// Get allowed origins from environment or use secure defaults
const getAllowedOrigins = () => {
  const envOrigins = typeof Deno !== 'undefined' ? Deno.env.get('ALLOWED_ORIGINS') : undefined
  if (envOrigins) {
    return envOrigins.split(',').map(origin => origin.trim())
  }
  
  // Secure default origins - replace with your actual domains
  return [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:4173',
    'https://your-production-domain.com'
  ]
}

export const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'true'
}

export function getCorsHeaders(origin?: string): Record<string, string> {
  const allowedOrigins = getAllowedOrigins()
  const isAllowedOrigin = origin && allowedOrigins.includes(origin)
  
  return {
    ...corsHeaders,
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : allowedOrigins[0]
  }
}

export function createSupabaseClient() {
  
  return {
    from: (table: string) => ({
      select: (columns: string = '*') => createQuery('GET', table, { select: columns }),
      insert: (data: any) => createQuery('POST', table, { data }),
      update: (data: any) => createQuery('PATCH', table, { data }),
      delete: () => createQuery('DELETE', table),
      upsert: (data: any) => createQuery('POST', table, { data, upsert: true })
    }),
    auth: {
      getUser: async (token: string) => {
        try {
          const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'apikey': supabaseKey!
            }
          })
          
          if (!response.ok) {
            return { data: { user: null }, error: { message: 'Invalid token' } }
          }
          
          const user = await response.json()
          return { data: { user }, error: null }
        } catch (error) {
          return { data: { user: null }, error: { message: error.message } }
        }
      }
    }
  }
}

function createQuery(method: string, table: string, options: any = {}) {
  
  const queryBuilder: any = {
    eq: (column: string, value: any) => {
      queryBuilder.filters = queryBuilder.filters || []
      queryBuilder.filters.push(`${column}=eq.${value}`)
      return queryBuilder
    },
    neq: (column: string, value: any) => {
      queryBuilder.filters = queryBuilder.filters || []
      queryBuilder.filters.push(`${column}=neq.${value}`)
      return queryBuilder
    },
    gte: (column: string, value: any) => {
      queryBuilder.filters = queryBuilder.filters || []
      queryBuilder.filters.push(`${column}=gte.${value}`)
      return queryBuilder
    },
    lte: (column: string, value: any) => {
      queryBuilder.filters = queryBuilder.filters || []
      queryBuilder.filters.push(`${column}=lte.${value}`)
      return queryBuilder
    },
    ilike: (column: string, value: any) => {
      queryBuilder.filters = queryBuilder.filters || []
      queryBuilder.filters.push(`${column}=ilike.${value}`)
      return queryBuilder
    },
    order: (column: string, opts: any = {}) => {
      queryBuilder.orderBy = `${column}.${opts.ascending === false ? 'desc' : 'asc'}`
      return queryBuilder
    },
    range: (from: number, to: number) => {
      queryBuilder.rangeFrom = from
      queryBuilder.rangeTo = to
      return queryBuilder
    },
    select: (columns: string = '*') => {
      queryBuilder.selectColumns = columns
      return queryBuilder
    },
    single: () => {
      queryBuilder.single = true
      return queryBuilder
    },
    then: async (resolve: (value: any) => void, reject?: (reason?: any) => void) => {
      try {
        const result = await executeQuery(method, table, options, queryBuilder)
        resolve(result)
      } catch (error) {
        if (reject) {
          reject(error)
        } else {
          throw error
        }
      }
    }
  }
  
  return queryBuilder
}

async function executeQuery(method: string, table: string, options: any, queryBuilder: any) {
  
  let url = `${supabaseUrl}/rest/v1/${table}`
  const headers: any = {
    'apikey': supabaseKey!,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  }
  
  // Add filters to URL
  if (queryBuilder.filters && queryBuilder.filters.length > 0) {
    url += '?' + queryBuilder.filters.join('&')
  }
  
  // Add select
  if (queryBuilder.selectColumns) {
    url += (url.includes('?') ? '&' : '?') + `select=${queryBuilder.selectColumns}`
  }
  
  // Add order
  if (queryBuilder.orderBy) {
    url += (url.includes('?') ? '&' : '?') + `order=${queryBuilder.orderBy}`
  }
  
  // Add range headers
  if (queryBuilder.rangeFrom !== undefined) {
    headers['Range'] = `${queryBuilder.rangeFrom}-${queryBuilder.rangeTo}`
  }
  
  const requestOptions: any = {
    method,
    headers
  }
  
  // Add body for POST/PATCH
  if (options.data && (method === 'POST' || method === 'PATCH')) {
    requestOptions.body = JSON.stringify(options.data)
  }
  
  try {
    const response = await fetch(url, requestOptions)
    
    if (!response.ok) {
      const errorText = await response.text()
      return { data: null, error: { message: errorText } }
    }
    
    const responseText = await response.text()
    const data = responseText ? JSON.parse(responseText) : null
    
    return {
      data: queryBuilder.single ? (Array.isArray(data) ? data[0] : data) : data,
      error: null,
      count: response.headers.get('content-range')?.split('/')[1] || null
    }
  } catch (error) {
    return { data: null, error: { message: error.message } }
  }
}

export async function verifyAuth(req: Request, supabase: any) {
  const authHeader = req.headers.get('Authorization')
  
  if (!authHeader) {
    return { success: false, error: 'Authorization header required' }
  }

  const token = authHeader.replace('Bearer ', '')
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return { success: false, error: 'Invalid authentication token' }
    }
    
    return { success: true, user }
  } catch (error) {
    return { success: false, error: 'Authentication verification failed' }
  }
}
