import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  BookOpen,
  Calendar,
  MapPin,
  Users,
  Star,
  Clock,
  Shield,
  AlertCircle,
} from 'lucide-react'
import { familyShareApi, SharedMemoirView } from '@/lib/api'

export default function SharedMemoir() {
  const { token } = useParams<{ token: string }>()

  const { data, isLoading, error } = useQuery({
    queryKey: ['sharedMemoir', token],
    queryFn: () => familyShareApi.getSharedContent(token!),
    enabled: !!token,
    retry: false,
  })

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="h-12 w-12 mx-auto mb-4 animate-pulse text-primary" />
          <p className="text-muted-foreground">Loading memoir...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Unable to Access Memoir</h2>
            <p className="text-muted-foreground">
              This share link may have expired, been revoked, or is invalid.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { share, memoir } = data

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{share.ownerName}'s Memoir</h1>
              <p className="text-muted-foreground flex items-center gap-2 mt-1">
                <Shield className="h-4 w-4" />
                Shared with you via PROVENIQ Origins
              </p>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Shared {formatDate(share.createdAt)}
              </div>
              {share.expiresAt && (
                <div>Expires {formatDate(share.expiresAt)}</div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-3xl font-bold">{memoir.stats.chapters}</div>
              <div className="text-sm text-muted-foreground">Chapters</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-3xl font-bold">{memoir.stats.events}</div>
              <div className="text-sm text-muted-foreground">Events</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-3xl font-bold">{memoir.stats.artifacts}</div>
              <div className="text-sm text-muted-foreground">Artifacts</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <div className="text-3xl font-bold">{memoir.stats.people}</div>
              <div className="text-sm text-muted-foreground">People</div>
            </CardContent>
          </Card>
        </div>

        {/* Chapters */}
        <div className="space-y-8">
          {memoir.chapters.map(chapter => (
            <Card key={chapter.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      Chapter {chapter.number}: {chapter.title}
                    </CardTitle>
                    {chapter.yearsCovered.length > 0 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {chapter.yearsCovered.join(' – ')}
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary">{chapter.events.length} events</Badge>
                </div>
                {chapter.summary && (
                  <p className="text-muted-foreground italic mt-2">{chapter.summary}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {chapter.events.map(event => (
                    <div
                      key={event.id}
                      className="border-l-2 border-primary/20 pl-4 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{event.title}</span>
                        {event.isKeystone && (
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        {event.date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(event.date)}
                          </span>
                        )}
                        {event.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {event.location}
                          </span>
                        )}
                        {event.people.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {event.people.join(', ')}
                          </span>
                        )}
                      </div>
                      {event.summary && (
                        <p className="text-sm mt-2">{event.summary}</p>
                      )}
                      {event.emotionTags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {event.emotionTags.map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Collections */}
        {memoir.collections.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Collections</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {memoir.collections.map(collection => (
                <Card key={collection.id}>
                  <CardContent className="pt-4">
                    <h3 className="font-medium">{collection.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {collection.description}
                    </p>
                    <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                      <span>{collection.eventCount} events</span>
                      <span>{collection.artifactCount} artifacts</span>
                      <span>{collection.personCount} people</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-muted-foreground border-t pt-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="h-4 w-4" />
            Secured by PROVENIQ Origins
          </div>
          <p>This memoir is protected with cryptographic provenance</p>
        </div>
      </div>
    </div>
  )
}
