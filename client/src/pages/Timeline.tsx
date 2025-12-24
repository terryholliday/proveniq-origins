import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { timelineApi, chaptersApi, traumaCyclesApi, Event } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Star, Users, FileText, Sparkles, Music, Wand2, Plus, Loader2, CheckCircle2 } from 'lucide-react'

const API_BASE = 'http://localhost:3001/api'

interface ChapterSuggestion {
  title: string
  theme: string
  eventIds: string[]
  reasoning: string
}

interface OrganizationResult {
  suggestedChapters: ChapterSuggestion[]
  unassignedEvents: string[]
  overallNarrative: string
}

export default function Timeline() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState({
    chapterId: 'all',
    traumaCycleId: 'all',
  })
  const [showOrganizer, setShowOrganizer] = useState(false)
  const [suggestions, setSuggestions] = useState<OrganizationResult | null>(null)
  const [selectedChapters, setSelectedChapters] = useState<Set<number>>(new Set())

  // AI chapter organization
  const organizeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/chapters/organize`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to get suggestions')
      return res.json() as Promise<OrganizationResult>
    },
    onSuccess: (data) => {
      setSuggestions(data)
      setSelectedChapters(new Set(data.suggestedChapters.map((_, i) => i)))
    },
  })

  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!suggestions) throw new Error('No suggestions')
      const chaptersToApply = suggestions.suggestedChapters
        .filter((_, i) => selectedChapters.has(i))
        .map(ch => ({
          title: ch.title,
          eventIds: ch.eventIds,
          isNew: true,
        }))
      
      const res = await fetch(`${API_BASE}/chapters/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapters: chaptersToApply }),
      })
      if (!res.ok) throw new Error('Failed to apply')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeline'] })
      queryClient.invalidateQueries({ queryKey: ['chapters'] })
      setShowOrganizer(false)
      setSuggestions(null)
    },
  })

  const { data: timeline, isLoading } = useQuery({
    queryKey: ['timeline', filters],
    queryFn: () =>
      timelineApi.get({
        chapterId: filters.chapterId !== 'all' ? filters.chapterId : undefined,
        traumaCycleId: filters.traumaCycleId !== 'all' ? filters.traumaCycleId : undefined,
      }),
  })

  const { data: chapters } = useQuery({
    queryKey: ['chapters'],
    queryFn: chaptersApi.getAll,
  })

  const { data: traumaCycles } = useQuery({
    queryKey: ['traumaCycles'],
    queryFn: traumaCyclesApi.getAll,
  })

  const formatDate = (dateString: string | null) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Timeline</h1>
          <p className="text-muted-foreground">
            Chronological view of your life events
            {timeline?.yearRange && (
              <span className="ml-2">
                ({timeline.yearRange.start} — {timeline.yearRange.end})
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link to="/events/new">
              <Plus className="w-4 h-4 mr-2" />
              Add Event
            </Link>
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              setShowOrganizer(true)
              organizeMutation.mutate()
            }}
            disabled={organizeMutation.isPending}
          >
            {organizeMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Wand2 className="w-4 h-4 mr-2" />
            )}
            Organize Chapters
          </Button>
        </div>
      </div>

      {/* AI Chapter Organizer Modal */}
      {showOrganizer && suggestions && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5" />
              AI Chapter Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{suggestions.overallNarrative}</p>
            
            <div className="space-y-3">
              {suggestions.suggestedChapters.map((ch, i) => (
                <div 
                  key={i}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedChapters.has(i) 
                      ? 'bg-primary/10 border-primary' 
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => {
                    const newSet = new Set(selectedChapters)
                    if (newSet.has(i)) {
                      newSet.delete(i)
                    } else {
                      newSet.add(i)
                    }
                    setSelectedChapters(newSet)
                  }}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{ch.title}</h4>
                    {selectedChapters.has(i) && <CheckCircle2 className="w-4 h-4 text-primary" />}
                  </div>
                  <p className="text-sm text-muted-foreground">{ch.theme}</p>
                  <p className="text-xs text-muted-foreground mt-1">{ch.eventIds.length} events • {ch.reasoning}</p>
                </div>
              ))}
            </div>

            {suggestions.unassignedEvents.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {suggestions.unassignedEvents.length} events don't fit neatly into chapters yet.
              </p>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={() => applyMutation.mutate()}
                disabled={applyMutation.isPending || selectedChapters.size === 0}
              >
                {applyMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Apply {selectedChapters.size} Chapters
              </Button>
              <Button variant="outline" onClick={() => {
                setShowOrganizer(false)
                setSuggestions(null)
              }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="w-64">
              <label className="text-sm font-medium mb-2 block">Chapter</label>
              <Select
                value={filters.chapterId}
                onValueChange={(v) => setFilters((p) => ({ ...p, chapterId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All chapters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All chapters</SelectItem>
                  {chapters?.map((ch) => (
                    <SelectItem key={ch.id} value={ch.id}>
                      {ch.number}. {ch.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-64">
              <label className="text-sm font-medium mb-2 block">Trauma Cycle</label>
              <Select
                value={filters.traumaCycleId}
                onValueChange={(v) => setFilters((p) => ({ ...p, traumaCycleId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All cycles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All cycles</SelectItem>
                  {traumaCycles?.map((tc) => (
                    <SelectItem key={tc.id} value={tc.id}>
                      {tc.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading timeline...</div>
        </div>
      ) : timeline && timeline.timeline.length > 0 ? (
        <div className="relative">
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />

          {timeline.timeline.map((yearGroup) => (
            <div key={yearGroup.year} className="mb-8">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg z-10">
                  {yearGroup.year}
                </div>
                <span className="text-muted-foreground">
                  {yearGroup.events.length} event{yearGroup.events.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="ml-20 space-y-4">
                {yearGroup.events.map((event: Event) => (
                  <Card key={event.id} className="relative">
                    <div className="absolute -left-12 top-6 w-4 h-4 rounded-full bg-muted border-2 border-background" />
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <Link
                            to={`/events/${event.id}`}
                            className="text-lg font-semibold hover:underline flex items-center gap-2"
                          >
                            {event.title}
                            {event.isKeystone && (
                              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            )}
                          </Link>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(event.date)}
                            {event.location && ` • ${event.location}`}
                          </div>
                        </div>
                        <div className="flex gap-2 text-muted-foreground">
                          {event._count?.personLinks ? (
                            <span className="flex items-center gap-1 text-xs">
                              <Users className="h-3 w-3" />
                              {event._count.personLinks}
                            </span>
                          ) : null}
                          {event._count?.artifactLinks ? (
                            <span className="flex items-center gap-1 text-xs">
                              <FileText className="h-3 w-3" />
                              {event._count.artifactLinks}
                            </span>
                          ) : null}
                          {event._count?.synchronicityLinks ? (
                            <span className="flex items-center gap-1 text-xs">
                              <Sparkles className="h-3 w-3" />
                              {event._count.synchronicityLinks}
                            </span>
                          ) : null}
                          {event._count?.songLinks ? (
                            <span className="flex items-center gap-1 text-xs">
                              <Music className="h-3 w-3" />
                              {event._count.songLinks}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      {event.summary && (
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                          {event.summary}
                        </p>
                      )}
                      {event.emotionTags && event.emotionTags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {event.emotionTags.slice(0, 4).map((tag: string, i: number) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 bg-muted rounded text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="mt-2 text-xs text-muted-foreground">
                        {event.chapter && (
                          <span>Ch. {event.chapter.number}: {event.chapter.title}</span>
                        )}
                        {event.traumaCycle && (
                          <span className="ml-2">• {event.traumaCycle.label}</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64 gap-2">
            <div className="text-muted-foreground">No events with dates found</div>
            <Link to="/events/new" className="text-primary hover:underline text-sm">
              Create an event with a date to see it on the timeline
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
