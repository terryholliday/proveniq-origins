import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { statsApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Sparkles, Feather, Heart } from 'lucide-react'

interface SessionActivity {
  timestamp: string
  eventsCreated: number
  eventsEdited: number
  peopleAdded: number
  artifactsAdded: number
  lastEventTitle?: string
  lastChapterViewed?: string
}

function getLastSession(): SessionActivity | null {
  try {
    const stored = localStorage.getItem('memoirark-last-session')
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // ignore
  }
  return null
}

function saveCurrentSession(activity: Partial<SessionActivity>) {
  const current = getLastSession() || {
    timestamp: new Date().toISOString(),
    eventsCreated: 0,
    eventsEdited: 0,
    peopleAdded: 0,
    artifactsAdded: 0,
  }
  localStorage.setItem(
    'memoirark-last-session',
    JSON.stringify({ ...current, ...activity, timestamp: new Date().toISOString() })
  )
}

export function useSessionTracker() {
  return {
    trackEventCreated: (title: string) => {
      const session = getLastSession()
      saveCurrentSession({
        eventsCreated: (session?.eventsCreated || 0) + 1,
        lastEventTitle: title,
      })
    },
    trackEventEdited: () => {
      const session = getLastSession()
      saveCurrentSession({ eventsEdited: (session?.eventsEdited || 0) + 1 })
    },
    trackPersonAdded: () => {
      const session = getLastSession()
      saveCurrentSession({ peopleAdded: (session?.peopleAdded || 0) + 1 })
    },
    trackArtifactAdded: () => {
      const session = getLastSession()
      saveCurrentSession({ artifactsAdded: (session?.artifactsAdded || 0) + 1 })
    },
    trackChapterViewed: (title: string) => {
      saveCurrentSession({ lastChapterViewed: title })
    },
  }
}

export default function WelcomeModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const [visible, setVisible] = useState(true)
  const lastSession = getLastSession()

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: statsApi.getStats,
  })

  const isNewUser = !stats || (stats.events === 0 && stats.chapters === 0)
  const hasActivity = lastSession && (
    lastSession.eventsCreated > 0 ||
    lastSession.eventsEdited > 0 ||
    lastSession.peopleAdded > 0 ||
    lastSession.artifactsAdded > 0
  )

  const handleContinue = () => {
    setVisible(false)
    onClose()
  }

  const handleGetStarted = () => {
    setVisible(false)
    onClose()
    navigate('/events/new')
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleContinue} />
      <div className="relative z-10 w-full max-w-lg mx-4 animate-float" style={{ animation: 'none' }}>
        <div className="bg-card rounded-2xl shadow-2xl overflow-hidden border border-border/30">
          <div className="bg-gradient-to-br from-primary/10 via-accent/10 to-rose-500/5 p-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-card/50 to-transparent" />
            <div className="relative">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 mb-4 animate-breathe">
                <Feather className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-3xl font-display text-foreground mb-2">
                {isNewUser ? 'Your Story Begins Here' : 'Welcome Back, Storyteller'}
              </h1>
              <p className="text-muted-foreground text-lg">
                {isNewUser
                  ? 'Every life is a story worth telling'
                  : 'Your memoir awaits you'}
              </p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {!isNewUser && stats && (
              <div className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Heart className="w-4 h-4 text-primary" />
                  Your Story So Far
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Moments</span>
                    <span className="font-semibold text-primary">{stats.events}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">People</span>
                    <span className="font-semibold text-accent">{stats.persons}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Chapters</span>
                    <span className="font-semibold text-primary">{stats.chapters}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Treasures</span>
                    <span className="font-semibold text-accent">{stats.artifacts}</span>
                  </div>
                </div>
              </div>
            )}

            {hasActivity && lastSession && (
              <div className="bg-gradient-to-br from-accent/10 to-primary/5 rounded-xl p-4 space-y-2">
                <div className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent" />
                  Last time you were here...
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {lastSession.eventsCreated > 0 && (
                    <li>
                      You captured {lastSession.eventsCreated} {lastSession.eventsCreated > 1 ? 'moments' : 'moment'}
                      {lastSession.lastEventTitle && (
                        <span className="italic text-foreground/70"> — "{lastSession.lastEventTitle}"</span>
                      )}
                    </li>
                  )}
                  {lastSession.eventsEdited > 0 && (
                    <li>You refined {lastSession.eventsEdited} {lastSession.eventsEdited > 1 ? 'memories' : 'memory'}</li>
                  )}
                  {lastSession.peopleAdded > 0 && (
                    <li>You remembered {lastSession.peopleAdded} {lastSession.peopleAdded > 1 ? 'people' : 'person'}</li>
                  )}
                  {lastSession.artifactsAdded > 0 && (
                    <li>You preserved {lastSession.artifactsAdded} {lastSession.artifactsAdded > 1 ? 'treasures' : 'treasure'}</li>
                  )}
                  {lastSession.lastChapterViewed && (
                    <li>You were exploring "{lastSession.lastChapterViewed}"</li>
                  )}
                </ul>
              </div>
            )}

            {isNewUser && (
              <div className="text-center py-4 space-y-2">
                <p className="text-foreground font-medium">Ready to begin?</p>
                <p className="text-sm text-muted-foreground">
                  Start with a single memory—a moment that shaped you,<br />
                  a person who mattered, a day you'll never forget.
                </p>
              </div>
            )}
          </div>

          <div className="p-6 pt-0 flex gap-3">
            {isNewUser ? (
              <Button onClick={handleGetStarted} className="flex-1 h-12 text-base bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/20">
                Begin My Story
                <Feather className="ml-2 w-4 h-4" />
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={handleContinue} className="flex-1 h-12">
                  Continue
                </Button>
                <Button onClick={() => { handleContinue(); navigate('/events/new'); }} className="flex-1 h-12 bg-gradient-to-r from-primary to-primary/90">
                  Capture a Moment
                  <Feather className="ml-2 w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
