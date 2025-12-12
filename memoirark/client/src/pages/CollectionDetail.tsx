import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { collectionsApi, eventsApi, artifactsApi, personsApi, Event, Artifact, Person } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, FolderOpen, Calendar, FileText, Users, X, Plus } from 'lucide-react'

export default function CollectionDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [addType, setAddType] = useState<'event' | 'artifact' | 'person' | null>(null)
  const [selectedId, setSelectedId] = useState('')

  const { data: collection, isLoading } = useQuery({
    queryKey: ['collection', id],
    queryFn: () => collectionsApi.getById(id!),
    enabled: !!id,
  })

  const { data: allEvents } = useQuery({
    queryKey: ['events'],
    queryFn: () => eventsApi.getAll(),
    enabled: addType === 'event',
  })

  const { data: allArtifacts } = useQuery({
    queryKey: ['artifacts'],
    queryFn: () => artifactsApi.getAll(),
    enabled: addType === 'artifact',
  })

  const { data: allPersons } = useQuery({
    queryKey: ['persons'],
    queryFn: () => personsApi.getAll(),
    enabled: addType === 'person',
  })

  const addEventMutation = useMutation({
    mutationFn: (eventId: string) => collectionsApi.addEvent(id!, eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection', id] })
      setSelectedId('')
      setAddType(null)
    },
  })

  const removeEventMutation = useMutation({
    mutationFn: (eventId: string) => collectionsApi.removeEvent(id!, eventId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['collection', id] }),
  })

  const addArtifactMutation = useMutation({
    mutationFn: (artifactId: string) => collectionsApi.addArtifact(id!, artifactId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection', id] })
      setSelectedId('')
      setAddType(null)
    },
  })

  const removeArtifactMutation = useMutation({
    mutationFn: (artifactId: string) => collectionsApi.removeArtifact(id!, artifactId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['collection', id] }),
  })

  const addPersonMutation = useMutation({
    mutationFn: (personId: string) => collectionsApi.addPerson(id!, personId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection', id] })
      setSelectedId('')
      setAddType(null)
    },
  })

  const removePersonMutation = useMutation({
    mutationFn: (personId: string) => collectionsApi.removePerson(id!, personId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['collection', id] }),
  })

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString()
  }

  const handleAdd = () => {
    if (!selectedId) return
    if (addType === 'event') addEventMutation.mutate(selectedId)
    if (addType === 'artifact') addArtifactMutation.mutate(selectedId)
    if (addType === 'person') addPersonMutation.mutate(selectedId)
  }

  // Filter out already-added items
  const availableEvents = allEvents?.filter(
    (e) => !collection?.events?.some((ce) => ce.id === e.id)
  )
  const availableArtifacts = allArtifacts?.filter(
    (a) => !collection?.artifacts?.some((ca) => ca.id === a.id)
  )
  const availablePersons = allPersons?.filter(
    (p) => !collection?.persons?.some((cp) => cp.id === p.id)
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading collection...</div>
      </div>
    )
  }

  if (!collection) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-destructive">Collection not found</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/collections')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            <h1 className="text-3xl font-bold tracking-tight">{collection.name}</h1>
          </div>
          {collection.description && <p className="text-muted-foreground">{collection.description}</p>}
        </div>
      </div>

      {/* Add Items UI */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button
              variant={addType === 'event' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAddType(addType === 'event' ? null : 'event')}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Event
            </Button>
            <Button
              variant={addType === 'artifact' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAddType(addType === 'artifact' ? null : 'artifact')}
            >
              <FileText className="mr-2 h-4 w-4" />
              Artifact
            </Button>
            <Button
              variant={addType === 'person' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAddType(addType === 'person' ? null : 'person')}
            >
              <Users className="mr-2 h-4 w-4" />
              Person
            </Button>
          </div>

          {addType && (
            <div className="flex gap-2">
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={`Select ${addType}...`} />
                </SelectTrigger>
                <SelectContent>
                  {addType === 'event' &&
                    availableEvents?.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
                    ))}
                  {addType === 'artifact' &&
                    availableArtifacts?.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.type} — {a.shortDescription || 'No description'}
                      </SelectItem>
                    ))}
                  {addType === 'person' &&
                    availablePersons?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAdd} disabled={!selectedId}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Events ({collection.events?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {collection.events && collection.events.length > 0 ? (
              <ul className="space-y-2">
                {collection.events.map((event: Event) => (
                  <li key={event.id} className="flex items-center justify-between gap-2 text-sm">
                    <Link to={`/events/${event.id}`} className="hover:underline truncate">
                      {event.title}
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => removeEventMutation.mutate(event.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">No events</p>
            )}
          </CardContent>
        </Card>

        {/* Artifacts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Artifacts ({collection.artifacts?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {collection.artifacts && collection.artifacts.length > 0 ? (
              <ul className="space-y-2">
                {collection.artifacts.map((artifact: Artifact) => (
                  <li key={artifact.id} className="flex items-center justify-between gap-2 text-sm">
                    <Link to={`/artifacts/${artifact.id}`} className="hover:underline truncate">
                      <span className="capitalize">{artifact.type}</span>
                      {artifact.shortDescription && ` — ${artifact.shortDescription}`}
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => removeArtifactMutation.mutate(artifact.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">No artifacts</p>
            )}
          </CardContent>
        </Card>

        {/* People */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              People ({collection.persons?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {collection.persons && collection.persons.length > 0 ? (
              <ul className="space-y-2">
                {collection.persons.map((person: Person) => (
                  <li key={person.id} className="flex items-center justify-between gap-2 text-sm">
                    <Link to={`/people/${person.id}`} className="hover:underline truncate">
                      {person.name}
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => removePersonMutation.mutate(person.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">No people</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
