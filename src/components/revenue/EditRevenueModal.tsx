import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import RevenueService, { REVENUE_TYPES, REVENUE_CATEGORIES, UserRevenue } from '@/services/revenueService'
import { toast } from 'sonner'

interface EditRevenueModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  revenue: UserRevenue | null
  users: Array<{ id: string; full_name: string; email: string }>
}

export function EditRevenueModal({ open, onOpenChange, onSuccess, revenue, users }: EditRevenueModalProps) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    user_id: '',
    revenue_amount: '',
    revenue_source: '',
    revenue_type: '',
    revenue_category: 'general',
    transaction_date: new Date(),
    currency: 'USD',
    description: '',
    notes: '',
    status: 'active'
  })
  const [showCalendar, setShowCalendar] = useState(false)

  // Populate form when revenue changes
  useEffect(() => {
    if (revenue) {
      setFormData({
        user_id: revenue.user_id,
        revenue_amount: revenue.revenue_amount.toString(),
        revenue_source: revenue.revenue_source,
        revenue_type: revenue.revenue_type,
        revenue_category: revenue.revenue_category || 'general',
        transaction_date: new Date(revenue.transaction_date),
        currency: revenue.currency,
        description: revenue.description || '',
        notes: revenue.notes || '',
        status: revenue.status
      })
    }
  }, [revenue])

  const updateRevenueMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => RevenueService.updateRevenue(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenue-summary'] })
      queryClient.invalidateQueries({ queryKey: ['revenue-analytics'] })
      queryClient.invalidateQueries({ queryKey: ['revenue-data'] })
      queryClient.invalidateQueries({ queryKey: ['revenue-targets'] })
      onSuccess()
      onOpenChange(false)
      toast.success('Revenue updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update revenue')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!revenue || !formData.user_id || !formData.revenue_amount || !formData.revenue_source || !formData.revenue_type) {
      toast.error('Please fill in all required fields')
      return
    }

    updateRevenueMutation.mutate({
      id: revenue.id,
      updates: {
        user_id: formData.user_id,
        revenue_amount: parseFloat(formData.revenue_amount),
        revenue_source: formData.revenue_source,
        revenue_type: formData.revenue_type,
        revenue_category: formData.revenue_category,
        transaction_date: format(formData.transaction_date, 'yyyy-MM-dd'),
        currency: formData.currency,
        description: formData.description || undefined,
        notes: formData.notes || undefined,
        status: formData.status
      }
    })
  }

  if (!revenue) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Revenue Entry</DialogTitle>
          <DialogDescription>
            Update the revenue entry details
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* User Selection */}
          <div className="space-y-2">
            <Label htmlFor="user_id">User *</Label>
            <Select
              value={formData.user_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, user_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Revenue Amount */}
          <div className="space-y-2">
            <Label htmlFor="revenue_amount">Revenue Amount *</Label>
            <div className="flex">
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
              <Input
                id="revenue_amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.revenue_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, revenue_amount: e.target.value }))}
                className="flex-1 ml-2"
                required
              />
            </div>
          </div>

          {/* Revenue Source */}
          <div className="space-y-2">
            <Label htmlFor="revenue_source">Revenue Source *</Label>
            <Input
              id="revenue_source"
              placeholder="e.g., Client ABC Deal, Project XYZ"
              value={formData.revenue_source}
              onChange={(e) => setFormData(prev => ({ ...prev, revenue_source: e.target.value }))}
              required
            />
          </div>

          {/* Revenue Type */}
          <div className="space-y-2">
            <Label htmlFor="revenue_type">Revenue Type *</Label>
            <Select
              value={formData.revenue_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, revenue_type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {REVENUE_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Revenue Category */}
          <div className="space-y-2">
            <Label htmlFor="revenue_category">Category</Label>
            <Select
              value={formData.revenue_category}
              onValueChange={(value) => setFormData(prev => ({ ...prev, revenue_category: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REVENUE_CATEGORIES.map(category => (
                  <SelectItem key={category} value={category}>
                    {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="disputed">Disputed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Transaction Date */}
          <div className="space-y-2">
            <Label>Transaction Date</Label>
            <Popover open={showCalendar} onOpenChange={setShowCalendar}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !formData.transaction_date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.transaction_date ? (
                    format(formData.transaction_date, 'PPP')
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.transaction_date}
                  onSelect={(date) => {
                    if (date) {
                      setFormData(prev => ({ ...prev, transaction_date: date }))
                      setShowCalendar(false)
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Brief description of the revenue"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes or comments"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateRevenueMutation.isPending}>
              {updateRevenueMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Update Revenue
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}