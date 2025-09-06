import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  Receipt,
  Plus,
  Eye,
  Download,
  Calendar,
  RefreshCw,
  PieChart,
  BarChart3,
  Wallet,
  Building,
  CheckCircle,
  Target,
  AlertTriangle,
  Edit,
  Trash2,
  Loader2,
  Search,
  Filter,
  Calculator,
  Users,
  Award,
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import {
  useFinancialSummary,
  useInvoices,
  useExpenses,
  useCreateInvoice,
  useCreateExpense,
  useGenerateFinancialReport,
  useExportInvoice,
  formatCurrency as utilFormatCurrency,
  formatDate,
  getStatusColor,
  EXPENSE_CATEGORIES,
  INVOICE_STATUSES,
  REPORT_TYPES
} from '@/services'
import {
  CRMFinanceService,
  formatCurrency,
  formatDate as crmFormatDate,
  getRevenueSourceColor,
  calculateGrowthRate
} from '@/services/crmFinanceService'
import { useAuth } from '@/contexts/AuthContext'
import { useEnterprise } from '@/contexts/EnterpriseContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  PieChart as RechartsPieChart, 
  Cell, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  BarChart, 
  Bar 
} from 'recharts'
import { toast } from 'sonner'

interface InvoiceFormData {
  client_name: string
  client_email: string
  client_address: string
  service_description: string
  service_amount: number
  service_date: string
  due_date: string
  notes: string
  tax_rate: number
  discount_amount: number
  project_id?: string
}

interface ExpenseFormData {
  description: string
  amount: number
  category: string
  date: string
  notes: string
  project_id?: string
  is_billable: boolean
  vendor: string
  payment_method: string
}

interface RevenueFormData {
  revenue_amount: number
  revenue_source: string
  revenue_type: 'sales' | 'commission' | 'bonus' | 'project' | 'retainer' | 'other'
  revenue_category: string
  client_id: string
  description: string
  notes: string
  transaction_date: string
}

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#6b7280']

export function UnifiedFinanceHub() {
  const { user } = useAuth()
  const { isAdmin, permissions } = useEnterprise()
  const queryClient = useQueryClient()
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month')
  const [selectedTab, setSelectedTab] = useState<'overview' | 'revenue' | 'invoices' | 'expenses' | 'clients' | 'reports'>('overview')
  const [showCreateInvoice, setShowCreateInvoice] = useState(false)
  const [showCreateExpense, setShowCreateExpense] = useState(false)
  const [showAddRevenue, setShowAddRevenue] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string>('all')
  const [searchParams, setSearchParams] = useSearchParams()

  // Form states
  const [invoiceForm, setInvoiceForm] = useState<InvoiceFormData>({
    client_name: '',
    client_email: '',
    client_address: '',
    service_description: '',
    service_amount: 0,
    service_date: new Date().toISOString().split('T')[0],
    due_date: '',
    notes: '',
    tax_rate: 0,
    discount_amount: 0
  })

  const [expenseForm, setExpenseForm] = useState<ExpenseFormData>({
    description: '',
    amount: 0,
    category: 'office_supplies',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    is_billable: false,
    vendor: '',
    payment_method: 'credit_card'
  })

  const [revenueForm, setRevenueForm] = useState<RevenueFormData>({
    revenue_amount: 0,
    revenue_source: '',
    revenue_type: 'sales',
    revenue_category: 'general',
    client_id: 'none',
    description: '',
    notes: '',
    transaction_date: new Date().toISOString().split('T')[0]
  })

  // Handle URL parameters for tab selection and auto-opening create dialogs
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && ['overview', 'revenue', 'invoices', 'expenses', 'clients', 'reports'].includes(tab)) {
      setSelectedTab(tab as any)
    }
    
    const action = searchParams.get('action')
    if (action === 'create-expense') {
      setShowCreateExpense(true)
      searchParams.delete('action')
      setSearchParams(searchParams, { replace: true })
    } else if (action === 'create-invoice') {
      setShowCreateInvoice(true)
      searchParams.delete('action')
      setSearchParams(searchParams, { replace: true })
    } else if (action === 'add-revenue') {
      setShowAddRevenue(true)
      searchParams.delete('action')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  // API queries
  const { data: unifiedSummary, isLoading: summaryLoading, refetch: refetchSummary } = useQuery({
    queryKey: ['unified-financial-summary', selectedUserId, selectedPeriod],
    queryFn: () => CRMFinanceService.getUnifiedFinancialSummary({
      user_id: selectedUserId === 'all' ? undefined : selectedUserId,
      period: selectedPeriod
    })
  })

  const { data: invoices, isLoading: invoicesLoading, refetch: refetchInvoices } = useInvoices({ limit: 20 })
  const { data: expenses, isLoading: expensesLoading } = useExpenses({ limit: 20 })

  // Query for users (admin only)
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .order('full_name')
      
      if (error) throw error
      
      return data.map(user => ({
        id: user.user_id,
        full_name: user.full_name || 'Unknown User',
        email: user.user_id
      }))
    },
    enabled: isAdmin
  })

  // Query for clients
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, company')
        .eq('status', 'active')
        .order('name')
      
      if (error) throw error
      return data
    }
  })

  // Mutations
  const createInvoiceMutation = useCreateInvoice()
  const createExpenseMutation = useCreateExpense()
  const generateReportMutation = useGenerateFinancialReport()
  const exportInvoiceMutation = useExportInvoice()

  const addRevenueMutation = useMutation({
    mutationFn: (data: any) => CRMFinanceService.addRevenueEntry(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified-financial-summary'] })
      toast.success('Revenue entry added successfully!')
    },
    onError: (error: any) => {
      toast.error('Failed to add revenue entry: ' + error.message)
    }
  })

  const isLoading = summaryLoading || invoicesLoading || expensesLoading

  const summary = unifiedSummary?.summary || {
    total_revenue: 0,
    crm_revenue: 0,
    direct_revenue: 0,
    invoice_revenue: 0,
    total_expenses: 0,
    net_profit: 0,
    profit_margin: 0,
    health_score: 0
  }

  const clientBreakdown = unifiedSummary?.client_breakdown || []
  const revenueSources = unifiedSummary?.revenue_sources || {
    crm_deals: 0,
    direct_entries: 0,
    invoices: 0
  }

  // Form handlers
  const handleCreateInvoice = () => {
    if (!invoiceForm.client_name.trim()) {
      toast.error('Client name is required')
      return
    }
    if (!invoiceForm.service_description.trim()) {
      toast.error('Service description is required')
      return
    }
    if (invoiceForm.service_amount <= 0) {
      toast.error('Service amount must be greater than zero')
      return
    }

    const serviceInvoiceData = {
      ...invoiceForm,
      invoice_items: [{
        description: invoiceForm.service_description,
        rate: invoiceForm.service_amount,
        quantity: 1,
        amount: invoiceForm.service_amount
      }],
      subtotal: invoiceForm.service_amount,
      total_amount: invoiceForm.service_amount - invoiceForm.discount_amount + 
                   (invoiceForm.service_amount * (invoiceForm.tax_rate / 100))
    }

    createInvoiceMutation.mutate(serviceInvoiceData, {
      onSuccess: () => {
        setShowCreateInvoice(false)
        setInvoiceForm({
          client_name: '',
          client_email: '',
          client_address: '',
          service_description: '',
          service_amount: 0,
          service_date: new Date().toISOString().split('T')[0],
          due_date: '',
          notes: '',
          tax_rate: 0,
          discount_amount: 0
        })
        refetchSummary()
        refetchInvoices()
      }
    })
  }

  const handleCreateExpense = () => {
    if (!expenseForm.description.trim()) {
      toast.error('Expense description is required')
      return
    }
    if (expenseForm.amount <= 0) {
      toast.error('Amount must be greater than zero')
      return
    }

    createExpenseMutation.mutate(expenseForm, {
      onSuccess: () => {
        setShowCreateExpense(false)
        setExpenseForm({
          description: '',
          amount: 0,
          category: 'office_supplies',
          date: new Date().toISOString().split('T')[0],
          notes: '',
          is_billable: false,
          vendor: '',
          payment_method: 'credit_card'
        })
        refetchSummary()
      }
    })
  }

  const handleAddRevenue = () => {
    if (!revenueForm.revenue_source.trim()) {
      toast.error('Revenue source is required')
      return
    }
    if (revenueForm.revenue_amount <= 0) {
      toast.error('Revenue amount must be greater than zero')
      return
    }
    if (!user) {
      toast.error('User not authenticated')
      return
    }

    addRevenueMutation.mutate({
      user_id: user.id,
      ...revenueForm,
      client_id: revenueForm.client_id === 'none' ? null : revenueForm.client_id,
      currency: 'USD'
    }, {
      onSuccess: () => {
        setShowAddRevenue(false)
        setRevenueForm({
          revenue_amount: 0,
          revenue_source: '',
          revenue_type: 'sales',
          revenue_category: 'general',
          client_id: 'none',
          description: '',
          notes: '',
          transaction_date: new Date().toISOString().split('T')[0]
        })
      }
    })
  }

  const refreshAll = () => {
    refetchSummary()
    queryClient.invalidateQueries({ queryKey: ['invoices'] })
    queryClient.invalidateQueries({ queryKey: ['expenses'] })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Finance Hub</h1>
            <p className="text-muted-foreground">
              Unified financial management with CRM integration
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshAll}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Select value={selectedPeriod} onValueChange={(value: any) => setSelectedPeriod(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="quarter">Quarter</SelectItem>
                <SelectItem value="year">Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isAdmin && (
          <div className="flex items-center space-x-4">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-60">
                <SelectValue placeholder="All Users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users?.filter(user => user.id && user.id !== '').map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Financial Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Total Revenue</p>
                  <p className="text-3xl font-bold">{formatCurrency(summary.total_revenue)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-200" />
              </div>
              <div className="mt-2 text-xs text-green-100">
                CRM: {formatCurrency(summary.crm_revenue)} • 
                Invoices: {formatCurrency(summary.invoice_revenue)} • 
                Direct: {formatCurrency(summary.direct_revenue)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Total Expenses</p>
                  <p className="text-3xl font-bold">{formatCurrency(summary.total_expenses)}</p>
                </div>
                <Receipt className="h-8 w-8 text-red-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Track spending by category
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Net Profit</p>
                  <p className={cn(
                    "text-3xl font-bold",
                    summary.net_profit >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {formatCurrency(summary.net_profit)}
                  </p>
                </div>
                {summary.net_profit >= 0 ? (
                  <TrendingUp className="h-8 w-8 text-green-500" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-red-500" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Margin: {summary.profit_margin.toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Health Score</p>
                  <p className="text-3xl font-bold">{summary.health_score}/100</p>
                </div>
                <Target className="h-8 w-8 text-green-500" />
              </div>
              <div className="mt-2">
                <Progress value={summary.health_score} className="w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 items-center">
        <Dialog open={showCreateInvoice} onOpenChange={setShowCreateInvoice}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Invoice</DialogTitle>
              <DialogDescription>
                Generate a professional invoice for your client
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              {/* Client Information */}
              <div className="space-y-4">
                <h3 className="font-semibold">Client Information</h3>
                <div className="space-y-2">
                  <Label htmlFor="client_name">Client Name *</Label>
                  <Input
                    id="client_name"
                    value={invoiceForm.client_name}
                    onChange={(e) => setInvoiceForm(prev => ({ ...prev, client_name: e.target.value }))}
                    placeholder="Client or Company Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client_email">Client Email</Label>
                  <Input
                    id="client_email"
                    type="email"
                    value={invoiceForm.client_email}
                    onChange={(e) => setInvoiceForm(prev => ({ ...prev, client_email: e.target.value }))}
                    placeholder="client@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service_description">Service Description *</Label>
                  <Textarea
                    id="service_description"
                    value={invoiceForm.service_description}
                    onChange={(e) => setInvoiceForm(prev => ({ ...prev, service_description: e.target.value }))}
                    placeholder="Describe the service provided"
                    className="min-h-[80px]"
                  />
                </div>
              </div>

              {/* Invoice Details */}
              <div className="space-y-4">
                <h3 className="font-semibold">Invoice Details</h3>
                <div className="space-y-2">
                  <Label htmlFor="service_amount">Amount *</Label>
                  <Input
                    id="service_amount"
                    type="number"
                    step="0.01"
                    value={invoiceForm.service_amount}
                    onChange={(e) => setInvoiceForm(prev => ({ ...prev, service_amount: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={invoiceForm.due_date}
                    onChange={(e) => setInvoiceForm(prev => ({ ...prev, due_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                  <Input
                    id="tax_rate"
                    type="number"
                    step="0.01"
                    value={invoiceForm.tax_rate}
                    onChange={(e) => setInvoiceForm(prev => ({ ...prev, tax_rate: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                  />
                </div>
                
                {/* Invoice Total Preview */}
                <div className="border-t pt-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(invoiceForm.service_amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax ({invoiceForm.tax_rate}%):</span>
                      <span>{formatCurrency(invoiceForm.service_amount * (invoiceForm.tax_rate / 100))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Discount:</span>
                      <span>-{formatCurrency(invoiceForm.discount_amount)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-base border-t pt-2">
                      <span>Total:</span>
                      <span>{formatCurrency(
                        invoiceForm.service_amount - invoiceForm.discount_amount + 
                        (invoiceForm.service_amount * (invoiceForm.tax_rate / 100))
                      )}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateInvoice(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateInvoice}
                disabled={createInvoiceMutation.isPending}
              >
                {createInvoiceMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Create Invoice
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showCreateExpense} onOpenChange={setShowCreateExpense}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Expense</DialogTitle>
              <DialogDescription>
                Record a business expense
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="expense_description">Description *</Label>
                <Input
                  id="expense_description"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Expense description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expense_amount">Amount *</Label>
                  <Input
                    id="expense_amount"
                    type="number"
                    step="0.01"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expense_category">Category</Label>
                  <Select 
                    value={expenseForm.category} 
                    onValueChange={(value) => setExpenseForm(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map(category => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expense_date">Date</Label>
                <Input
                  id="expense_date"
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expense_vendor">Vendor</Label>
                <Input
                  id="expense_vendor"
                  value={expenseForm.vendor}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, vendor: e.target.value }))}
                  placeholder="Vendor name"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateExpense(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateExpense}
                disabled={createExpenseMutation.isPending}
              >
                {createExpenseMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Add Expense
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showAddRevenue} onOpenChange={setShowAddRevenue}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Revenue
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Revenue Entry</DialogTitle>
              <DialogDescription>
                Record direct revenue (non-CRM)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="revenue_source">Revenue Source *</Label>
                <Input
                  id="revenue_source"
                  value={revenueForm.revenue_source}
                  onChange={(e) => setRevenueForm(prev => ({ ...prev, revenue_source: e.target.value }))}
                  placeholder="e.g., Direct Sale, Consultation, etc."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="revenue_amount">Amount *</Label>
                  <Input
                    id="revenue_amount"
                    type="number"
                    step="0.01"
                    value={revenueForm.revenue_amount}
                    onChange={(e) => setRevenueForm(prev => ({ ...prev, revenue_amount: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="revenue_type">Type</Label>
                  <Select 
                    value={revenueForm.revenue_type} 
                    onValueChange={(value: any) => setRevenueForm(prev => ({ ...prev, revenue_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="commission">Commission</SelectItem>
                      <SelectItem value="bonus">Bonus</SelectItem>
                      <SelectItem value="project">Project</SelectItem>
                      <SelectItem value="retainer">Retainer</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="revenue_client">Client (Optional)</Label>
                <Select 
                  value={revenueForm.client_id} 
                  onValueChange={(value) => setRevenueForm(prev => ({ ...prev, client_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select client (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No client</SelectItem>
                    {clients.filter(client => client.id && client.id !== '').map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name} {client.company && `(${client.company})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="revenue_date">Transaction Date</Label>
                <Input
                  id="revenue_date"
                  type="date"
                  value={revenueForm.transaction_date}
                  onChange={(e) => setRevenueForm(prev => ({ ...prev, transaction_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="revenue_description">Description</Label>
                <Textarea
                  id="revenue_description"
                  value={revenueForm.description}
                  onChange={(e) => setRevenueForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Additional details about this revenue"
                  className="min-h-[80px]"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowAddRevenue(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddRevenue}
                disabled={addRevenueMutation.isPending}
              >
                {addRevenueMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Add Revenue
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={(value: any) => setSelectedTab(value)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Revenue Sources Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Revenue Sources</CardTitle>
                <CardDescription>
                  Revenue breakdown by source type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'CRM Deals', value: summary.crm_revenue, color: COLORS[0] },
                      { name: 'Invoices', value: summary.invoice_revenue, color: COLORS[1] },
                      { name: 'Direct Revenue', value: summary.direct_revenue, color: COLORS[2] }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value: any) => formatCurrency(value)} />
                      <Bar dataKey="value" fill={COLORS[0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Revenue Sources Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Activity</CardTitle>
                <CardDescription>
                  Current period activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm">CRM Deals</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{revenueSources.crm_deals}</p>
                      <p className="text-xs text-muted-foreground">deals</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Invoices</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{revenueSources.invoices}</p>
                      <p className="text-xs text-muted-foreground">invoices</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <span className="text-sm">Direct Entries</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{revenueSources.direct_entries}</p>
                      <p className="text-xs text-muted-foreground">entries</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Client Revenue Breakdown */}
          {clientBreakdown.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Clients by Revenue</CardTitle>
                <CardDescription>
                  Revenue breakdown by client
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {clientBreakdown.slice(0, 10).map((client, index) => (
                    <div key={client.client_id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          index < 3 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          #{index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{client.client_name}</p>
                          {client.company && (
                            <p className="text-sm text-muted-foreground">{client.company}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(client.total_revenue)}</p>
                        <div className="flex space-x-2 text-xs text-muted-foreground">
                          {client.crm_revenue > 0 && (
                            <span>CRM: {formatCurrency(client.crm_revenue)}</span>
                          )}
                          {client.invoice_revenue > 0 && (
                            <span>Inv: {formatCurrency(client.invoice_revenue)}</span>
                          )}
                          {client.direct_revenue > 0 && (
                            <span>Dir: {formatCurrency(client.direct_revenue)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Tracking</CardTitle>
              <CardDescription>
                All revenue sources including CRM deals, invoices, and direct entries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Revenue tracking functionality is now integrated.</p>
                <p className="text-sm">Use the tabs above to view revenue from different sources.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Invoices</CardTitle>
              <CardDescription>
                Manage your client invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              {invoices && (invoices as any).length > 0 ? (
                <div className="space-y-4">
                  {(invoices as any).map((invoice: any) => (
                    <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{invoice.title || invoice.invoice_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {invoice.client_name} • {formatDate(invoice.created_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(invoice.total_amount)}</p>
                        <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
                          {invoice.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No invoices found</p>
                  <p className="text-sm">Create your first invoice to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Expenses</CardTitle>
              <CardDescription>
                Track your business expenses
              </CardDescription>
            </CardHeader>
            <CardContent>
              {expenses && (expenses as any).length > 0 ? (
                <div className="space-y-4">
                  {(expenses as any).map((expense: any) => (
                    <div key={expense.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{expense.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {expense.category} • {formatDate(expense.date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(expense.amount)}</p>
                        {expense.vendor && (
                          <p className="text-sm text-muted-foreground">{expense.vendor}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No expenses found</p>
                  <p className="text-sm">Add your first expense to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Client Revenue Analysis</CardTitle>
              <CardDescription>
                Revenue performance by client
              </CardDescription>
            </CardHeader>
            <CardContent>
              {clientBreakdown.length > 0 ? (
                <div className="space-y-4">
                  {clientBreakdown.map((client, index) => (
                    <div key={client.client_id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-medium">{client.client_name}</h4>
                          {client.company && (
                            <p className="text-sm text-muted-foreground">{client.company}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">{formatCurrency(client.total_revenue)}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">CRM Revenue</p>
                          <p className="font-medium">{formatCurrency(client.crm_revenue)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Invoice Revenue</p>
                          <p className="font-medium">{formatCurrency(client.invoice_revenue)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Direct Revenue</p>
                          <p className="font-medium">{formatCurrency(client.direct_revenue)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No client revenue data found</p>
                  <p className="text-sm">Revenue will appear here once you have deals, invoices, or direct revenue entries</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Financial Reports</CardTitle>
              <CardDescription>
                Generate comprehensive financial reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {REPORT_TYPES.map(reportType => (
                  <Button
                    key={reportType.value}
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center"
                    onClick={() => {
                      // Handle report generation
                      toast.info(`Generating ${reportType.label} report...`)
                    }}
                  >
                    <Download className="h-6 w-6 mb-2" />
                    <span className="text-sm">{reportType.label}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
