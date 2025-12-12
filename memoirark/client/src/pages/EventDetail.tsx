import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { eventsApi, personsApi, songsApi, artifactsApi, synchronicitiesApi, linksApi, Person, Song, Artifact, Synchronicity } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Pencil, Plus, X, Users, Music, FileText, Sparkles, Star } from 'lucide-react'

export default function EventDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [linkingType, setLinkingType] = useState<'person' | 'song' | 'artifact' | 'synchronicity' | null>(null)
  const [selectedEntityId, setSelectedEntityId] = useState<string>('')

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventsApi.getById(id!),
    enabled: !!id,
  })

  const { data: allPersons } = useQuery({
    queryKey: ['persons'],
    queryFn: () => personsApi.getAll(),
  })

  const { data: allSongs } = useQuery({
    queryKey: ['songs'],
    queryFn: () => songsApi.getAll(),
  })

  const { data: allArtifacts } = useQuery({
    queryKey: ['artifacts'],
    queryFn: () => artifactsApi.getAll(),
  })

  const { data: allSynchronicities } = useQuery({
    queryKey: ['synchronicities'],
    queryFn: () => synchronicitiesApi.getAll(),
  })

  const linkPersonMutation = useMutation({
    mutationFn: (personId: string) => linksApi.linkPersonToEvent(id!, personId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', id] })
      setLinkingType(null)
      setSelectedEntityId('')
    },
  })

  const unlinkPersonMutation = useMutation({
    mutationFn: (personId: string) => linksApi.unlinkPersonFromEvent(id!, personId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['event', id] }),
  })

  const linkSongMutation = useMutation({
    mutationFn: (songId: string) => linksApi.linkSongToEvent(id!, songId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', id] })
      setLinkingType(null)
      setSelectedEntityId('')
    },
  })

  const unlinkSongMutation = useMutation({
    mutationFn: (songId: string) => linksApi.unlinkSongFromEvent(id!, songId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['event', id] }),
  })

  const linkArtifactMutation = useMutation({
    mutationFn: (artifactId: string) => linksApi.linkArtifactToEvent(id!, artifactId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', id] })
      setLinkingType(null)
      setSelectedEntityId('')
    },
  })

  const unlinkArtifactMutation = useMutation({
    mutationFn: (artifactId: string) => linksApi.unlinkArtifactFromEvent(id!, artifactId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['event', id] }),
  })

  const linkSynchronicityMutation = useMutation({
    mutationFn: (synchronicityId: string) => linksApi.linkSynchronicityToEvent(id!, synchronicityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', id] })
      setLinkingType(null)
      setSelectedEntityId('')
    },
  })

  const unlinkSynchronicityMutation = useMutation({
    mutationFn: (synchronicityId: string) => linksApi.unlinkSynchronicityFromEvent(id!, synchronicityId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['event', id] }),
  })

  const handleLink = () => {
    if (!selectedEntityId) return
    switch (linkingType) {
      case 'person':
        linkPersonMutation.mutate(selectedEntityId)
        break
      case 'song':
        linkSongMutation.mutate(selectedEntityId)
        break
      case 'artifact':
        linkArtifactMutation.mutate(selectedEntityId)
        break
      case 'synchronicity':
        linkSynchronicityMutation.mutate(selectedEntityId)
        break
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading event...</div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-destructive">Event not found</div>
      </div>
    )
  }

  const linkedPersonIds = new Set(event.persons?.map((p: Person) => p.id) || [])
  const linkedSongIds = new Set(event.songs?.map((s: Song) => s.id) || [])
  const linkedArtifactIds = new Set(event.artifacts?.map((a: Artifact) => a.id) || [])
  const linkedSynchronicityIds = new Set(event.synchronicities?.map((s: Synchronicity) => s.id) || [])

  const availablePersons = allPersons?.filter((p: Person) => !linkedPersonIds.has(p.id)) || []
  const availableSongs = allSongs?.filter((s: Song) => !linkedSongIds.has(s.id)) || []
  const availableArtifacts = allArtifacts?.filter((a: Artifact) => !linkedArtifactIds.has(a.id)) || []
  const availableSynchronicities = allSynchronicities?.filter((s: Synchronicity) => !linkedSynchronicityIds.has(s.id)) || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/events')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">{event.title}</h1>
              {event.isKeystone && <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />}
            </div>
            <p className="text-muted-foreground">
              {formatDate(event.date)} {event.location && `• ${event.location}`}
            </p>
          </div>
        </div>
        <Link to={`/events/${id}/edit`}>
          <Button>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Event
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {event.chapter && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Chapter</div>
                <div>{event.chapter.number}. {event.chapter.title}</div>
              </div>
            )}
            {event.traumaCycle && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Trauma Cycle</div>
                <div>{event.traumaCycle.label}</div>
              </div>
            )}
            {event.emotionTags && event.emotionTags.length > 0 && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Emotion Tags</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {event.emotionTags.map((tag: string, i: number) => (
                    <span key={i} className="px-2 py-1 bg-muted rounded-md text-sm">{tag}</span>
                  ))}
                </div>
              </div>
            )}
            {event.summary && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Summary</div>
                <div>{event.summary}</div>
              </div>
            )}
          </CardContent>
        </Card>

        {event.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-narrative whitespace-pre-wrap">{event.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              People ({event.persons?.length || 0})
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => setLinkingType('person')}>
              <Plus className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {linkingType === 'person' && (
              <div className="flex gap-2 mb-4">
                <Select value={selectedEntityId} onValueChange={setSelectedEntityId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select person..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePersons.map((p: Person) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleLink} disabled={!selectedEntityId}>Add</Button>
                <Button size="sm" variant="ghost" onClick={() => { setLinkingType(null); setSelectedEntityId(''); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            {event.persons && event.persons.length > 0 ? (
              <ul className="space-y-2">
                {event.persons.map((person: Person) => (
                  <li key={person.id} className="flex items-center justify-between">
                    <Link to={`/people/${person.id}`} className="hover:underline">
                      <span className="font-medium">{person.name}</span>
                      {person.role && <span className="text-muted-foreground ml-2">({person.role})</span>}
                    </Link>
                    <Button size="icon" variant="ghost" onClick={() => unlinkPersonMutation.mutate(person.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">No people linked</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Music className="h-5 w-5" />
              Songs ({event.songs?.length || 0})
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => setLinkingType('song')}>
              <Plus className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {linkingType === 'song' && (
              <div className="flex gap-2 mb-4">
                <Select value={selectedEntityId} onValueChange={setSelectedEntityId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select song..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSongs.map((s: Song) => (
                      <SelectItem key={s.id} value={s.id}>{s.title} — {s.artist}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleLink} disabled={!selectedEntityId}>Add</Button>
                <Button size="sm" variant="ghost" onClick={() => { setLinkingType(null); setSelectedEntityId(''); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            {event.songs && event.songs.length > 0 ? (
              <ul className="space-y-2">
                {event.songs.map((song: Song) => (
                  <li key={song.id} className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{song.title}</span>
                      <span className="text-muted-foreground ml-2">— {song.artist}</span>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => unlinkSongMutation.mutate(song.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">No songs linked</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Artifacts ({event.artifacts?.length || 0})
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => setLinkingType('artifact')}>
              <Plus className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {linkingType === 'artifact' && (
              <div className="flex gap-2 mb-4">
                <Select value={selectedEntityId} onValueChange={setSelectedEntityId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select artifact..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableArtifacts.map((a: Artifact) => (
                      <SelectItem key={a.id} value={a.id}>{a.type}: {a.shortDescription || a.sourcePathOrUrl}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleLink} disabled={!selectedEntityId}>Add</Button>
                <Button size="sm" variant="ghost" onClick={() => { setLinkingType(null); setSelectedEntityId(''); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            {event.artifacts && event.artifacts.length > 0 ? (
              <ul className="space-y-2">
                {event.artifacts.map((artifact: Artifact) => (
                  <li key={artifact.id} className="flex items-center justify-between">
                    <Link to={`/artifacts/${artifact.id}`} className="hover:underline">
                      <span className="font-medium">{artifact.type}</span>
                      {artifact.shortDescription && <span className="text-muted-foreground ml-2">— {artifact.shortDescription}</span>}
                    </Link>
                    <Button size="icon" variant="ghost" onClick={() => unlinkArtifactMutation.mutate(artifact.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">No artifacts linked</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Synchronicities ({event.synchronicities?.length || 0})
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => setLinkingType('synchronicity')}>
              <Plus className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {linkingType === 'synchronicity' && (
              <div className="flex gap-2 mb-4">
                <Select value={selectedEntityId} onValueChange={setSelectedEntityId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select synchronicity..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSynchronicities.map((s: Synchronicity) => (
                      <SelectItem key={s.id} value={s.id}>{s.type}{s.symbolicTag ? ` (${s.symbolicTag})` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleLink} disabled={!selectedEntityId}>Add</Button>
                <Button size="sm" variant="ghost" onClick={() => { setLinkingType(null); setSelectedEntityId(''); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            {event.synchronicities && event.synchronicities.length > 0 ? (
              <ul className="space-y-2">
                {event.synchronicities.map((sync: Synchronicity) => (
                  <li key={sync.id} className="flex items-center justify-between">
                    <Link to={`/synchronicities/${sync.id}`} className="hover:underline">
                      <span className="font-medium">{sync.type}</span>
                      {sync.symbolicTag && <span className="text-muted-foreground ml-2">({sync.symbolicTag})</span>}
                    </Link>
                    <Button size="icon" variant="ghost" onClick={() => unlinkSynchronicityMutation.mutate(sync.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">No synchronicities linked</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
