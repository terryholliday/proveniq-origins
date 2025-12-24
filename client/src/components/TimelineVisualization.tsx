import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { eventsApi, artifactsApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Image, FileText, Video, Mic } from 'lucide-react'

interface TimelineItem {
  id: string
  type: 'event' | 'artifact'
  title: string
  date: Date | null
  year: number | null
  artifactType?: string
  emotionTags?: string[]
}

export default function TimelineVisualization() {
  const { data: events } = useQuery({
    queryKey: ['events'],
    queryFn: () => eventsApi.getAll(),
  })

  const { data: artifacts } = useQuery({
    queryKey: ['artifacts'],
    queryFn: () => artifactsApi.getAll(),
  })

  const timelineData = useMemo(() => {
    const items: TimelineItem[] = []

    // Add events
    events?.forEach((event) => {
      const date = event.date ? new Date(event.date) : null
      items.push({
        id: event.id,
        type: 'event',
        title: event.title,
        date,
        year: date?.getFullYear() || null,
        emotionTags: event.emotionTags,
      })
    })

    // Add artifacts (try to extract date from description or use creation)
    artifacts?.forEach((artifact) => {
      items.push({
        id: artifact.id,
        type: 'artifact',
        title: artifact.shortDescription || artifact.importedFrom || 'Untitled',
        date: artifact.createdAt ? new Date(artifact.createdAt) : null,
        year: artifact.createdAt ? new Date(artifact.createdAt).getFullYear() : null,
        artifactType: artifact.type,
      })
    })

    // Sort by date
    items.sort((a, b) => {
      if (!a.date && !b.date) return 0
      if (!a.date) return 1
      if (!b.date) return -1
      return a.date.getTime() - b.date.getTime()
    })

    return items
  }, [events, artifacts])

  // Group by decade
  const decades = useMemo(() => {
    const grouped: Record<string, TimelineItem[]> = {}
    const undated: TimelineItem[] = []

    timelineData.forEach((item) => {
      if (item.year) {
        const decade = Math.floor(item.year / 10) * 10
        const key = `${decade}s`
        if (!grouped[key]) grouped[key] = []
        grouped[key].push(item)
      } else {
        undated.push(item)
      }
    })

    return { grouped, undated }
  }, [timelineData])

  const getArtifactIcon = (type?: string) => {
    switch (type) {
      case 'photo': return <Image className="h-3 w-3" />
      case 'document': case 'journal': case 'email': return <FileText className="h-3 w-3" />
      case 'audio': return <Mic className="h-3 w-3" />
      case 'video': return <Video className="h-3 w-3" />
      default: return <FileText className="h-3 w-3" />
    }
  }

  const sortedDecades = Object.keys(decades.grouped).sort()

  // Find gaps (decades with no items)
  const allDecades: string[] = []
  if (sortedDecades.length >= 2) {
    const firstDecade = parseInt(sortedDecades[0])
    const lastDecade = parseInt(sortedDecades[sortedDecades.length - 1])
    for (let d = firstDecade; d <= lastDecade; d += 10) {
      allDecades.push(`${d}s`)
    }
  }

  const gaps = allDecades.filter(d => !decades.grouped[d])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Your Life Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        {timelineData.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No events or artifacts yet. Start adding memories to see your timeline!
          </p>
        ) : (
          <div className="space-y-6">
            {/* Timeline visualization */}
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/20 via-primary to-primary/20" />
              
              {sortedDecades.map((decade) => (
                <div key={decade} className="relative pl-12 pb-6">
                  {/* Decade marker */}
                  <div className="absolute left-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                    {decade.slice(0, 2)}
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">{decade}</h3>
                    <div className="flex flex-wrap gap-2">
                      {decades.grouped[decade].map((item) => (
                        <div
                          key={item.id}
                          className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${
                            item.type === 'event'
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                              : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                          }`}
                          title={item.title}
                        >
                          {item.type === 'artifact' && getArtifactIcon(item.artifactType)}
                          <span className="max-w-[150px] truncate">{item.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Gaps indicator */}
            {gaps.length > 0 && (
              <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-2">
                  📅 Timeline Gaps Detected
                </h4>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  You have no memories from: <strong>{gaps.join(', ')}</strong>
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  Consider adding photos, documents, or events from these decades to complete your story.
                </p>
              </div>
            )}

            {/* Undated items */}
            {decades.undated.length > 0 && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/30 rounded-lg">
                <h4 className="font-medium mb-2">Undated Items ({decades.undated.length})</h4>
                <div className="flex flex-wrap gap-2">
                  {decades.undated.slice(0, 10).map((item) => (
                    <span
                      key={item.id}
                      className="px-2 py-1 rounded text-xs bg-gray-200 dark:bg-gray-700"
                    >
                      {item.title}
                    </span>
                  ))}
                  {decades.undated.length > 10 && (
                    <span className="text-xs text-muted-foreground">
                      +{decades.undated.length - 10} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {events?.length || 0}
                </div>
                <div className="text-xs text-muted-foreground">Events</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {artifacts?.length || 0}
                </div>
                <div className="text-xs text-muted-foreground">Artifacts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">
                  {sortedDecades.length}
                </div>
                <div className="text-xs text-muted-foreground">Decades Covered</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
