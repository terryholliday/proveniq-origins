import { ReactNode, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Moon, Sun, Home, Calendar, BookOpen, Users, FileText, Sparkles,
  Clock, Search, Download, Tag, FolderOpen, Upload, Music,
  HelpCircle, Feather, LogOut, MessageCircle, Menu, X, ChevronDown,
  TreePine, Mic, Package, FileArchive, Lightbulb
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface LayoutProps {
  children: ReactNode
  theme: 'light' | 'dark'
  toggleTheme: () => void
}

export default function Layout({ children, theme, toggleTheme }: LayoutProps) {
  const location = useLocation()
  const { user, logout } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Primary nav items (always visible with labels)
  const primaryNav = [
    { path: '/', label: 'Home', icon: Home, tourId: 'dashboard' },
    { path: '/wizard', label: 'Talk to Ori', icon: MessageCircle, featured: true },
    { path: '/timeline', label: 'Timeline', icon: Clock, tourId: 'timeline' },
    { path: '/insights', label: 'Insights', icon: Lightbulb },
  ]

  // Dropdown menus
  const contentMenu = [
    { path: '/events', label: 'Life Events', icon: Calendar, desc: 'Your memories and moments', tourId: 'events' },
    { path: '/people', label: 'People', icon: Users, desc: 'Those who shaped your story', tourId: 'people' },
    { path: '/artifacts', label: 'Artifacts', icon: FileText, desc: 'Photos, documents, treasures', tourId: 'artifacts' },
    { path: '/chapters', label: 'Chapters', icon: BookOpen, desc: 'Your memoir structure', tourId: 'chapters' },
    { path: '/synchronicities', label: 'Synchronicities', icon: Sparkles, desc: 'Meaningful coincidences', tourId: 'synchronicities' },
    { path: '/family-tree', label: 'Family Tree', icon: TreePine, desc: 'Your lineage' },
  ]

  const importMenu = [
    { path: '/bulk-upload', label: 'Bulk Upload', icon: FileArchive, desc: 'Multiple files or ZIP' },
    { path: '/upload', label: 'Audio Recording', icon: Mic, desc: 'Voice memos and recordings' },
    { path: '/voice-capture', label: 'Voice Capture', icon: Mic, desc: 'Record directly' },
    { path: '/import/cloud', label: 'Cloud Import', icon: Package, desc: 'Google Drive, Dropbox' },
  ]

  const organizeMenu = [
    { path: '/search', label: 'Search', icon: Search, desc: 'Find anything', tourId: 'search' },
    { path: '/tags', label: 'Tags', icon: Tag, desc: 'Organize by theme', tourId: 'tags' },
    { path: '/collections', label: 'Collections', icon: FolderOpen, desc: 'Group related items', tourId: 'collections' },
  ]

  const moreMenu = [
    { path: '/export', label: 'Export Memoir', icon: Download, desc: 'Download your story' },
    { path: '/manage/songs', label: 'Soundtrack', icon: Music, desc: 'Songs of your life' },
    { path: '/guide', label: 'Help & Guide', icon: HelpCircle, desc: 'How to use Origins' },
  ]

  const NavDropdown = ({ label, items, icon: Icon, tourId }: { label: string; items: typeof contentMenu; icon: any; tourId?: string }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-1.5 h-9 px-3" data-tour={tourId}>
          <Icon className="h-4 w-4" />
          <span>{label}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {items.map((item) => {
          const ItemIcon = item.icon
          const isActive = location.pathname === item.path
          return (
            <DropdownMenuItem key={item.path} asChild>
              <Link
                to={item.path}
                className={cn(
                  "flex items-start gap-3 p-2 cursor-pointer",
                  isActive && "bg-primary/5"
                )}
                data-tour={item.tourId}
              >
                <ItemIcon className={cn("h-5 w-5 mt-0.5", isActive ? "text-primary" : "text-muted-foreground")} />
                <div>
                  <div className={cn("font-medium", isActive && "text-primary")}>{item.label}</div>
                  <div className="text-xs text-muted-foreground">{item.desc}</div>
                </div>
              </Link>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
        <div className="container flex h-14 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 group-hover:from-primary/20 group-hover:to-accent/20 transition-colors">
              <Feather className="h-5 w-5 text-primary" />
            </div>
            <span className="font-display text-xl hidden sm:inline">Origins <span className="text-xs text-muted-foreground font-normal">by PROVENIQ</span></span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {/* Primary nav items with labels */}
            {primaryNav.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  data-tour={item.tourId}
                  className={cn(
                    'flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm font-medium transition-colors',
                    item.featured
                      ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-700 dark:text-amber-400 hover:from-amber-500/20 hover:to-orange-500/20'
                      : isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}

            <div className="w-px h-6 bg-border mx-2" />

            {/* Dropdown menus */}
            <NavDropdown label="My Story" items={contentMenu} icon={BookOpen} tourId="my-story" />
            <NavDropdown label="Import" items={importMenu} icon={Upload} />
            <NavDropdown label="Organize" items={organizeMenu} icon={FolderOpen} tourId="organize" />
            <NavDropdown label="More" items={moreMenu} icon={HelpCircle} />
          </nav>

          {/* Right side controls */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {/* User menu */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-9 px-2 gap-2">
                    {user.picture ? (
                      <img src={user.picture} alt="" className="w-6 h-6 rounded-full" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                        {user.name?.charAt(0) || '?'}
                      </div>
                    )}
                    <span className="hidden sm:inline text-sm">{user.name?.split(' ')[0]}</span>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel className="font-normal">
                    <div className="text-sm font-medium">{user.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="cursor-pointer">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2" />
                        Settings
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-red-600 cursor-pointer">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-9 w-9"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border/50 bg-background">
            <nav className="container py-4 space-y-4">
              {/* Primary */}
              <div className="space-y-1">
                {primaryNav.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.path
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium',
                        isActive ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  )
                })}
              </div>

              {/* Content */}
              <div>
                <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">My Story</div>
                <div className="space-y-1">
                  {contentMenu.map((item) => {
                    const Icon = item.icon
                    const isActive = location.pathname === item.path
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm',
                          isActive ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              </div>

              {/* Import */}
              <div>
                <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Import</div>
                <div className="space-y-1">
                  {importMenu.map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted"
                      >
                        <Icon className="h-5 w-5" />
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              </div>

              {/* More */}
              <div>
                <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">More</div>
                <div className="space-y-1">
                  {[...organizeMenu, ...moreMenu].map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted"
                      >
                        <Icon className="h-5 w-5" />
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              </div>
            </nav>
          </div>
        )}
      </header>
      <main className="container py-8">{children}</main>
    </div>
  )
}
