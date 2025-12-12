import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { statsApi, Stats } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { BookOpen, ArrowRight, Sparkles } from 'lucide-react'

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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleContinue} />
      <div className="relative z-10 w-full max-w-lg mx-4">
        <div className="bg-card rounded-2xl shadow-2xl overflow-hidden border border-border/50">
          <div className="bg-gradient-to-br from-primary/10 via-accent/5 to-transparent p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-display text-foreground mb-2">
              {isNewUser ? 'Build Your Ark' : 'Return to Your Story'}
            </h1>
            <p className="text-muted-foreground">
              {isNewUser
                ? 'Begin preserving the moments that shaped you'
                : 'Welcome back to MemoirArk'}
            </p>
          </div>

          <div className="p-6 space-y-4">
            {!isNewUser && stats && (
              <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Sparkles className="w-4 h-4" />
                  Your Archive
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Events</span>
                    <span className="font-semibold">{stats.events}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">People</span>
                    <span className="font-semibold">{stats.persons}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Chapters</span>
                    <span className="font-semibold">{stats.chapters}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Artifacts</span>
                    <span className="font-semibold">{stats.artifacts}</span>
                  </div>
                </div>
              </div>
            )}

            {hasActivity && lastSession && (
              <div className="bg-accent/10 rounded-xl p-4 space-y-2">
                <div className="text-sm font-medium text-accent-foreground">
                  Previously, on MemoirArk...
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {lastSession.eventsCreated > 0 && (
                    <li>
                      You created {lastSession.eventsCreated} event{lastSession.eventsCreated > 1 ? 's' : ''}
                      {lastSession.lastEventTitle && (
                        <span className="italic"> including "{lastSession.lastEventTitle}"</span>
                      )}
                    </li>
                  )}
                  {lastSession.eventsEdited > 0 && (
                    <li>You edited {lastSession.eventsEdited} event{lastSession.eventsEdited > 1 ? 's' : ''}</li>
                  )}
                  {lastSession.peopleAdded > 0 && (
                    <li>You added {lastSession.peopleAdded} {lastSession.peopleAdded > 1 ? 'people' : 'person'}</li>
                  )}
                  {lastSession.artifactsAdded > 0 && (
                    <li>You uploaded {lastSession.artifactsAdded} artifact{lastSession.artifactsAdded > 1 ? 's' : ''}</li>
                  )}
                  {lastSession.lastChapterViewed && (
                    <li>You were reading "{lastSession.lastChapterViewed}"</li>
                  )}
                </ul>
              </div>
            )}

            {isNewUser && (
              <div className="text-center text-sm text-muted-foreground py-2">
                <p>Your memoir awaits. Start by creating your first event—</p>
                <p>a memory, a moment, a turning point.</p>
              </div>
            )}
          </div>

          <div className="p-6 pt-0 flex gap-3">
            {isNewUser ? (
              <Button onClick={handleGetStarted} className="flex-1 h-12 text-base">
                Create First Event
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={handleContinue} className="flex-1 h-12">
                  Continue
                </Button>
                <Button onClick={() => { handleContinue(); navigate('/events/new'); }} className="flex-1 h-12">
                  Add Event
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
