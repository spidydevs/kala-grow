import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { 
  CheckCircle2, 
  Plus, 
  Target, 
  Timer, 
  TrendingUp,
  Calendar,
  Flame,
  Star
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'

interface Habit {
  id: string
  name: string
  description?: string
  category: string
  target_frequency: number
  target_value: number
  unit: string
  reward_points: number
  todayEntry?: {
    completed_value: number
    is_completed: boolean
  }
  isCompletedToday: boolean
  streak?: number
}

interface HabitTrackerProps {
  userId: string
  onPointsEarned?: (points: number) => void
}

export function HabitTracker({ userId, onPointsEarned }: HabitTrackerProps) {
  const [habits, setHabits] = useState<Habit[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newHabit, setNewHabit] = useState({
    name: '',
    description: '',
    category: 'productivity',
    target_frequency: 1,
    target_value: 1,
    unit: 'count'
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadHabits()
  }, [userId])

  const loadHabits = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.functions.invoke('gamification-engine', {
        body: { action: 'get_habits' }
      })

      if (error) {
        console.error('Error loading habits:', error)
      } else if (data?.data) {
        setHabits(data.data)
      }
    } catch (error) {
      console.error('Error loading habits:', error)
    } finally {
      setLoading(false)
    }
  }

  const createHabit = async () => {
    if (!newHabit.name.trim()) return

    try {
      setLoading(true)
      const { data, error } = await supabase.functions.invoke('gamification-engine', {
        body: { 
          action: 'create_habit',
          metadata: {
            ...newHabit,
            reward_points: Math.max(5, newHabit.target_value * 2)
          }
        }
      })

      if (error) {
        console.error('Error creating habit:', error)
      } else {
        setNewHabit({
          name: '',
          description: '',
          category: 'productivity',
          target_frequency: 1,
          target_value: 1,
          unit: 'count'
        })
        setShowAddForm(false)
        loadHabits()
      }
    } catch (error) {
      console.error('Error creating habit:', error)
    } finally {
      setLoading(false)
    }
  }

  const completeHabit = async (habitId: string, value = 1) => {
    try {
      const { data, error } = await supabase.functions.invoke('gamification-engine', {
        body: { 
          action: 'complete_habit',
          habitId,
          metadata: { value }
        }
      })

      if (error) {
        console.error('Error completing habit:', error)
      } else if (data?.data) {
        onPointsEarned?.(data.data.pointsAwarded)
        loadHabits()
      }
    } catch (error) {
      console.error('Error completing habit:', error)
    }
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      productivity: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      health: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      learning: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      creativity: 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400',
      social: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
    }
    return colors[category as keyof typeof colors] || colors.productivity
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2 text-green-500" />
              Daily Habits
            </CardTitle>
            <CardDescription>
              Build positive routines and earn points
            </CardDescription>
          </div>
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            
            className="flex items-center"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Habit
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div className="space-y-4">
                <Input
                  placeholder="Habit name (e.g., 'Read for 30 minutes')"
                  value={newHabit.name}
                  onChange={(e) => setNewHabit(prev => ({ ...prev, name: e.target.value }))}
                />
                <div className="grid grid-cols-2 gap-4">
                  <select
                    className="px-3 py-2 border rounded-md bg-background"
                    value={newHabit.category}
                    onChange={(e) => setNewHabit(prev => ({ ...prev, category: e.target.value }))}
                  >
                    <option value="productivity">Productivity</option>
                    <option value="health">Health</option>
                    <option value="learning">Learning</option>
                    <option value="creativity">Creativity</option>
                    <option value="social">Social</option>
                  </select>
                  <Input
                    type="number"
                    placeholder="Target (e.g., 30)"
                    value={newHabit.target_value}
                    onChange={(e) => setNewHabit(prev => ({ ...prev, target_value: Number(e.target.value) }))}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={createHabit} disabled={loading} >
                    Create Habit
                  </Button>
                  <Button 
                    onClick={() => setShowAddForm(false)} 
                    variant="outline" 
                    
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-3">
          {habits.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Target className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No habits yet. Create your first habit to start building positive routines!</p>
            </div>
          ) : (
            habits.map((habit) => (
              <motion.div
                key={habit.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-lg border ${
                  habit.isCompletedToday 
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                } transition-all duration-200`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{habit.name}</h4>
                      <Badge className={getCategoryColor(habit.category)} variant="secondary">
                        {habit.category}
                      </Badge>
                      {habit.streak && habit.streak > 0 && (
                        <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400" variant="secondary">
                          <Flame className="h-3 w-3 mr-1" />
                          {habit.streak} day{habit.streak !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                    
                    {habit.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {habit.description}
                      </p>
                    )}
                    
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-2">
                      <span>Target: {habit.target_value} {habit.unit}</span>
                      <Star className="h-3 w-3 mx-2" />
                      <span>{habit.reward_points} points</span>
                    </div>
                    
                    {habit.todayEntry && !habit.isCompletedToday && (
                      <Progress 
                        value={(habit.todayEntry.completed_value / habit.target_value) * 100}
                        className="h-2 mb-2"
                      />
                    )}
                  </div>
                  
                  <div className="ml-4">
                    {habit.isCompletedToday ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex items-center text-green-600 dark:text-green-400"
                      >
                        <CheckCircle2 className="h-6 w-6 mr-2" />
                        <span className="text-sm font-medium">Done!</span>
                      </motion.div>
                    ) : (
                      <Button
                        onClick={() => completeHabit(habit.id, habit.target_value)}
                        
                        className="flex items-center"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Complete
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Focus Session Component
export function FocusSession({ userId, onSessionComplete }: { 
  userId: string, 
  onSessionComplete?: (points: number) => void 
}) {
  const [isActive, setIsActive] = useState(false)
  const [timeLeft, setTimeLeft] = useState(25 * 60) // 25 minutes default
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionType, setSessionType] = useState('pomodoro')
  const [customDuration, setCustomDuration] = useState(25)

  useEffect(() => {
    let interval: NodeJS.Timeout
    
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1)
      }, 1000)
    } else if (timeLeft === 0 && isActive) {
      completeSession()
    }
    
    return () => clearInterval(interval)
  }, [isActive, timeLeft])

  const startSession = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('gamification-engine', {
        body: { 
          action: 'start_focus_session',
          sessionData: {
            type: sessionType,
            plannedDuration: Math.floor(timeLeft / 60)
          }
        }
      })

      if (error) {
        console.error('Error starting session:', error)
      } else if (data?.data) {
        setSessionId(data.data.id)
        setIsActive(true)
      }
    } catch (error) {
      console.error('Error starting session:', error)
    }
  }

  const completeSession = async () => {
    if (!sessionId) return

    try {
      const actualMinutes = Math.floor((customDuration * 60 - timeLeft) / 60)
      
      const { data, error } = await supabase.functions.invoke('gamification-engine', {
        body: { 
          action: 'end_focus_session',
          sessionData: {
            sessionId,
            userId,
            actualDuration: actualMinutes,
            plannedDuration: customDuration,
            productivityRating: timeLeft === 0 ? 5 : 4
          }
        }
      })

      if (error) {
        console.error('Error completing session:', error)
      } else if (data?.data) {
        onSessionComplete?.(data.data.earnedPoints)
      }
    } catch (error) {
      console.error('Error completing session:', error)
    } finally {
      setIsActive(false)
      setTimeLeft(customDuration * 60)
      setSessionId(null)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const progress = ((customDuration * 60 - timeLeft) / (customDuration * 60)) * 100

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Timer className="h-5 w-5 mr-2 text-green-500" />
          Focus Session
        </CardTitle>
        <CardDescription>
          Stay focused and earn productivity points
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center space-y-6">
        <div className="relative">
          <motion.div
            className="w-32 h-32 mx-auto rounded-full border-8 border-gray-200 dark:border-gray-700 flex items-center justify-center relative overflow-hidden"
            animate={{ scale: isActive ? [1, 1.05, 1] : 1 }}
            transition={{ duration: 2, repeat: isActive ? Infinity : 0 }}
          >
            {/* Progress circle */}
            <motion.div
              className="absolute inset-0 rounded-full border-8 border-green-500"
              style={{
                background: `conic-gradient(from 0deg, #10B981 ${progress * 3.6}deg, transparent ${progress * 3.6}deg)`
              }}
            />
            
            <div className="relative z-10 text-center">
              <motion.div
                className="text-3xl font-bold text-gray-900 dark:text-white"
                animate={{ scale: timeLeft <= 10 && isActive ? [1, 1.1, 1] : 1 }}
                transition={{ duration: 0.5, repeat: timeLeft <= 10 && isActive ? Infinity : 0 }}
              >
                {formatTime(timeLeft)}
              </motion.div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {sessionType}
              </div>
            </div>
          </motion.div>
        </div>

        {!isActive ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-4">
              <select
                className="px-3 py-2 border rounded-md bg-background"
                value={sessionType}
                onChange={(e) => setSessionType(e.target.value)}
              >
                <option value="pomodoro">Pomodoro (25 min)</option>
                <option value="focus">Focus Session</option>
                <option value="deep_work">Deep Work</option>
              </select>
              <Input
                type="number"
                min={5}
                max={120}
                value={customDuration}
                onChange={(e) => {
                  const duration = Number(e.target.value)
                  setCustomDuration(duration)
                  setTimeLeft(duration * 60)
                }}
                className="w-20"
              />
              <span className="text-sm text-gray-500">min</span>
            </div>
            
            <Button onClick={startSession} className="w-full" size="lg">
              <Timer className="h-5 w-5 mr-2" />
              Start Focus Session
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Session in progress...
            </div>
            <div className="flex gap-2">
              <Button onClick={completeSession} variant="outline" className="flex-1">
                Complete Early
              </Button>
              <Button 
                onClick={() => {
                  setIsActive(false)
                  setTimeLeft(customDuration * 60)
                  setSessionId(null)
                }} 
                variant="destructive"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
