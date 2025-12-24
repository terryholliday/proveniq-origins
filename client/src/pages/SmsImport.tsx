import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { smsImportApi, SmsParseResult, SmsImportResult, SmsConversationPreview } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { 
  Upload, 
  MessageSquare, 
  Users, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  ChevronRight,
  Phone,
  ArrowRight,
  ArrowLeft,
  Smartphone,
  ExternalLink
} from 'lucide-react'

type ImportStep = 'instructions' | 'upload' | 'preview' | 'select' | 'options' | 'importing' | 'complete'

export default function SmsImport() {
  const [step, setStep] = useState<ImportStep>('instructions')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [parseResult, setParseResult] = useState<SmsParseResult | null>(null)
  const [importResult, setImportResult] = useState<SmsImportResult | null>(null)
  const [selectedConversations, setSelectedConversations] = useState<Set<string>>(new Set())
  const [options, setOptions] = useState({
    createPeople: true,
    createArtifact: true,
    groupByDay: true,
  })

  const { data: instructions } = useQuery({
    queryKey: ['sms-instructions'],
    queryFn: smsImportApi.getInstructions,
  })

  const parseMutation = useMutation({
    mutationFn: (file: File) => smsImportApi.parse(file),
    onSuccess: (data) => {
      setParseResult(data)
      // Pre-select top 10 conversations by message count
      const topConversations = data.conversations.slice(0, 10).map(c => c.phoneNumber)
      setSelectedConversations(new Set(topConversations))
      setStep('preview')
    },
  })

  const importMutation = useMutation({
    mutationFn: () => {
      if (!selectedFile) throw new Error('No file selected')
      return smsImportApi.import(selectedFile, {
        ...options,
        selectedConversations: Array.from(selectedConversations),
      })
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

  const toggleConversation = (phoneNumber: string) => {
    const newSet = new Set(selectedConversations)
    if (newSet.has(phoneNumber)) {
      newSet.delete(phoneNumber)
    } else {
      newSet.add(phoneNumber)
    }
    setSelectedConversations(newSet)
  }

  const selectAllConversations = () => {
    if (parseResult) {
      setSelectedConversations(new Set(parseResult.conversations.map(c => c.phoneNumber)))
    }
  }

  const deselectAllConversations = () => {
    setSelectedConversations(new Set())
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'sent': return <ArrowRight className="h-3 w-3 text-blue-500" />
      case 'received': return <ArrowLeft className="h-3 w-3 text-green-500" />
      default: return <FileText className="h-3 w-3 text-muted-foreground" />
    }
  }

  const selectedMessageCount = parseResult?.conversations
    .filter(c => selectedConversations.has(c.phoneNumber))
    .reduce((sum, c) => sum + c.messageCount, 0) ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Import SMS Messages</h1>
        <p className="text-muted-foreground">
          Import your Android text message history into Origins
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 text-sm flex-wrap">
        {['Instructions', 'Upload', 'Preview', 'Select', 'Options', 'Import'].map((label, i) => {
          const stepMap: ImportStep[] = ['instructions', 'upload', 'preview', 'select', 'options', 'importing']
          const isActive = stepMap.indexOf(step) >= i || step === 'complete'
          const isCurrent = stepMap[i] === step || (step === 'complete' && i === 5)
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
              <Smartphone className="h-5 w-5" />
              {instructions.title}
            </CardTitle>
            <CardDescription>
              Follow these steps to export your text messages from your Android phone
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
                    {s.link && (
                      <a 
                        href={s.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline inline-flex items-center gap-1 mt-1"
                      >
                        Open in Play Store <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
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

            {instructions.alternativeApps.length > 0 && (
              <div className="rounded-lg bg-muted/50 p-4">
                <div className="font-medium mb-2">Alternative Apps</div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {instructions.alternativeApps.map((app, i) => (
                    <li key={i}>• <strong>{app.name}</strong>: {app.note}</li>
                  ))}
                </ul>
              </div>
            )}

            <Button onClick={() => setStep('upload')} className="w-full">
              I Have My Backup Ready
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
              Upload SMS Backup
            </CardTitle>
            <CardDescription>
              Select the .xml file from your SMS Backup & Restore export
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              {parseMutation.isPending ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                  <div className="text-muted-foreground">Parsing SMS backup...</div>
                  <div className="text-sm text-muted-foreground">This may take a moment for large backups</div>
                </div>
              ) : parseMutation.isError ? (
                <div className="flex flex-col items-center gap-4">
                  <AlertCircle className="h-12 w-12 text-destructive" />
                  <div className="text-destructive">Failed to parse file</div>
                  <div className="text-sm text-muted-foreground">
                    Make sure you selected a valid SMS backup XML file
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
                    or click to browse for sms-*.xml
                  </div>
                  <input
                    type="file"
                    accept=".xml"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="sms-file"
                  />
                  <Label htmlFor="sms-file">
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
                <MessageSquare className="h-5 w-5" />
                SMS Backup Overview
              </CardTitle>
              <CardDescription>
                Summary of your text message backup
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3 mb-6">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <div className="text-2xl font-bold">{parseResult.totalMessages.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Total Messages</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <div className="text-2xl font-bold">{parseResult.conversationCount}</div>
                    <div className="text-sm text-muted-foreground">Conversations</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">Backup Date</div>
                    <div className="text-sm text-muted-foreground">
                      {parseResult.backupDate ? formatDate(parseResult.backupDate) : 'Unknown'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                Top conversations by message count are shown below. You'll select which ones to import in the next step.
              </div>
            </CardContent>
          </Card>

          {/* Top Conversations Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Top Conversations</CardTitle>
              <CardDescription>Your most active text message threads</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {parseResult.conversations.slice(0, 10).map((conv) => (
                  <ConversationPreviewCard key={conv.phoneNumber} conversation={conv} />
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button variant="outline" onClick={() => setStep('upload')}>
              Choose Different File
            </Button>
            <Button onClick={() => setStep('select')} className="flex-1">
              Select Conversations to Import
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Select Conversations Step */}
      {step === 'select' && parseResult && (
        <Card>
          <CardHeader>
            <CardTitle>Select Conversations</CardTitle>
            <CardDescription>
              Choose which conversations to import ({selectedConversations.size} selected, {selectedMessageCount.toLocaleString()} messages)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAllConversations}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAllConversations}>
                Deselect All
              </Button>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {parseResult.conversations.map((conv) => (
                <div 
                  key={conv.phoneNumber}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedConversations.has(conv.phoneNumber) 
                      ? 'bg-primary/5 border-primary' 
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => toggleConversation(conv.phoneNumber)}
                >
                  <Checkbox 
                    checked={selectedConversations.has(conv.phoneNumber)}
                    onCheckedChange={() => toggleConversation(conv.phoneNumber)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{conv.contactName}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Phone className="h-3 w-3" />
                      {conv.phoneNumber}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-medium">{conv.messageCount.toLocaleString()}</div>
                    <div className="text-muted-foreground">messages</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-4 pt-4">
              <Button variant="outline" onClick={() => setStep('preview')}>
                Back to Preview
              </Button>
              <Button 
                onClick={() => setStep('options')} 
                className="flex-1"
                disabled={selectedConversations.size === 0}
              >
                Continue to Options ({selectedConversations.size} selected)
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Options Step */}
      {step === 'options' && parseResult && (
        <Card>
          <CardHeader>
            <CardTitle>Import Options</CardTitle>
            <CardDescription>
              Configure how the conversations should be imported into Origins
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
                    Create Person entries for each contact ({selectedConversations.size} people)
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
                    Create Conversation Artifacts
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Store each conversation transcript as a searchable document artifact
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
                      ? 'Create separate events for each day with messages (recommended)'
                      : 'Create a single event per conversation'}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-muted p-4">
              <div className="font-medium mb-2">Import Summary</div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Conversations: <strong>{selectedConversations.size}</strong></li>
                <li>• Messages: <strong>{selectedMessageCount.toLocaleString()}</strong></li>
                {options.createPeople && <li>• Will create up to {selectedConversations.size} Person records</li>}
                {options.createArtifact && <li>• Will create {selectedConversations.size} document artifacts</li>}
                {options.groupByDay && <li>• Will create events grouped by day</li>}
              </ul>
            </div>

            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setStep('select')}>
                Back to Selection
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
              <div className="text-xl font-medium">Importing Messages...</div>
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
              Your SMS conversations have been imported into Origins
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-lg bg-muted p-4 text-center">
                <div className="text-3xl font-bold">{importResult.results.conversationsImported}</div>
                <div className="text-sm text-muted-foreground">Conversations</div>
              </div>
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
              <div className="font-medium mb-2">Import Summary</div>
              <div className="text-sm text-muted-foreground">
                Successfully imported {importResult.totalMessages.toLocaleString()} messages from {importResult.results.conversationsImported} conversations
              </div>
            </div>

            <div className="flex gap-4">
              <Button variant="outline" onClick={resetImport}>
                Import More Messages
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
                  There was an error importing your messages. Please try again.
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

function ConversationPreviewCard({ conversation }: { conversation: SmsConversationPreview }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border rounded-lg p-4">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div>
          <div className="font-medium">{conversation.contactName}</div>
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Phone className="h-3 w-3" />
            {conversation.phoneNumber}
          </div>
        </div>
        <div className="text-right">
          <div className="font-medium">{conversation.messageCount.toLocaleString()} messages</div>
          <div className="text-xs text-muted-foreground">
            {new Date(conversation.dateRange.earliest).toLocaleDateString()} - {new Date(conversation.dateRange.latest).toLocaleDateString()}
          </div>
        </div>
      </div>

      {expanded && conversation.preview.length > 0 && (
        <div className="mt-4 pt-4 border-t space-y-2 max-h-48 overflow-y-auto">
          {conversation.preview.map((msg, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <span className="mt-1">
                {msg.direction === 'sent' ? (
                  <ArrowRight className="h-3 w-3 text-blue-500" />
                ) : (
                  <ArrowLeft className="h-3 w-3 text-green-500" />
                )}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-muted-foreground text-xs">
                  {new Date(msg.timestamp).toLocaleString()}
                </span>
                <div className="truncate">{msg.content || <span className="italic text-muted-foreground">[No content]</span>}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
