import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { artifactsApi, ArtifactCreateInput } from '@/lib/api'
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

const ARTIFACT_TYPES = ['journal', 'email', 'photo', 'chatlog', 'document', 'video', 'audio', 'other']

export default function ArtifactForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEditing = Boolean(id)

  const [formData, setFormData] = useState<ArtifactCreateInput>({
    type: '',
    sourceSystem: '',
    sourcePathOrUrl: '',
    shortDescription: '',
    transcribedText: null,
    importedFrom: null,
  })

  const { data: artifact, isLoading: artifactLoading } = useQuery({
    queryKey: ['artifact', id],
    queryFn: () => artifactsApi.getById(id!),
    enabled: isEditing,
  })

  useEffect(() => {
    if (artifact) {
      setFormData({
        type: artifact.type,
        sourceSystem: artifact.sourceSystem,
        sourcePathOrUrl: artifact.sourcePathOrUrl,
        shortDescription: artifact.shortDescription,
        transcribedText: artifact.transcribedText,
        importedFrom: artifact.importedFrom,
      })
    }
  }, [artifact])

  const createMutation = useMutation({
    mutationFn: artifactsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artifacts'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      navigate('/artifacts')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ArtifactCreateInput> }) =>
      artifactsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artifacts'] })
      queryClient.invalidateQueries({ queryKey: ['artifact', id] })
      navigate('/artifacts')
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

  if (isEditing && artifactLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading artifact...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/artifacts')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditing ? 'Edit Artifact' : 'New Artifact'}
          </h1>
          <p className="text-muted-foreground">
            {isEditing ? 'Update artifact details' : 'Add a new artifact to your archive'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Artifact Details</CardTitle>
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
                    {ARTIFACT_TYPES.map((type) => (
                      <SelectItem key={type} value={type} className="capitalize">{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sourceSystem">Source System</Label>
                <Input
                  id="sourceSystem"
                  value={formData.sourceSystem}
                  onChange={(e) => setFormData((prev) => ({ ...prev, sourceSystem: e.target.value }))}
                  placeholder="e.g., AOL, Gmail, Dropbox"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="sourcePathOrUrl">Source Path or URL</Label>
                <Input
                  id="sourcePathOrUrl"
                  value={formData.sourcePathOrUrl}
                  onChange={(e) => setFormData((prev) => ({ ...prev, sourcePathOrUrl: e.target.value }))}
                  placeholder="e.g., C:\Documents\journal.txt or https://..."
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="shortDescription">Short Description</Label>
                <Input
                  id="shortDescription"
                  value={formData.shortDescription}
                  onChange={(e) => setFormData((prev) => ({ ...prev, shortDescription: e.target.value }))}
                  placeholder="Brief description of this artifact"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="importedFrom">Imported From</Label>
                <Input
                  id="importedFrom"
                  value={formData.importedFrom || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, importedFrom: e.target.value || null }))}
                  placeholder="Notes about import pipeline"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transcribedText">Transcribed Text</Label>
              <Textarea
                id="transcribedText"
                value={formData.transcribedText || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, transcribedText: e.target.value || null }))}
                placeholder="Full transcription or content of the artifact..."
                rows={10}
                className="font-narrative"
              />
              <p className="text-xs text-muted-foreground">
                For journals, emails, or chat logs, paste the full text content here
              </p>
            </div>

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => navigate('/artifacts')}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !formData.type}>
                <Save className="mr-2 h-4 w-4" />
                {isPending ? 'Saving...' : isEditing ? 'Update Artifact' : 'Create Artifact'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
