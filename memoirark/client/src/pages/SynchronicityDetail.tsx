import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { synchronicitiesApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Pencil, Calendar } from 'lucide-react'

export default function SynchronicityDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: synchronicity, isLoading } = useQuery({
    queryKey: ['synchronicity', id],
    queryFn: () => synchronicitiesApi.getById(id!),
    enabled: !!id,
  })

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading synchronicity...</div>
      </div>
    )
  }

  if (!synchronicity) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-destructive">Synchronicity not found</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/synchronicities')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight capitalize">{synchronicity.type}</h1>
            <p className="text-muted-foreground">
              {formatDate(synchronicity.date)}
              {synchronicity.symbolicTag && ` • ${synchronicity.symbolicTag}`}
            </p>
          </div>
        </div>
        <Link to={`/synchronicities/${id}/edit`}>
          <Button>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Synchronicity
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
              <div className="text-sm font-medium text-muted-foreground">Type</div>
              <div className="capitalize">{synchronicity.type}</div>
            </div>
            {synchronicity.symbolicTag && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Symbolic Tag</div>
                <div>{synchronicity.symbolicTag}</div>
              </div>
            )}
            <div>
              <div className="text-sm font-medium text-muted-foreground">Date</div>
              <div>{formatDate(synchronicity.date)}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-narrative whitespace-pre-wrap">{synchronicity.description}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Linked Events ({synchronicity.eventLinks?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {synchronicity.eventLinks && synchronicity.eventLinks.length > 0 ? (
            <ul className="space-y-3">
              {synchronicity.eventLinks.map((link) => (
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
            <p className="text-muted-foreground text-sm">No events linked to this synchronicity</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
