import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { generateAITasks } from '@/services/aiService'
import { toast } from 'sonner'
import { Brain, Sparkles, Loader2, Plus, Clock, User, Flag } from 'lucide-react'

interface AITaskGeneratorProps {
  projectId?: string
  onTasksGenerated?: (tasks: any[]) => void
}

interface GeneratedTask {
  title: string
  description: string
  estimated_hours: number
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assignee_role: string
  dependencies?: string[]
}

export function AITaskGenerator({ projectId, onTasksGenerated }: AITaskGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    projectDescription: '',
    projectType: '',
    timeline: '',
    budget: '',
    clientRequirements: ''
  })
  const [generatedTasks, setGeneratedTasks] = useState<GeneratedTask[]>([])

  const projectTypes = [
    'Brand Strategy',
    'Website Development', 
    'Social Media Campaign',
    'Content Marketing',
    'SEO Campaign',
    'Email Marketing',
    'PPC Campaign',
    'Video Production',
    'Graphic Design',
    'Product Launch'
  ]

  const handleGenerate = async () => {
    if (!formData.projectDescription.trim()) {
      toast.error('Please provide a project description')
      return
    }

    setIsLoading(true)
    try {
      const response = await generateAITasks({
        projectDescription: formData.projectDescription,
        projectType: formData.projectType,
        timeline: formData.timeline,
        budget: formData.budget,
        clientRequirements: formData.clientRequirements
      })

      if (response.success && response.tasks) {
        setGeneratedTasks(response.tasks)
        toast.success(`Generated ${response.tasks.length} tasks successfully!`)
      } else {
        toast.error('Failed to generate tasks')
      }
    } catch (error) {
      console.error('AI Task Generation Error:', error)
      toast.error('Failed to generate tasks. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveTasks = async () => {
    if (!generatedTasks.length || !projectId) {
      toast.error('No tasks to save or project not selected')
      return
    }

    setIsLoading(true)
    try {
      const tasksToSave = generatedTasks.map(task => ({
        project_id: projectId,
        title: task.title,
        description: task.description,
        status: 'todo' as const,
        priority: task.priority,
        estimated_hours: task.estimated_hours,
        assignee_role: task.assignee_role
      }))

      const { error } = await supabase
        .from('tasks')
        .insert(tasksToSave)

      if (error) throw error

      toast.success('Tasks saved successfully!')
      setIsOpen(false)
      setGeneratedTasks([])
      setFormData({
        projectDescription: '',
        projectType: '',
        timeline: '',
        budget: '',
        clientRequirements: ''
      })
      onTasksGenerated?.(tasksToSave)
    } catch (error) {
      console.error('Save Tasks Error:', error)
      toast.error('Failed to save tasks')
    } finally {
      setIsLoading(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="bg-gradient-to-r from-green-600 to-green-600 hover:from-green-700 hover:to-green-700 text-white"
      >
        <Brain className="h-4 w-4 mr-2" />
        AI Task Generator
      </Button>
    )
  }

  return (
    <Card  className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-green-600" />
            <CardTitle>AI Task Generator</CardTitle>
          </div>
          <Button variant="ghost" onClick={() => setIsOpen(false)}>
            ×
          </Button>
        </div>
        <CardDescription>
          Generate comprehensive task breakdowns using AI for your marketing projects
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Input Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="description">Project Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe your project goals, target audience, and key deliverables..."
              value={formData.projectDescription}
              onChange={(e) => setFormData(prev => ({ ...prev, projectDescription: e.target.value }))}
              className="min-h-[100px]"
            />
          </div>

          <div>
            <Label htmlFor="type">Project Type</Label>
            <select 
              value={formData.projectType} 
              onChange={(e) => setFormData(prev => ({ ...prev, projectType: e.target.value }))}
              className="flex h-10 w-full items-center justify-between rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white ring-offset-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:ring-offset-gray-900 appearance-none"
            >
              <option value="">Select project type</option>
              {projectTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="timeline">Timeline</Label>
            <Input
              id="timeline"
              placeholder="e.g., 6 weeks, 3 months"
              value={formData.timeline}
              onChange={(e) => setFormData(prev => ({ ...prev, timeline: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="budget">Budget Range</Label>
            <Input
              id="budget"
              placeholder="e.g., $10,000 - $25,000"
              value={formData.budget}
              onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="requirements">Client Requirements</Label>
            <Textarea
              id="requirements"
              placeholder="Specific client needs, constraints, or preferences..."
              value={formData.clientRequirements}
              onChange={(e) => setFormData(prev => ({ ...prev, clientRequirements: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Brain className="h-4 w-4 mr-2" />
            )}
            Generate Tasks
          </Button>
        </div>

        {/* Generated Tasks */}
        {generatedTasks.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Generated Tasks ({generatedTasks.length})</h3>
              <Button onClick={handleSaveTasks} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Save All Tasks
              </Button>
            </div>
            
            <div className="grid gap-3">
              {generatedTasks.map((task, index) => (
                <Card key={index}  className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <h4 className="font-semibold text-gray-900 dark:text-white">{task.title}</h4>
                      <Badge className={getPriorityColor(task.priority)}>
                        <Flag className="h-3 w-3 mr-1" />
                        {task.priority}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-400">{task.description}</p>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{task.estimated_hours}h</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <User className="h-3 w-3" />
                        <span>{task.assignee_role}</span>
                      </div>
                      {task.dependencies && task.dependencies.length > 0 && (
                        <div className="flex items-center space-x-1">
                          <span>Dependencies: {task.dependencies.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}