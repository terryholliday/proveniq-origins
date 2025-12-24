import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { artifactsApi, ArtifactCreateInput, uploadsApi } from '@/lib/api'
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
import { ArrowLeft, Save, FileUp, Loader2 } from 'lucide-react'
import TagSuggestions from '@/components/TagSuggestions'
import ContextAssistant from '@/components/ContextAssistant'

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

  const [suggestedTagsInput, setSuggestedTagsInput] = useState('')
  const [showContextAssistant, setShowContextAssistant] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [extractionMessage, setExtractionMessage] = useState<string | null>(null)
  const [memoryPrompts, setMemoryPrompts] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setUploadedFileName(file.name)

    try {
      // Determine artifact type from file
      let artifactType = formData.type || 'other'
      if (file.type.startsWith('image/')) artifactType = 'photo'
      else if (file.type.startsWith('audio/')) artifactType = 'audio'
      else if (file.type.startsWith('video/')) artifactType = 'video'
      else if (file.type.includes('pdf') || file.type.includes('document')) artifactType = 'document'

      // Upload based on type
      let response
      if (file.type.startsWith('audio/')) {
        response = await uploadsApi.uploadAudio(file, file.name, formData.sourceSystem || 'upload')
      } else if (file.type.startsWith('image/')) {
        response = await uploadsApi.uploadImage(file)
      } else if (file.type === 'application/pdf' || file.type.startsWith('text/') || file.name.endsWith('.pdf') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        response = await uploadsApi.uploadDocument(file, file.name)
      } else {
        // For other files, just set the path locally
        setFormData(prev => ({
          ...prev,
          type: artifactType,
          sourcePathOrUrl: file.name,
          shortDescription: prev.shortDescription || file.name,
          importedFrom: 'Local upload',
        }))
        setIsUploading(false)
        return
      }

      // Update form with uploaded file info and extracted text
      setFormData(prev => ({
        ...prev,
        type: artifactType,
        sourcePathOrUrl: response.file?.path || response.file?.filename ? `/uploads/${response.file.filename}` : file.name,
        shortDescription: prev.shortDescription || file.name,
        importedFrom: 'Local upload',
        transcribedText: response.extractedText || prev.transcribedText || null,
      }))
      
      // Show message about extraction
      if (response.message) {
        setExtractionMessage(response.message)
      }
      
      // Set memory prompts if available (for images)
      if (response.memoryPrompts && response.memoryPrompts.length > 0) {
        setMemoryPrompts(response.memoryPrompts)
      }
    } catch (error) {
      console.error('Upload failed:', error)
      alert('Failed to upload file. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

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
                <div className="flex gap-2">
                  <Input
                    id="sourcePathOrUrl"
                    value={formData.sourcePathOrUrl}
                    onChange={(e) => setFormData((prev) => ({ ...prev, sourcePathOrUrl: e.target.value }))}
                    placeholder="e.g., C:\Documents\journal.txt or https://..."
                    className="flex-1"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                    accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <FileUp className="mr-2 h-4 w-4" />
                        Browse
                      </>
                    )}
                  </Button>
                </div>
                {uploadedFileName && (
                  <p className="text-xs text-muted-foreground">
                    Uploaded: {uploadedFileName}
                  </p>
                )}
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
              <div className="flex items-center justify-between">
                <Label htmlFor="transcribedText">Transcribed Text</Label>
                {extractionMessage && (
                  <span className="text-xs text-green-600 dark:text-green-400">
                    {extractionMessage}
                  </span>
                )}
              </div>
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
              
              {/* Memory Prompts from AI Image Analysis */}
              {memoryPrompts.length > 0 && (
                <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                  <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-2">
                    🎙️ Ori's Interview Questions
                  </h4>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">
                    Based on this image, here are some questions to help you capture the memory:
                  </p>
                  <ul className="space-y-2">
                    {memoryPrompts.map((prompt, idx) => (
                      <li key={idx} className="text-sm text-amber-800 dark:text-amber-200 flex items-start gap-2">
                        <span className="text-amber-500">•</span>
                        <span>{prompt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <TagSuggestions
                title={formData.shortDescription || ''}
                summary={formData.type + ' ' + formData.sourceSystem}
                notes={formData.transcribedText || ''}
                currentTags={suggestedTagsInput.split(',').map(t => t.trim()).filter(Boolean)}
                onAddTag={(tag) => {
                  const current = suggestedTagsInput.trim()
                  setSuggestedTagsInput(current ? `${current}, ${tag}` : tag)
                }}
              />
              {suggestedTagsInput && (
                <div className="text-sm text-muted-foreground">
                  <strong>Suggested tags:</strong> {suggestedTagsInput}
                  <p className="text-xs mt-1">These tags will be available when linking this artifact to events</p>
                </div>
              )}
              {formData.type && !showContextAssistant && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowContextAssistant(true)}
                  className="mt-2"
                >
                  Add more context about this {formData.type}
                </Button>
              )}
            </div>

            {showContextAssistant && (
              <ContextAssistant
                contentType={formData.type === 'photo' ? 'photo' : formData.type === 'document' || formData.type === 'journal' || formData.type === 'email' ? 'document' : 'artifact'}
                contentSummary={formData.shortDescription || `this ${formData.type}`}
                onAnswersComplete={(answers) => {
                  let additionalText = formData.transcribedText || ''
                  additionalText += '\n\n--- Context ---\n'
                  Object.entries(answers).forEach(([key, value]) => {
                    if (value) additionalText += `${key}: ${value}\n`
                  })
                  setFormData((prev) => ({
                    ...prev,
                    transcribedText: additionalText,
                  }))
                  setShowContextAssistant(false)
                }}
                onSkip={() => setShowContextAssistant(false)}
              />
            )}

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
