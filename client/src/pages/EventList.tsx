import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { eventsApi, chaptersApi, traumaCyclesApi, Event } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export default function EventList() {
  const queryClient = useQueryClient()
  const [chapterFilter, setChapterFilter] = useState<string>('all')
  const [traumaCycleFilter, setTraumaCycleFilter] = useState<string>('all')

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['events', chapterFilter, traumaCycleFilter],
    queryFn: () =>
      eventsApi.getAll({
        chapterId: chapterFilter !== 'all' ? chapterFilter : undefined,
        traumaCycleId: traumaCycleFilter !== 'all' ? traumaCycleFilter : undefined,
      }),
  })

  const { data: chapters } = useQuery({
    queryKey: ['chapters'],
    queryFn: chaptersApi.getAll,
  })

  const { data: traumaCycles } = useQuery({
    queryKey: ['traumaCycles'],
    queryFn: traumaCyclesApi.getAll,
  })

  const deleteMutation = useMutation({
    mutationFn: eventsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
    },
  })

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      deleteMutation.mutate(id)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Events</h1>
          <p className="text-muted-foreground">
            Manage your life events
          </p>
        </div>
        <Link to="/events/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Event
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="w-64">
              <label className="text-sm font-medium mb-2 block">Chapter</label>
              <Select value={chapterFilter} onValueChange={setChapterFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All chapters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All chapters</SelectItem>
                  {chapters?.map((chapter) => (
                    <SelectItem key={chapter.id} value={chapter.id}>
                      {chapter.number}. {chapter.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-64">
              <label className="text-sm font-medium mb-2 block">Trauma Cycle</label>
              <Select value={traumaCycleFilter} onValueChange={setTraumaCycleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All trauma cycles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All trauma cycles</SelectItem>
                  {traumaCycles?.map((tc) => (
                    <SelectItem key={tc.id} value={tc.id}>
                      {tc.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {eventsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-muted-foreground">Loading events...</div>
            </div>
          ) : events && events.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      Title
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      Date
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      Location
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      Chapter
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      Trauma Cycle
                    </th>
                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event: Event) => (
                    <tr key={event.id} className="border-b hover:bg-muted/50">
                      <td className="p-4 align-middle font-medium">
                        {event.title}
                      </td>
                      <td className="p-4 align-middle text-muted-foreground">
                        {formatDate(event.date)}
                      </td>
                      <td className="p-4 align-middle text-muted-foreground">
                        {event.location || '—'}
                      </td>
                      <td className="p-4 align-middle text-muted-foreground">
                        {event.chapter
                          ? `${event.chapter.number}. ${event.chapter.title}`
                          : '—'}
                      </td>
                      <td className="p-4 align-middle text-muted-foreground">
                        {event.traumaCycle?.label || '—'}
                      </td>
                      <td className="p-4 align-middle text-right">
                        <div className="flex justify-end gap-2">
                          <Link to={`/events/${event.id}/edit`}>
                            <Button variant="ghost" size="icon">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(event.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <div className="text-muted-foreground">No events found</div>
              <Link to="/events/new">
                <Button variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Create your first event
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
