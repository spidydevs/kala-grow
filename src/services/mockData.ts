// Mock data fallbacks to prevent loading issues

export const mockFinancialSummary = {
  data: {
    total_revenue: 15420.50,
    total_expenses: 8930.25,
    net_profit: 6490.25,
    pending_invoices: 2,
    overdue_invoices: 0,
    monthly_growth: 12.5,
    revenue_trend: [12000, 13500, 15420],
    expense_categories: {
      'Software': 2300,
      'Marketing': 1800,
      'Office': 950,
      'Other': 3880.25
    }
  },
  success: true
}

export const mockProductivityAnalytics = {
  data: {
    total_completed_tasks: 147,
    total_focus_time: 8.5,
    productivity_score: 87,
    weekly_growth: 15,
    task_completion_rate: 0.82,
    daily_averages: {
      tasks: 6.2,
      focus_hours: 2.8
    },
    trends: {
      tasks: [12, 15, 18, 14, 16, 19, 22],
      focus: [2.5, 3.0, 2.8, 3.2, 3.5, 2.9, 3.8]
    }
  },
  success: true
}

export const mockUserStats = {
  id: 'mock-stats',
  user_id: 'current-user',
  total_points: 2847,
  level: 8,
  tasks_completed: 147,
  tasks_created: 162,
  current_streak: 12,
  longest_streak: 28,
  total_revenue: 15420.50,
  total_expenses: 8930.25,
  invoices_created: 23,
  expenses_logged: 67,
  reports_generated: 12,
  updated_at: new Date().toISOString()
}

export const mockActivities = [
  {
    id: '1',
    user_id: 'current-user',
    action: 'task_completed',
    entity_type: 'task',
    entity_id: 'task-1',
    details: {
      task_title: 'Complete client presentation',
      points_earned: 25
    },
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30 minutes ago
  },
  {
    id: '2',
    user_id: 'current-user',
    action: 'invoice_created',
    entity_type: 'invoice',
    entity_id: 'inv-1',
    details: {
      client_name: 'Acme Corp',
      total_amount: 2500,
      points_earned: 15
    },
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
  },
  {
    id: '3',
    user_id: 'current-user',
    action: 'task_created',
    entity_type: 'task',
    entity_id: 'task-2',
    details: {
      task_title: 'Review marketing campaign',
      points_earned: 10
    },
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() // 4 hours ago
  },
  {
    id: '4',
    user_id: 'current-user',
    action: 'expense_created',
    entity_type: 'expense',
    entity_id: 'exp-1',
    details: {
      description: 'Office supplies',
      amount: 127.50,
      points_earned: 5
    },
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() // 6 hours ago
  },
  {
    id: '5',
    user_id: 'current-user',
    action: 'report_generated',
    entity_type: 'report',
    entity_id: 'rep-1',
    details: {
      report_type: 'Monthly Financial Summary',
      points_earned: 20
    },
    created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString() // 8 hours ago
  }
]

export const mockTasks = [
  {
    id: 'task-1',
    title: 'Complete client presentation',
    description: 'Finish the Q4 presentation for the marketing team',
    status: 'completed',
    priority: 'high',
    due_date: new Date().toISOString(),
    completed_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'task-2',
    title: 'Review marketing campaign',
    description: 'Analyze performance metrics and prepare recommendations',
    status: 'in_progress',
    priority: 'medium',
    due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'task-3',
    title: 'Update website content',
    description: 'Refresh the homepage copy and product descriptions',
    status: 'pending',
    priority: 'low',
    due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'task-4',
    title: 'Prepare monthly report',
    description: 'Compile financial and operational metrics for stakeholders',
    status: 'completed',
    priority: 'high',
    due_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'task-5',
    title: 'Schedule team meeting',
    description: 'Coordinate calendars and book conference room',
    status: 'completed',
    priority: 'medium',
    due_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  }
]