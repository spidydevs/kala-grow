import React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Loader2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import RevenueService, { UserRevenue, formatCurrency } from '@/services/revenueService'
import { toast } from 'sonner'

interface DeleteRevenueDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  revenue: UserRevenue | null
  onSuccess: () => void
}

export function DeleteRevenueDialog({ open, onOpenChange, revenue, onSuccess }: DeleteRevenueDialogProps) {
  const queryClient = useQueryClient()

  const deleteRevenueMutation = useMutation({
    mutationFn: (revenueId: string) => RevenueService.deleteRevenue(revenueId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenue-summary'] })
      queryClient.invalidateQueries({ queryKey: ['revenue-analytics'] })
      queryClient.invalidateQueries({ queryKey: ['revenue-data'] })
      queryClient.invalidateQueries({ queryKey: ['revenue-targets'] })
      onSuccess()
      onOpenChange(false)
      toast.success('Revenue entry deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete revenue entry')
    }
  })

  const handleDelete = () => {
    if (!revenue) return
    deleteRevenueMutation.mutate(revenue.id)
  }

  if (!revenue) return null

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Revenue Entry</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this revenue entry? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="py-4">
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Amount:</span>
              <span className="text-sm font-medium">
                {formatCurrency(revenue.revenue_amount, revenue.currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Source:</span>
              <span className="text-sm font-medium">{revenue.revenue_source}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Type:</span>
              <span className="text-sm font-medium">
                {revenue.revenue_type.charAt(0).toUpperCase() + revenue.revenue_type.slice(1)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Date:</span>
              <span className="text-sm font-medium">
                {new Date(revenue.transaction_date).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteRevenueMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteRevenueMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Delete Revenue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}