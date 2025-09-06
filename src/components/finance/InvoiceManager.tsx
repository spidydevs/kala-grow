import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileText, Download, Plus, Eye, Edit, DollarSign, CalendarDays, Loader2, Send, Trash2, Filter, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

interface Invoice {
  id: string
  invoice_number: string
  client_name: string
  client_email?: string
  client_company?: string
  amount: number
  tax_amount: number
  total_amount: number
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  issue_date: string
  due_date: string
  paid_date?: string
  description: string
  payment_method?: string
  created_at: string
  invoice_line_items?: {
    id: string
    description: string
    quantity: number
    unit_price: number
    line_total: number
  }[]
}

export function InvoiceManager() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    if (user) {
      fetchInvoices()
    }
  }, [user])

  // Filter and sort invoices when filters change
  useEffect(() => {
    let filtered = [...invoices]
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(invoice => 
        invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.client_company?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === statusFilter)
    }
    
    // Sort
    filtered.sort((a, b) => {
      let aValue = a[sortBy as keyof Invoice] as string | number
      let bValue = b[sortBy as keyof Invoice] as string | number
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = (bValue as string).toLowerCase()
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })
    
    setFilteredInvoices(filtered)
  }, [invoices, searchTerm, statusFilter, sortBy, sortOrder])

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('finance-management-complete', {
        body: {
          action: 'get_invoices'
        }
      })
      
      if (error) {
        throw error
      }
      
      setInvoices(data?.data || [])
    } catch (error: any) {
      console.error('Error fetching invoices:', error)
      toast.error('Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateInvoice = () => {
    navigate('/finance/invoices/new')
  }

  const handleEditInvoice = (invoice: Invoice) => {
    navigate(`/finance/invoices/edit/${invoice.id}`)
  }

  const handleUpdateStatus = async (invoiceId: string, newStatus: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('finance-management-complete', {
        body: {
          action: 'update_invoice_status',
          params: {
            invoice_id: invoiceId,
            status: newStatus
          }
        }
      })
      
      if (error) throw error
      
      toast.success(`Invoice status updated to ${newStatus}`)
      fetchInvoices()
    } catch (error: any) {
      console.error('Error updating invoice status:', error)
      toast.error('Failed to update invoice status')
    }
  }

  const handleDownloadInvoice = async (invoice: Invoice) => {
    try {
      const { data, error } = await supabase.functions.invoke('finance-management-complete', {
        body: {
          action: 'generate_invoice_pdf',
          params: {
            invoice_id: invoice.id
          }
        }
      })
      
      if (error) {
        throw error
      }
      
      // Create a blob and download link
      const blob = new Blob([data], { type: 'text/html' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `invoice-${invoice.invoice_number}.html`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast.success('Invoice downloaded successfully')
    } catch (error: any) {
      console.error('Error downloading invoice:', error)
      toast.error('Failed to download invoice')
    }
  }

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      return
    }
    
    try {
      const { data, error } = await supabase.functions.invoke('finance-management-complete', {
        body: {
          action: 'delete_invoice',
          params: {
            invoice_id: invoiceId
          }
        }
      })
      
      if (error) throw error
      
      toast.success('Invoice deleted successfully')
      fetchInvoices()
    } catch (error: any) {
      console.error('Error deleting invoice:', error)
      toast.error('Failed to delete invoice')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'sent':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const totalRevenue = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.total_amount, 0)
    
  const pendingRevenue = invoices
    .filter(inv => inv.status === 'sent')
    .reduce((sum, inv) => sum + inv.total_amount, 0)
    
  const overdueRevenue = invoices
    .filter(inv => inv.status === 'overdue')
    .reduce((sum, inv) => sum + inv.total_amount, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2 text-muted-foreground">Loading invoices...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              From {invoices.filter(inv => inv.status === 'paid').length} paid invoices
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Revenue</CardTitle>
            <CalendarDays className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700">
              ${pendingRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              From {invoices.filter(inv => inv.status === 'sent').length} pending invoices
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <CalendarDays className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">
              ${overdueRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              From {invoices.filter(inv => inv.status === 'overdue').length} overdue invoices
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{invoices.length}</div>
            <p className="text-xs text-muted-foreground">
              Across all clients
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Invoices</CardTitle>
              <CardDescription>
                Manage and track all your invoices
              </CardDescription>
            </div>
            <Button onClick={handleCreateInvoice} className="shrink-0">
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          </div>
          
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
              const [field, order] = value.split('-')
              setSortBy(field)
              setSortOrder(order as 'asc' | 'desc')
            }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at-desc">Newest First</SelectItem>
                <SelectItem value="created_at-asc">Oldest First</SelectItem>
                <SelectItem value="total_amount-desc">Highest Amount</SelectItem>
                <SelectItem value="total_amount-asc">Lowest Amount</SelectItem>
                <SelectItem value="due_date-asc">Due Date (Earliest)</SelectItem>
                <SelectItem value="due_date-desc">Due Date (Latest)</SelectItem>
                <SelectItem value="client_name-asc">Client A-Z</SelectItem>
                <SelectItem value="client_name-desc">Client Z-A</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        
        <CardContent>
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                {invoices.length === 0 ? 'No invoices yet' : 'No invoices match your filters'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {invoices.length === 0 
                  ? 'Create your first invoice to get started'
                  : 'Try adjusting your search or filter criteria'
                }
              </p>
              {invoices.length === 0 && (
                <Button onClick={handleCreateInvoice}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Invoice
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span className="font-mono text-sm">{invoice.invoice_number}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{invoice.client_name}</div>
                          {invoice.client_company && (
                            <div className="text-sm text-muted-foreground">{invoice.client_company}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">${invoice.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                          <div className="text-sm text-muted-foreground">${invoice.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} + tax</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(invoice.status)}>
                          {invoice.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(invoice.issue_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className={`${new Date(invoice.due_date) < new Date() && invoice.status !== 'paid' ? 'text-red-600 font-medium' : ''}`}>
                          {new Date(invoice.due_date).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedInvoice(invoice)
                              setViewDialogOpen(true)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditInvoice(invoice)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadInvoice(invoice)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {invoice.status === 'draft' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateStatus(invoice.id, 'sent')}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                          {invoice.status === 'sent' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateStatus(invoice.id, 'paid')}
                            >
                              ✓
                            </Button>
                          )}
                          {invoice.status === 'draft' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteInvoice(invoice.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Invoice {selectedInvoice?.invoice_number}
            </DialogTitle>
            <DialogDescription>
              Invoice details and line items
            </DialogDescription>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-6">
              {/* Client Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">Bill To:</h4>
                    <div className="space-y-1">
                      <div className="font-medium">{selectedInvoice.client_name}</div>
                      {selectedInvoice.client_company && (
                        <div className="text-sm text-muted-foreground">{selectedInvoice.client_company}</div>
                      )}
                      {selectedInvoice.client_email && (
                        <div className="text-sm text-muted-foreground">{selectedInvoice.client_email}</div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Issue Date</div>
                      <div className="font-medium">{new Date(selectedInvoice.issue_date).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Due Date</div>
                      <div className="font-medium">{new Date(selectedInvoice.due_date).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Status</div>
                      <Badge className={getStatusColor(selectedInvoice.status)}>
                        {selectedInvoice.status.toUpperCase()}
                      </Badge>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Payment Method</div>
                      <div className="font-medium">{selectedInvoice.payment_method || 'Not specified'}</div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Line Items */}
              <div>
                <h4 className="font-medium mb-4">Invoice Items</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedInvoice.invoice_line_items?.map((item, index) => (
                      <TableRow key={item.id || index}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">${item.unit_price.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">${item.line_total.toFixed(2)}</TableCell>
                      </TableRow>
                    )) || (
                      <TableRow>
                        <TableCell>{selectedInvoice.description}</TableCell>
                        <TableCell className="text-center">1</TableCell>
                        <TableCell className="text-right">${selectedInvoice.amount.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">${selectedInvoice.amount.toFixed(2)}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Totals */}
              <div className="flex justify-end">
                <div className="space-y-2 min-w-[250px]">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${selectedInvoice.amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>${selectedInvoice.tax_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>${selectedInvoice.total_amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={() => handleEditInvoice(selectedInvoice)} variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Invoice
                </Button>
                <Button onClick={() => handleDownloadInvoice(selectedInvoice)} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                {selectedInvoice.status === 'draft' && (
                  <Button onClick={() => {
                    handleUpdateStatus(selectedInvoice.id, 'sent')
                    setViewDialogOpen(false)
                  }}>
                    <Send className="h-4 w-4 mr-2" />
                    Send Invoice
                  </Button>
                )}
                {selectedInvoice.status === 'sent' && (
                  <Button onClick={() => {
                    handleUpdateStatus(selectedInvoice.id, 'paid')
                    setViewDialogOpen(false)
                  }}>
                    Mark as Paid
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}