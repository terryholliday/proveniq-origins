import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { eventsApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  Upload, 
  Image as ImageIcon, 
  Loader2, 
  Sparkles,
  ArrowRight,
  Check,
  X
} from 'lucide-react'

const API_BASE = 'http://localhost:3001/api'

interface UploadedPhoto {
  artifactId: string
  filename: string
  path: string
}

export default function PhotoMemory() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [step, setStep] = useState<'upload' | 'describe' | 'details' | 'saving' | 'done'>('upload')
  const [uploadedPhoto, setUploadedPhoto] = useState<UploadedPhoto | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [description, setDescription] = useState('')
  const [eventData, setEventData] = useState({
    title: '',
    date: '',
    location: '',
    people: '',
    emotions: '',
  })
  const [createdEventId, setCreatedEventId] = useState<string | null>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    
    try {
      const formData = new FormData()
      formData.append('photo', file)
      formData.append('sourceSystem', 'photo-memory')

      const response = await fetch(`${API_BASE}/uploads/photo`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('Upload failed')

      const data = await response.json()
      setUploadedPhoto({
        artifactId: data.artifact.id,
        filename: data.file.filename,
        path: data.file.path,
      })
      setStep('describe')
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload photo. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDescriptionSubmit = async () => {
    if (!description.trim()) return

    // Use AI to extract details from description
    try {
      const response = await fetch(`${API_BASE}/ai/Ori`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: `You are helping extract structured data from a photo description. Extract the following if mentioned:
- A short title for this memory (5-8 words)
- Approximate date (if mentioned)
- Location (if mentioned)
- People mentioned (comma-separated names)
- Emotions/feelings (comma-separated)

Respond with ONLY valid JSON:
{
  "title": "string or null",
  "date": "YYYY-MM-DD or null",
  "location": "string or null",
  "people": "comma-separated string or null",
  "emotions": "comma-separated string or null"
}`,
          conversationHistory: '',
          userMessage: description,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        try {
          let parsed = data.response
          // Handle markdown code blocks
          const jsonMatch = data.response.match(/```(?:json)?\s*([\s\S]*?)```/)
          if (jsonMatch) parsed = jsonMatch[1]
          
          const extracted = JSON.parse(parsed)
          setEventData({
            title: extracted.title || '',
            date: extracted.date || '',
            location: extracted.location || '',
            people: extracted.people || '',
            emotions: extracted.emotions || '',
          })
        } catch {
          // If parsing fails, just move to details step
        }
      }
    } catch (error) {
      console.log('AI extraction failed, continuing manually')
    }

    setStep('details')
  }

  const createEventMutation = useMutation({
    mutationFn: eventsApi.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['artifacts'] })
      setCreatedEventId(data.id)
      setStep('done')
    },
  })

  const handleSave = async () => {
    setStep('saving')

    // Create event (artifact linking done separately via API)
    createEventMutation.mutate({
      title: eventData.title || 'Photo Memory',
      date: eventData.date || null,
      location: eventData.location || null,
      summary: description,
      emotionTags: eventData.emotions.split(',').map(e => e.trim()).filter(Boolean),
      notes: `People: ${eventData.people || 'Not specified'}\nPhoto: ${uploadedPhoto?.artifactId || 'none'}`,
    })
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Photo Memory</h1>
        <p className="text-muted-foreground">
          Upload a photo and tell its story
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {['Upload', 'Describe', 'Details', 'Done'].map((label, i) => {
          const stepIndex = ['upload', 'describe', 'details', 'done'].indexOf(step)
          const isActive = i === stepIndex || (step === 'saving' && i === 2)
          const isComplete = i < stepIndex
          return (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                isComplete ? 'bg-green-500 text-white' :
                isActive ? 'bg-primary text-primary-foreground' :
                'bg-muted text-muted-foreground'
              }`}>
                {isComplete ? <Check className="w-3 h-3" /> : i + 1}
              </div>
              <span className={isActive ? 'font-medium' : 'text-muted-foreground'}>{label}</span>
              {i < 3 && <ArrowRight className="w-4 h-4 text-muted-foreground" />}
            </div>
          )
        })}
      </div>

      {/* Step: Upload */}
      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>Choose a Photo</CardTitle>
          </CardHeader>
          <CardContent>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-xl p-12 text-center cursor-pointer hover:border-primary hover:bg-muted/50 transition-colors"
            >
              {isUploading ? (
                <div className="space-y-2">
                  <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
                  <p className="text-muted-foreground">Uploading...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                  <p className="font-medium">Click to upload a photo</p>
                  <p className="text-sm text-muted-foreground">
                    JPG, PNG, GIF, WebP up to 50MB
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Describe */}
      {step === 'describe' && uploadedPhoto && (
        <Card>
          <CardHeader>
            <CardTitle>Tell Me About This Photo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="aspect-video bg-muted rounded-lg overflow-hidden">
              <img 
                src={`${API_BASE}${uploadedPhoto.path}`}
                alt="Uploaded photo"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="bg-violet-50 dark:bg-violet-950/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-violet-500 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Ori asks:</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    What's the story behind this photo? Who's in it, when was it taken, 
                    and what was happening? Share as much or as little as you'd like.
                  </p>
                </div>
              </div>
            </div>

            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="This photo was taken at... The people in it are... I remember feeling..."
              className="min-h-[150px]"
            />

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('upload')}>
                <X className="w-4 h-4 mr-2" />
                Choose Different Photo
              </Button>
              <Button 
                onClick={handleDescriptionSubmit}
                disabled={!description.trim()}
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Details */}
      {step === 'details' && uploadedPhoto && (
        <Card>
          <CardHeader>
            <CardTitle>Confirm Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1">
                <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                  <img 
                    src={`${API_BASE}${uploadedPhoto.path}`}
                    alt="Uploaded photo"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="col-span-2 space-y-3">
                <div>
                  <label className="text-sm font-medium block mb-1">Title</label>
                  <Input
                    value={eventData.title}
                    onChange={(e) => setEventData({ ...eventData, title: e.target.value })}
                    placeholder="A title for this memory"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Date</label>
                  <Input
                    type="date"
                    value={eventData.date}
                    onChange={(e) => setEventData({ ...eventData, date: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Location</label>
              <Input
                value={eventData.location}
                onChange={(e) => setEventData({ ...eventData, location: e.target.value })}
                placeholder="Where was this taken?"
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">People</label>
              <Input
                value={eventData.people}
                onChange={(e) => setEventData({ ...eventData, people: e.target.value })}
                placeholder="Who's in this photo? (comma-separated)"
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Emotions</label>
              <Input
                value={eventData.emotions}
                onChange={(e) => setEventData({ ...eventData, emotions: e.target.value })}
                placeholder="How did you feel? (comma-separated)"
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Story</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('describe')}>
                Back
              </Button>
              <Button onClick={handleSave}>
                <ImageIcon className="w-4 h-4 mr-2" />
                Save Memory
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Saving */}
      {step === 'saving' && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Preserving your memory...</p>
          </CardContent>
        </Card>
      )}

      {/* Step: Done */}
      {step === 'done' && (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-medium">Memory Preserved!</h3>
            <p className="text-muted-foreground">
              Your photo and its story have been saved to your memoir.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => {
                setStep('upload')
                setUploadedPhoto(null)
                setDescription('')
                setEventData({ title: '', date: '', location: '', people: '', emotions: '' })
              }}>
                Add Another Photo
              </Button>
              {createdEventId && (
                <Button onClick={() => navigate(`/events/${createdEventId}`)}>
                  View Memory
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
