import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { tagsApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Tag as TagIcon, Calendar } from 'lucide-react'

export default function TagDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: tag, isLoading } = useQuery({
    queryKey: ['tag', id],
    queryFn: () => tagsApi.getById(id!),
    enabled: !!id,
  })

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading tag...</div>
      </div>
    )
  }

  if (!tag) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-destructive">Tag not found</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/tags')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <TagIcon className="h-5 w-5" />
            <h1 className="text-3xl font-bold tracking-tight">{tag.name}</h1>
          </div>
          {tag.description && <p className="text-muted-foreground">{tag.description}</p>}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Tagged Events ({tag.events?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tag.events && tag.events.length > 0 ? (
            <ul className="space-y-3">
              {tag.events.map((event) => (
                <li key={event.id} className="border-b pb-2 last:border-0">
                  <Link to={`/events/${event.id}`} className="hover:underline">
                    <div className="font-medium">{event.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(event.date)}
                      {event.location && ` • ${event.location}`}
                      {event.chapter && ` • Ch. ${event.chapter.number}`}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">No events tagged with this tag</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
