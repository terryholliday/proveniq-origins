import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { 
  Upload,
  MessageSquare,
  ChevronRight,
  Loader2,
  Calendar,
  User,
  Bot,
  FileText,
  ExternalLink,
  ArrowRight,
  AlertCircle,
  ArrowLeft,
  CheckCircle2
} from 'lucide-react'
import { API_URL } from '@/lib/api'

const API_BASE = API_URL

interface ConversationPreview {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messageCount: number
  preview: Array<{ role: string; content: string }>
}

interface ParseResult {
  totalConversations: number
  conversations: ConversationPreview[]
}

interface ImportResult {
  success: boolean
  results: {
    conversationsImported: number
    artifactsCreated: number
    eventsCreated: number
  }
}

interface Instructions {
  title: string
  steps: Array<{ step: number; title: string; description: string }>
  notes: string[]
}

type ImportStep = 'instructions' | 'upload' | 'preview' | 'select' | 'options' | 'importing' | 'complete'

export default function ChatGptImport() {
  const [step, setStep] = useState<ImportStep>('instructions')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [selectedConversations, setSelectedConversations] = useState<Set<string>>(new Set())
  const [options, setOptions] = useState({
    createArtifacts: true,
    createEvents: true,
  })

  const { data: instructions } = useQuery<Instructions>({
    queryKey: ['chatgpt-instructions'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/chatgpt-import/instructions`)
      return res.json()
    },
  })

  const parseMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`${API_BASE}/chatgpt-import/parse`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) throw new Error('Failed to parse file')
      return res.json() as Promise<ParseResult>
    },
    onSuccess: (data) => {
      setParseResult(data)
      // Pre-select first 20 conversations
      const topConversations = data.conversations.slice(0, 20).map(c => c.id)
      setSelectedConversations(new Set(topConversations))
      setStep('preview')
    },
  })

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error('No file selected')
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('conversationIds', JSON.stringify(Array.from(selectedConversations)))
      formData.append('createArtifacts', String(options.createArtifacts))
      formData.append('createEvents', String(options.createEvents))
      
      const res = await fetch(`${API_BASE}/chatgpt-import/import`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) throw new Error('Failed to import')
      return res.json() as Promise<ImportResult>
    },
    onSuccess: (data) => {
      setImportResult(data)
      setStep('complete')
    },
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      parseMutation.mutate(file)
    }
  }

  const handleImport = () => {
    setStep('importing')
    importMutation.mutate()
  }

  const resetImport = () => {
    setStep('instructions')
    setSelectedFile(null)
    setParseResult(null)
    setImportResult(null)
    setSelectedConversations(new Set())
    parseMutation.reset()
    importMutation.reset()
  }

  const toggleConversation = (id: string) => {
    const newSet = new Set(selectedConversations)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedConversations(newSet)
  }

  const selectAll = () => {
    if (parseResult) {
      setSelectedConversations(new Set(parseResult.conversations.map(c => c.id)))
    }
  }

  const selectNone = () => {
    setSelectedConversations(new Set())
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Bot className="w-8 h-8 text-emerald-500" />
        <div>
          <h1 className="text-2xl font-bold">Import ChatGPT Conversations</h1>
          <p className="text-muted-foreground">
            Bring your AI conversations into your memoir
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 text-sm">
        {['Instructions', 'Upload', 'Preview', 'Import'].map((label, i) => {
          const stepIndex = ['instructions', 'upload', 'preview', 'select', 'options', 'importing', 'complete'].indexOf(step)
          const isActive = i <= Math.min(stepIndex, 3)
          const isCurrent = (i === 0 && step === 'instructions') ||
                           (i === 1 && step === 'upload') ||
                           (i === 2 && (step === 'preview' || step === 'select' || step === 'options')) ||
                           (i === 3 && (step === 'importing' || step === 'complete'))
          
          return (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
                ${isActive ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'}
                ${isCurrent ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}`}>
                {i + 1}
              </div>
              <span className={isActive ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
              {i < 3 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </div>
          )
        })}
      </div>

      {/* Instructions Step */}
      {step === 'instructions' && instructions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {instructions.title}
            </CardTitle>
            <CardDescription>
              Follow these steps to export your ChatGPT data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              {instructions.steps.map((s) => (
                <div key={s.step} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center flex-shrink-0">
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">{s.step}</span>
                  </div>
                  <div>
                    <h4 className="font-medium">{s.title}</h4>
                    <p className="text-sm text-muted-foreground">{s.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="font-medium text-sm">Notes:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                {instructions.notes.map((note, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-500">•</span>
                    {note}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-3">
              <Button asChild variant="outline">
                <a href="https://chat.openai.com" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open ChatGPT
                </a>
              </Button>
              <Button onClick={() => setStep('upload')}>
                I have my export ready
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Step */}
      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload conversations.json
            </CardTitle>
            <CardDescription>
              Select the conversations.json file from your ChatGPT export
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
                id="chatgpt-file"
              />
              <label htmlFor="chatgpt-file" className="cursor-pointer">
                <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Click to select conversations.json</p>
                <p className="text-sm text-muted-foreground mt-1">
                  or drag and drop the file here
                </p>
              </label>
            </div>

            {parseMutation.isPending && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Parsing your conversations...
              </div>
            )}

            {parseMutation.isError && (
              <div className="flex items-center gap-2 text-red-500">
                <AlertCircle className="w-4 h-4" />
                Failed to parse file. Make sure it's a valid ChatGPT export.
              </div>
            )}

            <Button variant="outline" onClick={() => setStep('instructions')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to instructions
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Preview Step */}
      {(step === 'preview' || step === 'select' || step === 'options') && parseResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Select Conversations to Import
            </CardTitle>
            <CardDescription>
              Found {parseResult.totalConversations} conversations. Select which ones to import.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {selectedConversations.size} of {parseResult.totalConversations} selected
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={selectNone}>
                  Select None
                </Button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2 border rounded-lg p-2">
              {parseResult.conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors
                    ${selectedConversations.has(conv.id) 
                      ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800' 
                      : 'hover:bg-muted/50'}`}
                  onClick={() => toggleConversation(conv.id)}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedConversations.has(conv.id)}
                      onCheckedChange={() => toggleConversation(conv.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium truncate">{conv.title}</h4>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {conv.messageCount}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(conv.createdAt).toLocaleDateString()}
                      </div>
                      {conv.preview.length > 0 && (
                        <div className="mt-2 text-sm text-muted-foreground space-y-1">
                          {conv.preview.slice(0, 2).map((msg, i) => (
                            <div key={i} className="flex items-start gap-2">
                              {msg.role === 'user' ? (
                                <User className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              ) : (
                                <Bot className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              )}
                              <span className="truncate">{msg.content}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Import Options */}
            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="font-medium">Import Options</h4>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={options.createArtifacts}
                    onCheckedChange={(checked) => 
                      setOptions(prev => ({ ...prev, createArtifacts: checked === true }))
                    }
                  />
                  <span>Create artifacts (full conversation transcripts)</span>
                </Label>
                <Label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={options.createEvents}
                    onCheckedChange={(checked) => 
                      setOptions(prev => ({ ...prev, createEvents: checked === true }))
                    }
                  />
                  <span>Create events (searchable timeline entries)</span>
                </Label>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('upload')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button 
                onClick={handleImport}
                disabled={selectedConversations.size === 0}
              >
                Import {selectedConversations.size} Conversations
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Importing Step */}
      {step === 'importing' && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <Loader2 className="w-12 h-12 mx-auto animate-spin text-emerald-500" />
              <h3 className="text-lg font-medium">Importing your conversations...</h3>
              <p className="text-muted-foreground">
                This may take a moment for large exports
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Complete Step */}
      {step === 'complete' && importResult && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500" />
              <h3 className="text-lg font-medium">Import Complete!</h3>
              <div className="text-muted-foreground space-y-1">
                <p>{importResult.results.conversationsImported} conversations imported</p>
                <p>{importResult.results.artifactsCreated} artifacts created</p>
                <p>{importResult.results.eventsCreated} events created</p>
              </div>
              <div className="flex justify-center gap-3 pt-4">
                <Button variant="outline" onClick={resetImport}>
                  Import More
                </Button>
                <Button asChild>
                  <a href="/events">View Events</a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
