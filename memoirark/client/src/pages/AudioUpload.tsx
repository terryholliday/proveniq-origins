import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { uploadsApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, FileAudio, X, Check, Loader2 } from 'lucide-react'

interface FileWithPreview {
  file: File
  id: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
}

export default function AudioUpload() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [sourceSystem, setSourceSystem] = useState('therapy-sessions')
  const [isUploading, setIsUploading] = useState(false)

  const uploadMutation = useMutation({
    mutationFn: async (fileItem: FileWithPreview) => {
      return uploadsApi.uploadAudio(fileItem.file, fileItem.file.name, sourceSystem)
    },
    onSuccess: (_, fileItem) => {
      setFiles((prev) =>
        prev.map((f) => (f.id === fileItem.id ? { ...f, status: 'success' as const } : f))
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
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      )}
                      {fileItem.status === 'success' && (
                        <Check className="h-5 w-5 text-green-500" />
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

      {successCount > 0 && !isUploading && pendingCount === 0 && (
        <Card className="border-green-500">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-green-600">
              <Check className="h-5 w-5" />
              <span>All files uploaded successfully!</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
