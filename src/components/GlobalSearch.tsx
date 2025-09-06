import React, { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Search,
  CheckCircle2,
  User,
  FileText,
  Clock,
  DollarSign,
  Loader2,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/services'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

interface SearchResult {
  id: string
  type: 'task' | 'client' | 'invoice'
  title: string
  description: string
  status?: string
  priority?: string
  revenue?: number
  amount?: number
  created_at: string
}

interface SearchResults {
  tasks: SearchResult[]
  clients: SearchResult[]
  invoices: SearchResult[]
}

interface GlobalSearchProps {
  className?: string
}

export function GlobalSearch({ className }: GlobalSearchProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults>({ tasks: [], clients: [], invoices: [] })
  const [isSearching, setIsSearching] = useState(false)
  const [totalResults, setTotalResults] = useState(0)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
        setTimeout(() => inputRef.current?.focus(), 100)
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
        setQuery('')
        setResults({ tasks: [], clients: [], invoices: [] })
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Handle clicks outside search
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults({ tasks: [], clients: [], invoices: [] })
      setTotalResults(0)
      return
    }

    const timeoutId = setTimeout(() => {
      performSearch(query)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query])

  const performSearch = async (searchQuery: string) => {
    setIsSearching(true)
    try {
      const { data, error } = await supabase.functions.invoke('global-search', {
        body: { query: searchQuery, limit: 20 }
      })

      if (error) {
        throw new Error(error.message || 'Search failed')
      }

      setResults(data.data.results)
      setTotalResults(data.data.total_results)
    } catch (error: any) {
      console.error('Search error:', error)
      toast.error('Search failed. Please try again.')
    } finally {
      setIsSearching(false)
    }
  }

  const handleResultClick = (result: SearchResult) => {
    switch (result.type) {
      case 'task':
        navigate('/tasks')
        break
      case 'client':
        navigate('/crm')
        break
      case 'invoice':
        navigate('/finance')
        break
    }
    setIsOpen(false)
    setQuery('')
  }

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'task': return CheckCircle2
      case 'client': return User
      case 'invoice': return FileText
      default: return Search
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'paid':
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'overdue': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
      case 'medium': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  return (
    <div className={cn('relative', className)} ref={searchRef}>
      {/* Search Trigger */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          ref={inputRef}
          placeholder="Search tasks, clients, invoices... (⌘K)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="pl-10 pr-10"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            onClick={() => {
              setQuery('')
              setResults({ tasks: [], clients: [], invoices: [] })
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (query.length >= 2 || totalResults > 0) && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50 max-h-[400px] overflow-hidden">
          <CardContent className="p-0">
            {/* Search Status */}
            <div className="px-4 py-3 border-b bg-muted/50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {isSearching ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Searching...</span>
                    </div>
                  ) : (
                    <span>
                      {totalResults > 0 ? `Found ${totalResults} results` : 
                       query.length >= 2 ? 'No results found' : 'Type to search'}
                    </span>
                  )}
                </div>
                <kbd className="pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 hidden sm:inline-flex">
                  ESC
                </kbd>
              </div>
            </div>

            {/* Results */}
            {totalResults > 0 && (
              <div className="max-h-[300px] overflow-y-auto">
                {/* Tasks */}
                {results.tasks.length > 0 && (
                  <div className="p-2">
                    <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Tasks ({results.tasks.length})
                    </div>
                    {results.tasks.map((result) => {
                      const Icon = getResultIcon(result.type)
                      return (
                        <div
                          key={`${result.type}-${result.id}`}
                          className="flex items-center space-x-3 px-2 py-2 rounded-md hover:bg-muted cursor-pointer"
                          onClick={() => handleResultClick(result)}
                        >
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{result.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{result.description}</p>
                          </div>
                          <div className="flex items-center space-x-1">
                            {result.status && (
                              <Badge className={`text-xs ${getStatusColor(result.status)}`}>
                                {result.status}
                              </Badge>
                            )}
                            {result.priority && (
                              <Badge className={`text-xs ${getPriorityColor(result.priority)}`}>
                                {result.priority}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Clients */}
                {results.clients.length > 0 && (
                  <div className="p-2 border-t">
                    <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Clients ({results.clients.length})
                    </div>
                    {results.clients.map((result) => {
                      const Icon = getResultIcon(result.type)
                      return (
                        <div
                          key={`${result.type}-${result.id}`}
                          className="flex items-center space-x-3 px-2 py-2 rounded-md hover:bg-muted cursor-pointer"
                          onClick={() => handleResultClick(result)}
                        >
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{result.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{result.description}</p>
                          </div>
                          <div className="flex items-center space-x-1">
                            {result.status && (
                              <Badge className={`text-xs ${getStatusColor(result.status)}`}>
                                {result.status}
                              </Badge>
                            )}
                            {result.revenue && (
                              <div className="flex items-center space-x-1 text-xs text-green-600">
                                <DollarSign className="h-3 w-3" />
                                <span>{formatCurrency(result.revenue)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Invoices */}
                {results.invoices.length > 0 && (
                  <div className="p-2 border-t">
                    <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Invoices ({results.invoices.length})
                    </div>
                    {results.invoices.map((result) => {
                      const Icon = getResultIcon(result.type)
                      return (
                        <div
                          key={`${result.type}-${result.id}`}
                          className="flex items-center space-x-3 px-2 py-2 rounded-md hover:bg-muted cursor-pointer"
                          onClick={() => handleResultClick(result)}
                        >
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{result.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{result.description}</p>
                          </div>
                          <div className="flex items-center space-x-1">
                            {result.status && (
                              <Badge className={`text-xs ${getStatusColor(result.status)}`}>
                                {result.status}
                              </Badge>
                            )}
                            {result.amount && (
                              <div className="flex items-center space-x-1 text-xs text-green-600">
                                <DollarSign className="h-3 w-3" />
                                <span>{formatCurrency(result.amount)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* No Results */}
            {!isSearching && totalResults === 0 && query.length >= 2 && (
              <div className="px-4 py-8 text-center">
                <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No results found for "{query}"
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try searching for tasks, clients, or invoices
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}