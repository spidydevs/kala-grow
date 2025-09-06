import { UserRevenue, formatCurrency } from '@/services/revenueService'

export function exportRevenueToCSV(revenue: UserRevenue[], filename: string = 'revenue-data') {
  if (!revenue || revenue.length === 0) {
    throw new Error('No revenue data to export')
  }

  // Define CSV headers
  const headers = [
    'Date',
    'Source',
    'Type',
    'Category',
    'Amount',
    'Currency',
    'Status',
    'Client',
    'Project',
    'Description',
    'Notes',
    'Created At'
  ]

  // Convert revenue data to CSV rows
  const rows = revenue.map(item => [
    new Date(item.transaction_date).toLocaleDateString(),
    `"${item.revenue_source}"`,
    item.revenue_type,
    item.revenue_category || '',
    item.revenue_amount,
    item.currency,
    item.status,
    item.client?.name || '',
    item.project?.name || '',
    `"${item.description || ''}"`,
    `"${item.notes || ''}"`,
    new Date(item.created_at).toLocaleDateString()
  ])

  // Combine headers and rows
  const csvContent = [headers, ...rows]
    .map(row => row.join(','))
    .join('\n')

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

export function exportRevenueToJSON(revenue: UserRevenue[], filename: string = 'revenue-data') {
  if (!revenue || revenue.length === 0) {
    throw new Error('No revenue data to export')
  }

  const jsonContent = JSON.stringify(revenue, null, 2)
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' })
  const link = document.createElement('a')
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.json`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

// Summary export with totals and statistics
export function exportRevenueSummaryToCSV(
  revenue: UserRevenue[], 
  filename: string = 'revenue-summary'
) {
  if (!revenue || revenue.length === 0) {
    throw new Error('No revenue data to export')
  }

  // Calculate summary statistics
  const totalRevenue = revenue.reduce((sum, item) => sum + item.revenue_amount, 0)
  const salesRevenue = revenue.filter(item => item.revenue_type === 'sales').reduce((sum, item) => sum + item.revenue_amount, 0)
  const commissionRevenue = revenue.filter(item => item.revenue_type === 'commission').reduce((sum, item) => sum + item.revenue_amount, 0)
  const bonusRevenue = revenue.filter(item => item.revenue_type === 'bonus').reduce((sum, item) => sum + item.revenue_amount, 0)
  const projectRevenue = revenue.filter(item => item.revenue_type === 'project').reduce((sum, item) => sum + item.revenue_amount, 0)
  const transactionCount = revenue.length
  const averageDealSize = totalRevenue / transactionCount

  // Group by month
  const monthlyData = revenue.reduce((acc, item) => {
    const month = new Date(item.transaction_date).toISOString().slice(0, 7) // YYYY-MM
    if (!acc[month]) {
      acc[month] = { total: 0, count: 0 }
    }
    acc[month].total += item.revenue_amount
    acc[month].count += 1
    return acc
  }, {} as Record<string, { total: number; count: number }>)

  // Create summary content
  const summaryContent = [
    ['Revenue Summary Report'],
    ['Generated on:', new Date().toLocaleDateString()],
    [''],
    ['Overall Statistics'],
    ['Total Revenue:', totalRevenue],
    ['Sales Revenue:', salesRevenue],
    ['Commission Revenue:', commissionRevenue],
    ['Bonus Revenue:', bonusRevenue],
    ['Project Revenue:', projectRevenue],
    ['Total Transactions:', transactionCount],
    ['Average Deal Size:', averageDealSize.toFixed(2)],
    [''],
    ['Monthly Breakdown'],
    ['Month', 'Revenue', 'Transactions', 'Average'],
    ...Object.entries(monthlyData).map(([month, data]) => [
      month,
      data.total,
      data.count,
      (data.total / data.count).toFixed(2)
    ])
  ]

  const csvContent = summaryContent
    .map(row => row.join(','))
    .join('\n')

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}