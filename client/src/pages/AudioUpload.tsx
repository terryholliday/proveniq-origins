import { useState, useRef } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { uploadsApi, tagsApi } from '@/lib/api'
import ContextAssistant from '@/components/ContextAssistant'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Upload, FileAudio, X, Check, Loader2, Sparkles, Plus } from 'lucide-react'

interface FileWithPreview {
  file: File
  id: string
  status: 'pending' | 'uploading' | 'uploaded' | 'transcribing' | 'analyzing' | 'success' | 'error'
  error?: string
  artifactId?: string
  processingStep?: string
}

interface SuggestedTag {
  name: string
  reason: string
}

const SOURCE_TAG_SUGGESTIONS: Record<string, SuggestedTag[]> = {
  'therapy-sessions': [
    { name: 'healing', reason: 'Therapy session' },
    { name: 'self-reflection', reason: 'Therapy content' },
    { name: 'growth', reason: 'Personal development' },
    { name: 'trauma', reason: 'Processing experiences' },
    { name: 'insight', reason: 'Therapeutic insights' },
  ],
  'voicemail': [
    { name: 'communication', reason: 'Voice message' },
    { name: 'family', reason: 'Personal message' },
    { name: 'relationship', reason: 'Connection' },
    { name: 'memory', reason: 'Preserved moment' },
  ],
  'interview': [
    { name: 'oral-history', reason: 'Interview recording' },
    { name: 'testimony', reason: 'Personal account' },
    { name: 'memory', reason: 'Recorded recollection' },
  ],
  'recording': [
    { name: 'audio-diary', reason: 'Personal recording' },
    { name: 'memory', reason: 'Captured moment' },
    { name: 'reflection', reason: 'Personal thoughts' },
  ],
  'other': [
    { name: 'audio', reason: 'Audio artifact' },
    { name: 'archive', reason: 'Preserved content' },
  ],
}

export default function AudioUpload() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [sourceSystem, setSourceSystem] = useState('therapy-sessions')
  const [isUploading, setIsUploading] = useState(false)
  const [showTagReview, setShowTagReview] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [dismissedTags, setDismissedTags] = useState<string[]>([])
  const [showContextAssistant, setShowContextAssistant] = useState(false)
  const [, setContextAnswers] = useState<Record<string, string>>({})

  useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.getAll,
  })

  const suggestedTags = SOURCE_TAG_SUGGESTIONS[sourceSystem] || []
  const availableSuggestions = suggestedTags.filter(
    (t) => !selectedTags.includes(t.name) && !dismissedTags.includes(t.name)
  )

  const uploadMutation = useMutation({
    mutationFn: async (fileItem: FileWithPreview) => {
      return uploadsApi.uploadAudio(fileItem.file, fileItem.file.name, sourceSystem)
    },
    onSuccess: async (response, fileItem) => {
      // File uploaded, now show processing stages
      setFiles((prev) =>
        prev.map((f) => (f.id === fileItem.id ? { 
          ...f, 
          status: 'uploaded' as const,
          artifactId: response.artifact?.id,
          processingStep: 'Queued for transcription...'
        } : f))
      )

      // Simulate processing stages with visual feedback
      // In production, this would poll the backend for actual status
      await new Promise(resolve => setTimeout(resolve, 1500))
      setFiles((prev) =>
        prev.map((f) => (f.id === fileItem.id ? { 
          ...f, 
          status: 'transcribing' as const,
          processingStep: 'Transcribing audio...'
        } : f))
      )

      await new Promise(resolve => setTimeout(resolve, 2000))
      setFiles((prev) =>
        prev.map((f) => (f.id === fileItem.id ? { 
          ...f, 
          status: 'analyzing' as const,
          processingStep: 'AI analyzing content...'
        } : f))
      )

      await new Promise(resolve => setTimeout(resolve, 1500))
      setFiles((prev) =>
        prev.map((f) => (f.id === fileItem.id ? { 
          ...f, 
          status: 'success' as const,
          processingStep: 'Complete'
        } : f))
      )
    },
    onError: (error: Error, fileItem) => {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileItem.id ? { ...f, status: 'error' as const, error: error.message } : f
        )
      )
    },
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    const newFiles: FileWithPreview[] = selectedFiles.map((file) => ({
      file,
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      status: 'pending',
    }))
    setFiles((prev) => [...prev, ...newFiles])
  }

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const uploadAll = async () => {
    setIsUploading(true)
    const pendingFiles = files.filter((f) => f.status === 'pending')

    for (const fileItem of pendingFiles) {
      setFiles((prev) =>
        prev.map((f) => (f.id === fileItem.id ? { ...f, status: 'uploading' as const } : f))
      )
      await uploadMutation.mutateAsync(fileItem)
    }

    setIsUploading(false)
    queryClient.invalidateQueries({ queryKey: ['artifacts'] })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const pendingCount = files.filter((f) => f.status === 'pending').length
  const successCount = files.filter((f) => f.status === 'success').length
  const processingCount = files.filter((f) => 
    f.status === 'uploading' || f.status === 'uploaded' || f.status === 'transcribing' || f.status === 'analyzing'
  ).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Upload Audio</h1>
        <p className="text-muted-foreground">
          Upload therapy sessions, voicemails, and other audio recordings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Source Type</CardTitle>
          <CardDescription>Categorize your audio files</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {['therapy-sessions', 'voicemail', 'interview', 'recording', 'other'].map((type) => (
              <Button
                key={type}
                variant={sourceSystem === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSourceSystem(type)}
              >
                {type.replace('-', ' ')}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Select Files</CardTitle>
          <CardDescription>
            Supports MP3, WAV, M4A, AAC, OGG, FLAC (max 500MB per file)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
          >
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Click to select audio files</p>
            <p className="text-sm text-muted-foreground">or drag and drop</p>
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>
                  {files.length} file{files.length !== 1 ? 's' : ''} selected
                  {successCount > 0 && ` (${successCount} uploaded)`}
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFiles([])}
                  disabled={isUploading}
                >
                  Clear All
                </Button>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2">
                {files.map((fileItem) => (
                  <div
                    key={fileItem.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileAudio className="h-5 w-5 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{fileItem.file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(fileItem.file.size)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {fileItem.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFile(fileItem.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      {fileItem.status === 'uploading' && (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <span className="text-xs text-muted-foreground">Uploading...</span>
                        </div>
                      )}
                      {(fileItem.status === 'uploaded' || fileItem.status === 'transcribing' || fileItem.status === 'analyzing') && (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
                          <span className="text-xs text-violet-600 dark:text-violet-400">
                            {fileItem.processingStep}
                          </span>
                        </div>
                      )}
                      {fileItem.status === 'success' && (
                        <div className="flex items-center gap-2">
                          <Check className="h-5 w-5 text-green-500" />
                          <span className="text-xs text-green-600">Ready</span>
                        </div>
                      )}
                      {fileItem.status === 'error' && (
                        <span className="text-xs text-destructive">{fileItem.error}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button onClick={uploadAll} disabled={pendingCount === 0 || isUploading} className="flex-1">
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload {pendingCount} File{pendingCount !== 1 ? 's' : ''}
            </>
          )}
        </Button>
        <Button variant="outline" onClick={() => navigate('/artifacts')}>
          Go to Artifacts
        </Button>
      </div>

      {successCount > 0 && !isUploading && pendingCount === 0 && processingCount === 0 && !showTagReview && !showContextAssistant && (
        <Card className="border-green-500">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-600">
                <Check className="h-5 w-5" />
                <span>All files uploaded successfully!</span>
              </div>
              <Button onClick={() => setShowContextAssistant(true)} size="sm">
                Add Context
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showContextAssistant && !showTagReview && (
        <ContextAssistant
          contentType="audio"
          sourceType={sourceSystem}
          contentSummary={`${successCount} ${sourceSystem.replace('-', ' ')} file${successCount > 1 ? 's' : ''}`}
          onAnswersComplete={(answers) => {
            setContextAnswers(answers)
            setShowContextAssistant(false)
            setShowTagReview(true)
          }}
          onSkip={() => {
            setShowContextAssistant(false)
            setShowTagReview(true)
          }}
        />
      )}

      {showTagReview && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Suggested Tags for Your Uploads
            </CardTitle>
            <CardDescription>
              Based on uploading {sourceSystem.replace('-', ' ')}, we suggest these tags. 
              Accept the ones that fit, dismiss the rest.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedTags.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Accepted Tags</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedTags.map((tag) => (
                    <Badge key={tag} className="bg-primary/10 text-primary hover:bg-primary/20">
                      {tag}
                      <button
                        onClick={() => setSelectedTags((prev) => prev.filter((t) => t !== tag))}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {availableSuggestions.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Suggestions</Label>
                <div className="space-y-2">
                  {availableSuggestions.map((suggestion) => (
                    <div
                      key={suggestion.name}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div>
                        <span className="font-medium">{suggestion.name}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          — {suggestion.reason}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedTags((prev) => [...prev, suggestion.name])}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDismissedTags((prev) => [...prev, suggestion.name])}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {availableSuggestions.length === 0 && selectedTags.length === 0 && (
              <p className="text-muted-foreground text-center py-4">
                All suggestions reviewed. You can add custom tags when editing artifacts.
              </p>
            )}

            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={() => {
                  setShowTagReview(false)
                  navigate('/artifacts')
                }}
                className="flex-1"
              >
                Done — Go to Artifacts
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowTagReview(false)
                  setSelectedTags([])
                  setDismissedTags([])
                  setFiles([])
                }}
              >
                Upload More
              </Button>
            </div>

            {selectedTags.length > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                Tags will be available when you link these artifacts to events
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
