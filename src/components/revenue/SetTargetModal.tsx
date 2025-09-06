import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react'
import { format, addMonths, addQuarters, addYears, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns'
import { cn } from '@/lib/utils'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import RevenueService, { TARGET_PERIODS, TARGET_TYPES, formatCurrency } from '@/services/revenueService'
import { toast } from 'sonner'

interface SetTargetModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  users: Array<{ id: string; full_name: string; email: string }>
}

export function SetTargetModal({ open, onOpenChange, onSuccess, users }: SetTargetModalProps) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    user_id: '',
    target_amount: '',
    target_period: 'monthly' as 'monthly' | 'quarterly' | 'yearly',
    target_type: 'total' as 'total' | 'sales' | 'commission' | 'projects',
    start_date: new Date()
  })
  const [showCalendar, setShowCalendar] = useState(false)

  const setTargetMutation = useMutation({
    mutationFn: RevenueService.setRevenueTarget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenue-targets'] })
      queryClient.invalidateQueries({ queryKey: ['revenue-summary'] })
      onSuccess()
      onOpenChange(false)
      resetForm()
      toast.success('Revenue target set successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to set revenue target')
    }
  })

  const resetForm = () => {
    setFormData({
      user_id: '',
      target_amount: '',
      target_period: 'monthly',
      target_type: 'total',
      start_date: new Date()
    })
  }

  const calculatePeriodEnd = (startDate: Date, period: string) => {
    switch (period) {
      case 'monthly':
        return endOfMonth(startDate)
      case 'quarterly':
        return endOfQuarter(startDate)
      case 'yearly':
        return endOfYear(startDate)
      default:
        return endOfMonth(startDate)
    }
  }

  const calculatePeriodStart = (startDate: Date, period: string) => {
    switch (period) {
      case 'monthly':
        return startOfMonth(startDate)
      case 'quarterly':
        return startOfQuarter(startDate)
      case 'yearly':
        return startOfYear(startDate)
      default:
        return startOfMonth(startDate)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.user_id || !formData.target_amount) {
      toast.error('Please fill in all required fields')
      return
    }

    const periodStart = calculatePeriodStart(formData.start_date, formData.target_period)
    const periodEnd = calculatePeriodEnd(formData.start_date, formData.target_period)

    setTargetMutation.mutate({
      user_id: formData.user_id,
      target_amount: parseFloat(formData.target_amount),
      target_period: formData.target_period,
      target_type: formData.target_type,
      period_start: format(periodStart, 'yyyy-MM-dd'),
      period_end: format(periodEnd, 'yyyy-MM-dd')
    })
  }

  const periodStart = calculatePeriodStart(formData.start_date, formData.target_period)
  const periodEnd = calculatePeriodEnd(formData.start_date, formData.target_period)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Set Revenue Target</DialogTitle>
          <DialogDescription>
            Set a revenue target for a team member
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

          {/* Target Amount */}
          <div className="space-y-2">
            <Label htmlFor="target_amount">Target Amount *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
              <Input
                id="target_amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.target_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, target_amount: e.target.value }))}
                className="pl-8"
                required
              />
            </div>
          </div>

          {/* Target Period */}
          <div className="space-y-2">
            <Label htmlFor="target_period">Target Period</Label>
            <Select
              value={formData.target_period}
              onValueChange={(value: any) => setFormData(prev => ({ ...prev, target_period: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TARGET_PERIODS.map(period => (
                  <SelectItem key={period.value} value={period.value}>
                    {period.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Target Type */}
          <div className="space-y-2">
            <Label htmlFor="target_type">Target Type</Label>
            <Select
              value={formData.target_type}
              onValueChange={(value: any) => setFormData(prev => ({ ...prev, target_type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TARGET_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Popover open={showCalendar} onOpenChange={setShowCalendar}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !formData.start_date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.start_date ? (
                    format(formData.start_date, 'PPP')
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.start_date}
                  onSelect={(date) => {
                    if (date) {
                      setFormData(prev => ({ ...prev, start_date: date }))
                      setShowCalendar(false)
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Period Preview */}
          <div className="p-3 bg-muted rounded-md">
            <h4 className="text-sm font-medium mb-2">Target Period</h4>
            <div className="text-sm text-muted-foreground">
              <div>Start: {format(periodStart, 'MMM dd, yyyy')}</div>
              <div>End: {format(periodEnd, 'MMM dd, yyyy')}</div>
              <div className="mt-1 font-medium">
                Target: {formatCurrency(parseFloat(formData.target_amount) || 0)}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={setTargetMutation.isPending}>
              {setTargetMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Set Target
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}