import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { artifactsApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Pencil, Calendar, Users, FileAudio } from 'lucide-react'

export default function ArtifactDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: artifact, isLoading } = useQuery({
    queryKey: ['artifact', id],
    queryFn: () => artifactsApi.getById(id!),
    enabled: !!id,
  })

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading artifact...</div>
      </div>
    )
  }

  if (!artifact) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-destructive">Artifact not found</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/artifacts')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight capitalize">{artifact.type}</h1>
            {artifact.shortDescription && (
              <p className="text-muted-foreground">{artifact.shortDescription}</p>
            )}
          </div>
        </div>
        <Link to={`/artifacts/${id}/edit`}>
          <Button>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Artifact
          </Button>
        </Link>
      </div>

      {artifact.type === 'audio' && artifact.sourcePathOrUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileAudio className="h-5 w-5" />
              Audio Playback
            </CardTitle>
          </CardHeader>
          <CardContent>
            <audio
              controls
              className="w-full"
              src={`http://localhost:3001/api${artifact.sourcePathOrUrl}`}
            >
              Your browser does not support the audio element.
            </audio>
            {artifact.importedFrom && (
              <p className="text-sm text-muted-foreground mt-2">
                Original file: {artifact.importedFrom}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Source System</div>
              <div>{artifact.sourceSystem || '—'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Source Path/URL</div>
              <div className="break-all text-sm">{artifact.sourcePathOrUrl || '—'}</div>
            </div>
            {artifact.importedFrom && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Imported From</div>
                <div>{artifact.importedFrom}</div>
              </div>
            )}
          </CardContent>
        </Card>

        {artifact.transcribedText && (
          <Card>
            <CardHeader>
              <CardTitle>Transcribed Text</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-narrative whitespace-pre-wrap">{artifact.transcribedText}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Linked Events ({artifact.eventLinks?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {artifact.eventLinks && artifact.eventLinks.length > 0 ? (
              <ul className="space-y-3">
                {artifact.eventLinks.map((link) => (
                  <li key={link.event.id} className="border-b pb-2 last:border-0">
                    <Link to={`/events/${link.event.id}`} className="hover:underline">
                      <div className="font-medium">{link.event.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(link.event.date)}
                        {link.event.chapter && ` • Ch. ${link.event.chapter.number}`}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">No events linked</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Linked People ({artifact.personLinks?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {artifact.personLinks && artifact.personLinks.length > 0 ? (
              <ul className="space-y-2">
                {artifact.personLinks.map((link) => (
                  <li key={link.person.id}>
                    <Link to={`/people/${link.person.id}`} className="hover:underline">
                      <span className="font-medium">{link.person.name}</span>
                      {link.person.role && (
                        <span className="text-muted-foreground ml-2">({link.person.role})</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">No people linked</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
