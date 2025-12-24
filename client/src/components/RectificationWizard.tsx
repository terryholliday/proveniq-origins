import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Plus, Trash2, Sparkles, AlertTriangle } from 'lucide-react'

const API_BASE = 'http://localhost:3001/api'

interface LifeEvent {
  id: string
  date: string
  description: string
  type: 'marriage' | 'death' | 'birth' | 'move' | 'career' | 'accident' | 'health' | 'other'
}

interface RectificationResult {
  estimatedTime: string
  confidenceLevel: 'low' | 'medium' | 'high'
  reasoning: string
  alternativeTimes: string[]
  missingEventTypes?: string[]
  disclaimer: string
}

interface RectificationWizardProps {
  birthDate: string | null
  birthPlace: string | null
  onComplete: (estimatedTime: string) => void
  onCancel: () => void
}

const EVENT_TYPES = [
  { value: 'marriage', label: 'Marriage/Partnership' },
  { value: 'death', label: 'Death of loved one' },
  { value: 'birth', label: 'Birth of child' },
  { value: 'move', label: 'Major relocation' },
  { value: 'career', label: 'Career change/milestone' },
  { value: 'accident', label: 'Accident/Trauma' },
  { value: 'health', label: 'Health crisis' },
  { value: 'other', label: 'Other major event' },
]

export default function RectificationWizard({ 
  birthDate, 
  birthPlace, 
  onComplete, 
  onCancel 
}: RectificationWizardProps) {
  const [step, setStep] = useState<'intro' | 'timeWindow' | 'events' | 'processing' | 'result'>('intro')
  const [timeWindow, setTimeWindow] = useState<{
    earliest: string
    latest: string
    context: string
  }>({ earliest: '00:00', latest: '23:59', context: '' })
  const [events, setEvents] = useState<LifeEvent[]>([])
  const [result, setResult] = useState<RectificationResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addEvent = () => {
    setEvents([...events, {
      id: Date.now().toString(),
      date: '',
      description: '',
      type: 'other',
    }])
  }

  const updateEvent = (id: string, updates: Partial<LifeEvent>) => {
    setEvents(events.map(e => e.id === id ? { ...e, ...updates } : e))
  }

  const removeEvent = (id: string) => {
    setEvents(events.filter(e => e.id !== id))
  }

  const processRectification = async () => {
    setIsProcessing(true)
    setError(null)
    setStep('processing')

    try {
      const response = await fetch(`${API_BASE}/ai/rectify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          birthDate,
          birthPlace,
          timeWindow,
          lifeEvents: events.filter(e => e.date && e.description),
        }),
      })

      if (!response.ok) throw new Error('Rectification failed')
      
      const data = await response.json()
      setResult(data)
      setStep('result')
    } catch (err) {
      setError('Failed to process rectification. Please try again.')
      setStep('events')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto py-8">
      <div className="bg-card border rounded-xl shadow-xl max-w-2xl w-full mx-4 p-6">
        
        {/* Intro */}
        {step === 'intro' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-500" />
              <h3 className="text-lg font-semibold">Birth Time Rectification</h3>
            </div>
            
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-200">Important Disclaimer</p>
                  <p className="text-amber-700 dark:text-amber-300 mt-1">
                    Rectification is an astrological hypothesis, not a scientific fact. The estimated birth time 
                    is a best guess based on correlating life events with planetary transits. Results should be 
                    treated as approximate and uncertain.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-muted-foreground">
              If you don't know your exact birth time, we can attempt to estimate it using major life events. 
              This process works best with:
            </p>
            
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• An approximate time window (morning, afternoon, evening)</li>
              <li>• 3-6 precisely dated major life events</li>
              <li>• Events with strong emotional/transformative impact</li>
            </ul>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={onCancel}>Cancel</Button>
              <Button onClick={() => setStep('timeWindow')}>
                Begin Rectification
              </Button>
            </div>
          </div>
        )}

        {/* Time Window */}
        {step === 'timeWindow' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Approximate Birth Time</h3>
            <p className="text-sm text-muted-foreground">
              What do you know about when you were born? Any information helps narrow down the search.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Earliest possible time</label>
                <input
                  type="time"
                  value={timeWindow.earliest}
                  onChange={(e) => setTimeWindow({ ...timeWindow, earliest: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Latest possible time</label>
                <input
                  type="time"
                  value={timeWindow.latest}
                  onChange={(e) => setTimeWindow({ ...timeWindow, latest: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Quick select:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Early morning (12am-6am)', earliest: '00:00', latest: '06:00' },
                  { label: 'Morning (6am-12pm)', earliest: '06:00', latest: '12:00' },
                  { label: 'Afternoon (12pm-6pm)', earliest: '12:00', latest: '18:00' },
                  { label: 'Evening (6pm-12am)', earliest: '18:00', latest: '23:59' },
                  { label: 'Unknown (full day)', earliest: '00:00', latest: '23:59' },
                ].map((option) => (
                  <button
                    key={option.label}
                    onClick={() => setTimeWindow({ ...timeWindow, earliest: option.earliest, latest: option.latest })}
                    className="text-xs px-3 py-1.5 rounded-full border hover:bg-muted transition-colors"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Any other context? (optional)</label>
              <Textarea
                value={timeWindow.context}
                onChange={(e) => setTimeWindow({ ...timeWindow, context: e.target.value })}
                placeholder="E.g., 'My mother said it was around sunrise' or 'The doctor was on lunch break'"
                className="min-h-[80px]"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setStep('intro')}>Back</Button>
              <Button onClick={() => setStep('events')}>Continue</Button>
            </div>
          </div>
        )}

        {/* Life Events */}
        {step === 'events' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Major Life Events</h3>
            <p className="text-sm text-muted-foreground">
              Add 3-6 significant, precisely dated events from your life. The more accurate the dates, 
              the better the rectification.
            </p>

            {error && (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {events.map((event, index) => (
                <div key={event.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Event {index + 1}</span>
                    <button
                      onClick={() => removeEvent(event.id)}
                      className="text-muted-foreground hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground">Date</label>
                      <input
                        type="date"
                        value={event.date}
                        onChange={(e) => updateEvent(event.id, { date: e.target.value })}
                        className="w-full px-2 py-1.5 text-sm border rounded bg-background"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Type</label>
                      <select
                        value={event.type}
                        onChange={(e) => updateEvent(event.id, { type: e.target.value as LifeEvent['type'] })}
                        className="w-full px-2 py-1.5 text-sm border rounded bg-background"
                      >
                        {EVENT_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-xs text-muted-foreground">Description</label>
                    <input
                      type="text"
                      value={event.description}
                      onChange={(e) => updateEvent(event.id, { description: e.target.value })}
                      placeholder="Brief description of what happened"
                      className="w-full px-2 py-1.5 text-sm border rounded bg-background"
                    />
                  </div>
                </div>
              ))}

              {events.length < 12 && (
                <button
                  onClick={addEvent}
                  className="w-full border-2 border-dashed rounded-lg p-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Life Event
                </button>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              {events.filter(e => e.date && e.description).length} events added (minimum 3, more = better accuracy)
            </p>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setStep('timeWindow')}>Back</Button>
              <Button 
                onClick={processRectification}
                disabled={events.filter(e => e.date && e.description).length < 3}
              >
                Process Rectification
              </Button>
            </div>
          </div>
        )}

        {/* Processing */}
        {step === 'processing' && (
          <div className="py-12 text-center space-y-4">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-violet-500" />
            <h3 className="text-lg font-medium">Analyzing your life events...</h3>
            <p className="text-sm text-muted-foreground">
              Correlating events with planetary transits to estimate birth time
            </p>
          </div>
        )}

        {/* Result */}
        {step === 'result' && result && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-500" />
              <h3 className="text-lg font-semibold">Rectification Result</h3>
            </div>

            <div className="bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">Estimated Birth Time</p>
              <p className="text-3xl font-bold text-violet-700 dark:text-violet-300">{result.estimatedTime}</p>
              <p className="text-sm mt-1">
                Confidence: <span className={`font-medium ${
                  result.confidenceLevel === 'high' ? 'text-green-600' :
                  result.confidenceLevel === 'medium' ? 'text-amber-600' : 'text-red-600'
                }`}>{result.confidenceLevel}</span>
              </p>
            </div>

            {/* Prompt for more events if confidence is not high */}
            {result.confidenceLevel !== 'high' && (
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                  Want more accuracy?
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                  The rising sign changes every ~2 hours. Certain event types are especially useful for narrowing down birth time:
                </p>
                {result.missingEventTypes && result.missingEventTypes.length > 0 ? (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">Events that would help most:</p>
                    <ul className="text-sm text-blue-700 dark:text-blue-300 list-disc list-inside">
                      {result.missingEventTypes.map((type, i) => (
                        <li key={i}>{type}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <ul className="text-xs text-blue-700 dark:text-blue-300 mb-3 space-y-1">
                    <li>• <strong>Accidents/surgeries</strong> - pinpoint the Ascendant (body)</li>
                    <li>• <strong>Marriage/divorce dates</strong> - pinpoint the Descendant (7th house)</li>
                    <li>• <strong>Career milestones</strong> - pinpoint the Midheaven (10th house)</li>
                    <li>• <strong>Parent's death</strong> - pinpoint the IC (4th house)</li>
                  </ul>
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setStep('events')}
                  className="text-blue-700 border-blue-300 hover:bg-blue-100 dark:text-blue-300 dark:border-blue-700 dark:hover:bg-blue-900/50"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add More Events
                </Button>
              </div>
            )}

            <div>
              <h4 className="text-sm font-medium mb-1">Reasoning</h4>
              <p className="text-sm text-muted-foreground">{result.reasoning}</p>
            </div>

            {result.alternativeTimes.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-1">Alternative possibilities</h4>
                <p className="text-sm text-muted-foreground">{result.alternativeTimes.join(', ')}</p>
              </div>
            )}

            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-700 dark:text-amber-300">
              <strong>Disclaimer:</strong> {result.disclaimer}
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={onCancel}>Cancel</Button>
              <Button onClick={() => onComplete(result.estimatedTime)}>
                Use This Time
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
