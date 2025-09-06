import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  Play,
  Pause,
  Square,
  Clock,
  Calendar,
  Plus,
  Edit,
  Trash2,
  Timer,
  TrendingUp,
  Download,
  Filter,
  Search,
  BarChart3,
  Target,
  Zap,
  Award
} from 'lucide-react'
import { formatDuration, formatDate } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { useTasks } from '@/services/taskService'

interface FocusSession {
  id: string
  task_name: string
  start_time: string
  end_time?: string
  duration: number
  is_running: boolean
  productivity_score?: number
  created_at: string
}

export function TimeTrackingPage() {
  const { user } = useAuth()
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([])
  const [runningSessions, setRunningSessions] = useState<FocusSession | null>(null)
  const [newSession, setNewSession] = useState({
    selected_task_id: '',
    custom_task_name: ''
  })
  const [loading, setLoading] = useState(true)
  const [filterBy, setFilterBy] = useState('week')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentTime, setCurrentTime] = useState(0)

  // Fetch current tasks for dropdown
  const { data: tasksData, isLoading: tasksLoading } = useTasks({ 
    limit: 50 
  })
  const availableTasks = ((tasksData as any)?.data?.tasks || []).filter((task: any) => 
    task.status === 'todo' || task.status === 'in_progress'
  )

  useEffect(() => {
    fetchFocusSessions()
    checkRunningSession()
  }, [user])

  // Update timer every second for running sessions
  useEffect(() => {
    const interval = setInterval(() => {
      if (runningSessions) {
        const elapsed = Math.floor((Date.now() - new Date(runningSessions.start_time).getTime()) / 1000)
        setCurrentTime(elapsed)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [runningSessions])

  const fetchFocusSessions = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setFocusSessions(data || [])
    } catch (error) {
      console.error('Error fetching focus sessions:', error)
      toast.error('Failed to load focus sessions')
      // Fallback to empty array
      setFocusSessions([])
    } finally {
      setLoading(false)
    }
  }

  const checkRunningSession = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_running', true)
        .limit(1)

      if (error) throw error
      
      if (data && data.length > 0) {
        setRunningSessions(data[0])
        const elapsed = Math.floor((Date.now() - new Date(data[0].start_time).getTime()) / 1000)
        setCurrentTime(elapsed)
      }
    } catch (error) {
      console.error('Error checking running session:', error)
    }
  }

  const startFocusSession = async () => {
    if (runningSessions) {
      toast.error('Stop the current session before starting a new one')
      return
    }

    let taskName = 'Focus Session'
    let taskId = null
    
    // Determine task name and ID based on selection
    if (newSession.selected_task_id) {
      const selectedTask = availableTasks.find(task => task.id === newSession.selected_task_id)
      if (selectedTask) {
        taskName = selectedTask.title
        taskId = selectedTask.id
      }
    } else if (newSession.custom_task_name && newSession.custom_task_name.trim()) {
      taskName = newSession.custom_task_name.trim()
    }

    try {
      const { data, error } = await supabase
        .from('focus_sessions')
        .insert({
          user_id: user?.id,
          task_name: taskName,
          task_id: taskId,
          start_time: new Date().toISOString(),
          is_running: true
        })
        .select()

      if (error) throw error
      
      if (data && data.length > 0) {
        setRunningSessions(data[0])
      }
      setCurrentTime(0)
      setNewSession({ selected_task_id: '', custom_task_name: '' })
      toast.success(`⏱️ Timer started: ${taskName}`, {
        description: 'Focus session is now tracking your time',
        duration: 3000
      })
    } catch (error) {
      console.error('Error starting session:', error)
      toast.error('Failed to start focus session')
    }
  }

  const stopFocusSession = async () => {
    if (!runningSessions) return

    const duration = Math.floor((Date.now() - new Date(runningSessions.start_time).getTime()) / 1000)
    
    // Calculate productivity score based on duration only
    let productivityScore = 0
    if (duration >= 1800) { // 30 minutes or more
      productivityScore = 100
    } else if (duration >= 900) { // 15-30 minutes
      productivityScore = 70
    } else if (duration >= 300) { // 5-15 minutes
      productivityScore = 50
    } else { // Less than 5 minutes
      productivityScore = 25
    }

    try {
      const { error } = await supabase
        .from('focus_sessions')
        .update({
          end_time: new Date().toISOString(),
          duration: duration,
          productivity_score: productivityScore,
          is_running: false
        })
        .eq('id', runningSessions.id)

      if (error) throw error

      // Update user stats (simplified)
      const focusMinutes = Math.floor(duration / 60)
      const points = Math.floor(productivityScore / 10)
      
      setRunningSessions(null)
      setCurrentTime(0)
      fetchFocusSessions()
      toast.success(`Focus session completed! ${focusMinutes} minutes tracked, earned ${points} points 🌟`)
    } catch (error) {
      console.error('Error stopping session:', error)
      toast.error('Failed to stop focus session')
    }
  }

  const deleteSession = async (id: string) => {
    try {
      const { error } = await supabase
        .from('focus_sessions')
        .delete()
        .eq('id', id)

      if (error) throw error

      setFocusSessions(prev => prev.filter(session => session.id !== id))
      toast.success('Focus session deleted')
    } catch (error) {
      console.error('Error deleting session:', error)
      toast.error('Failed to delete session')
    }
  }

  // Calculate productivity statistics
  const stats = {
    totalHours: focusSessions.reduce((sum, session) => sum + (session.duration / 3600), 0),
    averageFocusTime: focusSessions.length > 0 ? focusSessions.reduce((sum, session) => sum + session.duration, 0) / focusSessions.length / 60 : 0,
    totalSessions: focusSessions.length,
    averageProductivityScore: focusSessions.length > 0 ? focusSessions.reduce((sum, session) => sum + (session.productivity_score || 0), 0) / focusSessions.length : 0
  }

  // Prepare chart data
  const dailyData = focusSessions.reduce((acc: any[], session) => {
    const date = formatDate(session.created_at)
    const existing = acc.find(item => item.date === date)
    const hours = session.duration / 3600
    const productivity = session.productivity_score || 0
    
    if (existing) {
      existing.hours += hours
      existing.productivity = (existing.productivity + productivity) / 2
      existing.sessions += 1
    } else {
      acc.push({ 
        date, 
        hours, 
        productivity,
        sessions: 1
      })
    }
    return acc
  }, [])

  const taskData = focusSessions.reduce((acc: any[], session) => {
    const taskName = session.task_name || 'Untitled'
    const existing = acc.find(item => item.name === taskName)
    const hours = session.duration / 3600
    
    if (existing) {
      existing.hours += hours
      existing.sessions += 1
    } else {
      acc.push({ 
        name: taskName, 
        hours,
        sessions: 1
      })
    }
    return acc
  }, [])

  const COLORS = ['#10B981', '#F59E0B', '#EF4444'] // Green, Yellow, Red

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Productivity Tracking
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track your focus sessions and monitor productivity patterns
          </p>
        </div>
        <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white">
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>
      </div>

      {/* Productivity Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Focus Hours</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalHours.toFixed(1)}</p>
              </div>
              <Clock className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Session (min)</p>
                <p className="text-2xl font-bold text-green-600">{stats.averageFocusTime.toFixed(0)}</p>
              </div>
              <Timer className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Productivity Score</p>
                <p className="text-2xl font-bold text-green-600">{stats.averageProductivityScore.toFixed(0)}</p>
              </div>
              <Award className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Sessions</p>
                <p className="text-2xl font-bold text-orange-600">{stats.totalSessions}</p>
              </div>
              <Target className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Focus Session */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-green-600" />
              <span>Focus Session Tracker</span>
            </CardTitle>
            {runningSessions && (
              <div className="text-2xl font-mono font-bold text-green-600">
                {formatDuration(currentTime)}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Enhanced Time Tracking Interface with Task Dropdown */}
          <div className="space-y-4">
            {!runningSessions && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Task from Board
                  </label>
                  {tasksLoading ? (
                    <div className="h-10 bg-gray-100 animate-pulse rounded-md"></div>
                  ) : (
                    <select
                      value={newSession.selected_task_id}
                      onChange={(e) => {
                        setNewSession(prev => ({ 
                          ...prev, 
                          selected_task_id: e.target.value,
                          custom_task_name: '' // Clear custom input when selecting from dropdown
                        }))
                      }}
                      className="w-full h-10 px-3 border border-input bg-background rounded-md focus:ring-green-500 focus:border-green-500"
                      disabled={!!runningSessions}
                    >
                      <option value="">Select a task from your board...</option>
                      {availableTasks.map((task) => (
                        <option key={task.id} value={task.id}>
                          {task.title} ({task.priority ? task.priority.toUpperCase() : 'NO PRIORITY'})
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {availableTasks.length} active tasks available
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Or Enter Custom Task
                  </label>
                  <Input
                    value={newSession.custom_task_name}
                    onChange={(e) => {
                      setNewSession(prev => ({ 
                        ...prev, 
                        custom_task_name: e.target.value,
                        selected_task_id: '' // Clear dropdown when typing custom
                      }))
                    }}
                    placeholder="Custom focus session..."
                    disabled={!!runningSessions || !!newSession.selected_task_id}
                    className="focus:ring-green-500"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    For tasks not on your board
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-center">
              {runningSessions ? (
                <Button onClick={stopFocusSession} variant="destructive" size="lg" className="px-8">
                  <Square className="h-5 w-5 mr-2" />
                  Stop Timer
                </Button>
              ) : (
                <Button 
                  onClick={startFocusSession} 
                  size="lg" 
                  className="bg-green-600 hover:bg-green-700 px-8"
                  disabled={!newSession.selected_task_id && (!newSession.custom_task_name || !newSession.custom_task_name.trim())}
                >
                  <Timer className="h-5 w-5 mr-2" />
                  Start Timer
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Productivity Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Daily Productivity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyData.slice(-7)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Bar yAxisId="left" dataKey="hours" fill="#10B981" name="Hours" />
                <Bar yAxisId="right" dataKey="productivity" fill="#10B981" name="Productivity Score" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Task Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={taskData.slice(0, 10)} // Show top 10 tasks
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, sessions }) => `${name}: ${sessions} sessions`}
                  outerRadius={80}
                  fill="#10B981"
                  dataKey="sessions"
                >
                  {taskData.slice(0, 10).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Focus Sessions List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Focus Sessions</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search sessions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {focusSessions
              .filter(session => {
                const taskName = session.task_name || '';
                return taskName.toLowerCase().includes(searchQuery.toLowerCase());
              })
              .map(session => (
                <div key={session.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {session.task_name || 'Focus Session'}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
                          <span>{formatDate(session.created_at)}</span>
                          <span>• {Math.floor(session.duration / 60)} minutes</span>
                          <span>• Score: {session.productivity_score || 0}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-green-600">
                          {formatDuration(session.duration)}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge 
                            variant={session.productivity_score && session.productivity_score >= 70 ? 'default' : 'secondary'}
                            className={session.productivity_score && session.productivity_score >= 70 ? 'bg-green-500' : 'bg-gray-500'}
                          >
                            {session.productivity_score || 0} pts
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteSession(session.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
        </CardContent>
      </Card>
    </div>
  )
}