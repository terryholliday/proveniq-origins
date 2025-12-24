import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { personsApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Pencil, Star, Calendar } from 'lucide-react'

export default function PersonDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: person, isLoading } = useQuery({
    queryKey: ['person', id],
    queryFn: () => personsApi.getById(id!),
    enabled: !!id,
  })

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading person...</div>
      </div>
    )
  }

  if (!person) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-destructive">Person not found</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/people')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">{person.name}</h1>
              {person.isPrimary && <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />}
            </div>
            {person.role && <p className="text-muted-foreground">{person.role}</p>}
          </div>
        </div>
        <Link to={`/people/${id}/edit`}>
          <Button>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Person
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Relationship Type</div>
              <div>{person.relationshipType || '—'}</div>
            </div>
            {person.notes && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Notes</div>
                <p className="font-narrative whitespace-pre-wrap">{person.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Linked Events ({person.eventLinks?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {person.eventLinks && person.eventLinks.length > 0 ? (
              <ul className="space-y-3">
                {person.eventLinks.map((link) => (
                  <li key={link.event.id} className="border-b pb-2 last:border-0">
                    <Link to={`/events/${link.event.id}`} className="hover:underline">
                      <div className="font-medium">{link.event.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(link.event.date)}
                        {link.event.chapter && ` • Ch. ${link.event.chapter.number}`}
                        {link.event.traumaCycle && ` • ${link.event.traumaCycle.label}`}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">No events linked to this person</p>
            )}
          </CardContent>
        </Card>
      </div>

      {person.artifactLinks && person.artifactLinks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Linked Artifacts ({person.artifactLinks.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {person.artifactLinks.map((link) => (
                <li key={link.artifact.id}>
                  <Link to={`/artifacts/${link.artifact.id}`} className="hover:underline">
                    <span className="font-medium">{link.artifact.type}</span>
                    {link.artifact.shortDescription && (
                      <span className="text-muted-foreground ml-2">— {link.artifact.shortDescription}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
