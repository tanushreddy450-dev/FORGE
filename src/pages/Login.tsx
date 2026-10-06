import { useState, type FormEvent, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  Code2,
  Mail,
  Lock,
  Eye,
  EyeOff,
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

export default function Login() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { login, isAuthenticated, loading: authLoading, refresh } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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

  const handleFillDemo = () => {
    setEmail('demo@algomaster.com')
    setPassword('Demo@1234')
    setError(null)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.')
      return
    }
    setLoading(true)
    try {
      await login(email.trim(), password)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed'
      if (
        msg.includes('Failed to fetch') ||
        msg.includes('NetworkError') ||
        msg.includes('fetch') ||
        msg.includes('Load failed')
      ) {
        setError('Cannot reach server. Please ensure the backend is running on http://localhost:8000 and try again.')
      } else if (msg.includes('Invalid email or password') || msg.includes('401')) {
        setError('Invalid email or password. You can use the demo account below or register a new one.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary/20 selection:text-primary">
      {/* Subtle professional Login theme background behind the original UI */}
      <div
        className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat opacity-45 dark:opacity-15"
        style={{ backgroundImage: `url('/theme-login.png')` }}
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col min-h-screen justify-between bg-background/60 dark:bg-background/80 backdrop-blur-[0.5px]">
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
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-12 flex-1 flex items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          {/* Left Column: Product Context */}
          <div className="lg:col-span-6 xl:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              <span>Interactive DSA Learning</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground leading-[1.15]">
                Build stronger DSA thinking.
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl">
                Learn data structures and algorithms through structured practice, step-by-step visual execution, and guided problem solving.
              </p>
            </div>

            {/* Product Highlights */}
            <div className="space-y-3.5 pt-2">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-md bg-muted text-foreground flex items-center justify-center shrink-0 mt-0.5 border border-border">
                  <Check className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="text-sm">
                  <span className="font-medium text-foreground">Practice real coding problems</span>
                  <span className="text-muted-foreground"> — curated by difficulty and algorithmic patterns.</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-md bg-muted text-foreground flex items-center justify-center shrink-0 mt-0.5 border border-border">
                  <Layers className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="text-sm">
                  <span className="font-medium text-foreground">Understand algorithms visually</span>
                  <span className="text-muted-foreground"> — inspect pointer movements, arrays, and recursion.</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-md bg-muted text-foreground flex items-center justify-center shrink-0 mt-0.5 border border-border">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="text-sm">
                  <span className="font-medium text-foreground">Learn with an AI tutor</span>
                  <span className="text-muted-foreground"> — get progressive hints without spoiling full solutions.</span>
                </div>
              </div>
            </div>

            {/* Evaluation Demo Box */}
            <div className="p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm max-w-lg shadow-xs space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
                    Evaluation Demo Account
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleFillDemo}
                  className="text-xs font-medium text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1"
                >
                  Auto-fill demo <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>Email: <code className="text-foreground font-mono bg-muted px-1.5 py-0.5 rounded">demo@algomaster.com</code></span>
                <span>Password: <code className="text-foreground font-mono bg-muted px-1.5 py-0.5 rounded">Demo@1234</code></span>
              </div>
            </div>
          </div>

          {/* Right Column: Sign In Card */}
          <div className="lg:col-span-6 xl:col-span-5">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="w-full max-w-md mx-auto rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm"
            >
              <div className="space-y-1.5 mb-6">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  Sign In
                </h2>
                <p className="text-sm text-muted-foreground">
                  Enter your credentials to access your workspace.
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mb-5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2.5"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-snug text-xs">{error}</span>
                </div>
              )}

              {/* Social Login Options */}
              <SocialLoginButtons redirectTo="/dashboard" disabled={loading} />

              <form onSubmit={handleSubmit} className="space-y-4">
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
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-medium text-foreground">
                      Password
                    </Label>
                    <button
                      type="button"
                      onClick={() => setError('Password reset instructions will be sent to your registered email.')}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                      className="pl-9 pr-10 h-10 rounded-lg text-sm bg-background border-border"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
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
                      Signing in…
                    </span>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>

              <div className="mt-6 pt-5 border-t border-border/60 text-center">
                <p className="text-xs text-muted-foreground">
                  Don&apos;t have an account?{' '}
                  <Link
                    to="/signup"
                    className="font-medium text-foreground hover:text-primary transition-colors underline underline-offset-4"
                  >
                    Create account
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
          <Link to="/signup" className="hover:text-foreground transition-colors">Sign Up</Link>
        </div>
      </footer>
      </div>
    </div>
  )
}
