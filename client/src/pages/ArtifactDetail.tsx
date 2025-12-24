import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { artifactsApi, ArtifactAnalysis } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowLeft, Pencil, Calendar, Users, FileAudio, Sparkles, MessageCircle, Loader2, Tag, Clock, Heart, Plus, UserPlus } from 'lucide-react'

export default function ArtifactDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [analysis, setAnalysis] = useState<ArtifactAnalysis['analysis'] | null>(null)

  const { data: artifact, isLoading } = useQuery({
    queryKey: ['artifact', id],
    queryFn: () => artifactsApi.getById(id!),
    enabled: !!id,
  })

  const analyzeMutation = useMutation({
    mutationFn: () => artifactsApi.analyze(id!),
    onSuccess: (data) => {
      setAnalysis(data.analysis)
    },
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

      {/* Ori AI Analysis Section */}
      <Card className="border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-600" />
            Ori's Analysis
          </CardTitle>
          <CardDescription>
            Let Ori analyze this artifact and help you build your story
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!analysis && !analyzeMutation.isPending && (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-4">
                Ori can analyze this content to find story-worthy elements, identify people, and suggest next steps.
              </p>
              <Button 
                onClick={() => analyzeMutation.mutate()}
                disabled={!artifact.transcribedText && !artifact.shortDescription}
                className="bg-amber-600 hover:bg-amber-700"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Ask Ori to Analyze
              </Button>
              {!artifact.transcribedText && !artifact.shortDescription && (
                <p className="text-xs text-muted-foreground mt-2">
                  No content available to analyze. Add a description or transcribed text first.
                </p>
              )}
            </div>
          )}

          {analyzeMutation.isPending && (
            <div className="flex items-center justify-center py-8 gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
              <span className="text-muted-foreground">Ori is reading and analyzing...</span>
            </div>
          )}

          {analysis && (
            <div className="space-y-6">
              {/* Ori's Message */}
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-amber-700 dark:text-amber-400 mb-1">Ori says:</p>
                    <p className="text-foreground leading-relaxed">{analysis.oriMessage}</p>
                  </div>
                </div>
              </div>

              {/* Key Themes & Emotional Tone */}
              <div className="grid gap-4 md:grid-cols-2">
                {analysis.keyThemes?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                      <Tag className="w-4 h-4" />
                      Key Themes
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.keyThemes.map((theme, i) => (
                        <span key={i} className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                          {theme}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.emotionalTone && (
                  <div>
                    <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                      <Heart className="w-4 h-4" />
                      Emotional Tone
                    </h4>
                    <p className="text-muted-foreground">{analysis.emotionalTone}</p>
                  </div>
                )}

                {analysis.timePeriod && (
                  <div>
                    <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4" />
                      Time Period
                    </h4>
                    <p className="text-muted-foreground">{analysis.timePeriod}</p>
                  </div>
                )}

                {analysis.peopleIdentified?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4" />
                      People Identified
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.peopleIdentified.map((person, i) => (
                        <span key={i} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs">
                          {person}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Follow-up Questions */}
              {analysis.followUpQuestions?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3">Ori wants to explore:</h4>
                  <div className="space-y-2">
                    {analysis.followUpQuestions.map((question, i) => (
                      <div key={i} className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                        <span className="text-amber-600 font-medium">{i + 1}.</span>
                        <p className="text-sm">{question}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Actions */}
              {analysis.suggestedActions?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3">Suggested next steps:</h4>
                  <div className="flex flex-wrap gap-2">
                    {analysis.suggestedActions.map((action, i) => (
                      <Button key={i} variant="outline" size="sm" asChild>
                        <Link to={
                          action.action === 'create_event' ? '/events/new' :
                          action.action === 'link_person' ? '/people/new' :
                          '#'
                        }>
                          {action.action === 'create_event' && <Plus className="w-3 h-3 mr-1" />}
                          {action.action === 'link_person' && <UserPlus className="w-3 h-3 mr-1" />}
                          {action.reason}
                        </Link>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Re-analyze button */}
              <div className="pt-2 border-t">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => analyzeMutation.mutate()}
                  disabled={analyzeMutation.isPending}
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  Re-analyze
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
