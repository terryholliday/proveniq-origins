import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { API_URL } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Upload, 
  FileArchive, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Image,
  FileText,
  Music,
  Video,
  FolderOpen,
} from 'lucide-react'

interface UploadResult {
  id: string
  filename: string
  type: string
  source: string
}

interface BulkUploadResponse {
  message: string
  success: UploadResult[]
  failed: { filename: string; error: string }[]
  total: number
  failedCount: number
}

export default function BulkUpload() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [uploadResult, setUploadResult] = useState<BulkUploadResponse | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData()
      files.forEach(file => formData.append('files', file))
      
      const response = await fetch(`${API_URL}/uploads/bulk`, {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) {
        throw new Error('Upload failed')
      }
      
      return response.json() as Promise<BulkUploadResponse>
    },
    onSuccess: (data) => {
      setUploadResult(data)
      setSelectedFiles([])
      queryClient.invalidateQueries({ queryKey: ['artifacts'] })
    },
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setSelectedFiles(prev => [...prev, ...files])
    setUploadResult(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    setSelectedFiles(prev => [...prev, ...files])
    setUploadResult(null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpload = () => {
    if (selectedFiles.length > 0) {
      uploadMutation.mutate(selectedFiles)
    }
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="h-4 w-4 text-green-500" />
    if (file.type.startsWith('audio/')) return <Music className="h-4 w-4 text-purple-500" />
    if (file.type.startsWith('video/')) return <Video className="h-4 w-4 text-red-500" />
    if (file.name.endsWith('.zip')) return <FileArchive className="h-4 w-4 text-amber-500" />
    return <FileText className="h-4 w-4 text-blue-500" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const totalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0)
  const zipCount = selectedFiles.filter(f => f.name.endsWith('.zip')).length

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bulk Upload</h1>
        <p className="text-muted-foreground">
          Upload multiple files at once, or a ZIP archive containing your photos, documents, and audio files.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Select Files
          </CardTitle>
          <CardDescription>
            Drag and drop files here, or click to browse. ZIP files will be automatically extracted.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt,.md,.zip"
            />
            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Drop files here or click to browse</p>
            <p className="text-sm text-muted-foreground mt-1">
              Supports images, audio, video, documents, and ZIP archives
            </p>
          </div>

          {/* Selected files list */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">
                  {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
                  {zipCount > 0 && (
                    <span className="text-amber-600 ml-2">
                      ({zipCount} ZIP archive{zipCount !== 1 ? 's' : ''} will be extracted)
                    </span>
                  )}
                </h3>
                <span className="text-sm text-muted-foreground">
                  Total: {formatFileSize(totalSize)}
                </span>
              </div>
              
              <div className="max-h-64 overflow-y-auto space-y-1 border rounded-lg p-2">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {getFileIcon(file)}
                      <span className="truncate">{file.name}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeFile(index)
                      }}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleUpload}
                  disabled={uploadMutation.isPending}
                  className="flex-1"
                >
                  {uploadMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedFiles([])}
                  disabled={uploadMutation.isPending}
                >
                  Clear All
                </Button>
              </div>
            </div>
          )}

          {/* Upload progress */}
          {uploadMutation.isPending && (
            <div className="space-y-2">
              <Progress value={undefined} className="animate-pulse" />
              <p className="text-sm text-center text-muted-foreground">
                Processing files and extracting content...
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {uploadResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {uploadResult.failedCount === 0 ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-amber-500" />
              )}
              Upload Complete
            </CardTitle>
            <CardDescription>{uploadResult.message}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Success */}
            {uploadResult.success.length > 0 && (
              <div>
                <h4 className="font-medium text-green-600 mb-2">
                  ✓ {uploadResult.success.length} artifacts created
                </h4>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {uploadResult.success.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 text-sm p-2 bg-green-50 dark:bg-green-950/30 rounded"
                    >
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="truncate">{item.filename}</span>
                      <span className="text-xs text-muted-foreground">
                        ({item.type})
                      </span>
                      {item.source === 'zip' && (
                        <span className="text-xs bg-amber-100 dark:bg-amber-900 px-1 rounded">
                          from ZIP
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Failed */}
            {uploadResult.failed.length > 0 && (
              <div>
                <h4 className="font-medium text-red-600 mb-2">
                  ✗ {uploadResult.failed.length} files failed
                </h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {uploadResult.failed.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-sm p-2 bg-red-50 dark:bg-red-950/30 rounded"
                    >
                      <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      <span className="truncate">{item.filename}</span>
                      <span className="text-xs text-red-600">{item.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              variant="outline"
              onClick={() => setUploadResult(null)}
              className="w-full"
            >
              Upload More Files
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <h3 className="font-medium mb-3">💡 Tips for Bulk Upload</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <FileArchive className="h-4 w-4 mt-0.5 text-amber-500" />
              <span>
                <strong>ZIP archives</strong> are automatically extracted. Great for uploading entire photo folders!
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Image className="h-4 w-4 mt-0.5 text-green-500" />
              <span>
                <strong>Images</strong> will be analyzed by AI to describe what's in them and estimate dates.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Music className="h-4 w-4 mt-0.5 text-purple-500" />
              <span>
                <strong>Audio files</strong> will be transcribed automatically (requires OpenAI API key).
              </span>
            </li>
            <li className="flex items-start gap-2">
              <FileText className="h-4 w-4 mt-0.5 text-blue-500" />
              <span>
                <strong>PDFs and documents</strong> will have their text extracted for Ori to reference.
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
