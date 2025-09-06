import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import {
  CRMFinanceService
} from '@/services/crmFinanceService'
import {
  formatCurrency
} from '@/services'
import {
  Plus,
  Search,
  User,
  Phone,
  Mail,
  Building,
  DollarSign,
  Edit,
  Trash2,
  FileText,
  Calendar,
  Loader2,
  Download,
  Send,
  Eye,
  X,
  Target,
  TrendingUp,
  CheckCircle
} from 'lucide-react'

interface Client {
  id: string
  name: string
  email?: string
  phone?: string
  company?: string
  address?: string
  status: 'active' | 'inactive' | 'potential'
  lifetime_value: number
  created_at: string
}

interface Invoice {
  id: string
  client_id: string
  invoice_number: string
  title: string
  description: string
  amount: number
  tax_rate: number
  tax_amount: number
  total_amount: number
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  due_date: string
  created_at: string
}

interface Deal {
  id: string
  user_id: string
  client_id: string
  title: string
  description?: string
  value: number
  stage: 'prospecting' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost'
  probability: number
  expected_close_date?: string
  closed_date?: string
  created_at: string
  updated_at: string
  client?: {
    name: string
    company?: string
  }
}

interface DealFormData {
  client_id: string
  title: string
  description: string
  value: number
  stage: Deal['stage']
  probability: number
  expected_close_date: string
}

interface InvoiceItem {
  description: string
  quantity: number
  unit_price: number
  total_price: number
}

export function CRMPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTab, setSelectedTab] = useState<'clients' | 'invoices' | 'deals'>('clients')
  const [showCreateClient, setShowCreateClient] = useState(false)
  const [showCreateInvoice, setShowCreateInvoice] = useState(false)
  const [showCreateDeal, setShowCreateDeal] = useState(false)
  const [showInvoicePreview, setShowInvoicePreview] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [deals, setDeals] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false)
  const [previewContent, setPreviewContent] = useState('')
  
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Client form state
  const [clientForm, setClientForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    status: 'active' as const
  })

  // Deal form state
  const [dealForm, setDealForm] = useState<DealFormData>({
    client_id: '',
    title: '',
    description: '',
    value: 0,
    stage: 'prospecting',
    probability: 50,
    expected_close_date: ''
  })

  // Invoice form state
  const [invoiceForm, setInvoiceForm] = useState({
    client_id: '',
    title: '',
    description: '',
    due_date: '',
    tax_rate: 0,
    items: [{ description: '', quantity: 1, unit_price: 0, total_price: 0 }] as InvoiceItem[]
  })

  // Load data
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    if (!user) return
    
    setIsLoading(true)
    try {
      // Load clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (clientsError) throw clientsError
      setClients(clientsData || [])

      // Load invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (invoicesError) throw invoicesError
      setInvoices(invoicesData || [])

      // Load deals with client information
      const { data: dealsData, error: dealsError } = await supabase
        .from('deals')
        .select(`
          *,
          clients (
            id,
            name,
            company
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (dealsError) throw dealsError
      setDeals(dealsData || [])
    } catch (error: any) {
      console.error('Error loading data:', error)
      toast.error('Failed to load data: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateClient = async () => {
    if (!user || !clientForm.name.trim()) {
      toast.error('Please fill in the client name')
      return
    }

    try {
      const { data, error } = await supabase
        .from('clients')
        .insert({
          user_id: user.id,
          ...clientForm
        })
        .select()
        .single()

      if (error) throw error

      setClients(prev => [data, ...prev])
      setShowCreateClient(false)
      setClientForm({
        name: '',
        email: '',
        phone: '',
        company: '',
        address: '',
        status: 'active'
      })
      toast.success('Client created successfully!')

      // Log activity
      await supabase.functions.invoke('gamification-engine', {
        body: { action: 'custom_points', points: 10 },
        headers: { 'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` }
      })
    } catch (error: any) {
      console.error('Error creating client:', error)
      toast.error('Failed to create client: ' + error.message)
    }
  }

  const handleCreateInvoice = async () => {
    if (!user || !invoiceForm.client_id || !invoiceForm.title.trim()) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      // Calculate totals
      const subtotal = invoiceForm.items.reduce((sum, item) => sum + item.total_price, 0)
      const taxAmount = subtotal * (invoiceForm.tax_rate / 100)
      const total = subtotal + taxAmount
      const invoiceNumber = `INV-${Date.now()}`

      // Create invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          user_id: user.id,
          client_id: invoiceForm.client_id,
          invoice_number: invoiceNumber,
          title: invoiceForm.title,
          description: invoiceForm.description,
          amount: subtotal,
          tax_rate: invoiceForm.tax_rate,
          tax_amount: taxAmount,
          total_amount: total,
          status: 'draft',
          due_date: invoiceForm.due_date || null
        })
        .select()
        .single()

      if (invoiceError) throw invoiceError

      // Create invoice items
      const itemsData = invoiceForm.items.map(item => ({
        invoice_id: invoiceData.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price
      }))

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsData)

      if (itemsError) throw itemsError

      setInvoices(prev => [invoiceData, ...prev])
      setShowCreateInvoice(false)
      resetInvoiceForm()
      toast.success('Invoice created successfully!')

      // Update gamification
      await supabase.functions.invoke('gamification-engine', {
        body: { action: 'custom_points', points: 15 },
        headers: { 'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` }
      })
    } catch (error: any) {
      console.error('Error creating invoice:', error)
      toast.error('Failed to create invoice: ' + error.message)
    }
  }

  const handleGenerateInvoice = async (invoiceId: string) => {
    setIsGeneratingInvoice(true)
    try {
      const { data, error } = await supabase.functions.invoke('invoice-generator', {
        body: { invoiceId, format: 'html' },
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (error) throw error

      if (data?.data?.content) {
        setPreviewContent(data.data.content)
        setShowInvoicePreview(true)
        toast.success('Invoice generated successfully!')
      }
    } catch (error: any) {
      console.error('Error generating invoice:', error)
      toast.error('Failed to generate invoice: ' + error.message)
    } finally {
      setIsGeneratingInvoice(false)
    }
  }

  const downloadInvoiceAsHTML = () => {
    const blob = new Blob([previewContent], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `invoice-${Date.now()}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Invoice downloaded successfully!')
  }

  const resetInvoiceForm = () => {
    setInvoiceForm({
      client_id: '',
      title: '',
      description: '',
      due_date: '',
      tax_rate: 0,
      items: [{ description: '', quantity: 1, unit_price: 0, total_price: 0 }]
    })
  }

  const addInvoiceItem = () => {
    setInvoiceForm(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, unit_price: 0, total_price: 0 }]
    }))
  }

  const removeInvoiceItem = (index: number) => {
    setInvoiceForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const updateInvoiceItem = (index: number, field: keyof InvoiceItem, value: any) => {
    setInvoiceForm(prev => {
      const newItems = [...prev.items]
      newItems[index] = { ...newItems[index], [field]: value }
      
      // Recalculate total price for this item
      if (field === 'quantity' || field === 'unit_price') {
        newItems[index].total_price = newItems[index].quantity * newItems[index].unit_price
      }
      
      return { ...prev, items: newItems }
    })
  }

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId)
    return client?.name || 'Unknown Client'
  }

  // Deal management functions
  const handleCreateDeal = async () => {
    if (!user || !dealForm.client_id || !dealForm.title.trim()) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      const { data, error } = await supabase
        .from('deals')
        .insert({
          user_id: user.id,
          ...dealForm
        })
        .select(`
          *,
          clients (
            id,
            name,
            company
          )
        `)
        .single()

      if (error) throw error

      setDeals(prev => [data, ...prev])
      setShowCreateDeal(false)
      setDealForm({
        client_id: '',
        title: '',
        description: '',
        value: 0,
        stage: 'prospecting',
        probability: 50,
        expected_close_date: ''
      })
      toast.success('Deal created successfully!')

      // Log activity
      await supabase.functions.invoke('gamification-engine', {
        body: { action: 'custom_points', points: 15 },
        headers: { 'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` }
      })
    } catch (error: any) {
      console.error('Error creating deal:', error)
      toast.error('Failed to create deal: ' + error.message)
    }
  }

  const handleUpdateDealStage = async (dealId: string, newStage: Deal['stage']) => {
    if (!user) return

    try {
      const updateData: any = {
        stage: newStage,
        updated_at: new Date().toISOString()
      }

      // If marking as closed, set closed_date
      if (newStage === 'closed_won' || newStage === 'closed_lost') {
        updateData.closed_date = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('deals')
        .update(updateData)
        .eq('id', dealId)
        .eq('user_id', user.id)
        .select(`
          *,
          clients (
            id,
            name,
            company
          )
        `)
        .single()

      if (error) throw error

      // Update local state
      setDeals(prev => prev.map(deal => deal.id === dealId ? data : deal))

      // If deal is closed_won, automatically sync to revenue
      if (newStage === 'closed_won') {
        try {
          await CRMFinanceService.autoSyncDealStageChange(dealId, newStage, user.id)
          toast.success('Deal marked as won and revenue synced automatically!')
        } catch (syncError: any) {
          console.error('Error syncing deal to revenue:', syncError)
          toast.warning('Deal updated but revenue sync failed. Please check the Finance Hub.')
        }
      } else {
        toast.success(`Deal stage updated to ${newStage.replace('_', ' ')}`)
      }

    } catch (error: any) {
      console.error('Error updating deal stage:', error)
      toast.error('Failed to update deal stage: ' + error.message)
    }
  }

  const getStageColor = (stage: Deal['stage']) => {
    const colors = {
      prospecting: 'bg-gray-100 text-gray-800',
      qualified: 'bg-blue-100 text-blue-800',
      proposal: 'bg-yellow-100 text-yellow-800',
      negotiation: 'bg-orange-100 text-orange-800',
      closed_won: 'bg-green-100 text-green-800',
      closed_lost: 'bg-red-100 text-red-800'
    }
    return colors[stage] || 'bg-gray-100 text-gray-800'
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800'
      case 'sent': return 'bg-blue-100 text-blue-800'
      case 'overdue': return 'bg-red-100 text-red-800'
      case 'cancelled': return 'bg-gray-100 text-gray-800'
      default: return 'bg-yellow-100 text-yellow-800'
    }
  }

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.company?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredInvoices = invoices.filter(invoice => {
    const client = clients.find(c => c.id === invoice.client_id)
    return invoice.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
           invoice.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
           client?.name.toLowerCase().includes(searchQuery.toLowerCase())
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CRM & Finance Hub</h1>
          <p className="text-muted-foreground">
            Manage clients, create invoices, and track revenue
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowCreateClient(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Client
          </Button>
          <Button onClick={() => setShowCreateInvoice(true)} variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            Create Invoice
          </Button>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search clients, invoices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={(value: any) => setSelectedTab(value)}>
        <TabsList>
          <TabsTrigger value="clients">Clients ({clients.length})</TabsTrigger>
          <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>
          <TabsTrigger value="deals">Deals ({deals.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredClients.map((client) => (
              <Card key={client.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="truncate">{client.name}</span>
                    <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>
                      {client.status}
                    </Badge>
                  </CardTitle>
                  <CardDescription>{client.company}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {client.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>{formatCurrency(client.lifetime_value || 0)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" variant="outline" onClick={() => setEditingClient(client)}>
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <div className="space-y-4">
            {filteredInvoices.map((invoice) => (
              <Card key={invoice.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{invoice.invoice_number}</span>
                    <Badge className={getStatusColor(invoice.status)}>
                      {invoice.status}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {invoice.title} • {getClientName(invoice.client_id)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold">{formatCurrency(invoice.total_amount)}</p>
                      <p className="text-sm text-muted-foreground">
                        Due: {new Date(invoice.due_date || invoice.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleGenerateInvoice(invoice.id)}
                        disabled={isGeneratingInvoice}
                      >
                        {isGeneratingInvoice ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Eye className="h-3 w-3 mr-1" />
                        )}
                        Preview
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="deals" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Sales Pipeline</h3>
              <p className="text-sm text-muted-foreground">Manage your deals and opportunities</p>
            </div>
            <Button onClick={() => setShowCreateDeal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Deal
            </Button>
          </div>
          
          {deals.length > 0 ? (
            <div className="space-y-4">
              {/* Pipeline Summary */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                {[
                  { stage: 'prospecting', label: 'Prospecting', icon: Search },
                  { stage: 'qualified', label: 'Qualified', icon: CheckCircle },
                  { stage: 'proposal', label: 'Proposal', icon: FileText },
                  { stage: 'negotiation', label: 'Negotiation', icon: Target },
                  { stage: 'closed_won', label: 'Won', icon: TrendingUp },
                  { stage: 'closed_lost', label: 'Lost', icon: X }
                ].map(({ stage, label, icon: Icon }) => {
                  const stageDeals = deals.filter((deal: Deal) => deal.stage === stage)
                  const stageValue = stageDeals.reduce((sum: number, deal: Deal) => sum + deal.value, 0)
                  
                  return (
                    <Card key={stage} className="p-4 text-center">
                      <div className="flex items-center justify-center mb-2">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="text-sm font-medium">{label}</div>
                      <div className="text-xs text-muted-foreground">{stageDeals.length} deals</div>
                      <div className="text-sm font-semibold">{formatCurrency(stageValue)}</div>
                    </Card>
                  )
                })}
              </div>
              
              {/* Deals List */}
              <div className="space-y-4">
                {deals.map((deal: Deal) => (
                  <Card key={deal.id} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{deal.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {deal.client?.name} {deal.client?.company && `(${deal.client.company})`}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{formatCurrency(deal.value)}</div>
                        <div className="text-sm text-muted-foreground">{deal.probability}% probability</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge className={getStageColor(deal.stage)}>
                          {deal.stage.replace('_', ' ').toUpperCase()}
                        </Badge>
                        {deal.expected_close_date && (
                          <span className="text-xs text-muted-foreground">
                            Expected: {new Date(deal.expected_close_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {deal.stage !== 'closed_won' && deal.stage !== 'closed_lost' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const stages: Deal['stage'][] = ['prospecting', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost']
                                const currentIndex = stages.indexOf(deal.stage)
                                if (currentIndex < stages.length - 2) {
                                  handleUpdateDealStage(deal.id, stages[currentIndex + 1])
                                }
                              }}
                            >
                              Advance
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateDealStage(deal.id, 'closed_won')}
                              className="text-green-600 hover:text-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Win
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateDealStage(deal.id, 'closed_lost')}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="h-4 w-4 mr-1" />
                              Lose
                            </Button>
                          </>
                        )}
                        {deal.stage === 'closed_won' && (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Revenue Synced
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {deal.description && (
                      <p className="text-sm text-muted-foreground mt-2">{deal.description}</p>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No deals found</p>
              <p className="text-sm text-muted-foreground">Create your first deal to start tracking opportunities</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Client Dialog */}
      <Dialog open={showCreateClient} onOpenChange={setShowCreateClient}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
            <DialogDescription>
              Create a new client profile for your CRM
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Client Name *</Label>
              <Input
                id="name"
                value={clientForm.name}
                onChange={(e) => setClientForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter client name"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={clientForm.email}
                onChange={(e) => setClientForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="client@example.com"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={clientForm.phone}
                onChange={(e) => setClientForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="(555) 123-4567"
              />
            </div>
            <div>
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={clientForm.company}
                onChange={(e) => setClientForm(prev => ({ ...prev, company: e.target.value }))}
                placeholder="Company name"
              />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={clientForm.address}
                onChange={(e) => setClientForm(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Full address"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateClient(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateClient}>
                Create Client
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Invoice Dialog */}
      <Dialog open={showCreateInvoice} onOpenChange={setShowCreateInvoice}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Invoice</DialogTitle>
            <DialogDescription>
              Generate a professional invoice for your client
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="client">Client *</Label>
                <select
                  id="client"
                  value={invoiceForm.client_id}
                  onChange={(e) => setInvoiceForm(prev => ({ ...prev, client_id: e.target.value }))}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">Select a client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} - {client.company}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={invoiceForm.due_date}
                  onChange={(e) => setInvoiceForm(prev => ({ ...prev, due_date: e.target.value }))}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="title">Invoice Title *</Label>
              <Input
                id="title"
                value={invoiceForm.title}
                onChange={(e) => setInvoiceForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Website Development Services"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={invoiceForm.description}
                onChange={(e) => setInvoiceForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Additional details about the invoice"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <Label>Invoice Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={addInvoiceItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>
              
              <div className="space-y-3">
                {invoiceForm.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      <Label>Description</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => updateInvoiceItem(index, 'description', e.target.value)}
                        placeholder="Service or product"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Qty</Label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateInvoiceItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        min="1"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Unit Price</Label>
                      <Input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => updateInvoiceItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Total</Label>
                      <Input
                        value={formatCurrency(item.total_price)}
                        disabled
                      />
                    </div>
                    <div className="col-span-1">
                      {invoiceForm.items.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeInvoiceItem(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                <Input
                  id="tax_rate"
                  type="number"
                  value={invoiceForm.tax_rate}
                  onChange={(e) => setInvoiceForm(prev => ({ ...prev, tax_rate: parseFloat(e.target.value) || 0 }))}
                  min="0"
                  max="100"
                  step="0.01"
                />
              </div>
              <div className="flex items-end">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Subtotal</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(invoiceForm.items.reduce((sum, item) => sum + item.total_price, 0))}
                  </p>
                  {invoiceForm.tax_rate > 0 && (
                    <>
                      <p className="text-sm text-muted-foreground">Tax ({invoiceForm.tax_rate}%)</p>
                      <p className="text-sm">
                        {formatCurrency(
                          invoiceForm.items.reduce((sum, item) => sum + item.total_price, 0) * (invoiceForm.tax_rate / 100)
                        )}
                      </p>
                    </>
                  )}
                  <p className="text-sm text-muted-foreground border-t pt-1 mt-1">Total</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(
                      invoiceForm.items.reduce((sum, item) => sum + item.total_price, 0) * (1 + invoiceForm.tax_rate / 100)
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateInvoice(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateInvoice}>
                Create Invoice
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice Preview Dialog */}
      <Dialog open={showInvoicePreview} onOpenChange={setShowInvoicePreview}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Invoice Preview</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={downloadInvoiceAsHTML}>
                  <Download className="h-4 w-4 mr-1" />
                  Download HTML
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowInvoicePreview(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="border rounded-lg overflow-hidden">
            <div 
              className="h-[600px] overflow-y-auto p-4 bg-white"
              dangerouslySetInnerHTML={{ __html: previewContent }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Deal Dialog */}
      <Dialog open={showCreateDeal} onOpenChange={setShowCreateDeal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Deal</DialogTitle>
            <DialogDescription>
              Create a new sales opportunity
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="deal_title">Deal Title *</Label>
              <Input
                id="deal_title"
                value={dealForm.title}
                onChange={(e) => setDealForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Website Development Project"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deal_client">Client *</Label>
                <Select 
                  value={dealForm.client_id} 
                  onValueChange={(value) => setDealForm(prev => ({ ...prev, client_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name} {client.company && `(${client.company})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="deal_value">Deal Value *</Label>
                <Input
                  id="deal_value"
                  type="number"
                  step="0.01"
                  value={dealForm.value}
                  onChange={(e) => setDealForm(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deal_stage">Stage</Label>
                <Select 
                  value={dealForm.stage} 
                  onValueChange={(value: Deal['stage']) => setDealForm(prev => ({ ...prev, stage: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prospecting">Prospecting</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="proposal">Proposal</SelectItem>
                    <SelectItem value="negotiation">Negotiation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="deal_probability">Probability (%)</Label>
                <Input
                  id="deal_probability"
                  type="number"
                  min="0"
                  max="100"
                  value={dealForm.probability}
                  onChange={(e) => setDealForm(prev => ({ ...prev, probability: parseInt(e.target.value) || 0 }))}
                  placeholder="50"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="deal_close_date">Expected Close Date</Label>
              <Input
                id="deal_close_date"
                type="date"
                value={dealForm.expected_close_date}
                onChange={(e) => setDealForm(prev => ({ ...prev, expected_close_date: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="deal_description">Description</Label>
              <Textarea
                id="deal_description"
                value={dealForm.description}
                onChange={(e) => setDealForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Additional details about this opportunity"
                className="min-h-[80px]"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowCreateDeal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateDeal}>
              <Plus className="h-4 w-4 mr-2" />
              Create Deal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { CRMPage as EnhancedCRMPage }