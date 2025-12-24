import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { X, ArrowRight, RotateCcw, Sparkles } from 'lucide-react'

type InterviewPhase = 'intro' | 'surface' | 'probing' | 'emotional' | 'meaning' | 'complete'

interface WizardResponse {
  phase: InterviewPhase
  userAnswer: string
  OriFollowUp: string
}

interface OriWizardProps {
  topic: string
  initialContent?: string
  onComplete: (enrichedContent: string, responses: WizardResponse[]) => void
  onCancel: () => void
}

// Probing question templates - Ori digs deeper like Oprah/Barbara Walters
const PROBING_TEMPLATES = {
  surface: [
    "Tell me what happened. Just the facts first.",
    "Walk me through this moment. What was the setting?",
    "Start from the beginning. What led up to this?",
  ],
  probing: [
    "You mentioned {keyword}. Let's stay there for a moment. What was really going on beneath the surface?",
    "I hear what you're saying, but I sense there's more. What aren't you telling me?",
    "That's the story you tell others. What's the story you tell yourself at 3am?",
    "You used the word '{keyword}'. That's a careful word. What's the word you're avoiding?",
    "Let's go deeper. When you say '{keyword}', what does that really mean to you?",
  ],
  emotional: [
    "Close your eyes for a moment. You're back there. What do you feel in your body?",
    "Where do you feel this in your body right now, as you're telling me?",
    "What emotion are you protecting yourself from as you tell this story?",
    "If that moment could speak, what would it say to you?",
    "What did you need in that moment that you didn't get?",
    "The child inside you who lived this—what does that child need to hear right now?",
  ],
  meaning: [
    "How did this moment change who you became?",
    "What did you learn about yourself that day that you still carry?",
    "If you could go back and whisper something to yourself in that moment, what would it be?",
    "How does this connect to who you are today?",
    "What pattern in your life started here?",
    "Why does this memory still have power over you?",
  ],
}

// Detect surface-level, evasive, or guarded responses
function analyzeResponse(text: string): { isDeep: boolean; keywords: string[]; flags: string[] } {
  const flags: string[] = []
  const keywords: string[] = []
  
  const lowerText = text.toLowerCase()
  
  // Detect hedging/minimizing language
  const hedgeWords = ['just', 'only', 'kind of', 'sort of', 'i guess', 'maybe', 'probably', 'whatever', 'fine', 'okay', 'normal']
  hedgeWords.forEach(word => {
    if (lowerText.includes(word)) flags.push('hedging')
  })
  
  // Detect emotional distance
  const distanceWords = ['they', 'people', 'one', 'you know', 'everyone', 'it was what it was']
  distanceWords.forEach(word => {
    if (lowerText.includes(word)) flags.push('distancing')
  })
  
  // Detect potential depth - emotional words
  const emotionalWords = ['hurt', 'angry', 'scared', 'afraid', 'loved', 'hated', 'ashamed', 'guilty', 'proud', 'broken', 'lost', 'alone', 'abandoned', 'betrayed', 'devastated', 'terrified', 'furious', 'heartbroken']
  emotionalWords.forEach(word => {
    if (lowerText.includes(word)) {
      flags.push('emotional')
      keywords.push(word)
    }
  })
  
  // Detect relationship words
  const relationshipWords = ['mother', 'father', 'mom', 'dad', 'parent', 'brother', 'sister', 'husband', 'wife', 'child', 'son', 'daughter', 'friend', 'lover']
  relationshipWords.forEach(word => {
    if (lowerText.includes(word)) keywords.push(word)
  })
  
  // Detect abstract/vague language
  const vagueWords = ['things', 'stuff', 'whatever', 'something', 'somehow', 'somewhere']
  vagueWords.forEach(word => {
    if (lowerText.includes(word)) flags.push('vague')
  })
  
  // Short responses are usually surface-level
  if (text.length < 50) flags.push('brief')
  
  // Long, detailed responses with emotional words are deep
  const isDeep = text.length > 150 && flags.includes('emotional') && !flags.includes('hedging')
  
  return { isDeep, keywords, flags }
}

function getFollowUpQuestion(phase: InterviewPhase, analysis: ReturnType<typeof analyzeResponse>, previousAnswer: string): string {
  const templates = PROBING_TEMPLATES[phase as keyof typeof PROBING_TEMPLATES] || PROBING_TEMPLATES.probing
  
  let question = templates[Math.floor(Math.random() * templates.length)]
  
  // Replace {keyword} placeholder with actual keyword from their response
  if (analysis.keywords.length > 0) {
    const keyword = analysis.keywords[Math.floor(Math.random() * analysis.keywords.length)]
    question = question.replace('{keyword}', keyword)
  } else {
    // Extract a significant word from their answer
    const words = previousAnswer.split(' ').filter(w => w.length > 4)
    if (words.length > 0) {
      const keyword = words[Math.floor(Math.random() * Math.min(5, words.length))]
      question = question.replace('{keyword}', keyword.toLowerCase().replace(/[.,!?]/g, ''))
    } else {
      question = question.replace('{keyword}', 'that')
    }
  }
  
  // Add pushback if response seems guarded
  if (analysis.flags.includes('hedging') || analysis.flags.includes('brief')) {
    const pushbacks = [
      "I appreciate you sharing, but I need you to go deeper. ",
      "That's a start, but we're not there yet. ",
      "You're still protecting something. Let's try again. ",
      "I can feel you holding back. It's safe here. ",
    ]
    question = pushbacks[Math.floor(Math.random() * pushbacks.length)] + question
  }
  
  return question
}

export default function OriWizard({ topic, initialContent = '', onComplete, onCancel }: OriWizardProps) {
  const [phase, setPhase] = useState<InterviewPhase>('intro')
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [responses, setResponses] = useState<WizardResponse[]>([])
  const [OriMessage, setOriMessage] = useState(
    `I want to understand this memory about "${topic}" at its deepest level. Not the version you tell at dinner parties—the real one. The one that still visits you. Are you ready to go there with me?`
  )
  const [isThinking, setIsThinking] = useState(false)

  const handleSubmit = () => {
    if (!currentAnswer.trim()) return
    
    setIsThinking(true)
    
    // Analyze the response
    const analysis = analyzeResponse(currentAnswer)
    
    // Store this exchange
    const newResponse: WizardResponse = {
      phase,
      userAnswer: currentAnswer,
      OriFollowUp: '',
    }
    
    // Determine next phase based on current phase and response depth
    let nextPhase: InterviewPhase = phase
    let followUp = ''
    
    setTimeout(() => {
      switch (phase) {
        case 'intro':
          nextPhase = 'surface'
          followUp = PROBING_TEMPLATES.surface[Math.floor(Math.random() * PROBING_TEMPLATES.surface.length)]
          break
          
        case 'surface':
          nextPhase = 'probing'
          followUp = getFollowUpQuestion('probing', analysis, currentAnswer)
          break
          
        case 'probing':
          // If they're still being surface-level, push harder
          if (!analysis.isDeep && responses.length < 4) {
            followUp = getFollowUpQuestion('probing', analysis, currentAnswer)
          } else {
            nextPhase = 'emotional'
            followUp = getFollowUpQuestion('emotional', analysis, currentAnswer)
          }
          break
          
        case 'emotional':
          nextPhase = 'meaning'
          followUp = getFollowUpQuestion('meaning', analysis, currentAnswer)
          break
          
        case 'meaning':
          nextPhase = 'complete'
          followUp = "Thank you for trusting me with this. What you've shared here—this is the real material. This is what your memoir needs."
          break
      }
      
      newResponse.OriFollowUp = followUp
      setResponses([...responses, newResponse])
      setOriMessage(followUp)
      setPhase(nextPhase)
      setCurrentAnswer('')
      setIsThinking(false)
    }, 1500) // Simulate thinking time
  }

  const handleComplete = () => {
    // Compile all responses into enriched content
    let enrichedContent = initialContent ? initialContent + '\n\n---\n\n' : ''
    enrichedContent += `## Deep Dive: ${topic}\n\n`
    
    responses.forEach((r) => {
      enrichedContent += `**Ori:** ${r.OriFollowUp || 'Tell me about this memory.'}\n\n`
      enrichedContent += `${r.userAnswer}\n\n`
    })
    
    onComplete(enrichedContent, responses)
  }

  const handleStartOver = () => {
    setPhase('intro')
    setResponses([])
    setCurrentAnswer('')
    setOriMessage(
      `I want to understand this memory about "${topic}" at its deepest level. Not the version you tell at dinner parties—the real one. The one that still visits you. Are you ready to go there with me?`
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900 dark:to-amber-800 flex items-center justify-center text-2xl">
              🧔
            </div>
            <div>
              <h2 className="font-display font-semibold">Ori's Deep Dive</h2>
              <p className="text-xs text-muted-foreground">
                {phase === 'complete' ? 'Interview Complete' : `Phase: ${phase.charAt(0).toUpperCase() + phase.slice(1)}`}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Conversation area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Previous exchanges */}
          {responses.map((r, i) => (
            <div key={i} className="space-y-3">
              {r.OriFollowUp && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center text-sm flex-shrink-0">
                    🧔
                  </div>
                  <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-2 max-w-[85%]">
                    <p className="text-sm font-narrative">{r.OriFollowUp}</p>
                  </div>
                </div>
              )}
              <div className="flex gap-3 justify-end">
                <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2 max-w-[85%]">
                  <p className="text-sm">{r.userAnswer}</p>
                </div>
              </div>
            </div>
          ))}

          {/* Current Ori message */}
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center text-sm flex-shrink-0">
              🧔
            </div>
            <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
              <p className="text-sm font-narrative italic">"{OriMessage}"</p>
            </div>
          </div>

          {isThinking && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center text-sm flex-shrink-0">
                🧔
              </div>
              <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <CardContent className="border-t p-4">
          {phase !== 'complete' ? (
            <div className="space-y-3">
              <Textarea
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder="Take your time. Be honest. This is just between us..."
                className="min-h-[100px] resize-none"
                disabled={isThinking}
              />
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={handleStartOver} disabled={responses.length === 0}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Start Over
                </Button>
                <Button onClick={handleSubmit} disabled={!currentAnswer.trim() || isThinking}>
                  {isThinking ? 'Ori is listening...' : 'Share'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-center py-4">
                <Sparkles className="w-8 h-8 mx-auto text-primary mb-2" />
                <p className="font-medium">You've done important work here.</p>
                <p className="text-sm text-muted-foreground">This material will enrich your memoir with authentic depth.</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={handleStartOver}>
                  Go Deeper
                </Button>
                <Button className="flex-1" onClick={handleComplete}>
                  Save & Continue
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
