import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar } from '@/components/ui/avatar'

import { Plus, Award, Star, Crown, Trophy, Medal, Target, Zap, Users, Loader2, UserPlus, Gift } from 'lucide-react'
import { toast } from 'sonner'
import { MedalService } from '@/services/medalService'
import { Medal as MedalType, UserMedal } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

interface MedalFormData {
  name: string
  description: string
  icon_url: string
  color: string
  points: number
  criteria: any
}

interface User {
  id: string
  full_name: string
  avatar_url?: string
  job_title?: string
}

const DEFAULT_MEDAL_ICONS = [
  { icon: Trophy, name: 'Trophy', url: '/images/medals/trophy.png' },
  { icon: Medal, name: 'Medal', url: '/images/medals/medal.png' },
  { icon: Star, name: 'Star', url: '/images/medals/star.png' },
  { icon: Crown, name: 'Crown', url: '/images/medals/crown.png' },
  { icon: Award, name: 'Award', url: '/images/medals/award.png' },
  { icon: Target, name: 'Target', url: '/images/medals/target.png' },
  { icon: Zap, name: 'Lightning', url: '/images/medals/lightning.png' },
  { icon: Users, name: 'Team', url: '/images/medals/team.png' }
]

const DEFAULT_COLORS = [
  '#FFD700', // Gold
  '#C0C0C0', // Silver
  '#CD7F32', // Bronze
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FECA57', // Yellow
  '#FF9FF3', // Pink
  '#A8E6CF'  // Light Green
]

export function MedalsManager() {
  const { user } = useAuth()
  const [medals, setMedals] = useState<MedalType[]>([])
  const [userMedals, setUserMedals] = useState<UserMedal[]>([])
  const [showCreateMedal, setShowCreateMedal] = useState(false)
  const [showAwardMedal, setShowAwardMedal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<any[]>([])
  const [selectedTab, setSelectedTab] = useState('overview')
  const [medalForm, setMedalForm] = useState<MedalFormData>({
    name: '',
    description: '',
    icon_url: '/images/medals/trophy.png',
    color: '#FFD700',
    points: 100,
    criteria: {}
  })
  const [awardForm, setAwardForm] = useState({
    medalId: '',
    userId: '',
    reason: ''
  })

  useEffect(() => {
    loadMedalsData()
  }, [user])

  const loadMedalsData = async () => {
    try {
      setLoading(true)
      const [allMedals, userMedalData, allUsers] = await Promise.all([
        MedalService.getAllMedals(),
        user ? MedalService.getUserMedals(user.id) : Promise.resolve([]),
        MedalService.getAllUsers()
      ])
      
      setMedals(allMedals)
      setUserMedals(userMedalData)
      setUsers(allUsers)
    } catch (error) {
      console.error('Error loading medals:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateMedal = async () => {
    if (!medalForm.name.trim()) {
      toast.error('Medal name is required')
      return
    }

    try {
      await MedalService.createMedal(medalForm)
      setShowCreateMedal(false)
      resetMedalForm()
      loadMedalsData()
      toast.success('Medal created successfully!')
    } catch (error) {
      console.error('Error creating medal:', error)
    }
  }

  const handleAwardMedal = async () => {
    if (!awardForm.medalId || !awardForm.userId) {
      toast.error('Please select both a medal and a user')
      return
    }

    try {
      const result = await MedalService.awardMedal(awardForm.userId, awardForm.medalId, awardForm.reason)
      setShowAwardMedal(false)
      setAwardForm({ medalId: '', userId: '', reason: '' })
      loadMedalsData()
      
      const medal = medals.find(m => m.id === awardForm.medalId)
      const user = users.find(u => u.id === awardForm.userId)
      
      toast.success(`Medal "${medal?.name}" awarded to ${user?.full_name}! ${medal?.points || 100} points added.`)
    } catch (error) {
      console.error('Error awarding medal:', error)
      toast.error(error.message || 'Failed to award medal')
    }
  }

  const resetMedalForm = () => {
    setMedalForm({
      name: '',
      description: '',
      icon_url: '/images/medals/trophy.png',
      color: '#FFD700',
      points: 100,
      criteria: {}
    })
  }

  const IconComponent = DEFAULT_MEDAL_ICONS.find(icon => icon.url === medalForm.icon_url)?.icon || Trophy

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Medal Management</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Create and award medals to recognize achievements
          </p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={showCreateMedal} onOpenChange={setShowCreateMedal}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Medal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Medal</DialogTitle>
                <DialogDescription>
                  Design a custom medal to recognize team achievements
                </DialogDescription>
              </DialogHeader>
              <MedalForm
                form={medalForm}
                setForm={setMedalForm}
                onSubmit={handleCreateMedal}
                onCancel={() => {
                  setShowCreateMedal(false)
                  resetMedalForm()
                }}
              />
            </DialogContent>
          </Dialog>
          
          <Dialog open={showAwardMedal} onOpenChange={setShowAwardMedal}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Gift className="h-4 w-4 mr-2" />
                Award Medal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Award Medal to User</DialogTitle>
                <DialogDescription>
                  Select a medal and user to award achievements
                </DialogDescription>
              </DialogHeader>
              <AwardMedalForm
                medals={medals}
                users={users}
                awardForm={awardForm}
                setAwardForm={setAwardForm}
                onSubmit={handleAwardMedal}
                onCancel={() => {
                  setShowAwardMedal(false)
                  setAwardForm({ medalId: '', userId: '', reason: '' })
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* My Medals */}
      {userMedals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Award className="h-5 w-5 mr-2 text-yellow-600" />
              My Medals ({userMedals.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {userMedals.map((userMedal) => (
                <div key={userMedal.id} className="text-center p-4 border rounded-lg hover:shadow-md transition-shadow">
                  <div 
                    className="w-16 h-16 mx-auto mb-2 rounded-full flex items-center justify-center text-white text-2xl"
                    style={{ backgroundColor: userMedal.medal?.color || '#FFD700' }}
                  >
                    🏆
                  </div>
                  <h3 className="font-semibold text-sm">{userMedal.medal?.name}</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {new Date(userMedal.awarded_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Medals */}
      <Card>
        <CardHeader>
          <CardTitle>Available Medals ({medals.length})</CardTitle>
          <CardDescription>
            Medals that can be awarded to team members
          </CardDescription>
        </CardHeader>
        <CardContent>
          {medals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {medals.map((medal) => (
                <Card key={medal.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl"
                          style={{ backgroundColor: medal.color }}
                        >
                          🏆
                        </div>
                        <div>
                          <h3 className="font-semibold">{medal.name}</h3>
                          {medal.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {medal.description}
                            </p>
                          )}
                          <p className="text-sm font-medium text-green-600 mt-1">
                            {medal.points || 100} points
                          </p>
                        </div>
                      </div>
                      <Badge 
                        style={{ 
                          backgroundColor: medal.color + '20', 
                          color: medal.color 
                        }}
                      >
                        Active
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No medals yet</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Create your first medal to start recognizing achievements
              </p>
              <Button onClick={() => setShowCreateMedal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Medal
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Medal Form Component
interface MedalFormProps {
  form: MedalFormData
  setForm: React.Dispatch<React.SetStateAction<MedalFormData>>
  onSubmit: () => void
  onCancel: () => void
}

function MedalForm({ form, setForm, onSubmit, onCancel }: MedalFormProps) {
  const IconComponent = DEFAULT_MEDAL_ICONS.find(icon => icon.url === form.icon_url)?.icon || Trophy

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="name">Medal Name *</Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Achievement Master"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={form.description}
          onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Awarded for exceptional achievement..."
          className="min-h-[80px]"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="points">Points Value *</Label>
        <Input
          id="points"
          type="number"
          min="1"
          max="1000"
          value={form.points}
          onChange={(e) => setForm(prev => ({ ...prev, points: parseInt(e.target.value) || 100 }))}
          placeholder="100"
        />
        <p className="text-xs text-gray-500">Points awarded when this medal is given to a user</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Icon</Label>
          <select
            value={form.icon_url}
            onChange={(e) => setForm(prev => ({ ...prev, icon_url: e.target.value }))}
            className="w-full h-10 px-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            {DEFAULT_MEDAL_ICONS.map((icon) => (
              <option key={icon.url} value={icon.url}>
                {icon.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="space-y-2">
          <Label>Color</Label>
          <div className="grid grid-cols-5 gap-2">
            {DEFAULT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                  form.color === color ? 'border-gray-900 dark:border-white' : 'border-gray-300'
                }`}
                style={{ backgroundColor: color }}
                onClick={() => setForm(prev => ({ ...prev, color }))}
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* Preview */}
      <div className="space-y-2">
        <Label>Preview</Label>
        <div className="flex items-center space-x-3 p-4 border rounded-lg">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center text-white"
            style={{ backgroundColor: form.color }}
          >
            <IconComponent className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold">{form.name || 'Medal Name'}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {form.description || 'Medal description'}
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end space-x-2 pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSubmit}>
          Create Medal
        </Button>
      </div>
    </div>
  )
}

// Award Medal Form Component
interface AwardMedalFormProps {
  medals: MedalType[]
  users: User[]
  awardForm: {
    medalId: string
    userId: string
    reason: string
  }
  setAwardForm: React.Dispatch<React.SetStateAction<{
    medalId: string
    userId: string
    reason: string
  }>>
  onSubmit: () => void
  onCancel: () => void
}

function AwardMedalForm({ medals, users, awardForm, setAwardForm, onSubmit, onCancel }: AwardMedalFormProps) {
  const selectedMedal = medals.find(m => m.id === awardForm.medalId)
  const selectedUser = users.find(u => u.id === awardForm.userId)

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="medalSelect">Select Medal *</Label>
        <Select value={awardForm.medalId} onValueChange={(value) => setAwardForm(prev => ({ ...prev, medalId: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a medal to award" />
          </SelectTrigger>
          <SelectContent>
            {medals.map((medal) => (
              <SelectItem key={medal.id} value={medal.id}>
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: medal.color }}
                  />
                  <span>{medal.name} ({medal.points || 100} points)</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="userSelect">Select User *</Label>
        <Select value={awardForm.userId} onValueChange={(value) => setAwardForm(prev => ({ ...prev, userId: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a user to award" />
          </SelectTrigger>
          <SelectContent>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                <div className="flex items-center space-x-2">
                  <span>{user.full_name}</span>
                  {user.job_title && (
                    <span className="text-sm text-gray-500">({user.job_title})</span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="reason">Reason (Optional)</Label>
        <Textarea
          id="reason"
          value={awardForm.reason}
          onChange={(e) => setAwardForm(prev => ({ ...prev, reason: e.target.value }))}
          placeholder="Why is this medal being awarded?"
          className="min-h-[80px]"
        />
      </div>
      
      {/* Preview */}
      {selectedMedal && selectedUser && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="font-medium mb-2">Award Preview</h4>
          <div className="flex items-center space-x-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg"
              style={{ backgroundColor: selectedMedal.color }}
            >
              🏆
            </div>
            <div>
              <p className="font-medium">{selectedMedal.name}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selectedUser.full_name} will receive {selectedMedal.points || 100} points
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex justify-end space-x-3 pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={!awardForm.medalId || !awardForm.userId}>
          Award Medal
        </Button>
      </div>
    </div>
  )
}