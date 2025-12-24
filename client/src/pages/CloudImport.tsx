import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Cloud,
  FolderOpen,
  Image,
  FileText,
  Music,
  Check,
  X,
  Loader2,
  Download,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react'
import { API_URL } from '@/lib/api'

const API_BASE = API_URL

interface CloudFile {
  id: string
  name: string
  mimeType?: string
  size?: number
  modifiedTime?: string
  thumbnailLink?: string
  path?: string
  isFolder?: boolean
}

interface CloudStatus {
  google: { connected: boolean; configured: boolean }
  dropbox: { connected: boolean; configured: boolean }
}

export default function CloudImport() {
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  
  const [activeProvider, setActiveProvider] = useState<'google' | 'dropbox' | null>(null)
  const [currentFolder, setCurrentFolder] = useState<string | null>(null)
  const [folderPath, setFolderPath] = useState<Array<{ id: string; name: string }>>([])
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [filterType, setFilterType] = useState<'all' | 'images' | 'documents' | 'audio'>('all')

  // Check URL params for OAuth callback status
  useEffect(() => {
    const provider = searchParams.get('provider')
    const status = searchParams.get('status')
    
    if (provider && status === 'connected') {
      setActiveProvider(provider as 'google' | 'dropbox')
      queryClient.invalidateQueries({ queryKey: ['cloudStatus'] })
    }
  }, [searchParams, queryClient])

  // Fetch connection status
  const { data: status, isLoading: statusLoading } = useQuery<CloudStatus>({
    queryKey: ['cloudStatus'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/cloud/status`)
      return res.json()
    },
  })

  // Fetch files from active provider
  const { data: filesData, isLoading: filesLoading, refetch: refetchFiles } = useQuery({
    queryKey: ['cloudFiles', activeProvider, currentFolder, filterType],
    queryFn: async () => {
      if (!activeProvider) return null
      
      const params = new URLSearchParams()
      if (currentFolder) params.set('folderId', currentFolder)
      if (filterType !== 'all') params.set('mimeType', filterType)
      
      const endpoint = activeProvider === 'google' 
        ? `${API_BASE}/cloud/google/files?${params}`
        : `${API_BASE}/cloud/dropbox/files?path=${currentFolder || ''}`
      
      const res = await fetch(endpoint)
      return res.json()
    },
    enabled: !!activeProvider && (
      (activeProvider === 'google' && status?.google.connected) ||
      (activeProvider === 'dropbox' && status?.dropbox.connected)
    ),
  })

  // Connect to provider
  const connectMutation = useMutation({
    mutationFn: async (provider: 'google' | 'dropbox') => {
      const res = await fetch(`${API_BASE}/cloud/${provider}/auth`)
      const data = await res.json()
      if (data.authUrl) {
        window.location.href = data.authUrl
      } else {
        throw new Error(data.error || 'Failed to get auth URL')
      }
    },
  })

  // Disconnect from provider
  const disconnectMutation = useMutation({
    mutationFn: async (provider: 'google' | 'dropbox') => {
      await fetch(`${API_BASE}/cloud/${provider}/disconnect`, { method: 'POST' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cloudStatus'] })
      setActiveProvider(null)
      setCurrentFolder(null)
      setFolderPath([])
    },
  })

  const handleFolderClick = (file: CloudFile) => {
    if (file.isFolder || file.mimeType === 'application/vnd.google-apps.folder') {
      setFolderPath(prev => [...prev, { id: file.id, name: file.name }])
      setCurrentFolder(file.id)
    }
  }

  const handleBackClick = () => {
    if (folderPath.length > 0) {
      const newPath = [...folderPath]
      newPath.pop()
      setFolderPath(newPath)
      setCurrentFolder(newPath.length > 0 ? newPath[newPath.length - 1].id : null)
    }
  }

  const toggleFileSelection = (fileId: string) => {
    const newSelected = new Set(selectedFiles)
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId)
    } else {
      newSelected.add(fileId)
    }
    setSelectedFiles(newSelected)
  }

  const [importProgress, setImportProgress] = useState<{ current: number; total: number; currentFile: string } | null>(null)

  // Import selected files
  const importMutation = useMutation({
    mutationFn: async () => {
      const selectedFilesArray = files.filter(f => selectedFiles.has(f.id))
      setImportProgress({ current: 0, total: selectedFilesArray.length, currentFile: '' })

      for (let i = 0; i < selectedFilesArray.length; i++) {
        const file = selectedFilesArray[i]
        setImportProgress({ current: i + 1, total: selectedFilesArray.length, currentFile: file.name })

        // Download file from cloud provider
        const downloadEndpoint = activeProvider === 'google'
          ? `${API_BASE}/cloud/google/download/${file.id}`
          : `${API_BASE}/cloud/dropbox/download?path=${encodeURIComponent(file.path || file.name)}`

        const downloadRes = await fetch(downloadEndpoint)
        if (!downloadRes.ok) {
          console.error(`Failed to download ${file.name}`)
          continue
        }

        const downloadData = await downloadRes.json()

        // Determine artifact type based on mime type
        let artifactType = 'document'
        if (file.mimeType?.includes('image')) artifactType = 'photo'
        else if (file.mimeType?.includes('audio')) artifactType = 'audio'
        else if (file.mimeType?.includes('video')) artifactType = 'video'

        // Create artifact and save file
        const importRes = await fetch(`${API_BASE}/cloud/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: activeProvider,
            fileId: file.id,
            fileName: file.name,
            mimeType: file.mimeType,
            content: downloadData.content, // base64 encoded
            artifactType,
          }),
        })

        if (!importRes.ok) {
          console.error(`Failed to import ${file.name}`)
        }
      }

      setImportProgress(null)
      return selectedFilesArray.length
    },
    onSuccess: (count) => {
      setSelectedFiles(new Set())
      queryClient.invalidateQueries({ queryKey: ['artifacts'] })
      alert(`Successfully imported ${count} file(s)! Ori is analyzing them now.`)
    },
    onError: (error) => {
      setImportProgress(null)
      console.error('Import error:', error)
      alert('Failed to import some files')
    },
  })

  const getFileIcon = (file: CloudFile) => {
    if (file.isFolder || file.mimeType?.includes('folder')) {
      return <FolderOpen className="w-5 h-5 text-amber-500" />
    }
    if (file.mimeType?.includes('image')) {
      return <Image className="w-5 h-5 text-blue-500" />
    }
    if (file.mimeType?.includes('audio')) {
      return <Music className="w-5 h-5 text-purple-500" />
    }
    return <FileText className="w-5 h-5 text-gray-500" />
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const files: CloudFile[] = filesData?.files || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cloud Storage Import</h1>
        <p className="text-muted-foreground">
          Connect to Google Drive or Dropbox to import photos, documents, and audio
        </p>
      </div>

      {/* Provider Selection */}
      {!activeProvider && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Google Drive */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="w-6 h-6" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                  <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                  <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                  <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                  <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                  <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                  <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                </svg>
                Google Drive
              </CardTitle>
              <CardDescription>
                {status?.google.configured 
                  ? (status.google.connected ? 'Connected' : 'Click to connect')
                  : 'Not configured - add credentials to .env'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statusLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : status?.google.connected ? (
                <div className="flex gap-2">
                  <Button onClick={() => setActiveProvider('google')}>
                    <FolderOpen className="w-4 h-4 mr-2" />
                    Browse Files
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => disconnectMutation.mutate('google')}
                  >
                    Disconnect
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={() => connectMutation.mutate('google')}
                  disabled={!status?.google.configured || connectMutation.isPending}
                >
                  {connectMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Cloud className="w-4 h-4 mr-2" />
                  )}
                  Connect Google Drive
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Dropbox */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="w-6 h-6" viewBox="0 0 43 40" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12.6 0L0 8.3l8.6 6.9 12.5-8.2zm17.8 0L17.9 7l12.5 8.2 8.6-6.9zM0 22.1l12.6 8.3 8.5-7-12.5-8.2zm30.4 1.3l-8.5 7 12.6 8.3 8.5-6.9zM21.1 24.4l-8.5 7-3.7-2.4v2.7l12.2 7.3 12.2-7.3v-2.7l-3.7 2.4z" fill="#0061ff"/>
                </svg>
                Dropbox
              </CardTitle>
              <CardDescription>
                {status?.dropbox.configured 
                  ? (status.dropbox.connected ? 'Connected' : 'Click to connect')
                  : 'Not configured - add credentials to .env'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statusLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : status?.dropbox.connected ? (
                <div className="flex gap-2">
                  <Button onClick={() => setActiveProvider('dropbox')}>
                    <FolderOpen className="w-4 h-4 mr-2" />
                    Browse Files
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => disconnectMutation.mutate('dropbox')}
                  >
                    Disconnect
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={() => connectMutation.mutate('dropbox')}
                  disabled={!status?.dropbox.configured || connectMutation.isPending}
                >
                  {connectMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Cloud className="w-4 h-4 mr-2" />
                  )}
                  Connect Dropbox
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* File Browser */}
      {activeProvider && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => {
                  setActiveProvider(null)
                  setCurrentFolder(null)
                  setFolderPath([])
                  setSelectedFiles(new Set())
                }}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <CardTitle className="capitalize">{activeProvider} Files</CardTitle>
              </div>
              
              <div className="flex gap-2">
                {['all', 'images', 'documents', 'audio'].map((type) => (
                  <Button
                    key={type}
                    variant={filterType === type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterType(type as typeof filterType)}
                  >
                    {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Breadcrumb */}
            {folderPath.length > 0 && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
                <button 
                  onClick={() => { setCurrentFolder(null); setFolderPath([]) }}
                  className="hover:text-foreground"
                >
                  Root
                </button>
                {folderPath.map((folder, i) => (
                  <span key={folder.id} className="flex items-center gap-1">
                    <ChevronRight className="w-4 h-4" />
                    <button
                      onClick={() => {
                        setFolderPath(folderPath.slice(0, i + 1))
                        setCurrentFolder(folder.id)
                      }}
                      className="hover:text-foreground"
                    >
                      {folder.name}
                    </button>
                  </span>
                ))}
              </div>
            )}
          </CardHeader>
          
          <CardContent>
            {filesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No files found in this folder
              </div>
            ) : (
              <>
                {/* File list */}
                <div className="divide-y">
                  {folderPath.length > 0 && (
                    <button
                      onClick={handleBackClick}
                      className="w-full flex items-center gap-3 py-3 px-2 hover:bg-muted/50 rounded transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                      <span className="text-muted-foreground">..</span>
                    </button>
                  )}
                  
                  {files.map((file) => {
                    const isFolder = file.isFolder || file.mimeType?.includes('folder')
                    const isSelected = selectedFiles.has(file.id)
                    
                    return (
                      <div
                        key={file.id}
                        className={`flex items-center gap-3 py-3 px-2 hover:bg-muted/50 rounded transition-colors cursor-pointer ${
                          isSelected ? 'bg-primary/10' : ''
                        }`}
                        onClick={() => isFolder ? handleFolderClick(file) : toggleFileSelection(file.id)}
                      >
                        {!isFolder && (
                          <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                            isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                          </div>
                        )}
                        
                        {file.thumbnailLink ? (
                          <img 
                            src={file.thumbnailLink} 
                            alt="" 
                            className="w-10 h-10 object-cover rounded"
                          />
                        ) : (
                          <div className="w-10 h-10 flex items-center justify-center">
                            {getFileIcon(file)}
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{file.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                            {file.modifiedTime && ` • ${new Date(file.modifiedTime).toLocaleDateString()}`}
                          </div>
                        </div>
                        
                        {isFolder && <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                      </div>
                    )
                  })}
                </div>

                {/* Selection actions */}
                {selectedFiles.size > 0 && (
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg flex items-center justify-between">
                    <span className="text-sm">
                      {selectedFiles.size} file{selectedFiles.size > 1 ? 's' : ''} selected
                    </span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setSelectedFiles(new Set())}>
                        <X className="w-4 h-4 mr-2" />
                        Clear
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => importMutation.mutate()}
                        disabled={importMutation.isPending}
                      >
                        {importMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            {importProgress ? `${importProgress.current}/${importProgress.total}` : 'Importing...'}
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4 mr-2" />
                            Import Selected
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Setup Instructions */}
      <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-sm">Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-4">
          <div>
            <h4 className="font-medium">Google Drive</h4>
            <ol className="list-decimal list-inside text-muted-foreground mt-1 space-y-1">
              <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener" className="text-blue-600 hover:underline">Google Cloud Console</a></li>
              <li>Create a project and enable the Google Drive API</li>
              <li>Create OAuth 2.0 credentials (Web application)</li>
              <li>Add <code className="bg-muted px-1 rounded">http://localhost:3001/api/cloud/google/callback</code> as authorized redirect URI</li>
              <li>Add to .env: <code className="bg-muted px-1 rounded">GOOGLE_DRIVE_CLIENT_ID</code> and <code className="bg-muted px-1 rounded">GOOGLE_DRIVE_CLIENT_SECRET</code></li>
            </ol>
          </div>
          
          <div>
            <h4 className="font-medium">Dropbox</h4>
            <ol className="list-decimal list-inside text-muted-foreground mt-1 space-y-1">
              <li>Go to <a href="https://www.dropbox.com/developers/apps" target="_blank" rel="noopener" className="text-blue-600 hover:underline">Dropbox App Console</a></li>
              <li>Create an app with "Full Dropbox" access</li>
              <li>Add <code className="bg-muted px-1 rounded">http://localhost:3001/api/cloud/dropbox/callback</code> as redirect URI</li>
              <li>Add to .env: <code className="bg-muted px-1 rounded">DROPBOX_APP_KEY</code> and <code className="bg-muted px-1 rounded">DROPBOX_APP_SECRET</code></li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
