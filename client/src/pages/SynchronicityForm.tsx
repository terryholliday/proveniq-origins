import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { synchronicitiesApi, SynchronicityCreateInput } from '@/lib/api'
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
import TagSuggestions from '@/components/TagSuggestions'

const SYNCHRONICITY_TYPES = ['dream', 'omen', 'sign', 'symbolic event', 'coincidence', 'vision', 'other']

export default function SynchronicityForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEditing = Boolean(id)

  const [formData, setFormData] = useState<SynchronicityCreateInput>({
    date: null,
    type: '',
    description: '',
    symbolicTag: null,
  })

  const { data: synchronicity, isLoading: syncLoading } = useQuery({
    queryKey: ['synchronicity', id],
    queryFn: () => synchronicitiesApi.getById(id!),
    enabled: isEditing,
  })

  useEffect(() => {
    if (synchronicity) {
      setFormData({
        date: synchronicity.date,
        type: synchronicity.type,
        description: synchronicity.description,
        symbolicTag: synchronicity.symbolicTag,
      })
    }
  }, [synchronicity])

  const createMutation = useMutation({
    mutationFn: synchronicitiesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['synchronicities'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      navigate('/synchronicities')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SynchronicityCreateInput> }) =>
      synchronicitiesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['synchronicities'] })
      queryClient.invalidateQueries({ queryKey: ['synchronicity', id] })
      navigate('/synchronicities')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isEditing && id) {
      updateMutation.mutate({ id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  if (isEditing && syncLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading synchronicity...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/synchronicities')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditing ? 'Edit Synchronicity' : 'New Synchronicity'}
          </h1>
          <p className="text-muted-foreground">
            {isEditing ? 'Update synchronicity details' : 'Record a dream, omen, or symbolic event'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Synchronicity Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SYNCHRONICITY_TYPES.map((type) => (
                      <SelectItem key={type} value={type} className="capitalize">{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="symbolicTag">Symbolic Tag</Label>
                <Input
                  id="symbolicTag"
                  value={formData.symbolicTag || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, symbolicTag: e.target.value || null }))}
                  placeholder="e.g., raccoon, train, storm, owl"
                />
                <p className="text-xs text-muted-foreground">
                  A short keyword representing the symbolic element
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the synchronicity in detail..."
                rows={8}
                className="font-narrative"
                required
              />
              <TagSuggestions
                title={formData.type}
                summary={formData.symbolicTag || ''}
                notes={formData.description}
                currentTags={[]}
                onAddTag={() => {}}
              />
            </div>

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => navigate('/synchronicities')}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !formData.type || !formData.description}>
                <Save className="mr-2 h-4 w-4" />
                {isPending ? 'Saving...' : isEditing ? 'Update Synchronicity' : 'Create Synchronicity'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
