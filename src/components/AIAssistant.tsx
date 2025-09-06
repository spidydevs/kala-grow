import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  Bot,
  Sparkles,
  Clock,
  User,
  Send,
  Loader2,
  CheckCircle2,
  Plus,
  Brain,
  Zap
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'

interface AIAssistantProps {
  onTaskCreated?: () => void
}

export function AIAssistant({ onTaskCreated }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [inputText, setInputText] = useState('')
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const handleAITaskCreation = async () => {
    if (!inputText.trim()) {
      toast.error('Please describe the task you want to create')
      return
    }

    if (!user) {
      toast.error('Please sign in to create tasks')
      return
    }

    setIsCreating(true)
    try {
      // Call our AI Task Creator Edge Function
      const { data, error } = await supabase.functions.invoke('ai-task-creator', {
        body: {
          inputText: inputText.trim()
        }
      })

      if (error) {
        throw new Error(error.message || 'Failed to create task with AI')
      }

      if (data?.data?.task) {
        const createdTask = data.data.task
        const processingTime = data.data.processing_time_ms
        
        toast.success(`✨ AI Task Created Successfully!`, {
          description: `"${createdTask.title}" - Priority: ${createdTask.priority.toUpperCase()} (${processingTime}ms)`,
          duration: 5000
        })

        // Update gamification points
        try {
          await supabase.functions.invoke('gamification-engine', {
            body: {
              action: 'custom_points',
              points: 5 // Bonus points for using AI
            }
          })
        } catch (gamificationError) {
          console.warn('Gamification update failed:', gamificationError)
        }

        // Reset form and close dialog
        setInputText('')
        setIsOpen(false)
        
        // Refresh tasks and stats
        queryClient.invalidateQueries({ queryKey: ['tasks'] })
        queryClient.invalidateQueries({ queryKey: ['user-stats'] })
        queryClient.invalidateQueries({ queryKey: ['activity-feed'] })
        
        onTaskCreated?.()
      } else {
        throw new Error('No task data received from AI')
      }
    } catch (error: any) {
      console.error('AI task creation error:', error)
      toast.error(`Failed to create AI task: ${error.message}`, {
        description: 'Please try again or create the task manually',
        duration: 6000
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleAITaskCreation()
    }
  }

  const examplePrompts = [
    "Create a marketing presentation for Q4 campaign, urgent, should take 3 hours",
    "Plan a social media strategy for next month",
    "Research competitors and create analysis report",
    "Set up project documentation structure",
    "Review and update website content"
  ]

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="default" 
          className="bg-gradient-to-r from-green-600 to-green-600 hover:from-green-700 hover:to-green-700 text-white shadow-lg"
        >
          <Brain className="mr-2 h-4 w-4" />
          AI Assistant
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-r from-green-100 to-green-100 rounded-lg">
              <Brain className="h-5 w-5 text-green-600" />
            </div>
            AI Task Creator
          </DialogTitle>
          <DialogDescription>
            Describe your task in natural language and let AI create it for you with proper categorization, priority, and time estimates.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="task-input">Describe your task</Label>
            <Textarea
              id="task-input"
              placeholder="e.g., I need to prepare a marketing presentation for the Q4 campaign, should take about 3 hours and it's urgent for next week"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              className="min-h-[100px] resize-none"
              disabled={isCreating}
            />
            <p className="text-xs text-muted-foreground">
              💡 Tip: Use Cmd/Ctrl + Enter to create task quickly
            </p>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Example prompts:</Label>
            <div className="grid gap-2">
              {examplePrompts.map((prompt, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="h-auto p-3 text-left justify-start text-wrap"
                  onClick={() => setInputText(prompt)}
                  disabled={isCreating}
                >
                  <Zap className="mr-2 h-3 w-3 flex-shrink-0" />
                  <span className="text-xs">{prompt}</span>
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4" />
              <span>Powered by Gemini AI</span>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsOpen(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAITaskCreation}
                disabled={!inputText.trim() || isCreating}
                className="bg-gradient-to-r from-green-600 to-green-600 hover:from-green-700 hover:to-green-700"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Create Task
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}