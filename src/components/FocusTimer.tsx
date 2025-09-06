import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Play,
  Pause,
  Square,
  Timer,
  Clock,
  Target,
  Zap,
  Award
} from 'lucide-react'
import { toast } from 'sonner'
import {
  useActiveSession,
  useFocusSessions,
  useStartFocusSession,
  useEndFocusSession
} from '@/services/focusTimerService'
import { cn } from '@/lib/utils'

interface FocusTimerProps {
  className?: string
}

export function FocusTimer({ className }: FocusTimerProps) {
  const [isStartDialogOpen, setIsStartDialogOpen] = useState(false)
  const [sessionTitle, setSessionTitle] = useState('')
  const [sessionDuration, setSessionDuration] = useState(25)
  const [timeLeft, setTimeLeft] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [productivityScore, setProductivityScore] = useState(75)
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<Date | null>(null)
  
  const { data: activeSession, isLoading: isLoadingActive } = useActiveSession()
  const { data: sessionsData } = useFocusSessions('7d')
  const startSessionMutation = useStartFocusSession()
  const endSessionMutation = useEndFocusSession()

  // Initialize timer from active session
  useEffect(() => {
    if (activeSession && !isRunning) {
      setCurrentSessionId(activeSession.id)
      setSessionTitle(activeSession.title)
      
      // Calculate time left based on start time and planned duration
      const startTime = new Date(activeSession.start_time)
      const plannedDuration = activeSession.planned_duration * 60 * 1000 // Convert to milliseconds
      const elapsed = Date.now() - startTime.getTime()
      const remaining = Math.max(0, plannedDuration - elapsed)
      
      setTimeLeft(Math.floor(remaining / 1000))
      setIsRunning(remaining > 0)
      startTimeRef.current = startTime
      
      if (remaining > 0) {
        startTimer()
      }
    }
  }, [activeSession])

  const startTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsRunning(false)
          handleTimerComplete()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleStartSession = async () => {
    if (!sessionTitle.trim()) {
      toast.error('Please enter a session title')
      return
    }

    try {
      const session = await startSessionMutation.mutateAsync({
        title: sessionTitle.trim(),
        duration: sessionDuration
      })
      
      setCurrentSessionId(session.id)
      setTimeLeft(sessionDuration * 60)
      setIsRunning(true)
      setIsStartDialogOpen(false)
      startTimeRef.current = new Date()
      startTimer()
      
      toast.success(`Started ${sessionTitle} - ${sessionDuration} minutes`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to start session')
    }
  }

  const handlePauseResume = () => {
    if (isRunning) {
      setIsRunning(false)
      if (intervalRef.current) clearInterval(intervalRef.current)
      toast.success('Session paused')
    } else {
      setIsRunning(true)
      startTimer()
      toast.success('Session resumed')
    }
  }

  const handleStopSession = async () => {
    if (!currentSessionId || !startTimeRef.current) return

    setIsRunning(false)
    if (intervalRef.current) clearInterval(intervalRef.current)

    try {
      const actualDuration = Math.floor((Date.now() - startTimeRef.current.getTime()) / (1000 * 60))
      
      await endSessionMutation.mutateAsync({
        session_id: currentSessionId,
        actual_duration: actualDuration,
        productivity_score: productivityScore
      })
      
      setCurrentSessionId(null)
      setTimeLeft(0)
      startTimeRef.current = null
      
      toast.success(`Session completed! ${actualDuration} minutes focused`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to end session')
    }
  }

  const handleTimerComplete = async () => {
    if (!currentSessionId || !startTimeRef.current) return

    try {
      const actualDuration = Math.floor((Date.now() - startTimeRef.current.getTime()) / (1000 * 60))
      
      await endSessionMutation.mutateAsync({
        session_id: currentSessionId,
        actual_duration: actualDuration,
        productivity_score: productivityScore
      })
      
      setCurrentSessionId(null)
      setTimeLeft(0)
      startTimeRef.current = null
      
      toast.success('🎉 Focus session completed! Great work!', { duration: 6000 })
    } catch (error: any) {
      console.error('Failed to complete session:', error)
      toast.error('Session completed locally')
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const getProgressPercentage = () => {
    if (!sessionDuration || !startTimeRef.current) return 0
    const totalSeconds = sessionDuration * 60
    const elapsed = totalSeconds - timeLeft
    return Math.min(100, Math.max(0, (elapsed / totalSeconds) * 100))
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const stats = sessionsData?.stats || {
    total_sessions: 0,
    total_minutes: 0,
    average_productivity: 0,
    completed_sessions: 0
  }

  return (
    <>
      <Card className={cn('focus-timer-card', className)}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Timer className="h-5 w-5" />
            <span>Focus Timer</span>
            {isRunning && (
              <Badge variant="default" className="bg-green-500">
                Active
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Stay focused and productive with timed work sessions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {currentSessionId ? (
            <div className="space-y-4">
              {/* Active Session Display */}
              <div className="text-center space-y-2">
                <h3 className="font-medium text-lg">{sessionTitle}</h3>
                <div className="text-4xl font-mono font-bold text-green-600">
                  {formatTime(timeLeft)}
                </div>
                <Progress value={getProgressPercentage()} className="h-3" />
              </div>

              {/* Controls */}
              <div className="flex justify-center space-x-2">
                <Button
                  onClick={handlePauseResume}
                  variant={isRunning ? "secondary" : "default"}
                  size="sm"
                >
                  {isRunning ? (
                    <><Pause className="h-4 w-4 mr-2" />Pause</>
                  ) : (
                    <><Play className="h-4 w-4 mr-2" />Resume</>
                  )}
                </Button>
                <Button
                  onClick={handleStopSession}
                  variant="destructive"
                  size="sm"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Stop
                </Button>
              </div>

              {/* Productivity Score Selector */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">How productive do you feel?</Label>
                <div className="flex space-x-2">
                  {[25, 50, 75, 100].map((score) => (
                    <Button
                      key={score}
                      variant={productivityScore === score ? "default" : "outline"}
                      size="sm"
                      onClick={() => setProductivityScore(score)}
                      className="flex-1"
                    >
                      {score}%
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Start Session Button */}
              <Button 
                onClick={() => setIsStartDialogOpen(true)} 
                className="w-full btn-taskade-primary"
                disabled={isLoadingActive}
              >
                <Play className="h-4 w-4 mr-2" />
                Start Focus Session
              </Button>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="font-semibold">{stats.total_sessions}</div>
                  <div className="text-muted-foreground">Sessions</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="font-semibold">{Math.round(stats.total_minutes / 60 * 10) / 10}h</div>
                  <div className="text-muted-foreground">Focus Time</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Start Session Dialog */}
      <Dialog open={isStartDialogOpen} onOpenChange={setIsStartDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Start Focus Session</span>
            </DialogTitle>
            <DialogDescription>
              Create a focused work session to boost your productivity
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="session-title">What will you focus on?</Label>
              <Input
                id="session-title"
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                placeholder="e.g., Review project proposal, Write documentation..."
                autoFocus
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="session-duration">Duration (minutes)</Label>
              <div className="flex space-x-2">
                {[15, 25, 45, 60].map((duration) => (
                  <Button
                    key={duration}
                    variant={sessionDuration === duration ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSessionDuration(duration)}
                    className="flex-1"
                  >
                    {duration}m
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsStartDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleStartSession}
              disabled={startSessionMutation.isPending || !sessionTitle.trim()}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {startSessionMutation.isPending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              Start Session
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
