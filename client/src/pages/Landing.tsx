import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Feather,
  BookOpen,
  Users,
  Clock,
  Sparkles,
  Star,
  MessageCircle,
  FileText,
  Shield,
  Loader2,
  Mail,
  AlertCircle,
  Check,
  ArrowRight,
} from 'lucide-react'

export default function Landing() {
  const navigate = useNavigate()
  const { login, loginWithEmail, signup, isAuthenticated } = useAuth()
  
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Redirect if already authenticated
  if (isAuthenticated) {
    navigate('/', { replace: true })
    return null
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      if (authMode === 'signup') {
        const result = await signup(email, password, name || undefined)
        if (!result.success) {
          setError(result.error || 'Signup failed')
        }
      } else {
        const result = await loginWithEmail(email, password)
        if (!result.success) {
          setError(result.error || 'Login failed')
        }
      }
    } finally {
      setSubmitting(false)
    }
  }

  const openAuth = (mode: 'login' | 'signup') => {
    setAuthMode(mode)
    setError(null)
    setEmail('')
    setPassword('')
    setName('')
    setShowAuthModal(true)
  }

  const features = [
    {
      icon: MessageCircle,
      title: 'Ori AI Interviewer',
      description: 'Have natural conversations that gently guide you through your memories',
    },
    {
      icon: Clock,
      title: 'Visual Timeline',
      description: 'See your life unfold chronologically with an interactive timeline',
    },
    {
      icon: Users,
      title: 'People & Relationships',
      description: 'Map the people who shaped your story and their connections',
    },
    {
      icon: BookOpen,
      title: 'Auto-Generated Chapters',
      description: 'AI organizes your memories into meaningful memoir chapters',
    },
    {
      icon: Sparkles,
      title: 'Astro Mode',
      description: 'Discover cosmic patterns and synchronicities in your life events',
      premium: true,
    },
    {
      icon: FileText,
      title: 'Artifact Archive',
      description: 'Store photos, documents, and audio recordings with your stories',
    },
  ]

  const pricingTiers = [
    {
      name: 'Free',
      price: '$0',
      period: '',
      description: 'Start preserving your story',
      features: [
        '50 life events',
        '5 people profiles',
        'Basic timeline view',
        '10 Ori conversations/month',
      ],
      cta: 'Get Started Free',
      highlighted: false,
    },
    {
      name: 'Storyteller',
      price: '$9.99',
      period: '/month',
      description: 'For dedicated memoir writers',
      features: [
        'Unlimited events & people',
        'Full Ori AI access',
        'Chapter auto-generation',
        'PDF & ePub export',
        'Audio transcription (5 hrs/mo)',
      ],
      cta: 'Start Free Trial',
      highlighted: true,
    },
    {
      name: 'Legacy',
      price: '$19.99',
      period: '/month',
      description: 'The complete memoir experience',
      features: [
        'Everything in Storyteller',
        'Astro Mode & synchronicities',
        'Cloud import (Google Drive, Dropbox)',
        'Audio transcription (20 hrs/mo)',
        'Priority support',
      ],
      cta: 'Start Free Trial',
      highlighted: false,
    },
  ]

  const testimonials = [
    {
      quote: "I've been meaning to write my memoir for 20 years. Origins made it happen in 3 months.",
      author: "Margaret T.",
      role: "Retired Teacher, 72",
    },
    {
      quote: "The AI interviewer asked questions I never thought to ask myself. It unlocked memories I'd forgotten.",
      author: "David K.",
      role: "Vietnam Veteran, 78",
    },
    {
      quote: "My grandchildren will know who I really was, not just 'grandma'. That's priceless.",
      author: "Eleanor S.",
      role: "Family Matriarch, 81",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-orange-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-amber-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30">
                <Feather className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">Origins <span className="text-sm font-normal text-amber-600">by PROVENIQ</span></span>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => openAuth('login')}>
                Sign In
              </Button>
              <Button onClick={() => openAuth('signup')} className="bg-amber-600 hover:bg-amber-700">
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-sm font-medium mb-8">
              <Sparkles className="h-4 w-4" />
              AI-Powered Memoir Writing
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white leading-tight">
              Where You{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-600">
                Come From
              </span>
            </h1>
            <p className="mt-6 text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Origins helps you capture, organize, and transform your memories into a 
              lasting legacy. With AI-guided interviews and automatic chapter generation, 
              your story writes itself.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={() => openAuth('signup')}
                className="bg-amber-600 hover:bg-amber-700 text-lg h-14 px-8"
              >
                Start Your Story Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="text-lg h-14 px-8"
              >
                See How It Works
              </Button>
            </div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              No credit card required • Free forever plan available
            </p>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-amber-200 dark:bg-amber-900/20 rounded-full blur-3xl opacity-30" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-200 dark:bg-orange-900/20 rounded-full blur-3xl opacity-30" />
      </section>

      {/* Social Proof */}
      <section className="py-12 bg-white/50 dark:bg-gray-900/50 border-y border-amber-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center items-center gap-8 text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-200 to-orange-200 dark:from-amber-800 dark:to-orange-800 border-2 border-white dark:border-gray-900" />
                ))}
              </div>
              <span className="text-sm font-medium">2,500+ stories preserved</span>
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
              ))}
              <span className="ml-2 text-sm font-medium">4.9/5 rating</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <span className="text-sm font-medium">Bank-level encryption</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              Everything You Need to Write Your Story
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Powerful tools designed to make memoir writing effortless and meaningful
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <Card key={feature.title} className="relative overflow-hidden hover:shadow-lg transition-shadow">
                {feature.premium && (
                  <div className="absolute top-4 right-4">
                    <span className="px-2 py-1 text-xs font-medium bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full">
                      Premium
                    </span>
                  </div>
                )}
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 lg:py-32 bg-gradient-to-b from-amber-50 to-white dark:from-gray-900 dark:to-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              How Origins Works
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              Three simple steps to your finished memoir
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Talk to Ori',
                description: 'Our AI interviewer asks thoughtful questions to help you recall and articulate your memories.',
              },
              {
                step: '2',
                title: 'Watch It Organize',
                description: 'Origins automatically creates a timeline, links people, and identifies chapter themes.',
              },
              {
                step: '3',
                title: 'Export Your Memoir',
                description: 'Download your polished memoir as a PDF, ePub, or order a printed hardcover book.',
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-white text-2xl font-bold flex items-center justify-center mx-auto mb-6">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  {item.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              Stories From Our Community
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, i) => (
              <Card key={i} className="bg-white dark:bg-gray-900">
                <CardContent className="pt-6">
                  <div className="flex gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 italic mb-4">
                    "{testimonial.quote}"
                  </p>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{testimonial.author}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 lg:py-32 bg-gradient-to-b from-white to-amber-50 dark:from-gray-950 dark:to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              Simple, Transparent Pricing
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              Start free, upgrade when you're ready
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingTiers.map((tier) => (
              <Card 
                key={tier.name} 
                className={`relative ${tier.highlighted ? 'border-2 border-amber-500 shadow-xl scale-105' : ''}`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 text-sm font-medium bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                <CardContent className="pt-8">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{tier.name}</h3>
                  <div className="mt-4 flex items-baseline">
                    <span className="text-4xl font-bold text-gray-900 dark:text-white">{tier.price}</span>
                    <span className="text-gray-500 dark:text-gray-400 ml-1">{tier.period}</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{tier.description}</p>
                  
                  <ul className="mt-6 space-y-3">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-600 dark:text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    className={`w-full mt-8 ${tier.highlighted ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
                    variant={tier.highlighted ? 'default' : 'outline'}
                    onClick={() => openAuth('signup')}
                  >
                    {tier.cta}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 lg:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
            Your Origins Deserve to Be Preserved
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
            Don't let your story fade. Start preserving your origins today.
          </p>
          <Button 
            size="lg" 
            onClick={() => openAuth('signup')}
            className="mt-8 bg-amber-600 hover:bg-amber-700 text-lg h-14 px-8"
          >
            Begin Your Story — It's Free
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Feather className="h-5 w-5 text-amber-500" />
              <span className="text-white font-semibold">Origins <span className="text-amber-500 text-xs">by PROVENIQ</span></span>
            </div>
            <div className="flex gap-6 text-sm">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
            </div>
            <p className="text-sm">© 2024 Origins by PROVENIQ. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Feather className="h-5 w-5 text-amber-600" />
              {authMode === 'signup' ? 'Create Your Account' : 'Welcome Back'}
            </DialogTitle>
            <DialogDescription>
              {authMode === 'signup' 
                ? 'Start preserving your life story today' 
                : 'Sign in to continue your memoir'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Google Sign In */}
            <Button 
              onClick={login}
              className="w-full h-11"
              variant="outline"
              type="button"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            {/* Email Form */}
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              {authMode === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="name">Name (optional)</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={authMode === 'signup' ? 'At least 8 characters' : 'Your password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={authMode === 'signup' ? 8 : 1}
                />
              </div>
              <Button type="submit" className="w-full h-11 bg-amber-600 hover:bg-amber-700" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" />
                )}
                {authMode === 'signup' ? 'Create Account' : 'Sign In'}
              </Button>
            </form>

            <div className="text-center text-sm">
              {authMode === 'login' ? (
                <p className="text-muted-foreground">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setAuthMode('signup'); setError(null); }}
                    className="text-amber-600 hover:underline font-medium"
                  >
                    Sign up
                  </button>
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setAuthMode('login'); setError(null); }}
                    className="text-amber-600 hover:underline font-medium"
                  >
                    Sign in
                  </button>
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
