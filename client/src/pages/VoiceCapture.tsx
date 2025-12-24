import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { eventsApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  Mic, 
  Square, 
  Play, 
  Pause,
  Loader2, 
  Sparkles,
  Check,
  Upload,
  Trash2
} from 'lucide-react'

const API_BASE = 'http://localhost:3001/api'

interface RecordingState {
  isRecording: boolean
  isPaused: boolean
  duration: number
  audioBlob: Blob | null
  audioUrl: string | null
}

export default function VoiceCapture() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const [step, setStep] = useState<'record' | 'review' | 'transcribe' | 'edit' | 'saving' | 'done'>('record')
  const [recording, setRecording] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioBlob: null,
    audioUrl: null,
  })
  const [isPlaying, setIsPlaying] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [eventData, setEventData] = useState({
    title: '',
    date: '',
    location: '',
    emotions: '',
  })
  const [createdEventId, setCreatedEventId] = useState<string | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (recording.audioUrl) URL.revokeObjectURL(recording.audioUrl)
    }
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const audioUrl = URL.createObjectURL(audioBlob)
        setRecording(prev => ({
          ...prev,
          isRecording: false,
          audioBlob,
          audioUrl,
        }))
        stream.getTracks().forEach(track => track.stop())
        setStep('review')
      }

      mediaRecorder.start(1000) // Collect data every second
      
      setRecording(prev => ({
        ...prev,
        isRecording: true,
        isPaused: false,
        duration: 0,
      }))

      // Start timer
      timerRef.current = setInterval(() => {
        setRecording(prev => ({
          ...prev,
          duration: prev.duration + 1,
        }))
      }, 1000)

    } catch (error) {
      console.error('Error accessing microphone:', error)
      alert('Could not access microphone. Please check permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording.isRecording) {
      mediaRecorderRef.current.stop()
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const togglePlayback = () => {
    if (!audioRef.current || !recording.audioUrl) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const transcribeAudio = async () => {
    if (!recording.audioBlob) return

    setIsTranscribing(true)
    setStep('transcribe')

    // For now, use browser's speech recognition on playback
    // In production, you'd send to Whisper API or similar
    
    // Simulated transcription - in real app, send to server
    try {
      // Upload audio first
      const formData = new FormData()
      formData.append('audio', recording.audioBlob, 'recording.webm')
      formData.append('shortDescription', 'Voice memo')
      formData.append('sourceSystem', 'voice-capture')

      const uploadResponse = await fetch(`${API_BASE}/uploads/audio`, {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) throw new Error('Upload failed')

      // For demo, prompt user to type what they said
      // Real implementation would use Whisper API
      setTranscript('')
      setStep('edit')
      
    } catch (error) {
      console.error('Transcription error:', error)
      setStep('edit')
    } finally {
      setIsTranscribing(false)
    }
  }

  const extractDetailsFromTranscript = async () => {
    if (!transcript.trim()) return

    try {
      const response = await fetch(`${API_BASE}/ai/Ori`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: `Extract structured data from this voice memo transcript. Find:
- A short title (5-8 words)
- Approximate date if mentioned (YYYY-MM-DD format)
- Location if mentioned
- Emotions/feelings mentioned

Respond with ONLY valid JSON:
{
  "title": "string or null",
  "date": "YYYY-MM-DD or null", 
  "location": "string or null",
  "emotions": "comma-separated string or null"
}`,
          conversationHistory: '',
          userMessage: transcript,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        try {
          let parsed = data.response
          const jsonMatch = data.response.match(/```(?:json)?\s*([\s\S]*?)```/)
          if (jsonMatch) parsed = jsonMatch[1]
          
          const extracted = JSON.parse(parsed)
          setEventData({
            title: extracted.title || '',
            date: extracted.date || '',
            location: extracted.location || '',
            emotions: extracted.emotions || '',
          })
        } catch {
          // Parsing failed, continue with manual entry
        }
      }
    } catch (error) {
      console.log('AI extraction failed')
    }
  }

  const createEventMutation = useMutation({
    mutationFn: eventsApi.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      setCreatedEventId(data.id)
      setStep('done')
    },
  })

  const handleSave = () => {
    setStep('saving')
    createEventMutation.mutate({
      title: eventData.title || 'Voice Memo',
      date: eventData.date || null,
      location: eventData.location || null,
      summary: transcript,
      emotionTags: eventData.emotions.split(',').map(e => e.trim()).filter(Boolean),
      notes: `Recorded voice memo (${formatDuration(recording.duration)})`,
    })
  }

  const resetRecording = () => {
    if (recording.audioUrl) {
      URL.revokeObjectURL(recording.audioUrl)
    }
    setRecording({
      isRecording: false,
      isPaused: false,
      duration: 0,
      audioBlob: null,
      audioUrl: null,
    })
    setTranscript('')
    setEventData({ title: '', date: '', location: '', emotions: '' })
    setStep('record')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Voice Capture</h1>
        <p className="text-muted-foreground">
          Record your memories in your own voice
        </p>
      </div>

      {/* Hidden audio element for playback */}
      {recording.audioUrl && (
        <audio
          ref={audioRef}
          src={recording.audioUrl}
          onEnded={() => setIsPlaying(false)}
        />
      )}

      {/* Step: Record */}
      {step === 'record' && (
        <Card>
          <CardHeader>
            <CardTitle>Record Your Story</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center py-8">
              {recording.isRecording ? (
                <div className="space-y-4">
                  <div className="w-32 h-32 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center animate-pulse">
                    <Mic className="w-16 h-16 text-red-500" />
                  </div>
                  <div className="text-4xl font-mono font-bold">
                    {formatDuration(recording.duration)}
                  </div>
                  <p className="text-muted-foreground">Recording...</p>
                  <Button 
                    size="lg" 
                    variant="destructive"
                    onClick={stopRecording}
                  >
                    <Square className="w-5 h-5 mr-2" />
                    Stop Recording
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-32 h-32 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                    <Mic className="w-16 h-16 text-primary" />
                  </div>
                  <p className="text-muted-foreground">
                    Click to start recording your memory
                  </p>
                  <Button size="lg" onClick={startRecording}>
                    <Mic className="w-5 h-5 mr-2" />
                    Start Recording
                  </Button>
                </div>
              )}
            </div>

            <div className="bg-muted/50 rounded-lg p-4 text-sm">
              <p className="font-medium mb-2">Tips for recording:</p>
              <ul className="text-muted-foreground space-y-1">
                <li>• Find a quiet space</li>
                <li>• Speak naturally, as if telling a friend</li>
                <li>• Include details: who, what, when, where</li>
                <li>• Share how you felt in the moment</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Review */}
      {step === 'review' && recording.audioUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Review Recording</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted rounded-lg p-6 text-center">
              <div className="text-2xl font-mono mb-4">
                {formatDuration(recording.duration)}
              </div>
              <div className="flex justify-center gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={togglePlayback}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-5 h-5 mr-2" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 mr-2" />
                      Play
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={resetRecording}>
                <Trash2 className="w-4 h-4 mr-2" />
                Discard
              </Button>
              <Button onClick={transcribeAudio}>
                <Sparkles className="w-4 h-4 mr-2" />
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Transcribe */}
      {step === 'transcribe' && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Processing your recording...</p>
          </CardContent>
        </Card>
      )}

      {/* Step: Edit */}
      {step === 'edit' && (
        <Card>
          <CardHeader>
            <CardTitle>Add Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-violet-50 dark:bg-violet-950/30 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-2">
                Type or paste what you said in your recording:
              </p>
              <Textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="I remember when..."
                className="min-h-[150px]"
              />
              {transcript.trim() && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-2"
                  onClick={extractDetailsFromTranscript}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Auto-extract details
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
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

            <div>
              <label className="text-sm font-medium block mb-1">Location</label>
              <Input
                value={eventData.location}
                onChange={(e) => setEventData({ ...eventData, location: e.target.value })}
                placeholder="Where did this happen?"
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

            <div className="flex gap-3">
              <Button variant="outline" onClick={resetRecording}>
                Start Over
              </Button>
              <Button 
                onClick={handleSave}
                disabled={!transcript.trim()}
              >
                <Upload className="w-4 h-4 mr-2" />
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
              Your voice memo has been saved to your memoir.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={resetRecording}>
                Record Another
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
