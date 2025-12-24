import { useState, useMemo } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { eventsApi, chaptersApi, personsApi, artifactsApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BookOpen, Sparkles, Copy } from 'lucide-react'

export default function ChapterGenerator() {
  const [selectedChapterId, setSelectedChapterId] = useState<string>('')
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('')
  const [chapterTitle, setChapterTitle] = useState('')
  const [generatedChapter, setGeneratedChapter] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  const { data: chapters } = useQuery({
    queryKey: ['chapters'],
    queryFn: () => chaptersApi.getAll(),
  })

  const { data: events } = useQuery({
    queryKey: ['events'],
    queryFn: () => eventsApi.getAll(),
  })

  const { data: persons } = useQuery({
    queryKey: ['persons'],
    queryFn: () => personsApi.getAll(),
  })

  const { data: artifacts } = useQuery({
    queryKey: ['artifacts'],
    queryFn: () => artifactsApi.getAll(),
  })

  // Calculate available time ranges from events
  const timeRanges = useMemo(() => {
    if (!events) return []
    
    const years = events
      .filter(e => e.date)
      .map(e => new Date(e.date!).getFullYear())
      .sort((a, b) => a - b)

    if (years.length === 0) return []

    const ranges: { value: string; label: string }[] = []
    const minYear = years[0]
    const maxYear = years[years.length - 1]

    // Add decade ranges
    for (let decade = Math.floor(minYear / 10) * 10; decade <= maxYear; decade += 10) {
      const decadeEnd = decade + 9
      const eventsInDecade = events.filter(e => {
        if (!e.date) return false
        const year = new Date(e.date).getFullYear()
        return year >= decade && year <= decadeEnd
      })
      if (eventsInDecade.length > 0) {
        ranges.push({
          value: `${decade}-${decadeEnd}`,
          label: `${decade}s (${eventsInDecade.length} events)`,
        })
      }
    }

    return ranges
  }, [events])

  const generateChapterMutation = useMutation({
    mutationFn: async () => {
      let relevantEvents = events || []
      let chapterContext = ''

      // Filter by chapter or time range
      if (selectedChapterId) {
        const chapter = chapters?.find(c => c.id === selectedChapterId)
        relevantEvents = events?.filter(e => e.chapterId === selectedChapterId) || []
        chapterContext = `Chapter: "${chapter?.title}"\n`
      } else if (selectedTimeRange) {
        const [startYear, endYear] = selectedTimeRange.split('-').map(Number)
        relevantEvents = events?.filter(e => {
          if (!e.date) return false
          const year = new Date(e.date).getFullYear()
          return year >= startYear && year <= endYear
        }) || []
        chapterContext = `Time Period: ${startYear} - ${endYear}\n`
      }

      // Sort events chronologically
      relevantEvents = relevantEvents.sort((a, b) => {
        if (!a.date || !b.date) return 0
        return new Date(a.date).getTime() - new Date(b.date).getTime()
      })

      // Build event summaries
      const eventDetails = relevantEvents.map(e => {
        const eventPersons = e.persons?.map(p => p.name).join(', ') || ''
        return `EVENT: ${e.title}
Date: ${e.date ? new Date(e.date).toLocaleDateString() : 'Unknown'}
${e.summary ? `Summary: ${e.summary}` : ''}
${e.emotionTags?.length ? `Emotions: ${e.emotionTags.join(', ')}` : ''}
${eventPersons ? `People involved: ${eventPersons}` : ''}
${e.notes ? `Notes: ${e.notes}` : ''}`
      }).join('\n\n')

      // Get relevant artifacts
      const relevantArtifacts = artifacts?.filter(a => a.transcribedText)?.slice(0, 5) || []
      const artifactContext = relevantArtifacts.map(a => 
        `[${a.type.toUpperCase()}] ${a.shortDescription}: ${a.transcribedText?.slice(0, 200)}...`
      ).join('\n')

      const response = await fetch('http://localhost:3001/api/ai/Ori', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: `You are a masterful ghostwriter creating a memoir chapter. Your task is to weave the provided events, people, and artifacts into a compelling narrative.

WRITING GUIDELINES:
- Write in first person, as if you ARE the memoir author
- Create vivid scenes using sensory details
- Use dialogue where appropriate (but only if it can be reasonably inferred)
- Build emotional arcs within the chapter
- Create smooth transitions between events
- The chapter should be 800-1500 words
- Include a compelling opening hook and satisfying conclusion

CRITICAL RULES:
- ONLY use details explicitly provided in the events and artifacts
- Do NOT invent specific quotes, dates, or facts not mentioned
- If details are sparse, focus on emotional truth and reflection
- When uncertain, use phrases like "I remember feeling..." or "Looking back..."

Structure the chapter with:
1. An evocative opening that sets the scene
2. The main narrative arc with key events
3. Reflective moments that add depth
4. A closing that provides meaning or foreshadows what's to come`,
          conversationHistory: '',
          userMessage: `Write a memoir chapter based on this material:

${chapterContext}
${chapterTitle ? `Suggested Title: "${chapterTitle}"` : ''}

EVENTS (in chronological order):
${eventDetails || 'No specific events provided'}

SUPPORTING ARTIFACTS:
${artifactContext || 'No artifacts available'}

PEOPLE IN THIS STORY:
${persons?.slice(0, 10).map(p => `- ${p.name} (${p.relationshipType || 'relationship unknown'})`).join('\n') || 'No people recorded'}`,
        }),
      })
      const data = await response.json()
      return data.response
    },
    onSuccess: (chapter) => {
      setGeneratedChapter(chapter)
      setIsEditing(false)
    },
  })

  const handleGenerate = () => {
    generateChapterMutation.mutate()
  }

  const handleCopy = () => {
    if (generatedChapter) {
      navigator.clipboard.writeText(generatedChapter)
    }
  }

  const canGenerate = (events?.length || 0) >= 3 || (artifacts?.some(a => a.transcribedText))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Chapter Auto-Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Ori will analyze your events, artifacts, and people to draft a complete memoir chapter. The more material you provide, the richer the chapter.
        </p>

        {!generatedChapter ? (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Chapter Title (optional)</label>
                <Input
                  value={chapterTitle}
                  onChange={(e) => setChapterTitle(e.target.value)}
                  placeholder="e.g., 'The Summer Everything Changed'"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Focus on existing chapter</label>
                <Select value={selectedChapterId || "all"} onValueChange={(v) => {
                  setSelectedChapterId(v === "all" ? "" : v)
                  if (v !== "all") setSelectedTimeRange('')
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a chapter..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All events</SelectItem>
                    {chapters?.map((chapter) => (
                      <SelectItem key={chapter.id} value={chapter.id}>
                        {chapter.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!selectedChapterId && timeRanges.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Or focus on time period</label>
                  <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a decade..." />
                    </SelectTrigger>
                    <SelectContent>
                      {timeRanges.map((range) => (
                        <SelectItem key={range.value} value={range.value}>
                          {range.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Stats */}
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <div className="font-medium mb-2">Available Material</div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-lg font-bold text-primary">{events?.length || 0}</div>
                    <div className="text-xs text-muted-foreground">Events</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-blue-600">{persons?.length || 0}</div>
                    <div className="text-xs text-muted-foreground">People</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-600">
                      {artifacts?.filter(a => a.transcribedText).length || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Artifacts w/ text</div>
                  </div>
                </div>
              </div>
            </div>

            {!canGenerate && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Add at least 3 events or upload some documents with transcribed text to generate a chapter.
              </p>
            )}

            <Button 
              onClick={handleGenerate} 
              disabled={!canGenerate || generateChapterMutation.isPending}
              className="w-full"
            >
              {generateChapterMutation.isPending ? (
                'Writing your chapter...'
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Chapter
                </>
              )}
            </Button>
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Your Chapter Draft</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
              </div>
            </div>

            {isEditing ? (
              <Textarea
                value={generatedChapter}
                onChange={(e) => setGeneratedChapter(e.target.value)}
                rows={20}
                className="font-narrative"
              />
            ) : (
              <div className="p-4 bg-muted/50 rounded-lg max-h-[500px] overflow-y-auto">
                <p className="whitespace-pre-wrap font-narrative leading-relaxed">{generatedChapter}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
                {isEditing ? 'Preview' : 'Edit'}
              </Button>
              <Button variant="outline" onClick={() => setGeneratedChapter(null)}>
                Generate Another
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
