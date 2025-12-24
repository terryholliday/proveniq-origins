import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { chaptersApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  BookOpen, 
  Heart, 
  Loader2, 
  Download, 
  Sparkles,
  CheckCircle2,
  ChevronRight,
  Printer
} from 'lucide-react'

const API_BASE = 'http://localhost:3001/api'

interface NarrativeChapter {
  number: number
  title: string
  narrative: string
  events: Array<{
    id: string
    title: string
    date: string | null
    summary: string | null
  }>
}

interface MemoirResult {
  authorName: string
  style: string
  generatedAt: string
  chapters: NarrativeChapter[]
  totalEvents: number
}

interface LegacyLetterResult {
  recipientName: string
  generatedAt: string
  letter: string
  keystoneEventsUsed: number
  peopleReferenced: number
}

interface StyleOption {
  id: string
  name: string
  description: string
}

export default function MemoirExport() {
  const [step, setStep] = useState<'choose' | 'configure' | 'generating' | 'preview' | 'letter-config' | 'letter-preview'>('choose')
  const [authorName, setAuthorName] = useState('')
  const [memoirTitle, setMemoirTitle] = useState('My Memoir')
  const [selectedStyle, setSelectedStyle] = useState('reflective')
  const [selectedChapters, setSelectedChapters] = useState<string[]>([])
  const [memoirResult, setMemoirResult] = useState<MemoirResult | null>(null)
  const [letterResult, setLetterResult] = useState<LegacyLetterResult | null>(null)
  const [recipientName, setRecipientName] = useState('')
  const [letterThemes, setLetterThemes] = useState('')

  const { data: chapters } = useQuery({
    queryKey: ['chapters'],
    queryFn: chaptersApi.getAll,
  })

  const { data: styles } = useQuery({
    queryKey: ['memoir-styles'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/memoir/styles`)
      return res.json() as Promise<StyleOption[]>
    },
  })

  const { data: stats } = useQuery({
    queryKey: ['export-stats'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/export/stats`)
      return res.json()
    },
  })

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/memoir/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterIds: selectedChapters.length > 0 ? selectedChapters : undefined,
          style: selectedStyle,
          includeAllEvents: true,
          authorName: authorName || 'Anonymous',
        }),
      })
      if (!res.ok) throw new Error('Generation failed')
      return res.json() as Promise<MemoirResult>
    },
    onSuccess: (data) => {
      setMemoirResult(data)
      setStep('preview')
    },
  })

  const letterMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/memoir/legacy-letter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientName: recipientName || 'my loved ones',
          themes: letterThemes.split(',').map(t => t.trim()).filter(Boolean),
        }),
      })
      if (!res.ok) throw new Error('Generation failed')
      return res.json() as Promise<LegacyLetterResult>
    },
    onSuccess: (data) => {
      setLetterResult(data)
      setStep('letter-preview')
    },
  })

  const downloadHTML = async () => {
    if (!memoirResult) return
    
    const res = await fetch(`${API_BASE}/memoir/html`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chapters: memoirResult.chapters,
        authorName: memoirResult.authorName,
        title: memoirTitle,
      }),
    })
    
    const html = await res.text()
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${memoirTitle.replace(/\s+/g, '-').toLowerCase()}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  const printMemoir = async () => {
    if (!memoirResult) return
    
    const res = await fetch(`${API_BASE}/memoir/html`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chapters: memoirResult.chapters,
        authorName: memoirResult.authorName,
        title: memoirTitle,
      }),
    })
    
    const html = await res.text()
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.print()
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Export Your Memoir</h1>
        <p className="text-muted-foreground">
          Transform your memories into a lasting legacy document
        </p>
      </div>

      {/* Stats overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{stats.events}</div>
              <div className="text-sm text-muted-foreground">Events</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{stats.chapters}</div>
              <div className="text-sm text-muted-foreground">Chapters</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{stats.persons}</div>
              <div className="text-sm text-muted-foreground">People</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{stats.keystoneEvents}</div>
              <div className="text-sm text-muted-foreground">Keystone Moments</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step: Choose export type */}
      {step === 'choose' && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card 
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => setStep('configure')}
          >
            <CardHeader>
              <BookOpen className="w-10 h-10 text-primary mb-2" />
              <CardTitle>Full Memoir</CardTitle>
              <CardDescription>
                AI-woven narrative that transforms your events into flowing prose, 
                organized by chapters. Export as a print-ready document.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-primary">
                Start creating <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => setStep('letter-config')}
          >
            <CardHeader>
              <Heart className="w-10 h-10 text-rose-500 mb-2" />
              <CardTitle>Legacy Letter</CardTitle>
              <CardDescription>
                A heartfelt letter distilling your life's wisdom for loved ones. 
                Perfect for passing down lessons to children or grandchildren.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-rose-500">
                Create letter <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step: Configure memoir */}
      {step === 'configure' && (
        <Card>
          <CardHeader>
            <CardTitle>Configure Your Memoir</CardTitle>
            <CardDescription>
              Customize how your story will be told
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-2">Author Name</label>
                <Input
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-2">Memoir Title</label>
                <Input
                  value={memoirTitle}
                  onChange={(e) => setMemoirTitle(e.target.value)}
                  placeholder="My Memoir"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">Writing Style</label>
              <Select value={selectedStyle} onValueChange={setSelectedStyle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {styles?.map((style) => (
                    <SelectItem key={style.id} value={style.id}>
                      <div>
                        <div className="font-medium">{style.name}</div>
                        <div className="text-xs text-muted-foreground">{style.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">
                Chapters to Include
                <span className="text-muted-foreground font-normal ml-2">
                  (leave empty for all)
                </span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {chapters?.map((ch) => (
                  <label
                    key={ch.id}
                    className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedChapters.includes(ch.id)
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedChapters.includes(ch.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedChapters([...selectedChapters, ch.id])
                        } else {
                          setSelectedChapters(selectedChapters.filter(id => id !== ch.id))
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">
                      Ch. {ch.number}: {ch.title}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('choose')}>
                Back
              </Button>
              <Button 
                onClick={() => {
                  setStep('generating')
                  generateMutation.mutate()
                }}
                disabled={generateMutation.isPending}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Memoir
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Generating */}
      {step === 'generating' && (
        <Card>
          <CardContent className="py-16 text-center">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary mb-4" />
            <h3 className="text-lg font-medium mb-2">Weaving Your Story...</h3>
            <p className="text-muted-foreground">
              AI is transforming your memories into flowing narrative prose.
              This may take a minute.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Step: Preview memoir */}
      {step === 'preview' && memoirResult && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    Memoir Generated
                  </CardTitle>
                  <CardDescription>
                    {memoirResult.chapters.length} chapters • {memoirResult.totalEvents} events • {memoirResult.style} style
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={downloadHTML}>
                    <Download className="w-4 h-4 mr-2" />
                    Download HTML
                  </Button>
                  <Button onClick={printMemoir}>
                    <Printer className="w-4 h-4 mr-2" />
                    Print
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Chapter previews */}
          {memoirResult.chapters.map((chapter) => (
            <Card key={chapter.number}>
              <CardHeader>
                <CardTitle className="text-lg">
                  Chapter {chapter.number}: {chapter.title}
                </CardTitle>
                <CardDescription>
                  {chapter.events.length} events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose prose-stone dark:prose-invert max-w-none">
                  {chapter.narrative.split('\n\n').slice(0, 3).map((p, i) => (
                    <p key={i} className="text-sm leading-relaxed">{p}</p>
                  ))}
                  {chapter.narrative.split('\n\n').length > 3 && (
                    <p className="text-sm text-muted-foreground italic">
                      ... and more
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep('configure')}>
              Regenerate
            </Button>
            <Button variant="outline" onClick={() => setStep('choose')}>
              Start Over
            </Button>
          </div>
        </div>
      )}

      {/* Step: Configure legacy letter */}
      {step === 'letter-config' && (
        <Card>
          <CardHeader>
            <CardTitle>Create Your Legacy Letter</CardTitle>
            <CardDescription>
              A heartfelt message distilling your life's wisdom
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="text-sm font-medium block mb-2">Who is this letter for?</label>
              <Input
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="e.g., my grandchildren, my daughter Sarah, future generations"
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">
                Themes to address
                <span className="text-muted-foreground font-normal ml-2">(optional, comma-separated)</span>
              </label>
              <Textarea
                value={letterThemes}
                onChange={(e) => setLetterThemes(e.target.value)}
                placeholder="e.g., resilience, family, love, faith, hard work, forgiveness"
                className="min-h-[80px]"
              />
            </div>

            <div className="bg-muted/50 rounded-lg p-4 text-sm">
              <p className="font-medium mb-1">What will be included:</p>
              <ul className="text-muted-foreground space-y-1">
                <li>• Wisdom from your {stats?.keystoneEvents || 0} keystone life moments</li>
                <li>• Acknowledgment of important relationships</li>
                <li>• Life lessons learned along the way</li>
                <li>• Hopes and wishes for the recipient</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('choose')}>
                Back
              </Button>
              <Button 
                onClick={() => {
                  setStep('generating')
                  letterMutation.mutate()
                }}
                disabled={letterMutation.isPending}
              >
                <Heart className="w-4 h-4 mr-2" />
                Generate Letter
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Preview legacy letter */}
      {step === 'letter-preview' && letterResult && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    Legacy Letter Generated
                  </CardTitle>
                  <CardDescription>
                    For {letterResult.recipientName} • Based on {letterResult.keystoneEventsUsed} keystone moments
                  </CardDescription>
                </div>
                <Button 
                  variant="outline"
                  onClick={() => {
                    const blob = new Blob([letterResult.letter], { type: 'text/plain' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = 'legacy-letter.txt'
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
                <div className="prose prose-stone dark:prose-invert max-w-none">
                  {letterResult.letter.split('\n\n').map((p, i) => (
                    <p key={i} className="leading-relaxed">{p}</p>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep('letter-config')}>
              Regenerate
            </Button>
            <Button variant="outline" onClick={() => setStep('choose')}>
              Start Over
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
