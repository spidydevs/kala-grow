import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})


// Database types
export interface Profile {
  id: string
  user_id: string
  full_name?: string
  avatar_url?: string
  job_title?: string
  company?: string
  timezone?: string
  created_at?: string
  updated_at?: string
}

export interface Organization {
  id: string
  name: string
  slug: string
  description?: string
  logo_url?: string
  industry?: string
  size?: string
  website?: string
  address?: any
  billing_info?: any
  settings?: any
  created_by: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  organization_id: string
  name: string
  email?: string
  phone?: string
  company?: string
  website?: string
  address?: any
  industry?: string
  status: 'active' | 'inactive' | 'prospect' | 'archived'
  source?: string
  tags?: string[]
  notes?: string
  assigned_to?: string
  created_by: string
  avatar_url?: string
  revenue?: number
  client_type: 'project-based' | 'retainer'
  setup_cost?: number
  advance_payment?: number
  retainer_amount?: number
  last_contact_date?: string
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  organization_id: string
  client_id: string
  name: string
  description?: string
  project_type?: string
  status: 'planning' | 'in_progress' | 'review' | 'completed' | 'cancelled' | 'on_hold'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  budget?: number
  estimated_hours?: number
  actual_hours?: number
  start_date?: string
  end_date?: string
  deadline?: string
  created_by: string
  assigned_to?: string
  project_manager_id?: string
  tags?: string[]
  settings?: any
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  user_id: string
  project_id?: string
  category_id?: string
  parent_task_id?: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'review' | 'completed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assigned_to?: string[] // Updated to support array of user IDs
  created_by?: string
  due_date?: string
  estimated_hours?: number
  actual_hours?: number
  tags?: string[]
  attachments?: any[]
  position?: number
  ai_generated?: boolean
  ai_context?: any
  completed_at?: string
  created_at: string
  updated_at: string
}

export interface Pipeline {
  id: string
  organization_id: string
  name: string
  description?: string
  type: 'sales' | 'marketing' | 'service' | 'custom'
  stages: any[]
  is_default: boolean
  created_by: string
  created_at: string
  updated_at: string
}

// New database types for productivity powerhouse
export interface Invoice {
  id: string
  user_id: string
  invoice_number: string
  client_name: string
  client_email?: string
  client_address?: string
  items: InvoiceItem[]
  subtotal: number
  discount_amount: number
  tax_rate: number
  tax_amount: number
  total_amount: number
  status: 'pending' | 'paid' | 'overdue' | 'cancelled'
  due_date?: string
  notes?: string
  project_id?: string
  created_at: string
  updated_at: string
}

export interface InvoiceItem {
  description: string
  quantity: number
  rate: number
  amount?: number
}

export interface Expense {
  id: string
  user_id: string
  description: string
  amount: number
  category: string
  date: string
  receipt_url?: string
  notes?: string
  project_id?: string
  is_billable: boolean
  vendor?: string
  payment_method: string
  created_at: string
  updated_at: string
}

export interface UserStats {
  id: string
  user_id: string
  total_points: number
  level: number
  tasks_completed: number
  tasks_created: number
  current_streak: number
  longest_streak: number
  total_revenue: number
  total_expenses: number
  invoices_created: number
  expenses_logged: number
  reports_generated: number
  updated_at: string
}

export interface Activity {
  id: string
  user_id: string
  action: string
  entity_type: string
  entity_id?: string
  details?: any
  created_at: string
}

export interface Deal {
  id: string
  pipeline_id: string
  client_id: string
  title: string
  description?: string
  value?: number
  stage_id: string
  probability?: number
  expected_close_date?: string
  actual_close_date?: string
  assigned_to?: string
  created_by: string
  source?: string
  tags?: string[]
  notes?: string
  activities_count?: number
  last_activity_date?: string
  position?: number
  created_at: string
  updated_at: string
}

// Gamification interfaces
export interface Medal {
  id: string
  name: string
  description?: string
  icon_url?: string
  color: string
  points: number
  criteria?: any
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface UserMedal {
  id: string
  user_id: string
  medal_id: string
  awarded_at: string
  awarded_by?: string
  notes?: string
  medal?: Medal
}

export interface RankTier {
  id: string
  level: number
  tier: number
  name: string
  points_required: number
  color?: string
  icon_url?: string
  created_at: string
}

export interface EnhancedUserStats {
  id: string
  user_id: string
  total_points: number
  level: number
  tasks_completed: number
  tasks_created: number
  current_streak: number
  longest_streak: number
  total_revenue: number
  total_expenses: number
  invoices_created: number
  expenses_logged: number
  reports_generated: number
  current_rank_tier_id?: string
  rank_updated_at?: string
  updated_at: string
  rank_tier?: RankTier
}