import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Moon, Sun, Home, Calendar, BookOpen, Users, FileText, Sparkles, Clock, Search, Download, Tag, FolderOpen, Filter, Upload, Music, RotateCcw, HelpCircle, Feather } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface LayoutProps {
  children: ReactNode
  theme: 'light' | 'dark'
  toggleTheme: () => void
}

export default function Layout({ children, theme, toggleTheme }: LayoutProps) {
  const location = useLocation()

  const navItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/timeline', label: 'Timeline', icon: Clock },
    { path: '/events', label: 'Events', icon: Calendar },
    { path: '/chapters', label: 'Chapters', icon: BookOpen },
    { path: '/people', label: 'People', icon: Users },
    { path: '/artifacts', label: 'Artifacts', icon: FileText },
    { path: '/synchronicities', label: 'Sync', icon: Sparkles },
    { path: '/tags', label: 'Tags', icon: Tag },
    { path: '/collections', label: 'Collections', icon: FolderOpen },
    { path: '/query', label: 'Query', icon: Filter },
    { path: '/upload', label: 'Upload', icon: Upload },
    { path: '/search', label: 'Search', icon: Search },
    { path: '/export', label: 'Export', icon: Download },
    { path: '/manage/chapters', label: 'Edit Chapters', icon: BookOpen },
    { path: '/manage/trauma-cycles', label: 'Edit Cycles', icon: RotateCcw },
    { path: '/manage/songs', label: 'Edit Songs', icon: Music },
    { path: '/guide', label: 'User Guide', icon: HelpCircle },
  ]

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 border-b border-border/50 bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
          <div className="container flex h-14 items-center">
            <div className="mr-4 flex">
              <Link to="/" className="flex items-center space-x-2 group">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 group-hover:from-primary/20 group-hover:to-accent/20 transition-colors">
                  <Feather className="h-5 w-5 text-primary" />
                </div>
                <span className="font-display text-xl bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">MemoirArk</span>
              </Link>
            </div>
            <nav className="flex items-center space-x-0.5 text-sm font-medium flex-1 overflow-x-auto">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <Tooltip key={item.path}>
                    <TooltipTrigger asChild>
                      <Link
                        to={item.path}
                        data-tour={item.path.replace(/\//g, '-').slice(1) || 'dashboard'}
                        className={cn(
                          'flex items-center justify-center p-2 rounded-lg transition-all duration-200',
                          isActive
                            ? 'bg-gradient-to-br from-primary/15 to-accent/10 text-primary shadow-sm'
                            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="font-medium">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </nav>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleTheme}
                  className="inline-flex items-center justify-center rounded-lg p-2 transition-all duration-200 hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                  aria-label="Toggle theme"
                >
                  {theme === 'dark' ? (
                    <Sun className="h-5 w-5" />
                  ) : (
                    <Moon className="h-5 w-5" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {theme === 'dark' ? 'Light mode' : 'Dark mode'}
              </TooltipContent>
            </Tooltip>
          </div>
        </header>
        <main className="container py-8">{children}</main>
      </div>
    </TooltipProvider>
  )
}
