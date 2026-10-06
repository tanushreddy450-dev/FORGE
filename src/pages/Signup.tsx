import { useState, type FormEvent, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  Code2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  GraduationCap,
  AlertCircle,
  Check,
  Loader2,
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { setToken } from '@/lib/api'
import { ModeToggle } from '@/components/ui/mode-toggle'
import { Input } from '@/components/shadcn/ui/input'
import { Label } from '@/components/shadcn/ui/label'
import { Button } from '@/components/shadcn/ui/button'
import { SocialLoginButtons } from '@/components/auth/SocialLoginButtons'

export default function Signup() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { register, isAuthenticated, loading: authLoading, refresh } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [college, setCollege] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Handle OAuth return params (oauth_token or oauth_error from provider callback)
  useEffect(() => {
    const oauthToken = searchParams.get('oauth_token') || searchParams.get('token')
    const oauthError = searchParams.get('oauth_error') || searchParams.get('error')

    if (oauthToken) {
      setToken(oauthToken)
      refresh().then(() => {
        navigate('/dashboard', { replace: true })
      })
    } else if (oauthError) {
      // Clean query parameter from browser address bar immediately so it is not persistent
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [searchParams, refresh, navigate])

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, authLoading, navigate])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    try {
      const username =
        email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') ||
        fullName.toLowerCase().replace(/\s+/g, '_')
      await register({
        email: email.trim(),
        username,
        full_name: fullName.trim(),
        password,
        college: college.trim() || undefined,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed'
      if (
        msg.includes('Failed to fetch') ||
        msg.includes('NetworkError') ||
        msg.includes('fetch')
      ) {
        setError('Cannot reach server. Please ensure the backend is running on http://localhost:8000 and try again.')
      } else if (msg.includes('already registered') || msg.includes('already taken')) {
        setError(msg)
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary/20 selection:text-primary">
      {/* Top Header */}
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center transition-colors group-hover:bg-primary/15">
            <Code2 className="w-5 h-5" />
          </div>
          <span className="font-semibold text-lg tracking-tight">FORGE</span>
        </Link>
        <div className="flex items-center gap-3">
          <ModeToggle />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 flex-1 flex items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          {/* Left Column: Product Context */}
          <div className="lg:col-span-6 xl:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              <span>Interactive DSA Learning</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground leading-[1.15]">
                Start mastering algorithms today.
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl">
                Create your account to unlock curated topic roadmaps, live visual debuggers, and adaptive mentoring.
              </p>
            </div>

            {/* Product Highlights */}
            <div className="space-y-3.5 pt-2">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-md bg-muted text-foreground flex items-center justify-center shrink-0 mt-0.5 border border-border">
                  <Check className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="text-sm">
                  <span className="font-medium text-foreground">Structured topic roadmaps</span>
                  <span className="text-muted-foreground"> — progress from fundamentals to dynamic programming.</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-md bg-muted text-foreground flex items-center justify-center shrink-0 mt-0.5 border border-border">
                  <Layers className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="text-sm">
                  <span className="font-medium text-foreground">Real execution trace</span>
                  <span className="text-muted-foreground"> — see data structures update at every line of code.</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-md bg-muted text-foreground flex items-center justify-center shrink-0 mt-0.5 border border-border">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="text-sm">
                  <span className="font-medium text-foreground">Free for individual learners</span>
                  <span className="text-muted-foreground"> — full access to practice arena and problem test harness.</span>
                </div>
              </div>
            </div>

            {/* Reassurance Box */}
            <div className="p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm max-w-lg shadow-xs space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
                  Instant Access
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                No credit card required. Start solving problems right inside your browser immediately.
              </p>
            </div>
          </div>

          {/* Right Column: Sign Up Card */}
          <div className="lg:col-span-6 xl:col-span-5">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="w-full max-w-md mx-auto rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm"
            >
              <div className="space-y-1.5 mb-5">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  Create Account
                </h2>
                <p className="text-sm text-muted-foreground">
                  Join developers mastering data structures and algorithms.
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2.5"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-snug text-xs">{error}</span>
                </div>
              )}

              {/* Social Login Options */}
              <SocialLoginButtons redirectTo="/dashboard" disabled={loading} />

              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName" className="text-xs font-medium text-foreground">
                    Full Name
                  </Label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ada Lovelace"
                      required
                      autoComplete="name"
                      className="pl-9 h-10 rounded-lg text-sm bg-background border-border"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium text-foreground">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      required
                      autoComplete="email"
                      className="pl-9 h-10 rounded-lg text-sm bg-background border-border"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="college" className="text-xs font-medium text-foreground">
                    University / Institution <span className="text-muted-foreground font-normal">(Optional)</span>
                  </Label>
                  <div className="relative">
                    <GraduationCap className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      id="college"
                      type="text"
                      value={college}
                      onChange={(e) => setCollege(e.target.value)}
                      placeholder="e.g. Stanford University"
                      autoComplete="organization"
                      className="pl-9 h-10 rounded-lg text-sm bg-background border-border"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-xs font-medium text-foreground">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        autoComplete="new-password"
                        className="pl-9 pr-9 h-10 rounded-lg text-sm bg-background border-border"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword" className="text-xs font-medium text-foreground">
                      Confirm
                    </Label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      <Input
                        id="confirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        autoComplete="new-password"
                        className="pl-9 h-10 rounded-lg text-sm bg-background border-border"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 rounded-lg text-sm font-medium transition-colors mt-2"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating account…
                    </span>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </form>

              <div className="mt-5 pt-4 border-t border-border/60 text-center">
                <p className="text-xs text-muted-foreground">
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    className="font-medium text-foreground hover:text-primary transition-colors underline underline-offset-4"
                  >
                    Sign In
                  </Link>
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Subtle Footer */}
      <footer className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
        <p>© 2026 FORGE. Thoughtful DSA learning and visualization.</p>
        <div className="flex items-center gap-4">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <Link to="/login" className="hover:text-foreground transition-colors">Sign In</Link>
        </div>
      </footer>
    </div>
  )
}
