import React, { useState, useEffect } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, useDroppable } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Plus,
  Search,
  CheckCircle2,
  PlayCircle,
  Target,
  Clock,
  AlertCircle,
  Edit,
  Trash2,
  Calendar,
  User as UserIcon,
  Loader2,
  Flag,
  MoreHorizontal,
  LayoutGrid,
  List,
  Columns3
} from 'lucide-react'
import {
  useTasks,
  useCreateTask,
  useUpdateTask,
  useCompleteTask,
  useDeleteTask,
  formatDate,
  formatRelativeTime,
  getPriorityColor,
  getStatusColor,
  TASK_PRIORITIES,
  TASK_STATUSES
} from '@/services'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { EnhancedAIAssistant } from '@/components/EnhancedAIAssistant'
import { AssignmentManager } from '@/components/features/tasks/AssignmentManager'
import { gamificationService } from '@/services/gamificationService'
import { userService, User, useUsers } from '@/services/userService'
import { useAuth } from '@/contexts/AuthContext'
import { useIsAdmin } from '@/hooks/useRoleVerification'
import { useQueryClient } from '@tanstack/react-query'

interface TaskFormData {
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'todo' | 'in_progress' | 'review' | 'completed'
  category_id?: string
  project_id?: string
  assigned_to?: string[] // Support for multiple user assignments
  due_date: string
  estimated_hours?: number
  tags: string[]
}

// Kanban Column Configuration
const KANBAN_COLUMNS = [
  {
    id: 'todo',
    title: 'To Do',
    color: '#6B7280', // gray
    icon: Clock
  },
  {
    id: 'in_progress',
    title: 'In Progress',
    color: '#3B82F6', // blue
    icon: PlayCircle
  },
  {
    id: 'review',
    title: 'In Review',
    color: '#F97316', // orange instead of harsh yellow
    icon: AlertCircle
  },
  {
    id: 'completed',
    title: 'Completed',
    color: '#10B981', // green
    icon: CheckCircle2
  }
]

// Draggable Task Card Component
interface TaskCardProps {
  task: any
  onEdit: (task: any) => void
  onDelete: (taskId: string) => void
  onComplete: (taskId: string) => void
  onManageAssignments?: (task: any) => void // New prop for assignment management
  isCompleting?: boolean
  isDeleting?: boolean
  isAdmin?: boolean // New prop to show admin features
}

const TaskCard = React.memo(function TaskCard({ task, onEdit, onDelete, onComplete, onManageAssignments, isCompleting, isDeleting, isAdmin }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.9 : 1,
    zIndex: isDragging ? 9999 : 'auto',
    position: isDragging ? 'fixed' : 'static',
    pointerEvents: isDragging ? 'none' : 'auto',
    cursor: isDragging ? 'grabbing' : 'grab'
  } as React.CSSProperties

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "mb-3 transform-gpu transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]",
        isDragging && "shadow-2xl rotate-2 scale-105"
      )}
    >
      <Card className="cursor-move hover:shadow-lg transition-all duration-200">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {task.title}
              </CardTitle>
              {task.description && (
                <CardDescription className="text-xs mt-1 line-clamp-2">
                  {task.description}
                </CardDescription>
              )}
            </div>
            <div className="flex items-center space-x-1">
              {isAdmin && onManageAssignments && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation()
                    onManageAssignments(task)
                  }}
                  title="Manage Assignments"
                >
                  <UserIcon className="h-3 w-3" />
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation()
                  onEdit(task)
                }}
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(task.id)
                }}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Badge className={getPriorityColor(task.priority)} variant="secondary">
                <Flag className="h-3 w-3 mr-1" />
                {task.priority}
              </Badge>
              {task.status !== 'completed' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    onComplete(task.id)
                  }}
                  disabled={isCompleting}
                  className="h-6 px-2 text-xs"
                >
                  {isCompleting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3 w-3" />
                  )}
                </Button>
              )}
            </div>
            
            {task.due_date && (
              <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                <Calendar className="h-3 w-3 mr-1" />
                <span>Due {formatDate(task.due_date)}</span>
              </div>
            )}
            
            {task.estimated_hours && (
              <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                <Clock className="h-3 w-3 mr-1" />
                <span>{task.estimated_hours}h</span>
              </div>
            )}
            
            {task.assigned_to && task.assigned_to.length > 0 && (
              <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                <UserIcon className="h-3 w-3 mr-1" />
                <span>{task.assigned_to.length} assigned</span>
              </div>
            )}
            
            {task.tags && task.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {task.tags.slice(0, 2).map((tag: string, index: number) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {task.tags.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{task.tags.length - 2}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
})

// Kanban Column Component
interface KanbanColumnProps {
  column: typeof KANBAN_COLUMNS[0]
  tasks: any[]
  onAddTask: (status: string) => void
  onEditTask: (task: any) => void
  onDeleteTask: (taskId: string) => void
  onCompleteTask: (taskId: string) => void
  onManageAssignments?: (task: any) => void // New prop
  isCompleting?: boolean
  isDeleting?: boolean
  isAdmin?: boolean // New prop
}

const KanbanColumn = React.memo(function KanbanColumn({ 
  column, 
  tasks, 
  onAddTask, 
  onEditTask, 
  onDeleteTask, 
  onCompleteTask,
  onManageAssignments,
  isCompleting,
  isDeleting,
  isAdmin
}: KanbanColumnProps) {
  const Icon = column.icon
  const { setNodeRef, isOver } = useDroppable({
    id: column.id
  })
  
  return (
    <div className="flex-shrink-0 w-80">
      <Card className={`h-full transition-colors ${
        isOver ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-900/20' : ''
      }`}>
        <CardHeader className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: column.color }}
              />
              <Icon className="h-4 w-4" style={{ color: column.color }} />
              <CardTitle className="text-sm font-semibold">{column.title}</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {tasks.length}
              </Badge>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6"
              onClick={() => onAddTask(column.id)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-4" ref={setNodeRef}>
          <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <div className={`space-y-3 min-h-[400px] rounded-lg transition-colors ${
              isOver ? 'bg-green-100 dark:bg-green-800/20' : ''
            }`}>
              {tasks.map((task) => (
                <TaskCard 
                  key={task.id} 
                  task={task}
                  onEdit={onEditTask}
                  onDelete={onDeleteTask}
                  onComplete={onCompleteTask}
                  onManageAssignments={onManageAssignments}
                  isCompleting={isCompleting}
                  isDeleting={isDeleting}
                  isAdmin={isAdmin}
                />
              ))}
              
              {tasks.length === 0 && (
                <div className="flex items-center justify-center h-32 text-gray-400 dark:text-gray-600">
                  <div className="text-center">
                    <Icon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{isOver ? 'Drop task here' : 'No tasks yet'}</p>
                  </div>
                </div>
              )}
            </div>
          </SortableContext>
        </CardContent>
      </Card>
    </div>
  )
})

export function TasksPage() {
  const { user } = useAuth()
  const { isAdmin } = useIsAdmin()
  const queryClient = useQueryClient()
  const [selectedTab, setSelectedTab] = useState<'all' | 'todo' | 'in_progress' | 'completed'>('all')
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list')
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [editingTask, setEditingTask] = useState<any>(null)
  const [managingAssignments, setManagingAssignments] = useState<any>(null) // New state for assignment management
  const [searchQuery, setSearchQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<string>('')
  const [searchParams, setSearchParams] = useSearchParams()
  
  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )
  const [taskForm, setTaskForm] = useState<TaskFormData>({
    title: '',
    description: '',
    priority: 'medium',
    status: 'todo',
    assigned_to: [], // Initialize as empty array for multiple assignments
    due_date: '',
    estimated_hours: undefined,
    tags: []
  })

  // Handle URL parameters for auto-opening create dialog
  useEffect(() => {
    const action = searchParams.get('action')
    if (action === 'create') {
      setShowCreateTask(true)
      // Remove the action parameter from URL
      searchParams.delete('action')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  // Build filter parameters - memoized to prevent unnecessary re-renders
  const filterParams = React.useMemo(() => {
    const params: any = {}
    if (selectedTab !== 'all') {
      params.status = selectedTab === 'in_progress' ? 'in_progress' : selectedTab
    }
    if (priorityFilter) {
      params.priority = priorityFilter
    }
    return params
  }, [selectedTab, priorityFilter])

  // API queries
  const { data: tasksData, isLoading: tasksLoading } = useTasks(filterParams)
  const createTaskMutation = useCreateTask()
  const updateTaskMutation = useUpdateTask()
  const completeTaskMutation = useCompleteTask()
  const deleteTaskMutation = useDeleteTask()

  const tasks = (tasksData as any)?.data?.tasks || []
  const taskStats = (tasksData as any)?.data?.stats || {
    total: 0,
    pending: 0,
    in_progress: 0,
    completed: 0
  }

  // Filter tasks by search query - memoized for performance
  const filteredTasks = React.useMemo(() => {
    if (!searchQuery) return tasks
    return tasks.filter((task: any) => {
      return task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
             task.description?.toLowerCase().includes(searchQuery.toLowerCase())
    })
  }, [tasks, searchQuery])

  // Prevent page reloads by handling tab changes without navigation
  const handleTabChange = React.useCallback((value: string) => {
    setSelectedTab(value as 'all' | 'todo' | 'in_progress' | 'completed')
  }, [])

  const handleCreateTask = () => {
    if (!taskForm.title.trim()) {
      toast.error('Task title is required')
      return
    }

    createTaskMutation.mutate(taskForm, {
      onSuccess: () => {
        setShowCreateTask(false)
        resetForm()
      }
    })
  }

  const handleUpdateTask = () => {
    if (!editingTask) return
    
    updateTaskMutation.mutate({
      taskId: editingTask.id,
      updates: taskForm
    }, {
      onSuccess: () => {
        setEditingTask(null)
        resetForm()
      }
    })
  }

  const handleCompleteTask = (taskId: string) => {
    completeTaskMutation.mutate(taskId)
  }

  const handleDeleteTask = (taskId: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      deleteTaskMutation.mutate(taskId)
    }
  }

  const handleAssignmentUpdate = (taskId: string, newAssignments: string[]) => {
    updateTaskMutation.mutate({
      taskId,
      updates: { assigned_to: newAssignments }
    }, {
      onSuccess: () => {
        setManagingAssignments(null)
      }
    })
  }

  const openEditTask = (task: any) => {
    setTaskForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      category_id: task.category_id,
      project_id: task.project_id,
      assigned_to: task.assigned_to || [], // Handle as array
      due_date: task.due_date || '',
      estimated_hours: task.estimated_hours,
      tags: task.tags || []
    })
    setEditingTask(task)
  }

  const resetForm = () => {
    setTaskForm({
      title: '',
      description: '',
      priority: 'medium',
      status: 'todo',
      assigned_to: [], // Reset as empty array
      due_date: '',
      estimated_hours: undefined,
      tags: []
    })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    
    if (!over) return
    
    const activeId = active.id as string
    const overId = over.id as string
    
    // Find the task being dragged
    const task = filteredTasks.find((t: any) => t.id === activeId)
    if (!task) return
    
    // Check if dropped on a column or another task
    let targetStatus = overId
    
    // If dropped on another task, find which column that task belongs to
    if (overId !== activeId && !KANBAN_COLUMNS.find(col => col.id === overId)) {
      const targetTask = filteredTasks.find((t: any) => t.id === overId)
      if (targetTask) {
        targetStatus = targetTask.status
      }
    }
    
    // Find the target column
    const targetColumn = KANBAN_COLUMNS.find(col => col.id === targetStatus)
    if (targetColumn && task.status !== targetColumn.id) {
      updateTaskMutation.mutate({
        taskId: activeId,
        updates: { status: targetColumn.id as TaskFormData['status'] }
      })
      toast.success(`Task moved to ${targetColumn.title}`)
    }
  }

  if (tasksLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Task Management</h1>
            <p className="text-muted-foreground">
              Organize and track your productivity with gamified task management
            </p>
          </div>
        </div>

        {/* Task Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Total Tasks</p>
                  <p className="text-3xl font-bold">{taskStats.total}</p>
                </div>
                <Target className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Pending</p>
                  <p className="text-3xl font-bold text-yellow-600">{taskStats.pending}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">In Progress</p>
                  <p className="text-3xl font-bold text-green-600">{taskStats.in_progress}</p>
                </div>
                <PlayCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Completed</p>
                  <p className="text-3xl font-bold text-green-600">{taskStats.completed}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Actions and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center space-x-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-10 px-3 border border-input bg-background rounded-md"
          >
            <option value="">All Priorities</option>
            {TASK_PRIORITIES.map(priority => (
              <option key={priority} value={priority}>
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* View Toggle */}
          <div className="flex items-center bg-muted rounded-lg p-1">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-8 px-3"
            >
              <List className="h-4 w-4 mr-1" />
              List
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('kanban')}
              className="h-8 px-3"
            >
              <Columns3 className="h-4 w-4 mr-1" />
              Kanban
            </Button>
          </div>
          
          <EnhancedAIAssistant 
            onTaskCreated={() => {
              // Refresh tasks after AI generation
              queryClient.invalidateQueries({ queryKey: ['tasks'] })
            }}
            onDataFetched={() => {
              // Data was fetched and displayed in the AI assistant
              queryClient.invalidateQueries({ queryKey: ['tasks'] })
            }}
          />
          <Dialog open={showCreateTask} onOpenChange={setShowCreateTask}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Task
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingTask ? 'Edit Task' : 'Create New Task'}</DialogTitle>
              <DialogDescription>
                {editingTask ? 'Update task details' : 'Add a new task to your productivity workflow'}
              </DialogDescription>
            </DialogHeader>
            <TaskForm
              form={taskForm}
              setForm={setTaskForm}
              onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
              onCancel={() => {
                setShowCreateTask(false)
                setEditingTask(null)
                resetForm()
              }}
              isLoading={createTaskMutation.isPending || updateTaskMutation.isPending}
              isEditing={!!editingTask}
            />
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All Tasks ({taskStats.total})</TabsTrigger>
          <TabsTrigger value="todo">To Do ({taskStats.pending})</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress ({taskStats.in_progress})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({taskStats.completed})</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="space-y-4">
          {viewMode === 'list' ? (
            // List View
            <div className="space-y-4">
              {filteredTasks.length > 0 ? (
                filteredTasks.map((task: any) => (
                  <Card key={task.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-lg">{task.title}</h3>
                            <Badge className={getPriorityColor(task.priority)} variant="secondary">
                              <Flag className="h-3 w-3 mr-1" />
                              {task.priority}
                            </Badge>
                            <Badge className={getStatusColor(task.status)} variant="secondary">
                              {task.status === 'in_progress' ? (
                                <PlayCircle className="h-3 w-3 mr-1" />
                              ) : task.status === 'completed' ? (
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                              ) : task.status === 'todo' ? (
                                <Clock className="h-3 w-3 mr-1" />
                              ) : (
                                <AlertCircle className="h-3 w-3 mr-1" />
                              )}
                              {task.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          
                          {task.description && (
                            <p className="text-muted-foreground">{task.description}</p>
                          )}
                          
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            {task.due_date && (
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-4 w-4" />
                                <span>Due {formatDate(task.due_date)}</span>
                              </div>
                            )}
                            {task.estimated_hours && (
                              <div className="flex items-center space-x-1">
                                <Clock className="h-4 w-4" />
                                <span>{task.estimated_hours}h estimated</span>
                              </div>
                            )}
                            {task.assigned_to && task.assigned_to.length > 0 && (
                              <div className="flex items-center space-x-1">
                                <UserIcon className="h-4 w-4" />
                                <span>
                                  Assigned to {task.assigned_to.length} user{task.assigned_to.length > 1 ? 's' : ''}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center space-x-1">
                              <span>Created {formatRelativeTime(task.created_at)}</span>
                            </div>
                          </div>

                          {task.tags && task.tags.length > 0 && (
                            <div className="flex items-center space-x-1">
                              {task.tags.map((tag: string, index: number) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          {task.status !== 'completed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCompleteTask(task.id)}
                              disabled={completeTaskMutation.isPending}
                            >
                              {completeTaskMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          
                          {isAdmin && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setManagingAssignments(task)}
                              title="Manage Assignments"
                            >
                              <UserIcon className="h-4 w-4" />
                            </Button>
                          )}
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              openEditTask(task)
                              setShowCreateTask(true)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteTask(task.id)}
                            disabled={deleteTaskMutation.isPending}
                          >
                            {deleteTaskMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">No tasks found</h3>
                    <p className="text-muted-foreground mb-4">
                      {searchQuery || priorityFilter ? 
                        'No tasks match your current filters.' :
                        'Create your first task to get started with productivity tracking!'}
                    </p>
                    {!searchQuery && !priorityFilter && (
                      <Button onClick={() => setShowCreateTask(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Your First Task
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            // Kanban View
            <DndContext 
              sensors={sensors} 
              collisionDetection={closestCenter} 
              onDragEnd={handleDragEnd}
            >
              <div className="flex space-x-6 overflow-x-auto pb-4">
                {KANBAN_COLUMNS.map(column => {
                  const columnTasks = filteredTasks.filter((task: any) => {
                    if (column.id === 'completed') {
                      return task.status === 'completed'
                    }
                    return task.status === column.id
                  })
                  
                  return (
                    <KanbanColumn
                      key={column.id}
                      column={column}
                      tasks={columnTasks}
                      onAddTask={(status) => {
                        setTaskForm(prev => ({ ...prev, status: status as TaskFormData['status'] }))
                        setShowCreateTask(true)
                      }}
                      onEditTask={(task) => {
                        openEditTask(task)
                        setShowCreateTask(true)
                      }}
                      onDeleteTask={handleDeleteTask}
                      onCompleteTask={handleCompleteTask}
                      onManageAssignments={setManagingAssignments}
                      isCompleting={completeTaskMutation.isPending}
                      isDeleting={deleteTaskMutation.isPending}
                      isAdmin={isAdmin}
                    />
                  )
                })}
              </div>
            </DndContext>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Assignment Manager Dialog */}
      <AssignmentManager
        task={managingAssignments}
        isOpen={!!managingAssignments}
        onClose={() => setManagingAssignments(null)}
        onAssignmentUpdate={handleAssignmentUpdate}
      />
    </div>
  )
}

// Task Form Component
interface TaskFormProps {
  form: TaskFormData
  setForm: React.Dispatch<React.SetStateAction<TaskFormData>>
  onSubmit: () => void
  onCancel: () => void
  isLoading: boolean
  isEditing: boolean
}

function TaskForm({ form, setForm, onSubmit, onCancel, isLoading, isEditing }: TaskFormProps) {
  const { isAdmin } = useIsAdmin()
  
  // Use React Query to fetch users  
  const { data: users = [], isLoading: loadingUsers, error: usersError } = useUsers()

  // Show error if users failed to load
  useEffect(() => {
    if (usersError && isAdmin) {
      console.error('Failed to load users:', usersError)
      toast.error('Failed to load users for assignment. Please try refreshing the page.')
    }
  }, [usersError, isAdmin])

  const handleAssignmentChange = (userId: string, isAssigned: boolean) => {
    setForm(prev => ({
      ...prev,
      assigned_to: isAssigned 
        ? [...(prev.assigned_to || []), userId]
        : (prev.assigned_to || []).filter(id => id !== userId)
    }))
  }

  const handleTagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const tag = e.currentTarget.value.trim()
      if (tag && !form.tags.includes(tag)) {
        setForm(prev => ({
          ...prev,
          tags: [...prev.tags, tag]
        }))
        e.currentTarget.value = ''
      }
    }
  }

  const removeTag = (tagToRemove: string) => {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  return (
    <div className="space-y-4 py-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="title">Task Title *</Label>
          <Input
            id="title"
            value={form.title}
            onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
            placeholder="What needs to be done?"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="due_date">Due Date</Label>
          <Input
            id="due_date"
            type="date"
            value={form.due_date}
            onChange={(e) => setForm(prev => ({ ...prev, due_date: e.target.value }))}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <select
            id="priority"
            value={form.priority}
            onChange={(e) => setForm(prev => ({ ...prev, priority: e.target.value as any }))}
            className="w-full h-10 px-3 border border-input bg-background rounded-md"
          >
            {TASK_PRIORITIES.map(priority => (
              <option key={priority} value={priority}>
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </option>
            ))}
          </select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="estimated_hours">Estimated Hours</Label>
          <Input
            id="estimated_hours"
            type="number"
            min="0"
            step="0.5"
            value={form.estimated_hours || ''}
            onChange={(e) => setForm(prev => ({ ...prev, estimated_hours: parseFloat(e.target.value) || undefined }))}
            placeholder="2"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={form.description}
          onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Add more details about this task..."
          className="min-h-[80px]"
        />
      </div>
      
      {/* Task Assignment Section - Only for Admins */}
      {isAdmin && (
        <div className="space-y-2">
          <Label>Assign Task To</Label>
          <div className="space-y-2">
            {loadingUsers ? (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading users...</span>
              </div>
            ) : (
              <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-1">
                {users.length > 0 ? (
                  users.map((user) => (
                    <label key={user.id} className="flex items-center space-x-2 cursor-pointer p-1 hover:bg-muted rounded">
                      <input
                        type="checkbox"
                        checked={(form.assigned_to || []).includes(user.id)}
                        onChange={(e) => handleAssignmentChange(user.id, e.target.checked)}
                        className="rounded"
                      />
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <UserIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm truncate">{user.full_name}</span>
                        {user.role === 'admin' && (
                          <Badge variant="secondary" className="text-xs">Admin</Badge>
                        )}
                      </div>
                    </label>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground py-2">No users available for assignment</div>
                )}
              </div>
            )}
            {(form.assigned_to || []).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                <span className="text-sm text-muted-foreground">Assigned to:</span>
                {(form.assigned_to || []).map((userId) => {
                  const user = users.find(u => u.id === userId)
                  return user ? (
                    <Badge key={userId} variant="outline" className="text-xs">
                      <UserIcon className="h-3 w-3 mr-1" />
                      {user.full_name}
                    </Badge>
                  ) : null
                })}
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="tags">Tags</Label>
        <div className="space-y-2">
          <Input
            id="tags"
            placeholder="Type a tag and press Enter or comma"
            onKeyDown={handleTagInput}
          />
          {form.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {form.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex justify-end space-x-2 pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={isLoading}>
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isEditing ? 'Update Task' : 'Create Task'}
        </Button>
      </div>
    </div>
  )
}