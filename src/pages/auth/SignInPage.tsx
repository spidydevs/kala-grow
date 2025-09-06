import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'react-hot-toast'
import { Eye, EyeOff, Mail, Lock } from 'lucide-react'

export function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from = location.state?.from?.pathname || '/dashboard'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await signIn(email, password)
      toast.success('Welcome back!')
      navigate(from, { replace: true })
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-5">
          <img src="/favicon.png" alt="Kala Grow" className="mx-auto h-14 w-auto mb-1" />
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Kala Grow</h1>
          <p className="text-sm text-muted-foreground mt-1">AI productivity suite</p>
        </div>

        <div className="rounded-lg p-6 bg-card border border-border backdrop-blur-sm shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="text-sm font-medium text-muted-foreground">Email</label>
              <div className="relative mt-2">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-400/90" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-transparent text-foreground placeholder-muted-foreground border-b border-border/30 focus:border-green-500 focus:ring-0 rounded-none"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="text-sm font-medium text-muted-foreground">Password</label>
              <div className="relative mt-2">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-400/90" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 bg-transparent text-foreground placeholder-muted-foreground border-b border-border/30 focus:border-green-500 focus:ring-0 rounded-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-300/80 hover:text-green-200"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-green-600 to-emerald-500 hover:brightness-95 text-black font-semibold py-2 rounded-md shadow-sm"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>

            <div className="flex items-center justify-between text-sm mt-3">
              <Link to="/auth/forgot-password" className="text-sm text-muted-foreground hover:underline">Forgot password?</Link>
              <Link to="/auth/signup" className="text-sm font-medium text-green-400 hover:text-green-300">Create account</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
