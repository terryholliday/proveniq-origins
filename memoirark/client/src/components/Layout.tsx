import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Moon, Sun, Home, Calendar, BookOpen, Users, FileText, Sparkles, Clock, Search, Download, Tag, FolderOpen, Filter, Upload, Music, RotateCcw } from 'lucide-react'
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
  ]

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center">
            <div className="mr-4 flex">
              <Link to="/" className="flex items-center space-x-2">
                <BookOpen className="h-6 w-6 text-primary" />
                <span className="font-display text-xl">MemoirArk</span>
              </Link>
            </div>
            <nav className="flex items-center space-x-1 text-sm font-medium flex-1 overflow-x-auto">
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
                          'flex items-center justify-center p-2 rounded-lg transition-all',
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
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
                  className="inline-flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-muted text-muted-foreground hover:text-foreground"
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
        <main className="container py-6">{children}</main>
      </div>
    </TooltipProvider>
  )
}
