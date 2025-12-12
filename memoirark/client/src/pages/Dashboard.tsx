import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { statsApi } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Calendar, 
  BookOpen, 
  Users, 
  FileText, 
  Sparkles, 
  Upload, 
  Search, 
  Clock, 
  Download,
  ArrowRight,
  HelpCircle,
  Tag,
  FolderOpen,
  Filter,
  Feather,
  Heart,
} from 'lucide-react'

const INSPIRATIONAL_QUOTES = [
  { text: "Every life is a story worth telling.", author: "Unknown" },
  { text: "The unexamined life is not worth living.", author: "Socrates" },
  { text: "We write to taste life twice.", author: "Anaïs Nin" },
  { text: "Your story matters. Tell it.", author: "Unknown" },
  { text: "Memory is the diary we all carry about with us.", author: "Oscar Wilde" },
]

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: statsApi.getStats,
  })

  const randomQuote = INSPIRATIONAL_QUOTES[Math.floor(Date.now() / 86400000) % INSPIRATIONAL_QUOTES.length]

  const quickActions = [
    {
      title: 'Talk with Noah',
      description: 'Your story guide awaits',
      icon: Sparkles,
      href: '/wizard',
      color: 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400',
      featured: true,
    },
    {
      title: 'Capture a Moment',
      description: 'A memory waiting to be told',
      icon: Feather,
      href: '/events/new',
      color: 'bg-gradient-to-br from-violet-500/15 to-purple-500/15 text-violet-600 dark:text-violet-400',
    },
    {
      title: 'Add Someone Special',
      description: 'The people who shaped you',
      icon: Heart,
      href: '/people/new',
      color: 'bg-gradient-to-br from-rose-500/15 to-pink-500/15 text-rose-600 dark:text-rose-400',
    },
    {
      title: 'Upload Audio',
      description: 'Voices and conversations',
      icon: Upload,
      href: '/upload',
      color: 'bg-gradient-to-br from-emerald-500/15 to-teal-500/15 text-emerald-600 dark:text-emerald-400',
    },
    {
      title: 'Add Artifact',
      description: 'Photos, letters, treasures',
      icon: FileText,
      href: '/artifacts/new',
      color: 'bg-gradient-to-br from-sky-500/15 to-blue-500/15 text-sky-600 dark:text-sky-400',
    },
  ]

  const browseActions = [
    { title: 'Timeline', description: 'Your journey through time', icon: Clock, href: '/timeline' },
    { title: 'Moments', description: `${stats?.events ?? 0} memories captured`, icon: Calendar, href: '/events' },
    { title: 'People', description: `${stats?.persons ?? 0} souls in your story`, icon: Users, href: '/people' },
    { title: 'Chapters', description: `${stats?.chapters ?? 0} chapters written`, icon: BookOpen, href: '/chapters' },
    { title: 'Artifacts', description: `${stats?.artifacts ?? 0} treasures saved`, icon: FileText, href: '/artifacts' },
    { title: 'Synchronicities', description: `${stats?.synchronicities ?? 0} meaningful connections`, icon: Sparkles, href: '/synchronicities' },
  ]

  const toolActions = [
    { title: 'Search', description: 'Find anything', icon: Search, href: '/search' },
    { title: 'Query Builder', description: 'Advanced filters', icon: Filter, href: '/query' },
    { title: 'Tags', description: 'Organize by theme', icon: Tag, href: '/tags' },
    { title: 'Collections', description: 'Group content', icon: FolderOpen, href: '/collections' },
    { title: 'Export', description: 'Download memoir', icon: Download, href: '/export' },
    { title: 'User Guide', description: 'How to use', icon: HelpCircle, href: '/guide' },
  ]

  return (
    <div className="space-y-10">
      {/* Hero section with inspirational quote */}
      <div className="relative overflow-hidden rounded-2xl gradient-hero p-8 md:p-10">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-transparent" />
        <div className="relative">
          <h1 className="text-3xl md:text-4xl font-display text-foreground mb-2">Welcome to MemoirArk</h1>
          <p className="text-lg text-muted-foreground mb-6">Where your story finds its voice</p>
          
          <blockquote className="border-l-2 border-primary/40 pl-4 py-1">
            <p className="text-base md:text-lg font-narrative italic text-foreground/80">"{randomQuote.text}"</p>
            <footer className="text-sm text-muted-foreground mt-1">— {randomQuote.author}</footer>
          </blockquote>
        </div>
        
        {!isLoading && stats && stats.events > 0 && (
          <div className="mt-6 pt-6 border-t border-border/50 flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-2xl font-display text-primary">{stats.events}</span>
              <span className="text-muted-foreground ml-2">moments captured</span>
            </div>
            <div>
              <span className="text-2xl font-display text-accent">{stats.persons}</span>
              <span className="text-muted-foreground ml-2">people remembered</span>
            </div>
            <div>
              <span className="text-2xl font-display text-primary">{stats.artifacts}</span>
              <span className="text-muted-foreground ml-2">artifacts preserved</span>
            </div>
          </div>
        )}
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Feather className="w-5 h-5 text-primary" />
          Begin Your Journey
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Link key={action.href} to={action.href} className={action.featured ? 'sm:col-span-2 lg:col-span-1' : ''}>
                <Card className={`h-full transition-smooth hover:shadow-lg hover:-translate-y-1 cursor-pointer group border-transparent ${
                  action.featured ? 'bg-gradient-to-br from-primary/10 via-accent/5 to-transparent ring-1 ring-primary/20' : 'hover:border-primary/30'
                }`}>
                  <CardContent className="pt-6">
                    <div className={`w-12 h-12 rounded-xl ${action.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="font-semibold">{action.title}</h3>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-accent" />
          Explore Your Story
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {browseActions.map((action) => {
            const Icon = action.icon
            return (
              <Link key={action.href} to={action.href}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardContent className="py-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Icon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium">{action.title}</h3>
                      <p className="text-sm text-muted-foreground truncate">{action.description}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Search className="w-5 h-5 text-muted-foreground" />
          Tools & Discovery
        </h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {toolActions.map((action) => {
            const Icon = action.icon
            return (
              <Link key={action.href} to={action.href}>
                <Button variant="outline" className="w-full justify-start h-auto py-3 px-4">
                  <Icon className="w-4 h-4 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">{action.title}</div>
                    <div className="text-xs text-muted-foreground">{action.description}</div>
                  </div>
                </Button>
              </Link>
            )
          })}
        </div>
      </section>

      <Card className="bg-gradient-to-br from-primary/5 via-accent/5 to-transparent border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-display">Your Story Awaits</CardTitle>
          <CardDescription>Every great memoir begins with a single memory</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-primary flex items-center justify-center text-sm font-semibold flex-shrink-0">1</div>
            <div>
              <p className="font-medium">Let the memories flow</p>
              <p className="text-sm text-muted-foreground">Talk with Noah, add moments as they come, upload photos and recordings</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent/20 to-accent/10 text-accent flex items-center justify-center text-sm font-semibold flex-shrink-0">2</div>
            <div>
              <p className="font-medium">Watch patterns emerge</p>
              <p className="text-sm text-muted-foreground">Connect people, places, and moments—your story will reveal itself</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/10 text-primary flex items-center justify-center text-sm font-semibold flex-shrink-0">3</div>
            <div>
              <p className="font-medium">Share your truth</p>
              <p className="text-sm text-muted-foreground">Export your memoir when you're ready—or keep it just for you</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
