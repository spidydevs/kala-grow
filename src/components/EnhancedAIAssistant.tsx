import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import {
  Bot,
  Sparkles,
  Send,
  Loader2,
  User,
  Calendar,
  Flag,
  Clock,
  CheckCircle2,
  MessageCircle,
  Brain,
  Zap,
  Settings,
  Cpu,
  Gauge,
  TrendingUp
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { formatDate } from '@/services'

interface EnhancedAIAssistantProps {
  onTaskCreated?: () => void
  onDataFetched?: () => void
}

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  action?: {
    type: 'CREATE_TASK' | 'FETCH_DATA' | 'ANSWER_QUERY'
    result?: any
  }
  modelInfo?: {
    selected: string
    used: string
    complexity_mode: string
    fallback_attempts: number
  }
}

type ComplexityMode = 'auto' | 'simple' | 'complex'

const MODEL_DESCRIPTIONS = {
  'gemini-1.5-pro': { name: 'Pro', icon: TrendingUp, color: 'text-green-400', description: 'Advanced analysis & reasoning' },
  'gemini-1.5-flash': { name: 'Flash', icon: Zap, color: 'text-green-400', description: 'Balanced speed & intelligence' },
  'gemini-1.5-flash-8b': { name: 'Flash Lite', icon: Gauge, color: 'text-green-400', description: 'Quick responses' }
}

export function EnhancedAIAssistant({ onTaskCreated, onDataFetched }: EnhancedAIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [inputMessage, setInputMessage] = useState('')
  const [complexityMode, setComplexityMode] = useState<ComplexityMode>('auto')
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hello! I\'m your industry-level AI productivity assistant with advanced intelligence capabilities. I have deep understanding of your complete productivity ecosystem and can provide context-aware insights.\n\nI can help you:\n• Create and manage tasks with intelligent prioritization\n• Analyze your productivity patterns and trends\n• Provide data-driven recommendations\n• Answer complex questions about your workflow\n\nTry asking me:\n• "What tasks are pending today?"\n• "Analyze my productivity patterns"\n• "Create a high-priority task for tomorrow"\n• "Show me overdue items"',
      timestamp: new Date()
    }
  ])
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (e?: React.FormEvent) => {
    // Prevent default form submission to avoid page refresh
    if (e) {
      e.preventDefault()
    }
    
    if (!inputMessage.trim()) {
      toast.error('Please enter a message')
      return
    }

    if (!user) {
      toast.error('Please sign in to use the AI assistant')
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsProcessing(true)

    try {
      // Call the enhanced multi-model AI assistant with context awareness
      const { data, error } = await supabase.functions.invoke('enhanced-ai-assistant', {
        body: {
          prompt: userMessage.content,
          complexity_mode: complexityMode
        }
      })

      if (error) {
        throw new Error(error.message || 'Failed to process message')
      }

      const aiResponse = data.data
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: aiResponse.message,
        timestamp: new Date(),
        action: {
          type: aiResponse.action,
          result: aiResponse.result
        },
        modelInfo: aiResponse.model_info
      }

      setMessages(prev => [...prev, assistantMessage])

      // Handle different action types with enhanced feedback
      if (aiResponse.action === 'CREATE_TASK' && aiResponse.result?.task) {
        const task = aiResponse.result.task
        toast.success(`Task "${task.title}" created successfully!`, {
          description: `Priority: ${task.priority.toUpperCase()}, Model: ${aiResponse.model_info.used}, Time: ${aiResponse.processing_time_ms}ms`,
          duration: 5000
        })
        
        // Refresh tasks without causing page reload
        queryClient.invalidateQueries({ queryKey: ['tasks'] })
        queryClient.invalidateQueries({ queryKey: ['user-stats'] })
        // Call onTaskCreated callback safely
        if (onTaskCreated) {
          try {
            onTaskCreated()
          } catch (error) {
            console.warn('onTaskCreated callback error:', error)
          }
        }
        
      } else if (aiResponse.action === 'FETCH_DATA' && aiResponse.result?.tasks) {
        const tasksCount = aiResponse.result.count
        toast.success(`Found ${tasksCount} task${tasksCount !== 1 ? 's' : ''}`, {
          description: `Model: ${aiResponse.model_info.used}, Time: ${aiResponse.processing_time_ms}ms`,
          duration: 3000
        })
        onDataFetched?.()
      }

    } catch (error: any) {
      console.error('AI assistant error:', error)
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `I apologize, but I encountered an error: ${error.message}. Please try rephrasing your request or try again.`,
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, errorMessage])
      toast.error(`AI Assistant Error: ${error.message}`, {
        duration: 6000
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(e)
    }
  }

  const renderTaskCard = (task: any) => (
    <Card key={task.id} className="mb-2 border-l-4 border-l-green-500 bg-gray-800 border-gray-700">
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="font-semibold text-sm text-gray-100">{task.title}</h4>
            {task.description && (
              <p className="text-xs text-gray-400 mt-1">{task.description}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className={cn(
                'text-xs',
                task.priority === 'urgent' && 'border-red-600 text-red-300 bg-red-900/30',
                task.priority === 'high' && 'border-orange-600 text-orange-300 bg-orange-900/30',
                task.priority === 'medium' && 'border-yellow-600 text-yellow-300 bg-yellow-900/30',
                task.priority === 'low' && 'border-green-600 text-green-300 bg-green-900/30'
              )}>
                <Flag className="h-3 w-3 mr-1" />
                {task.priority}
              </Badge>
              {task.due_date && (
                <Badge variant="outline" className="text-xs border-gray-600 text-gray-300 bg-gray-800">
                  <Calendar className="h-3 w-3 mr-1" />
                  {formatDate(task.due_date)}
                </Badge>
              )}
              {task.estimated_hours && (
                <Badge variant="outline" className="text-xs border-gray-600 text-gray-300 bg-gray-800">
                  <Clock className="h-3 w-3 mr-1" />
                  {task.estimated_hours}h
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const renderModelIndicator = (modelInfo?: Message['modelInfo']) => {
    if (!modelInfo) return null
    
    const modelDesc = MODEL_DESCRIPTIONS[modelInfo.used as keyof typeof MODEL_DESCRIPTIONS]
    if (!modelDesc) return null

    const Icon = modelDesc.icon
    return (
      <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
        <Icon className={`h-3 w-3 ${modelDesc.color}`} />
        <span>{modelDesc.name}</span>
        {modelInfo.fallback_attempts > 0 && (
          <span className="text-amber-400">(fallback)</span>
        )}
      </div>
    )
  }

  const renderMessage = (message: Message) => (
    <div key={message.id} className={cn(
      'flex gap-3 mb-4',
      message.type === 'user' ? 'justify-end' : 'justify-start'
    )}>
      {message.type === 'assistant' && (
        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-green-600 to-green-500 rounded-full flex items-center justify-center">
          <Brain className="h-4 w-4 text-white" />
        </div>
      )}
      
      <div className={cn(
        'max-w-[80%] rounded-lg px-4 py-2',
        message.type === 'user' 
          ? 'bg-green-600 text-white ml-auto' 
          : 'bg-gray-900 text-gray-100 border border-gray-700'
      )}>
        <div className="whitespace-pre-wrap text-sm">{message.content}</div>
        
        {/* Render task results if present */}
        {message.action?.type === 'FETCH_DATA' && message.action.result?.tasks && (
          <div className="mt-3 space-y-2">
            {message.action.result.tasks.slice(0, 5).map(renderTaskCard)}
            {message.action.result.tasks.length > 5 && (
              <p className="text-xs text-gray-400 text-center">
                And {message.action.result.tasks.length - 5} more tasks...
              </p>
            )}
          </div>
        )}
        
        {/* Render created task if present */}
        {message.action?.type === 'CREATE_TASK' && message.action.result?.task && (
          <div className="mt-3">
            {renderTaskCard(message.action.result.task)}
          </div>
        )}
        
        <div className="flex items-center justify-between mt-2">
          <div className="text-xs opacity-70">
            {message.timestamp.toLocaleTimeString()}
          </div>
          {message.type === 'assistant' && renderModelIndicator(message.modelInfo)}
        </div>
      </div>
      
      {message.type === 'user' && (
        <div className="flex-shrink-0 w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
          <User className="h-4 w-4 text-white" />
        </div>
      )}
    </div>
  )

  const quickCommands = [
    { text: "What tasks are pending today?", icon: CheckCircle2, complexity: 'auto' as ComplexityMode },
    { text: "Show me high priority tasks", icon: Flag, complexity: 'auto' as ComplexityMode },
    { text: "Analyze my productivity patterns", icon: TrendingUp, complexity: 'complex' as ComplexityMode },
    { text: "Create task Review proposal due tomorrow", icon: Zap, complexity: 'auto' as ComplexityMode }
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
      <DialogContent className="sm:max-w-[900px] lg:max-w-[1100px] sm:max-h-[85vh] lg:max-h-[90vh] flex flex-col bg-black border-gray-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <div className="p-2 bg-gradient-to-r from-green-900 to-green-700 rounded-lg">
              <Brain className="h-5 w-5 text-green-400" />
            </div>
            Industry-Level AI Assistant
            <Badge variant="secondary" className="ml-2 bg-purple-900 text-purple-400 border-purple-700">Multi-Model</Badge>
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            Advanced AI with multi-model architecture, context-aware intelligence, and deep database understanding.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col min-h-0">
          {/* Complexity Mode Toggle */}
          <div className="mb-4 p-3 bg-gray-900 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300">Intelligence Mode:</label>
              <div className="flex items-center gap-1">
                <Settings className="h-4 w-4 text-gray-400" />
                <span className="text-xs text-gray-400">Model Selection</span>
              </div>
            </div>
            <div className="flex gap-2">
              {([
                { mode: 'simple' as ComplexityMode, label: 'Quick', icon: Gauge, desc: 'Fast responses' },
                { mode: 'auto' as ComplexityMode, label: 'Smart', icon: Brain, desc: 'Auto-select optimal' },
                { mode: 'complex' as ComplexityMode, label: 'Deep', icon: TrendingUp, desc: 'Advanced analysis' }
              ]).map(({ mode, label, icon: Icon, desc }) => (
                <Button
                  key={mode}
                  variant={complexityMode === mode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setComplexityMode(mode)}
                  className={cn(
                    "flex-1 h-auto p-2 flex flex-col items-center",
                    complexityMode === mode 
                      ? "bg-green-600 hover:bg-green-700 border-green-500" 
                      : "bg-gray-800 border-gray-600 hover:bg-gray-700 hover:border-green-600"
                  )}
                  disabled={isProcessing}
                >
                  <Icon className="h-4 w-4 mb-1" />
                  <span className="text-xs font-medium">{label}</span>
                  <span className="text-xs opacity-70">{desc}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Messages Area */}
          <ScrollArea className="flex-1 min-h-[400px] max-h-[500px] p-4 border border-gray-800 rounded-lg bg-black overflow-y-auto">
            <div className="space-y-4">
              {messages.map(renderMessage)}
              {isProcessing && (
                <div className="flex gap-3 justify-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-green-600 to-green-500 rounded-full flex items-center justify-center">
                    <Brain className="h-4 w-4 text-white" />
                  </div>
                  <div className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-green-400" />
                      <span className="text-sm text-gray-100">Processing with {complexityMode} mode...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
          
          {/* Quick Commands */}
          <div className="mt-4">
            <label className="text-sm font-medium mb-2 block text-gray-300">Quick commands:</label>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {quickCommands.map((command, index) => {
                const Icon = command.icon
                return (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="h-auto p-2 text-left justify-start text-wrap bg-gray-900 border-gray-700 text-gray-300 hover:bg-gray-800 hover:border-green-600 hover:text-green-400"
                    onClick={() => {
                      setInputMessage(command.text)
                      setComplexityMode(command.complexity)
                    }}
                    disabled={isProcessing}
                  >
                    <Icon className="mr-2 h-3 w-3 flex-shrink-0" />
                    <span className="text-xs">{command.text}</span>
                  </Button>
                )
              })}
            </div>
          </div>
          
          {/* Input Area */}
          <form onSubmit={(e) => handleSendMessage(e)} className="flex gap-2">
            <Input
              placeholder="Ask me anything about your productivity or tell me to create tasks..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isProcessing}
              className="flex-1 bg-green-900 border-green-700 text-white placeholder:text-green-300 focus:border-green-500 focus:ring-green-500"
            />
            <Button 
              type="submit"
              disabled={!inputMessage.trim() || isProcessing}
              className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
          
          <div className="text-xs text-gray-500 mt-2 text-center">
            Powered by Gemini Multi-Model AI • Advanced Intelligence with Fallback System
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}