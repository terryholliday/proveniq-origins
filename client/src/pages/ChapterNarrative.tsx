import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { narrativeApi, Event, Person, Song, Artifact, Synchronicity } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, ArrowRight, Star, Users, Music, FileText, Sparkles } from 'lucide-react'

export default function ChapterNarrative() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: chapter, isLoading } = useQuery({
    queryKey: ['narrative-chapter', id],
    queryFn: () => narrativeApi.getChapter(id!),
    enabled: !!id,
  })

  const formatDate = (dateString: string | null) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading chapter...</div>
      </div>
    )
  }

  if (!chapter) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-destructive">Chapter not found</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/chapters')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          All Chapters
        </Button>
        <div className="flex gap-2">
          {chapter.prevChapter && (
            <Link to={`/chapters/${chapter.prevChapter.id}`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Ch. {chapter.prevChapter.number}
              </Button>
            </Link>
          )}
          {chapter.nextChapter && (
            <Link to={`/chapters/${chapter.nextChapter.id}`}>
              <Button variant="outline" size="sm">
                Ch. {chapter.nextChapter.number}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      <header className="text-center py-8 border-b">
        <div className="text-muted-foreground mb-2">Chapter {chapter.number}</div>
        <h1 className="text-4xl font-bold tracking-tight mb-4">{chapter.title}</h1>
        {chapter.yearsCovered && chapter.yearsCovered.length > 0 && (
          <div className="text-muted-foreground">
            {chapter.yearsCovered.join(' — ')}
          </div>
        )}
      </header>

      {chapter.summary && (
        <div className="font-narrative text-lg text-muted-foreground italic text-center px-8">
          {chapter.summary}
        </div>
      )}

      <div className="space-y-12">
        {chapter.events && chapter.events.length > 0 ? (
          chapter.events.map((event: Event) => (
            <article key={event.id} className="space-y-4">
              <header className="border-b pb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-semibold">{event.title}</h2>
                  {event.isKeystone && (
                    <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                  )}
                </div>
                <div className="text-muted-foreground">
                  {formatDate(event.date)}
                  {event.location && ` — ${event.location}`}
                </div>
              </header>

              {event.summary && (
                <p className="font-narrative text-lg">{event.summary}</p>
              )}

              {event.notes && (
                <div className="font-narrative whitespace-pre-wrap bg-muted/30 p-6 rounded-lg">
                  {event.notes}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                {event.persons && event.persons.length > 0 && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        People in this scene
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <ul className="space-y-1 text-sm">
                        {event.persons.map((person: Person) => (
                          <li key={person.id}>
                            <Link to={`/people/${person.id}`} className="hover:underline">
                              {person.name}
                              {person.role && (
                                <span className="text-muted-foreground ml-1">({person.role})</span>
                              )}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {event.songs && event.songs.length > 0 && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Music className="h-4 w-4" />
                        Soundtrack
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <ul className="space-y-1 text-sm">
                        {event.songs.map((song: Song) => (
                          <li key={song.id}>
                            "{song.title}" — {song.artist}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {event.artifacts && event.artifacts.length > 0 && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Related Artifacts
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <ul className="space-y-1 text-sm">
                        {event.artifacts.map((artifact: Artifact) => (
                          <li key={artifact.id}>
                            <Link to={`/artifacts/${artifact.id}`} className="hover:underline">
                              <span className="capitalize">{artifact.type}</span>
                              {artifact.shortDescription && (
                                <span className="text-muted-foreground ml-1">
                                  — {artifact.shortDescription}
                                </span>
                              )}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {event.synchronicities && event.synchronicities.length > 0 && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Synchronicities
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <ul className="space-y-1 text-sm">
                        {event.synchronicities.map((sync: Synchronicity) => (
                          <li key={sync.id}>
                            <Link to={`/synchronicities/${sync.id}`} className="hover:underline">
                              <span className="capitalize">{sync.type}</span>
                              {sync.symbolicTag && (
                                <span className="text-muted-foreground ml-1">
                                  ({sync.symbolicTag})
                                </span>
                              )}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>

              {event.emotionTags && event.emotionTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {event.emotionTags.map((tag: string, i: number) => (
                    <span key={i} className="px-3 py-1 bg-muted rounded-full text-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="text-right">
                <Link
                  to={`/events/${event.id}`}
                  className="text-sm text-primary hover:underline"
                >
                  View full event details →
                </Link>
              </div>
            </article>
          ))
        ) : (
          <div className="text-center text-muted-foreground py-12">
            No events recorded for this chapter yet.
          </div>
        )}
      </div>

      <footer className="flex items-center justify-between pt-8 border-t">
        {chapter.prevChapter ? (
          <Link to={`/chapters/${chapter.prevChapter.id}`}>
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {chapter.prevChapter.number}. {chapter.prevChapter.title}
            </Button>
          </Link>
        ) : (
          <div />
        )}
        {chapter.nextChapter && (
          <Link to={`/chapters/${chapter.nextChapter.id}`}>
            <Button variant="outline">
              {chapter.nextChapter.number}. {chapter.nextChapter.title}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        )}
      </footer>
    </div>
  )
}
