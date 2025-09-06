import React, { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Edit, Trash2, Search, Filter, Download } from 'lucide-react'
import { UserRevenue, formatCurrency, formatRevenueType, getRevenueTypeColor } from '@/services/revenueService'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface RevenueTableProps {
  revenue: UserRevenue[]
  onEdit?: (revenue: UserRevenue) => void
  onDelete?: (revenue: UserRevenue) => void
}

export function RevenueTable({ revenue, onEdit, onDelete }: RevenueTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('')

  const filteredRevenue = revenue.filter(item => {
    const matchesSearch = !searchTerm || 
      item.revenue_source.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.client?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = !filterType || item.revenue_type === filterType
    
    return matchesSearch && matchesType
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      case 'disputed':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Revenue Details</CardTitle>
            <CardDescription>
              Complete list of revenue entries with transaction details
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
        
        {/* Search and Filter */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search revenue entries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">All Types</option>
            <option value="sales">Sales</option>
            <option value="commission">Commission</option>
            <option value="bonus">Bonus</option>
            <option value="project">Project</option>
            <option value="retainer">Retainer</option>
            <option value="other">Other</option>
          </select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Description</TableHead>
                {(onEdit || onDelete) && <TableHead className="w-12"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRevenue.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No revenue entries found
                  </TableCell>
                </TableRow>
              ) : (
                filteredRevenue.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {format(new Date(item.transaction_date), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.revenue_source}</div>
                        {item.revenue_category && (
                          <div className="text-xs text-muted-foreground">
                            {item.revenue_category.replace('_', ' ')}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('text-xs', getRevenueTypeColor(item.revenue_type))}>
                        {formatRevenueType(item.revenue_type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatCurrency(item.revenue_amount, item.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-xs', getStatusColor(item.status))}>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.client ? (
                        <div>
                          <div className="font-medium">{item.client.name}</div>
                          {item.client.company && (
                            <div className="text-xs text-muted-foreground">
                              {item.client.company}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate" title={item.description}>
                        {item.description || '-'}
                      </div>
                    </TableCell>
                    {(onEdit || onDelete) && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {onEdit && (
                              <DropdownMenuItem onClick={() => onEdit(item)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            {onDelete && (
                              <DropdownMenuItem 
                                onClick={() => onDelete(item)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {filteredRevenue.length > 0 && (
          <div className="flex items-center justify-between pt-4">
            <p className="text-sm text-muted-foreground">
              Showing {filteredRevenue.length} of {revenue.length} entries
            </p>
            <div className="text-sm font-medium">
              Total: {formatCurrency(
                filteredRevenue.reduce((sum, item) => sum + item.revenue_amount, 0)
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}