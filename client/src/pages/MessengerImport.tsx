import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { messengerImportApi, MessengerParseResult, MessengerImportResult } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { 
  Upload, 
  MessageCircle, 
  Users, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  ChevronRight,
  Image,
  Video,
  Music,
  Smile
} from 'lucide-react'

type ImportStep = 'instructions' | 'upload' | 'preview' | 'options' | 'importing' | 'complete'

export default function MessengerImport() {
  const [step, setStep] = useState<ImportStep>('instructions')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [parseResult, setParseResult] = useState<MessengerParseResult | null>(null)
  const [importResult, setImportResult] = useState<MessengerImportResult | null>(null)
  const [options, setOptions] = useState({
    createPeople: true,
    createArtifact: true,
    groupByDay: true,
  })

  const { data: instructions } = useQuery({
    queryKey: ['messenger-instructions'],
    queryFn: messengerImportApi.getInstructions,
  })

  const parseMutation = useMutation({
    mutationFn: (file: File) => messengerImportApi.parse(file),
    onSuccess: (data) => {
      setParseResult(data)
      setStep('preview')
    },
  })

  const importMutation = useMutation({
    mutationFn: () => {
      if (!selectedFile) throw new Error('No file selected')
      return messengerImportApi.import(selectedFile, options)
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
    parseMutation.reset()
    importMutation.reset()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'photo': return <Image className="h-3 w-3" />
      case 'video': return <Video className="h-3 w-3" />
      case 'audio': return <Music className="h-3 w-3" />
      case 'gif': return <Smile className="h-3 w-3" />
      default: return <FileText className="h-3 w-3" />
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Import Messenger</h1>
        <p className="text-muted-foreground">
          Import your Facebook Messenger conversations into Origins
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 text-sm">
        {['Instructions', 'Upload', 'Preview', 'Options', 'Import'].map((label, i) => {
          const stepMap: ImportStep[] = ['instructions', 'upload', 'preview', 'options', 'importing']
          const isActive = stepMap.indexOf(step) >= i || step === 'complete'
          const isCurrent = stepMap[i] === step || (step === 'complete' && i === 4)
          return (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              <span className={`${isCurrent ? 'font-semibold text-primary' : isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Instructions Step */}
      {step === 'instructions' && instructions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              {instructions.title}
            </CardTitle>
            <CardDescription>
              Follow these steps to export your Messenger data from Facebook
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ol className="space-y-4">
              {instructions.steps.map((s) => (
                <li key={s.step} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                    {s.step}
                  </span>
                  <div>
                    <div className="font-medium">{s.title}</div>
                    <div className="text-sm text-muted-foreground">{s.description}</div>
                  </div>
                </li>
              ))}
            </ol>

            <div className="rounded-lg bg-muted p-4">
              <div className="font-medium mb-2">Important Notes</div>
              <ul className="text-sm text-muted-foreground space-y-1">
                {instructions.notes.map((note, i) => (
                  <li key={i}>• {note}</li>
                ))}
              </ul>
            </div>

            <Button onClick={() => setStep('upload')} className="w-full">
              I Have My Export Ready
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Upload Step */}
      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Messenger JSON
            </CardTitle>
            <CardDescription>
              Select the message_1.json file from your Facebook export
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              {parseMutation.isPending ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                  <div className="text-muted-foreground">Parsing conversation...</div>
                </div>
              ) : parseMutation.isError ? (
                <div className="flex flex-col items-center gap-4">
                  <AlertCircle className="h-12 w-12 text-destructive" />
                  <div className="text-destructive">Failed to parse file</div>
                  <div className="text-sm text-muted-foreground">
                    Make sure you selected a valid message_*.json file from your Facebook export
                  </div>
                  <Button variant="outline" onClick={() => parseMutation.reset()}>
                    Try Again
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <div className="text-lg font-medium mb-2">Drop your file here</div>
                  <div className="text-sm text-muted-foreground mb-4">
                    or click to browse for message_1.json
                  </div>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="messenger-file"
                  />
                  <Label htmlFor="messenger-file">
                    <Button variant="outline" asChild>
                      <span>Select File</span>
                    </Button>
                  </Label>
                </>
              )}
            </div>

            <div className="mt-4">
              <Button variant="ghost" onClick={() => setStep('instructions')}>
                Back to Instructions
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview Step */}
      {step === 'preview' && parseResult && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                {parseResult.title}
              </CardTitle>
              <CardDescription>
                Preview of your conversation before import
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3 mb-6">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <div className="text-2xl font-bold">{parseResult.participants.length}</div>
                    <div className="text-sm text-muted-foreground">Participants</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MessageCircle className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <div className="text-2xl font-bold">{parseResult.messageCount.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Messages</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Date Range</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(parseResult.dateRange.earliest)} — {formatDate(parseResult.dateRange.latest)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-sm font-medium mb-2">Participants</div>
                <div className="flex flex-wrap gap-2">
                  {parseResult.participants.map((p) => (
                    <span key={p} className="px-2 py-1 bg-muted rounded text-sm">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Message Preview</CardTitle>
              <CardDescription>First 50 messages from this conversation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto space-y-3">
                {parseResult.preview.map((msg, i) => (
                  <div key={i} className="border-b pb-3 last:border-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{msg.sender}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(msg.timestamp).toLocaleString()}
                      </span>
                      {msg.hasMedia && (
                        <div className="flex gap-1">
                          {msg.mediaTypes.map((type) => (
                            <span key={type} className="text-muted-foreground">
                              {getMediaIcon(type)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-sm">{msg.content || <span className="text-muted-foreground italic">[No text content]</span>}</div>
                    {msg.reactions.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {msg.reactions.map((r, ri) => (
                          <span key={ri} className="text-xs" title={r.actor}>
                            {r.reaction}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button variant="outline" onClick={() => setStep('upload')}>
              Choose Different File
            </Button>
            <Button onClick={() => setStep('options')} className="flex-1">
              Continue to Import Options
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Options Step */}
      {step === 'options' && parseResult && (
        <Card>
          <CardHeader>
            <CardTitle>Import Options</CardTitle>
            <CardDescription>
              Configure how the conversation should be imported into Origins
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="createPeople"
                  checked={options.createPeople}
                  onCheckedChange={(checked) => setOptions({ ...options, createPeople: !!checked })}
                />
                <div className="space-y-1">
                  <Label htmlFor="createPeople" className="font-medium">
                    Create People Records
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Create Person entries for each participant ({parseResult.participants.length} people)
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="createArtifact"
                  checked={options.createArtifact}
                  onCheckedChange={(checked) => setOptions({ ...options, createArtifact: !!checked })}
                />
                <div className="space-y-1">
                  <Label htmlFor="createArtifact" className="font-medium">
                    Create Conversation Artifact
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Store the full conversation transcript as a searchable document artifact
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="groupByDay"
                  checked={options.groupByDay}
                  onCheckedChange={(checked) => setOptions({ ...options, groupByDay: !!checked })}
                />
                <div className="space-y-1">
                  <Label htmlFor="groupByDay" className="font-medium">
                    Create Events by Day
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {options.groupByDay 
                      ? 'Create separate events for each day with messages (recommended for long conversations)'
                      : 'Create a single event for the entire conversation'}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-muted p-4">
              <div className="font-medium mb-2">Import Summary</div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Conversation: <strong>{parseResult.title}</strong></li>
                <li>• Messages: <strong>{parseResult.messageCount.toLocaleString()}</strong></li>
                {options.createPeople && <li>• Will create up to {parseResult.participants.length} Person records</li>}
                {options.createArtifact && <li>• Will create 1 document artifact with full transcript</li>}
                {options.groupByDay && <li>• Will create events grouped by day</li>}
              </ul>
            </div>

            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setStep('preview')}>
                Back to Preview
              </Button>
              <Button onClick={handleImport} className="flex-1">
                Start Import
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Importing Step */}
      {step === 'importing' && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <div className="text-xl font-medium">Importing Conversation...</div>
              <div className="text-muted-foreground">
                This may take a moment for large conversations
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Complete Step */}
      {step === 'complete' && importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-6 w-6" />
              Import Complete!
            </CardTitle>
            <CardDescription>
              Your Messenger conversation has been imported into Origins
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg bg-muted p-4 text-center">
                <div className="text-3xl font-bold">{importResult.results.peopleCreated}</div>
                <div className="text-sm text-muted-foreground">People Created</div>
              </div>
              <div className="rounded-lg bg-muted p-4 text-center">
                <div className="text-3xl font-bold">{importResult.results.artifactsCreated}</div>
                <div className="text-sm text-muted-foreground">Artifacts Created</div>
              </div>
              <div className="rounded-lg bg-muted p-4 text-center">
                <div className="text-3xl font-bold">{importResult.results.eventsCreated}</div>
                <div className="text-sm text-muted-foreground">Events Created</div>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="font-medium mb-2">{importResult.conversation}</div>
              <div className="text-sm text-muted-foreground">
                {importResult.messageCount.toLocaleString()} messages from{' '}
                {formatDate(importResult.dateRange.earliest)} to {formatDate(importResult.dateRange.latest)}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Participants: {importResult.participants.join(', ')}
              </div>
            </div>

            <div className="flex gap-4">
              <Button variant="outline" onClick={resetImport}>
                Import Another Conversation
              </Button>
              <Button asChild className="flex-1">
                <a href="/events">View Events</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {importMutation.isError && (
        <Card className="border-destructive">
          <CardContent className="py-6">
            <div className="flex items-center gap-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <div>
                <div className="font-medium text-destructive">Import Failed</div>
                <div className="text-sm text-muted-foreground">
                  There was an error importing your conversation. Please try again.
                </div>
              </div>
            </div>
            <Button variant="outline" onClick={resetImport} className="mt-4">
              Start Over
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
