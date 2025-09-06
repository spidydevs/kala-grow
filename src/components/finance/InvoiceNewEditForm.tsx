import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Trash2, Calculator, Save, Send, Eye, DollarSign, Percent, CalendarDays, Building, User, Mail, FileText, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface InvoiceLineItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  line_total: number
}

interface InvoiceFormData {
  // Client Information
  client_id?: string
  client_name: string
  client_email: string
  client_company: string
  client_address: string
  client_phone?: string
  
  // Invoice Details
  invoice_number?: string
  issue_date: string
  due_date: string
  payment_terms: string
  
  // Line Items
  line_items: InvoiceLineItem[]
  
  // Financial Calculations
  subtotal: number
  tax_rate: number
  tax_amount: number
  discount_amount: number
  discount_type: 'fixed' | 'percentage'
  total_amount: number
  
  // Additional Information
  notes: string
  terms_and_conditions: string
  payment_method?: string
  project_id?: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
}

interface Client {
  id: string
  name: string
  email?: string
  company?: string
  address?: string
  phone?: string
}

interface Props {
  invoice?: any // For editing existing invoices
  onSave?: (invoice: any) => void
  onCancel?: () => void
  mode?: 'create' | 'edit'
}

const generateInvoiceNumber = (): string => {
  const timestamp = Date.now().toString().slice(-6)
  const random = Math.random().toString(36).substring(2, 4).toUpperCase()
  return `INV-${timestamp}-${random}`
}

const generateLineItemId = (): string => {
  return Math.random().toString(36).substring(2, 15)
}

export function InvoiceNewEditForm({ invoice, onSave, onCancel, mode = 'create' }: Props) {
  const { user } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingClients, setLoadingClients] = useState(true)
  const [showClientDialog, setShowClientDialog] = useState(false)
  const [newClient, setNewClient] = useState({ name: '', email: '', company: '', address: '', phone: '' })
  
  const [formData, setFormData] = useState<InvoiceFormData>({
    client_name: '',
    client_email: '',
    client_company: '',
    client_address: '',
    client_phone: '',
    invoice_number: generateInvoiceNumber(),
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    payment_terms: '30',
    line_items: [
      {
        id: generateLineItemId(),
        description: '',
        quantity: 1,
        unit_price: 0,
        line_total: 0
      }
    ],
    subtotal: 0,
    tax_rate: 0,
    tax_amount: 0,
    discount_amount: 0,
    discount_type: 'fixed',
    total_amount: 0,
    notes: '',
    terms_and_conditions: 'Payment is due within 30 days of invoice date. Late payments may incur additional fees.',
    status: 'draft'
  })

  // Load existing invoice data for editing
  useEffect(() => {
    if (mode === 'edit' && invoice) {
      setFormData({
        ...invoice,
        issue_date: invoice.issue_date?.split('T')[0] || new Date().toISOString().split('T')[0],
        due_date: invoice.due_date?.split('T')[0] || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        line_items: invoice.line_items?.length > 0 ? invoice.line_items : [
          {
            id: generateLineItemId(),
            description: invoice.description || '',
            quantity: 1,
            unit_price: invoice.amount || 0,
            line_total: invoice.amount || 0
          }
        ]
      })
    }
  }, [invoice, mode])

  // Fetch clients
  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      setLoadingClients(true)
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, email, company, address, phone')
        .eq('status', 'active')
        .order('name')
      
      if (error) throw error
      setClients(data || [])
    } catch (error: any) {
      console.error('Error fetching clients:', error)
      toast.error('Failed to load clients')
    } finally {
      setLoadingClients(false)
    }
  }

  // Calculate totals whenever line items or tax/discount change
  const calculateTotals = useCallback(() => {
    const subtotal = formData.line_items.reduce((sum, item) => sum + item.line_total, 0)
    
    let discountAmount = formData.discount_amount
    if (formData.discount_type === 'percentage') {
      discountAmount = (subtotal * formData.discount_amount) / 100
    }
    
    const discountedSubtotal = subtotal - discountAmount
    const taxAmount = (discountedSubtotal * formData.tax_rate) / 100
    const totalAmount = discountedSubtotal + taxAmount

    setFormData(prev => ({
      ...prev,
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount
    }))
  }, [formData.line_items, formData.tax_rate, formData.discount_amount, formData.discount_type])

  useEffect(() => {
    calculateTotals()
  }, [calculateTotals])

  // Line item handlers
  const addLineItem = () => {
    setFormData(prev => ({
      ...prev,
      line_items: [...prev.line_items, {
        id: generateLineItemId(),
        description: '',
        quantity: 1,
        unit_price: 0,
        line_total: 0
      }]
    }))
  }

  const removeLineItem = (id: string) => {
    if (formData.line_items.length === 1) {
      toast.error('At least one line item is required')
      return
    }
    
    setFormData(prev => ({
      ...prev,
      line_items: prev.line_items.filter(item => item.id !== id)
    }))
  }

  const updateLineItem = (id: string, field: keyof InvoiceLineItem, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      line_items: prev.line_items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value }
          // Recalculate line total when quantity or unit_price changes
          if (field === 'quantity' || field === 'unit_price') {
            updatedItem.line_total = updatedItem.quantity * updatedItem.unit_price
          }
          return updatedItem
        }
        return item
      })
    }))
  }

  // Client selection handler
  const handleClientSelect = (clientId: string) => {
    const client = clients.find(c => c.id === clientId)
    if (client) {
      setFormData(prev => ({
        ...prev,
        client_id: client.id,
        client_name: client.name,
        client_email: client.email || '',
        client_company: client.company || '',
        client_address: client.address || '',
        client_phone: client.phone || ''
      }))
    }
  }

  // Create new client
  const handleCreateClient = async () => {
    try {
      if (!newClient.name.trim()) {
        toast.error('Client name is required')
        return
      }

      const { data, error } = await supabase
        .from('clients')
        .insert([{
          name: newClient.name,
          email: newClient.email,
          company: newClient.company,
          address: newClient.address,
          phone: newClient.phone,
          status: 'active',
          user_id: user?.id
        }])
        .select()
        .single()

      if (error) throw error

      setClients(prev => [...prev, data])
      handleClientSelect(data.id)
      setShowClientDialog(false)
      setNewClient({ name: '', email: '', company: '', address: '', phone: '' })
      toast.success('Client created successfully')
    } catch (error: any) {
      console.error('Error creating client:', error)
      toast.error('Failed to create client')
    }
  }

  // Form validation
  const validateForm = (): boolean => {
    if (!formData.client_name.trim()) {
      toast.error('Client name is required')
      return false
    }

    if (formData.line_items.length === 0) {
      toast.error('At least one line item is required')
      return false
    }

    const hasEmptyLineItems = formData.line_items.some(item => 
      !item.description.trim() || item.quantity <= 0 || item.unit_price < 0
    )

    if (hasEmptyLineItems) {
      toast.error('Please fill in all line item fields with valid values')
      return false
    }

    if (formData.total_amount <= 0) {
      toast.error('Invoice total must be greater than zero')
      return false
    }

    return true
  }

  // Save invoice
  const handleSave = async (status: 'draft' | 'sent' = 'draft') => {
    if (!validateForm()) return

    try {
      setLoading(true)
      
      const invoiceData = {
        ...formData,
        status,
        line_items: formData.line_items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_total: item.line_total
        }))
      }

      const { data, error } = await supabase.functions.invoke('finance', {
        body: {
          action: mode === 'edit' ? 'update_invoice' : 'create_invoice',
          params: mode === 'edit' ? { invoice_id: invoice?.id, ...invoiceData } : invoiceData
        }
      })

      if (error) throw error

      toast.success(`Invoice ${mode === 'edit' ? 'updated' : 'created'} successfully`)
      
      if (onSave) {
        onSave(data)
      }
    } catch (error: any) {
      console.error('Error saving invoice:', error)
      toast.error(`Failed to ${mode} invoice: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSendInvoice = () => {
    if (!formData.client_email.trim()) {
      toast.error('Client email is required to send invoice')
      return
    }
    handleSave('sent')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {mode === 'edit' ? 'Edit Invoice' : 'Create New Invoice'}
          </CardTitle>
          <CardDescription>
            {mode === 'edit' ? 'Update invoice details and line items' : 'Create a professional invoice for your client'}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form - Left Side */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Client Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor="client">Select Client</Label>
                    <Select
                      value={formData.client_id || ''}
                      onValueChange={handleClientSelect}
                      disabled={loadingClients}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose existing client or enter manually" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{client.name}</span>
                              {client.company && (
                                <span className="text-sm text-muted-foreground">{client.company}</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Dialog open={showClientDialog} onOpenChange={setShowClientDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="px-3">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Client</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="new_client_name">Name *</Label>
                          <Input
                            id="new_client_name"
                            value={newClient.name}
                            onChange={(e) => setNewClient(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Client name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="new_client_email">Email</Label>
                          <Input
                            id="new_client_email"
                            type="email"
                            value={newClient.email}
                            onChange={(e) => setNewClient(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="client@company.com"
                          />
                        </div>
                        <div>
                          <Label htmlFor="new_client_company">Company</Label>
                          <Input
                            id="new_client_company"
                            value={newClient.company}
                            onChange={(e) => setNewClient(prev => ({ ...prev, company: e.target.value }))}
                            placeholder="Company name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="new_client_address">Address</Label>
                          <Textarea
                            id="new_client_address"
                            value={newClient.address}
                            onChange={(e) => setNewClient(prev => ({ ...prev, address: e.target.value }))}
                            placeholder="Full address"
                            rows={3}
                          />
                        </div>
                        <div>
                          <Label htmlFor="new_client_phone">Phone</Label>
                          <Input
                            id="new_client_phone"
                            value={newClient.phone}
                            onChange={(e) => setNewClient(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder="Phone number"
                          />
                        </div>
                        <Button onClick={handleCreateClient} className="w-full">
                          Create Client
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="client_name">Client Name *</Label>
                    <Input
                      id="client_name"
                      value={formData.client_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, client_name: e.target.value }))}
                      placeholder="Client name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="client_email">Email</Label>
                    <Input
                      id="client_email"
                      type="email"
                      value={formData.client_email}
                      onChange={(e) => setFormData(prev => ({ ...prev, client_email: e.target.value }))}
                      placeholder="client@company.com"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="client_company">Company</Label>
                    <Input
                      id="client_company"
                      value={formData.client_company}
                      onChange={(e) => setFormData(prev => ({ ...prev, client_company: e.target.value }))}
                      placeholder="Company name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="client_phone">Phone</Label>
                    <Input
                      id="client_phone"
                      value={formData.client_phone || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, client_phone: e.target.value }))}
                      placeholder="Phone number"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="client_address">Address</Label>
                  <Textarea
                    id="client_address"
                    value={formData.client_address}
                    onChange={(e) => setFormData(prev => ({ ...prev, client_address: e.target.value }))}
                    placeholder="Client's full address"
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoice Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Invoice Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="invoice_number">Invoice Number</Label>
                  <Input
                    id="invoice_number"
                    value={formData.invoice_number || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, invoice_number: e.target.value }))}
                    placeholder="INV-001"
                  />
                </div>
                <div>
                  <Label htmlFor="issue_date">Issue Date</Label>
                  <Input
                    id="issue_date"
                    type="date"
                    value={formData.issue_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, issue_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="payment_terms">Payment Terms (days)</Label>
                  <Select
                    value={formData.payment_terms}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, payment_terms: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Due on receipt</SelectItem>
                      <SelectItem value="15">Net 15</SelectItem>
                      <SelectItem value="30">Net 30</SelectItem>
                      <SelectItem value="60">Net 60</SelectItem>
                      <SelectItem value="90">Net 90</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="payment_method">Payment Method</Label>
                  <Select
                    value={formData.payment_method || ''}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, payment_method: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="credit_card">Credit Card</SelectItem>
                      <SelectItem value="paypal">PayPal</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Line Items
                </CardTitle>
                <Button onClick={addLineItem} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Description</TableHead>
                      <TableHead className="w-[15%]">Qty</TableHead>
                      <TableHead className="w-[20%]">Unit Price</TableHead>
                      <TableHead className="w-[20%]">Total</TableHead>
                      <TableHead className="w-[5%]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.line_items.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Textarea
                            value={item.description}
                            onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                            placeholder="Describe the product or service"
                            className="min-h-[60px] resize-none"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                            className="text-center"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unit_price}
                              onChange={(e) => updateLineItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                              className="pl-10 text-right"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-right font-medium">
                            ${item.line_total.toFixed(2)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {formData.line_items.length > 1 && (
                            <Button
                              onClick={() => removeLineItem(item.id)}
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Notes and Terms */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any additional notes for the client"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="terms_and_conditions">Terms and Conditions</Label>
                <Textarea
                  id="terms_and_conditions"
                  value={formData.terms_and_conditions}
                  onChange={(e) => setFormData(prev => ({ ...prev, terms_and_conditions: e.target.value }))}
                  placeholder="Payment terms, late fees, etc."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoice Summary - Right Side */}
        <div className="space-y-6">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Invoice Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status:</span>
                <Badge variant={formData.status === 'draft' ? 'secondary' : 'default'}>
                  {formData.status.toUpperCase()}
                </Badge>
              </div>
              
              <Separator />
              
              {/* Calculations */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm">Subtotal:</span>
                  <span className="font-mono">${formData.subtotal.toFixed(2)}</span>
                </div>
                
                {/* Discount */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="discount_amount" className="text-sm">Discount:</Label>
                    <Select
                      value={formData.discount_type}
                      onValueChange={(value: 'fixed' | 'percentage') => 
                        setFormData(prev => ({ ...prev, discount_type: value, discount_amount: 0 }))
                      }
                    >
                      <SelectTrigger className="w-[80px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">$</SelectItem>
                        <SelectItem value="percentage">%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="relative flex-1 mr-2">
                      {formData.discount_type === 'fixed' && (
                        <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                      )}
                      {formData.discount_type === 'percentage' && (
                        <Percent className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                      )}
                      <Input
                        id="discount_amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.discount_amount}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          discount_amount: parseFloat(e.target.value) || 0
                        }))}
                        className={cn(
                          "h-8 text-sm",
                          formData.discount_type === 'fixed' ? "pl-6" : "pr-6"
                        )}
                      />
                    </div>
                    <span className="font-mono text-sm">
                      ${(formData.discount_type === 'percentage' 
                        ? (formData.subtotal * formData.discount_amount) / 100 
                        : formData.discount_amount
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
                
                {/* Tax */}
                <div className="space-y-2">
                  <Label htmlFor="tax_rate" className="text-sm">Tax Rate (%):</Label>
                  <div className="flex justify-between items-center">
                    <div className="relative flex-1 mr-2">
                      <Percent className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                      <Input
                        id="tax_rate"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={formData.tax_rate}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          tax_rate: parseFloat(e.target.value) || 0
                        }))}
                        className="h-8 text-sm pr-6"
                      />
                    </div>
                    <span className="font-mono text-sm">${formData.tax_amount.toFixed(2)}</span>
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="font-mono">${formData.total_amount.toFixed(2)}</span>
                </div>
              </div>
              
              <Separator />
              
              {/* Action Buttons */}
              <div className="space-y-2">
                <Button 
                  onClick={() => handleSave('draft')} 
                  disabled={loading}
                  className="w-full"
                  variant="outline"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save as Draft
                </Button>
                
                <Button 
                  onClick={handleSendInvoice} 
                  disabled={loading || !formData.client_email.trim()}
                  className="w-full"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                  Save & Send
                </Button>
                
                {onCancel && (
                  <Button 
                    onClick={onCancel} 
                    disabled={loading}
                    variant="ghost"
                    className="w-full"
                  >
                    Cancel
                  </Button>
                )}
              </div>
              
              {!formData.client_email.trim() && (
                <p className="text-xs text-muted-foreground text-center">
                  Client email required to send invoice
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}