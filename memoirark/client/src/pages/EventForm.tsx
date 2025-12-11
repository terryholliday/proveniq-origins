import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { eventsApi, chaptersApi, traumaCyclesApi, EventCreateInput } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Save } from 'lucide-react'

export default function EventForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEditing = Boolean(id)

  const [formData, setFormData] = useState<EventCreateInput>({
    title: '',
    date: null,
    location: null,
    summary: null,
    emotionTags: [],
    notes: null,
    chapterId: null,
    traumaCycleId: null,
  })

  const [emotionTagsInput, setEmotionTagsInput] = useState('')

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventsApi.getById(id!),
    enabled: isEditing,
  })

  const { data: chapters } = useQuery({
    queryKey: ['chapters'],
    queryFn: chaptersApi.getAll,
  })

  const { data: traumaCycles } = useQuery({
    queryKey: ['traumaCycles'],
    queryFn: traumaCyclesApi.getAll,
  })

  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title,
        date: event.date,
        location: event.location,
        summary: event.summary,
        emotionTags: event.emotionTags,
        notes: event.notes,
        chapterId: event.chapterId,
        traumaCycleId: event.traumaCycleId,
      })
      setEmotionTagsInput(event.emotionTags.join(', '))
    }
  }, [event])

  const createMutation = useMutation({
    mutationFn: eventsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      navigate('/events')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EventCreateInput> }) =>
      eventsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['event', id] })
      navigate('/events')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const emotionTags = emotionTagsInput
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)

    const data = {
      ...formData,
      emotionTags,
    }

    if (isEditing && id) {
      updateMutation.mutate({ id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  if (isEditing && eventLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading event...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/events')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditing ? 'Edit Event' : 'New Event'}
          </h1>
          <p className="text-muted-foreground">
            {isEditing
              ? 'Update the details of this event'
              : 'Create a new life event'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Event title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date ? formData.date.split('T')[0] : ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      date: e.target.value ? new Date(e.target.value).toISOString() : null,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      location: e.target.value || null,
                    }))
                  }
                  placeholder="Where did this happen?"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emotionTags">Emotion Tags</Label>
                <Input
                  id="emotionTags"
                  value={emotionTagsInput}
                  onChange={(e) => setEmotionTagsInput(e.target.value)}
                  placeholder="betrayal, fear, relief (comma-separated)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="chapter">Chapter</Label>
                <Select
                  value={formData.chapterId || 'none'}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      chapterId: value === 'none' ? null : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select chapter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No chapter</SelectItem>
                    {chapters?.map((chapter) => (
                      <SelectItem key={chapter.id} value={chapter.id}>
                        {chapter.number}. {chapter.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="traumaCycle">Trauma Cycle</Label>
                <Select
                  value={formData.traumaCycleId || 'none'}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      traumaCycleId: value === 'none' ? null : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select trauma cycle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No trauma cycle</SelectItem>
                    {traumaCycles?.map((tc) => (
                      <SelectItem key={tc.id} value={tc.id}>
                        {tc.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="summary">Summary</Label>
              <Textarea
                id="summary"
                value={formData.summary || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    summary: e.target.value || null,
                  }))
                }
                placeholder="Brief summary of the event"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    notes: e.target.value || null,
                  }))
                }
                placeholder="Detailed notes about the event..."
                rows={6}
                className="font-narrative"
              />
              <p className="text-xs text-muted-foreground">
                Use this field for longer narrative descriptions
              </p>
            </div>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/events')}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                <Save className="mr-2 h-4 w-4" />
                {isPending ? 'Saving...' : isEditing ? 'Update Event' : 'Create Event'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
