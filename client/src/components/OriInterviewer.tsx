import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { eventsApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Home, Save, RotateCcw, Mic, MicOff } from 'lucide-react'
import { Ori_SYSTEM_PROMPT, Ori_OPENINGS, Ori_CONFIG, OriTurnOutput } from '@/ai/personas/OriPersona'
import RectificationWizard from './RectificationWizard'

// ============================================
// WEB SPEECH API TYPES
// ============================================

interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor
    webkitSpeechRecognition: SpeechRecognitionConstructor
  }
}

// ============================================
// TYPES
// ============================================

interface Message {
  id: string
  role: 'Ori' | 'user'
  content: string
  timestamp: Date
}

interface TimelineEvent {
  type: 'date' | 'year' | 'life_event' | 'person'
  value: string
  context: string
  messageId: string
}

interface CapturedMemory {
  turn_id: string
  scene_id: string | null
  approx_date: string | null
  location: string | null
  people: string[]
  ghostwritten_text: string | null
  scores: {
    emotional_weight: number | null
    narrative_impact: number | null
    symbolic_density: number | null
    unresolved_energy: number | null
  }
  chapter_theme: string | null
}

interface ListeningAnalysis {
  user_emotional_state: string
  subtext_detection: string | null
  dangling_threads: string[]
  connection_opportunity: string | null
  chosen_tactic: string
}

interface InterviewMemory {
  messages: Message[]
  timelineEvents: TimelineEvent[]
  capturedMemories: CapturedMemory[]
  themes: string[]
  emotionalPeaks: string[]
  sessionStart: Date
}

// ============================================
// HOOKS
// ============================================

function useTypingSimulation() {
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const simulateTyping = useCallback((fullText: string, onComplete?: () => void) => {
    setIsTyping(true)
    setDisplayedText('')
    let index = 0

    intervalRef.current = setInterval(() => {
      if (index < fullText.length) {
        // Variable speed for natural feel
        const char = fullText[index]
        setDisplayedText(fullText.slice(0, index + 1))
        index++
        
        // Pause slightly longer on punctuation
        if (['.', ',', '?', '—'].includes(char)) {
          // Natural pause handled by interval variation
        }
      } else {
        if (intervalRef.current) clearInterval(intervalRef.current)
        setIsTyping(false)
        onComplete?.()
      }
    }, Ori_CONFIG.typingSpeed + Math.random() * 20)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const skipToEnd = useCallback((fullText: string) => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setDisplayedText(fullText)
    setIsTyping(false)
  }, [])

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  return { displayedText, isTyping, simulateTyping, skipToEnd }
}

function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported')
      return
    }

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition
    recognitionRef.current = new SpeechRecognitionClass()
    recognitionRef.current.continuous = true
    recognitionRef.current.interimResults = true

    recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript
        }
      }
      if (finalTranscript) {
        setTranscript(prev => prev + ' ' + finalTranscript)
      }
    }

    recognitionRef.current.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current.start()
    setIsListening(true)
  }, [])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }, [])

  const clearTranscript = useCallback(() => {
    setTranscript('')
  }, [])

  return { isListening, transcript, startListening, stopListening, clearTranscript }
}

// ============================================
// MEMORY CONTEXT BUILDER
// ============================================

function buildConversationContext(memory: InterviewMemory, maxMessages: number = 10): string {
  // Get recent messages for context, preserving narrative flow
  const recentMessages = memory.messages.slice(-maxMessages)
  
  // Build context string
  let context = ''
  
  // Add session context if we have themes
  if (memory.themes.length > 0) {
    context += `[Session themes so far: ${memory.themes.join(', ')}]\n\n`
  }
  
  // Add conversation history
  context += recentMessages.map(m => {
    const role = m.role === 'Ori' ? 'Ori' : 'User'
    return `${role}: ${m.content}`
  }).join('\n\n')
  
  return context
}

function extractTimelineEvents(text: string, messageId: string): TimelineEvent[] {
  const events: TimelineEvent[] = []
  
  // Year patterns (1950-2030)
  const yearPattern = /\b(19[5-9]\d|20[0-3]\d)\b/g
  let match
  while ((match = yearPattern.exec(text)) !== null) {
    events.push({
      type: 'year',
      value: match[1],
      context: text.slice(Math.max(0, match.index - 50), match.index + 50),
      messageId,
    })
  }
  
  // Life events
  const lifeEventPatterns = [
    /\b(died|passed away|death of|funeral|buried)\b/i,
    /\b(married|wedding|engagement|divorced)\b/i,
    /\b(born|birth|pregnant|baby|child)\b/i,
    /\b(moved to|relocated|left home)\b/i,
    /\b(graduated|college|university|school)\b/i,
    /\b(hired|fired|job|career|retired)\b/i,
    /\b(accident|hospital|surgery|diagnosis)\b/i,
  ]
  
  for (const pattern of lifeEventPatterns) {
    if (pattern.test(text)) {
      const eventMatch = text.match(pattern)
      if (eventMatch) {
        events.push({
          type: 'life_event',
          value: eventMatch[0],
          context: text.slice(0, 100),
          messageId,
        })
      }
    }
  }
  
  return events
}

// ============================================
// Ori PRESENCE ANIMATION
// ============================================

function OriPresence({ state }: { state: 'listening' | 'thinking' | 'speaking' | 'waiting' }) {
  return (
    <div className="relative">
      {/* Main avatar */}
      <div 
        className={`
          w-16 h-16 rounded-full 
          bg-gradient-to-br from-amber-100 to-amber-200 
          dark:from-amber-900 dark:to-amber-800 
          flex items-center justify-center text-3xl 
          shadow-lg transition-all duration-1000
          ${state === 'thinking' ? 'scale-95' : 'scale-100'}
        `}
      >
        🧔
      </div>
      
      {/* Breathing glow effect */}
      <div 
        className={`
          absolute inset-0 rounded-full 
          bg-amber-300/20 dark:bg-amber-600/20
          transition-all duration-[2000ms] ease-in-out
          ${state === 'listening' ? 'scale-125 opacity-60' : ''}
          ${state === 'thinking' ? 'scale-110 opacity-40 animate-pulse' : ''}
          ${state === 'speaking' ? 'scale-115 opacity-50' : ''}
          ${state === 'waiting' ? 'scale-100 opacity-0' : ''}
        `}
        style={{
          animation: state === 'listening' 
            ? 'breathe 4s ease-in-out infinite' 
            : state === 'thinking'
            ? 'pulse 2s ease-in-out infinite'
            : 'none'
        }}
      />
      
      {/* Subtle ring for active states */}
      {(state === 'listening' || state === 'speaking') && (
        <div 
          className="absolute inset-0 rounded-full border-2 border-amber-400/30 dark:border-amber-500/30"
          style={{
            animation: 'breathe 3s ease-in-out infinite',
          }}
        />
      )}
    </div>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function OriInterviewer() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  // State
  const [inputValue, setInputValue] = useState('')
  const [OriState, setOriState] = useState<'listening' | 'thinking' | 'speaking' | 'waiting'>('waiting')
  const [memory, setMemory] = useState<InterviewMemory>({
    messages: [],
    timelineEvents: [],
    capturedMemories: [],
    themes: [],
    emotionalPeaks: [],
    sessionStart: new Date(),
  })
  const [currentOriMessage, setCurrentOriMessage] = useState<Message | null>(null)
  const [isSaved, setIsSaved] = useState(false)
  const [showAstroSettings, setShowAstroSettings] = useState(false)
  const [showRectification, setShowRectification] = useState(false)
  const [birthData, setBirthData] = useState<{
    date: string | null
    time: string | null
    place: string | null
    astroEnabled: boolean
  }>(() => {
    const saved = localStorage.getItem('origins-birth-data')
    if (saved) {
      try { return JSON.parse(saved) } catch { /* ignore */ }
    }
    return { date: null, time: null, place: null, astroEnabled: false }
  })
  const [isFirstVisit] = useState(() => {
    const visited = localStorage.getItem('origins-ori-visited')
    if (!visited) {
      localStorage.setItem('origins-ori-visited', 'true')
      return true
    }
    return false
  })
  const hasGreetedRef = useRef(false)

  // Hooks
  const { displayedText, isTyping, simulateTyping, skipToEnd } = useTypingSimulation()
  const { isListening, transcript, startListening, stopListening, clearTranscript } = useSpeechRecognition()

  // Scroll to TOP on mount (so Astro mode is visible)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  // Scroll to bottom of messages as conversation progresses
  useEffect(() => {
    if (memory.messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [memory.messages, displayedText])

  // Handle voice transcript
  useEffect(() => {
    if (transcript.trim()) {
      setInputValue(prev => (prev + ' ' + transcript).trim())
      clearTranscript()
    }
  }, [transcript, clearTranscript])

  // Generate personalized returning greeting
  const generateReturningGreeting = async (): Promise<string> => {
    try {
      // Get last session summary from localStorage
      const lastSession = localStorage.getItem('origins-last-session')
      
      // Fetch recent events for context
      let recentEvents: Array<{ title: string; summary?: string; emotionTags?: string[]; date?: string }> = []
      try {
        const eventsResponse = await fetch('http://localhost:3001/api/events')
        if (eventsResponse.ok) {
          const allEvents = await eventsResponse.json()
          recentEvents = allEvents.slice(0, 5)
        }
      } catch (e) {
        console.log('Could not fetch events for greeting')
      }

      // Fetch artifacts (uploaded documents) for context
      let artifacts: Array<{ id: string; type: string; shortDescription: string; transcribedText?: string; sourceSystem?: string }> = []
      let artifactAnalyses: Array<{ name: string; analysis: any }> = []
      try {
        const artifactsResponse = await fetch('http://localhost:3001/api/artifacts')
        if (artifactsResponse.ok) {
          const allArtifacts = await artifactsResponse.json()
          artifacts = allArtifacts.slice(0, 5) // Limit to 5 for performance
          
          // Pre-analyze artifacts that have content but haven't been analyzed yet
          for (const artifact of artifacts) {
            if (artifact.transcribedText || artifact.shortDescription) {
              try {
                const analysisResponse = await fetch(`http://localhost:3001/api/artifacts/${artifact.id}/analyze`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                })
                if (analysisResponse.ok) {
                  const data = await analysisResponse.json()
                  if (data.analysis) {
                    artifactAnalyses.push({
                      name: artifact.shortDescription || artifact.type,
                      analysis: data.analysis
                    })
                  }
                }
              } catch (e) {
                console.log('Could not analyze artifact:', artifact.id)
              }
            }
          }
        }
      } catch (e) {
        console.log('Could not fetch artifacts for greeting')
      }
      
      // If we have no data at all, use generic
      if (!lastSession && recentEvents.length === 0 && artifacts.length === 0) {
        return Ori_OPENINGS.returning
      }

      // Build context for AI
      const sessionData = lastSession ? JSON.parse(lastSession) : null
      const eventSummaries = recentEvents.map((e) => 
        `"${e.title}"${e.summary ? ` - ${e.summary.slice(0, 100)}` : ''}${e.emotionTags?.length ? ` (${e.emotionTags.slice(0, 2).join(', ')})` : ''}`
      ).join('; ')

      // Build artifact summaries with AI analysis
      // CRITICAL: Only include artifacts where we have ACTUAL content, not just filenames
      const artifactSummaries = artifacts.map((a) => {
        let summary = `[${a.type.toUpperCase()}] ${a.shortDescription || 'Untitled'}`
        
        // Check if transcribedText has real content vs pending/error markers
        const hasRealContent = a.transcribedText && 
          !a.transcribedText.startsWith('[TRANSCRIPTION') &&
          a.transcribedText.length > 50
        
        if (hasRealContent) {
          summary += `\nACTUAL CONTENT: "${a.transcribedText!.slice(0, 500)}${a.transcribedText!.length > 500 ? '...' : ''}"`
        } else if (a.transcribedText?.startsWith('[TRANSCRIPTION')) {
          summary += `\nSTATUS: ${a.transcribedText}`
        } else {
          summary += `\nSTATUS: Content not yet extracted - DO NOT pretend you've read this file`
        }
        return summary
      }).join('\n\n')

      // Build detailed analysis summaries for pointed questions
      const detailedAnalyses = artifactAnalyses.map((aa) => {
        const a = aa.analysis
        return `
ARTIFACT: "${aa.name}"
- Summary: ${a.summary || 'No summary'}
- Key Themes: ${a.keyThemes?.join(', ') || 'None identified'}
- People Mentioned: ${a.peopleIdentified?.join(', ') || 'None'}
- Emotional Tone: ${a.emotionalTone || 'Unknown'}
- Time Period: ${a.timePeriod || 'Unknown'}
- Story Elements: ${a.storyElements?.join('; ') || 'None'}
- Suggested Questions: ${a.followUpQuestions?.join(' | ') || 'None'}`
      }).join('\n\n')

      // Determine if we have sparse data (just dates, no real content)
      const hasRichContent = recentEvents.some(e => 
        (e.summary && e.summary.length > 50) || 
        (e.emotionTags && e.emotionTags.length > 0)
      ) || (sessionData?.topics?.length > 0 && sessionData.topics.some((t: string) => t.length > 20))
      || artifacts.some(a => a.transcribedText && a.transcribedText.length > 50)
      
      const eventCount = recentEvents.length
      const artifactCount = artifacts.length
      const hasArtifacts = artifactCount > 0
      const isSparseData = eventCount <= 3 && !hasRichContent && !hasArtifacts

      // Check if user has birth date but hasn't enabled Astro mode yet
      const hasBirthDate = recentEvents.some(e => 
        e.title?.toLowerCase().includes('birth') || 
        e.title?.toLowerCase().includes('born')
      )
      const astroNotEnabled = !birthData.astroEnabled

      const prompt = `You are Ori, a master interviewer combining Barbara Walters' precision with Oprah's empathy. A returning user just opened their memoir session.

LAST SESSION (if available):
${sessionData ? `
- Topics discussed: ${sessionData.topics?.join(', ') || 'General life story'}
- Emotional themes: ${sessionData.emotions?.join(', ') || 'Various'}
- Last question asked: ${sessionData.lastQuestion || 'None recorded'}
- Key people mentioned: ${sessionData.people?.join(', ') || 'None recorded'}
` : 'No previous session data'}

RECENT EVENTS IN THEIR MEMOIR:
${eventSummaries || 'None yet'}

UPLOADED ARTIFACTS (documents, photos, audio, etc.):
${artifactSummaries || 'None yet'}
ARTIFACT COUNT: ${artifactCount}

${detailedAnalyses ? `
DETAILED ARTIFACT ANALYSIS (I have pre-read these files):
${detailedAnalyses}

IMPORTANT: Use the analysis above to ask SPECIFIC, POINTED questions about what you found in their documents. Reference actual themes, people, and story elements from the analysis. Show that you've actually read and understood their materials.
` : ''}

DATA RICHNESS: ${isSparseData ? 'SPARSE - User has only basic dates/milestones, no detailed stories yet' : 'Has some content to work with'}
EVENT COUNT: ${eventCount}
HAS BIRTH DATE: ${hasBirthDate ? 'YES' : 'NO'}
ASTRO MODE ENABLED: ${birthData.astroEnabled ? 'YES' : 'NO'}

${hasArtifacts && eventCount === 0 ? `
ARTIFACTS AVAILABLE (IMPORTANT):
The user has uploaded ${artifactCount} artifact(s) but hasn't created any memoir events yet. Your job is to:
1. Acknowledge that you've seen their uploaded materials
2. Reference SPECIFIC details from the artifacts listed above
3. Ask questions that help them turn these artifacts into memoir entries
4. Show genuine curiosity about the stories behind these documents/photos/recordings

Example: "I see you've uploaded some materials — [reference specific artifact]. Tell me more about this. What was happening in your life when...?"
` : hasBirthDate && astroNotEnabled ? `
ASTRO MODE INVITATION (IMPORTANT):
The user has entered their birth date but hasn't enabled Astro Mode yet. This is a perfect opportunity to introduce them to this feature.

Your greeting should:
1. Warmly acknowledge their birth date as the starting point of their story
2. Introduce Astro Mode as an optional lens: "As Above, So Below: As Within, So Without"
3. Explain that Astro Mode can overlay the movements of the stars onto the events of their life — showing how cosmic cycles may have correlated with their personal milestones, transitions, and transformative moments
4. Make it clear this is OPTIONAL and the memoir works perfectly without it
5. Ask if they'd like to enable Astro Mode (they can click the ✧ Astro button in the header)
6. Keep it intriguing but not pushy — some people love this, others prefer a purely secular approach

Example tone: "I notice you've marked your birth date — the moment your story began. There's an ancient idea: 'As Above, So Below.' Some find meaning in seeing how the movements of the stars correlate with the chapters of their lives. If you're curious, you can enable Astro Mode — it won't change your memoir, just add an optional cosmic lens. Would that interest you?"
` : isSparseData ? `
SPARSE DATA PROTOCOL (IMPORTANT):
The user has only entered basic milestone dates (like birth, graduation) without detailed memories. Your job is to help them BUILD their memoir, not interview them about sparse data points.

Your greeting should:
1. Warmly acknowledge they're getting started
2. Explain that the best memoirs are built from source materials — photos, letters, journals, messages, documents
3. Ask if they have any photos, old letters, journals, text message exports, or documents they'd like to upload
4. Mention that once you can see their materials, you can ask much better questions about their actual experiences
5. Make it feel like an invitation, not a demand

Example tone: "The richest memoirs come from the artifacts of our lives — the photos we kept, the letters we saved, the messages we sent. Do you have any of those you'd like to share? Once I can see what you've collected, I'll have a much better sense of the questions to ask."
` : `
Generate a warm, personalized greeting that:
1. References something SPECIFIC from their last session or recent events — ONLY if data exists above
2. Shows you remember and care about their story
3. Ends with ONE evocative, open-ended question that picks up a thread or explores something they haven't fully unpacked
`}

CRITICAL ANTI-HALLUCINATION RULES:
- ONLY reference details that appear VERBATIM in the "ACTUAL CONTENT" sections above
- If an artifact says "STATUS: Content not yet extracted" — you MUST NOT claim to have read it. You can only acknowledge the filename exists.
- If an artifact says "STATUS: [TRANSCRIPTION PENDING...]" — tell the user their files are still processing
- NEVER invent themes, emotions, or interpretations from FILENAMES ALONE. A file named "August 2017 recording" tells you NOTHING about its content.
- If the data says "High school graduation" — you know ONLY those words. Do NOT add caps being tossed, feelings of excitement, or any other fabricated details
- If no meaningful ACTUAL CONTENT exists, give a simple warm welcome and explain you're still processing their uploads
- A fabricated greeting destroys trust. When in doubt, be honest: "I see you've uploaded some files, but I'm still processing them."

FILENAME VS CONTENT:
- "Beyond Belief Introduction.pdf" as a filename tells you NOTHING about faith or transformation — that's a hallucination
- You need ACTUAL CONTENT to make claims about themes, emotions, or meaning
- If you only have filenames, SAY SO: "I see you've uploaded several recordings and documents. Once I've had a chance to process them, I'll be able to ask more specific questions."

Be warm but not sycophantic. Channel Oprah's "I see you" energy.
Keep it to 2-3 short paragraphs max. No JSON, just the greeting text.`

      const response = await fetch('http://localhost:3001/api/ai/Ori', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: prompt,
          conversationHistory: '',
          userMessage: 'Generate returning greeting',
        }),
      })

      if (response.ok) {
        const data = await response.json()
        // Handle both JSON protocol responses and plain text
        let greeting = data.response
        try {
          const parsed = JSON.parse(greeting)
          if (parsed.reply_to_user) greeting = parsed.reply_to_user
        } catch { /* plain text response */ }
        
        if (greeting && greeting.length > 20) {
          return greeting
        }
      }
    } catch (error) {
      console.log('Could not generate personalized greeting, using default:', error)
    }
    
    return Ori_OPENINGS.returning
  }

  // Initial greeting - only run once
  useEffect(() => {
    if (memory.messages.length === 0 && !hasGreetedRef.current) {
      hasGreetedRef.current = true
      
      const showGreeting = async () => {
        setOriState('thinking')
        
        const greeting = isFirstVisit 
          ? Ori_OPENINGS.firstTime 
          : await generateReturningGreeting()
        
        setOriState('speaking')
        const OriMessage: Message = {
          id: Date.now().toString(),
          role: 'Ori',
          content: greeting,
          timestamp: new Date(),
        }
        setCurrentOriMessage(OriMessage)
        
        simulateTyping(greeting, () => {
          setMemory(prev => ({
            ...prev,
            messages: [...prev.messages, OriMessage],
          }))
          setCurrentOriMessage(null)
          setOriState('listening')
        })
      }
      
      setTimeout(showGreeting, Ori_CONFIG.thinkingDelay)
    }
  }, [])

  // Save mutation
  const { mutate: createEvent, isPending: isSaving } = useMutation({
    mutationFn: eventsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      setIsSaved(true)
      
      // Save session summary for next time
      const userMessages = memory.messages.filter(m => m.role === 'user')
      const OriMessages = memory.messages.filter(m => m.role === 'Ori')
      const lastOriQuestion = OriMessages.length > 0 
        ? OriMessages[OriMessages.length - 1].content.split('?')[0] + '?'
        : null
      
      // Extract topics and people from conversation
      const allText = userMessages.map(m => m.content).join(' ')
      const emotions = memory.capturedMemories
        .flatMap(cm => Object.entries(cm.scores || {})
          .filter(([_, v]) => v && v >= 3)
          .map(([k]) => k))
      const people = memory.capturedMemories.flatMap(cm => cm.people || [])
      const topics = memory.capturedMemories
        .map(cm => cm.chapter_theme)
        .filter(Boolean)
      
      localStorage.setItem('origins-last-session', JSON.stringify({
        date: new Date().toISOString(),
        topics: topics.length > 0 ? topics : extractTopicsFromText(allText),
        emotions: [...new Set(emotions)],
        people: [...new Set(people)],
        lastQuestion: lastOriQuestion,
        messageCount: userMessages.length,
      }))
      
      // Ori's closing
      const closingMessage = "This conversation has been saved to your archive. What you've shared here—these are the threads of your story. They matter. Until next time."
      
      setOriState('speaking')
      const OriMessage: Message = {
        id: Date.now().toString(),
        role: 'Ori',
        content: closingMessage,
        timestamp: new Date(),
      }
      setCurrentOriMessage(OriMessage)
      
      simulateTyping(closingMessage, () => {
        setMemory(prev => ({
          ...prev,
          messages: [...prev.messages, OriMessage],
        }))
        setCurrentOriMessage(null)
        setOriState('waiting')
      })
    },
  })

  // Parse Ori's JSON response and extract user-facing text + memory data
  const parseOriResponse = (rawResponse: string): { 
    replyToUser: string; 
    capturedMemory: CapturedMemory | null;
    requestedUpload: 'photo' | 'document' | 'audio' | null;
    activeMode: 'standard' | 'astro';
    listeningAnalysis: ListeningAnalysis | null;
  } => {
    try {
      // Try to parse as JSON (v2.0 protocol with listening_analysis)
      const parsed: OriTurnOutput = JSON.parse(rawResponse)
      
      // Extract listening analysis (Master Interviewer brain)
      let listeningAnalysis: ListeningAnalysis | null = null
      if (parsed.listening_analysis) {
        listeningAnalysis = {
          user_emotional_state: parsed.listening_analysis.user_emotional_state,
          subtext_detection: parsed.listening_analysis.subtext_detection,
          dangling_threads: parsed.listening_analysis.dangling_threads || [],
          connection_opportunity: parsed.listening_analysis.connection_opportunity,
          chosen_tactic: parsed.listening_analysis.chosen_tactic,
        }
        // Log tactic for debugging (hidden from user)
        console.log(`🧠 Ori's Brain: [${listeningAnalysis.chosen_tactic}] ${listeningAnalysis.subtext_detection || 'No subtext detected'}`)
        if (listeningAnalysis.connection_opportunity) {
          console.log(`🔗 Loop-back opportunity: ${listeningAnalysis.connection_opportunity}`)
        }
      }
      
      // Extract captured memory if status is 'capturing'
      let capturedMemory: CapturedMemory | null = null
      if (parsed.memory_data.status === 'capturing') {
        capturedMemory = {
          turn_id: parsed.turn_id,
          scene_id: parsed.memory_data.scene_id,
          approx_date: parsed.memory_data.approx_date,
          location: parsed.memory_data.location,
          people: parsed.memory_data.people,
          ghostwritten_text: parsed.memory_data.ghostwritten_text,
          scores: parsed.memory_data.scores,
          chapter_theme: parsed.system_flags.chapter_theme,
        }
      }
      
      return {
        replyToUser: parsed.reply_to_user,
        capturedMemory,
        requestedUpload: parsed.system_flags.requested_upload || null,
        activeMode: parsed.system_flags.active_mode || 'standard',
        listeningAnalysis,
      }
    } catch {
      // If not valid JSON, treat as plain text (fallback mode)
      return {
        replyToUser: rawResponse,
        capturedMemory: null,
        requestedUpload: null,
        activeMode: 'standard',
        listeningAnalysis: null,
      }
    }
  }

  // Generate Ori's response (this would connect to your LLM API)
  const generateOriResponse = async (userMessage: string, conversationContext: string): Promise<{ 
    replyToUser: string; 
    capturedMemory: CapturedMemory | null;
    requestedUpload: 'photo' | 'document' | 'audio' | null;
    activeMode: 'standard' | 'astro';
    listeningAnalysis: ListeningAnalysis | null;
  }> => {
    // In production, this would call your LLM API with:
    // - Ori_SYSTEM_PROMPT as the system message
    // - conversationContext as the conversation history
    // - userMessage as the latest user input
    
    const apiEndpoint = '/api/ai/Ori'
    
    // Include birth data for Astro Mode eligibility
    const astroContext = birthData.astroEnabled && birthData.time && birthData.place
      ? `\n\n[ASTRO MODE ENABLED - User birth data: ${birthData.date} at ${birthData.time} in ${birthData.place}. You may use astro overlay when relevant.]`
      : ''
    
    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: Ori_SYSTEM_PROMPT + astroContext,
          conversationHistory: conversationContext,
          userMessage,
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        // Parse the response (handles both JSON protocol and plain text)
        return parseOriResponse(data.response)
      }
    } catch (error) {
      console.log('AI endpoint not available, using fallback')
    }
    
    // Fallback response pattern (demonstrates correct Ori behavior)
    const fallbackText = generateFallbackResponse(userMessage, memory)
    return { replyToUser: fallbackText, capturedMemory: null, requestedUpload: null, activeMode: 'standard', listeningAnalysis: null }
  }

  const handleSend = async () => {
    if (!inputValue.trim() || OriState === 'thinking' || OriState === 'speaking') return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    }

    // Extract timeline events silently
    const newEvents = extractTimelineEvents(userMessage.content, userMessage.id)

    // Update memory with user message
    setMemory(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      timelineEvents: [...prev.timelineEvents, ...newEvents],
    }))

    setInputValue('')
    setOriState('thinking')

    // Build context for LLM
    const context = buildConversationContext({
      ...memory,
      messages: [...memory.messages, userMessage],
    })

    // Simulate thinking time
    const thinkTime = Ori_CONFIG.minThinkingTime + 
      Math.random() * (Ori_CONFIG.maxThinkingTime - Ori_CONFIG.minThinkingTime)

    setTimeout(async () => {
      try {
        const { replyToUser, capturedMemory, requestedUpload } = await generateOriResponse(userMessage.content, context)
        
        setOriState('speaking')
        const OriMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'Ori',
          content: replyToUser,
          timestamp: new Date(),
        }
        setCurrentOriMessage(OriMessage)

        // Log upload request for future UI integration
        if (requestedUpload) {
          console.log(`📎 Ori requested artifact upload: ${requestedUpload}`)
          // TODO: Trigger upload UI modal based on requestedUpload type
        }

        simulateTyping(replyToUser, () => {
          setMemory(prev => ({
            ...prev,
            messages: [...prev.messages, OriMessage],
            // Store captured memory if present
            capturedMemories: capturedMemory 
              ? [...prev.capturedMemories, capturedMemory]
              : prev.capturedMemories,
          }))
          setCurrentOriMessage(null)
          setOriState('listening')
          textareaRef.current?.focus()
        })
      } catch (error) {
        console.error('Error generating response:', error)
        setOriState('listening')
      }
    }, thinkTime)
  }

  const handleSaveInterview = () => {
    const userMessages = memory.messages.filter(m => m.role === 'user')
    if (userMessages.length < 2) return

    const title = extractTitle(memory.messages)
    const transcript = memory.messages.map(m => 
      m.role === 'Ori' ? `**Ori:** ${m.content}` : `**You:** ${m.content}`
    ).join('\n\n')

    // Include timeline events as metadata
    const timelineNotes = memory.timelineEvents.length > 0
      ? `\n\n---\n\n### Timeline References\n${memory.timelineEvents.map(e => `- ${e.type}: ${e.value}`).join('\n')}`
      : ''

    createEvent({
      title,
      date: new Date().toISOString().split('T')[0],
      summary: userMessages[0]?.content.slice(0, 200) || '',
      notes: `## Interview with Ori\n\n${transcript}${timelineNotes}`,
      emotionTags: [],
      location: null,
      chapterId: null,
      traumaCycleId: null,
    })
  }

  const handleStartOver = () => {
    setMemory({
      messages: [],
      timelineEvents: [],
      capturedMemories: [],
      themes: [],
      emotionalPeaks: [],
      sessionStart: new Date(),
    })
    setIsSaved(false)
    setCurrentOriMessage(null)
    setOriState('waiting')

    setTimeout(() => {
      const greeting = Ori_OPENINGS.returning
      setOriState('speaking')
      const OriMessage: Message = {
        id: Date.now().toString(),
        role: 'Ori',
        content: greeting,
        timestamp: new Date(),
      }
      setCurrentOriMessage(OriMessage)
      
      simulateTyping(greeting, () => {
        setMemory(prev => ({
          ...prev,
          messages: [OriMessage],
        }))
        setCurrentOriMessage(null)
        setOriState('listening')
      })
    }, 500)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSkipTyping = () => {
    if (currentOriMessage && isTyping) {
      skipToEnd(currentOriMessage.content)
      setMemory(prev => ({
        ...prev,
        messages: [...prev.messages, currentOriMessage],
      }))
      setCurrentOriMessage(null)
      setOriState('listening')
    }
  }

  const userMessageCount = memory.messages.filter(m => m.role === 'user').length

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/30 via-amber-50/20 to-violet-50/30 dark:from-slate-950 dark:via-violet-950/20 dark:to-slate-900 flex flex-col">
      {/* Breathing animation keyframes */}
      <style>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.1); opacity: 0.7; }
        }
        @keyframes gentle-glow {
          0%, 100% { box-shadow: 0 0 20px -5px hsl(20 90% 60% / 0.2); }
          50% { box-shadow: 0 0 30px -5px hsl(20 90% 60% / 0.4); }
        }
      `}</style>

      {/* Header - warm, inviting */}
      <div className="border-b border-rose-100/50 dark:border-violet-900/30 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/')}
            className="text-muted-foreground hover:text-foreground"
          >
            <Home className="w-4 h-4 mr-2" />
            Exit
          </Button>
          
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium text-foreground/70 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary/60 animate-pulse" />
              Ori
            </div>
          </div>
          
          {/* Astro Mode Toggle - Prominent placement */}
          <button
            onClick={() => setShowAstroSettings(true)}
            className={`text-sm px-4 py-2 rounded-full border-2 transition-all font-medium flex items-center gap-2 ${
              birthData.astroEnabled && birthData.time && birthData.place
                ? 'bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 border-violet-400 dark:border-violet-600 shadow-sm'
                : 'bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/30 border-violet-300 dark:border-violet-700'
            }`}
            title="Astro Mode - View your life through the stars"
          >
            <span className="text-lg">✦</span>
            {birthData.astroEnabled && birthData.time && birthData.place ? 'Astro Mode On' : 'Astro Mode'}
          </button>
          
          <div className="flex gap-2">
            {userMessageCount >= 2 && !isSaved && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSaveInterview} 
                disabled={isSaving}
                className="text-muted-foreground hover:text-foreground"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Preserving...' : 'Save Story'}
              </Button>
            )}
            {userMessageCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleStartOver}
                className="text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Astro Settings Modal */}
      {showAstroSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border rounded-xl shadow-xl max-w-md w-full mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                ✧ Astro Mode
              </h3>
              <button 
                onClick={() => setShowAstroSettings(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            
            <p className="text-sm text-muted-foreground">
              When enabled, Ori can overlay astrological timing context onto your memories—seeing life patterns through planetary cycles. This is optional and requires your exact birth data.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium block mb-1">Birth Date</label>
                <input
                  type="date"
                  value={birthData.date || ''}
                  onChange={(e) => {
                    const newData = { ...birthData, date: e.target.value || null }
                    setBirthData(newData)
                    localStorage.setItem('origins-birth-data', JSON.stringify(newData))
                  }}
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium block mb-1">Birth Time (exact)</label>
                <input
                  type="time"
                  value={birthData.time || ''}
                  onChange={(e) => {
                    const newData = { ...birthData, time: e.target.value || null }
                    setBirthData(newData)
                    localStorage.setItem('origins-birth-data', JSON.stringify(newData))
                  }}
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                />
                <p className="text-xs text-muted-foreground mt-1">Required for accurate chart. Check your birth certificate.</p>
              </div>
              
              <div>
                <label className="text-sm font-medium block mb-1">Birth Place</label>
                <input
                  type="text"
                  placeholder="City, Country"
                  value={birthData.place || ''}
                  onChange={(e) => {
                    const newData = { ...birthData, place: e.target.value || null }
                    setBirthData(newData)
                    localStorage.setItem('origins-birth-data', JSON.stringify(newData))
                  }}
                  className="w-full px-3 py-2 border rounded-lg bg-background"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={birthData.astroEnabled}
                  onChange={(e) => {
                    const newData = { ...birthData, astroEnabled: e.target.checked }
                    setBirthData(newData)
                    localStorage.setItem('origins-birth-data', JSON.stringify(newData))
                  }}
                  className="w-4 h-4"
                  disabled={!birthData.time || !birthData.place}
                />
                <span className="text-sm">Enable Astro Mode</span>
              </label>
              
              {(!birthData.time || !birthData.place) && (
                <span className="text-xs text-amber-600">Requires time & place</span>
              )}
            </div>

            <div className="border-t pt-3 mt-2">
              <p className="text-xs text-muted-foreground mb-2">Don't know your exact birth time?</p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setShowAstroSettings(false)
                  setShowRectification(true)
                }}
                disabled={!birthData.date || !birthData.place}
                className="w-full"
              >
                ✧ Try Birth Time Rectification
              </Button>
            </div>

            <Button 
              onClick={() => setShowAstroSettings(false)}
              className="w-full"
            >
              Done
            </Button>
          </div>
        </div>
      )}

      {/* Rectification Wizard */}
      {showRectification && (
        <RectificationWizard
          birthDate={birthData.date}
          birthPlace={birthData.place}
          onComplete={(estimatedTime) => {
            const newData = { ...birthData, time: estimatedTime }
            setBirthData(newData)
            localStorage.setItem('origins-birth-data', JSON.stringify(newData))
            setShowRectification(false)
            setShowAstroSettings(true)
          }}
          onCancel={() => {
            setShowRectification(false)
            setShowAstroSettings(true)
          }}
        />
      )}

      {/* Messages - warm, spacious, inspiring */}
      <div className="flex-1 overflow-y-auto" onClick={handleSkipTyping}>
        <div className="container max-w-2xl mx-auto px-4 py-8 space-y-8">
          {memory.messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'Ori' && (
                <div className="flex-shrink-0">
                  <OriPresence state="waiting" />
                </div>
              )}
              <div
                className={`max-w-[80%] ${
                  message.role === 'Ori'
                    ? 'text-foreground/90'
                    : 'bg-gradient-to-br from-primary/10 to-accent/10 dark:from-primary/20 dark:to-accent/20 rounded-2xl rounded-tr-sm px-5 py-4 text-foreground'
                }`}
              >
                <p className="text-lg leading-relaxed whitespace-pre-wrap">
                  {message.content}
                </p>
              </div>
            </div>
          ))}

          {/* Current Ori message being typed */}
          {currentOriMessage && (
            <div className="flex gap-4 justify-start">
              <div className="flex-shrink-0">
                <OriPresence state={OriState} />
              </div>
              <div className="max-w-[80%] text-foreground/90">
                <p className="text-lg leading-relaxed whitespace-pre-wrap">
                  {displayedText}
                  {isTyping && <span className="animate-pulse text-primary">|</span>}
                </p>
              </div>
            </div>
          )}

          {/* Thinking state */}
          {OriState === 'thinking' && !currentOriMessage && (
            <div className="flex gap-4 justify-start">
              <div className="flex-shrink-0">
                <OriPresence state="thinking" />
              </div>
              <div className="text-muted-foreground text-lg italic">
                {/* Presence speaks for itself */}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input - warm, inviting, frictionless */}
      {!isSaved && (
        <div className="border-t border-rose-100/50 dark:border-violet-900/30 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm sticky bottom-0">
          <div className="container max-w-2xl mx-auto px-4 py-4">
            <div className="flex gap-3 items-end">
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={OriState === 'listening' ? "Share what's on your heart..." : ""}
                  className="min-h-[56px] max-h-[200px] resize-none bg-white dark:bg-slate-900 border-border/50 focus:border-primary/50 dark:focus:border-primary/50 rounded-xl pr-12 shadow-sm"
                  disabled={OriState === 'thinking' || OriState === 'speaking'}
                />
                
                {/* Voice input button */}
                {'webkitSpeechRecognition' in window && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={isListening ? stopListening : startListening}
                    className={`absolute right-2 bottom-2 h-8 w-8 ${isListening ? 'text-red-500' : 'text-stone-400'}`}
                    disabled={OriState === 'thinking' || OriState === 'speaking'}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </Button>
                )}
              </div>
              
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim() || OriState === 'thinking' || OriState === 'speaking'}
                size="icon"
                className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white shadow-lg shadow-primary/20"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground/60 mt-2 text-center">
              Press Enter to share · Shift+Enter for new line
            </p>
          </div>
        </div>
      )}

      {/* Saved state - celebratory */}
      {isSaved && (
        <div className="border-t border-rose-100/50 dark:border-violet-900/30 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm sticky bottom-0">
          <div className="container max-w-2xl mx-auto px-4 py-6 text-center">
            <p className="text-sm text-foreground/70 mb-4">Your story has been preserved ✨</p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => navigate('/events')}>
                View Your Moments
              </Button>
              <Button onClick={handleStartOver} className="bg-gradient-to-r from-primary to-primary/80 text-white">
                Continue Your Story
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function extractTitle(messages: Message[]): string {
  const firstUserMessage = messages.find(m => m.role === 'user')?.content || ''
  const words = firstUserMessage.split(' ').slice(0, 8).join(' ')
  return words.length > 5 ? words + '...' : 'Interview with Ori'
}

function extractTopicsFromText(text: string): string[] {
  const topics: string[] = []
  const lowerText = text.toLowerCase()
  
  // Common memoir topic keywords
  const topicPatterns: Record<string, string[]> = {
    'childhood': ['grew up', 'childhood', 'kid', 'young', 'school', 'parents', 'mom', 'dad', 'mother', 'father'],
    'family': ['family', 'brother', 'sister', 'sibling', 'grandma', 'grandpa', 'aunt', 'uncle', 'cousin'],
    'relationships': ['married', 'wedding', 'divorce', 'boyfriend', 'girlfriend', 'partner', 'love', 'relationship'],
    'career': ['job', 'work', 'career', 'boss', 'company', 'business', 'promotion', 'fired', 'hired'],
    'loss': ['died', 'death', 'passed away', 'funeral', 'grief', 'lost', 'miss'],
    'health': ['sick', 'hospital', 'doctor', 'surgery', 'diagnosis', 'recovery', 'health'],
    'travel': ['moved', 'travel', 'trip', 'vacation', 'country', 'city', 'lived in'],
    'education': ['college', 'university', 'degree', 'graduated', 'teacher', 'professor'],
    'milestones': ['born', 'birthday', 'anniversary', 'first time', 'achievement'],
  }
  
  for (const [topic, keywords] of Object.entries(topicPatterns)) {
    if (keywords.some(kw => lowerText.includes(kw))) {
      topics.push(topic)
    }
  }
  
  return topics.slice(0, 3) // Max 3 topics
}

function generateFallbackResponse(userMessage: string, memory: InterviewMemory): string {
  const messageCount = memory.messages.filter(m => m.role === 'user').length
  const text = userMessage.toLowerCase()
  const isShortResponse = userMessage.split(' ').length < 15

  // WARMUP PHASE (first 3-4 exchanges): Easy, rapport-building questions
  // Like a good journalist: start with facts, build trust, THEN go emotional
  
  // Exchange 1: They answered "where did you grow up?"
  if (messageCount === 1) {
    return `${getReflection(userMessage)} That's a great place to start.

What was it like growing up there? Paint me a little picture—what do you remember about the neighborhood, the feel of the place?`
  }

  // Exchange 2: Building on their description
  if (messageCount === 2) {
    return `I can picture it. ${getReflection(userMessage)}

Who were the important people in your world back then? Could be family, friends, neighbors—whoever comes to mind first.`
  }

  // Exchange 3: They've mentioned people - gentle bridge to relationships
  if (messageCount === 3) {
    if (containsPerson(text)) {
      return `${getReflection(userMessage)} It sounds like they mattered to you.

Tell me a little more about them. What stands out when you think of them?`
    }
    return `${getReflection(userMessage)}

What's one thing from that time that you still carry with you today? Could be a lesson, a habit, a way of seeing things.`
  }

  // Exchange 4: Transition to slightly deeper territory
  if (messageCount === 4) {
    return `${getReflection(userMessage)} That's the kind of detail that brings a story to life.

Now I'm curious—was there a moment growing up when things shifted for you? A time when you started to see the world differently?`
  }

  // DEEPENING PHASE (exchanges 5+): Now we can go deeper, trust is established

  // Short/vague response - use sensory grounding
  if (isShortResponse && messageCount > 4) {
    return `I hear you. ${getReflection(userMessage)}

Take me back to that moment. What do you remember seeing around you?`
  }

  // Emotional content detected - now safe to explore
  if (containsEmotion(text) && messageCount > 3) {
    const emotion = detectEmotion(text)
    return `${getEmotionalValidation(emotion)} ${getReflection(userMessage)}

Where did you feel that in your body?`
  }

  // Person mentioned in deeper phase
  if (containsPerson(text) && messageCount > 3) {
    return `${getReflection(userMessage)} It sounds like this person was significant.

What did they mean to you during that time?`
  }

  // Default deepening questions (rotate through)
  const deepeningQuestions = [
    `${getReflection(userMessage)} There's something important there.

What stayed with you after that?`,

    `${getReflection(userMessage)} I can sense the weight of that.

How did that shape who you became?`,

    `${getReflection(userMessage)} Thank you for trusting me with that.

What do you know now that you didn't know then?`,

    `${getReflection(userMessage)} That's a powerful memory.

When you think about it now, what feelings come up?`,

    `${getReflection(userMessage)} I appreciate you sharing that.

Was there anyone else who witnessed this, or was it something you carried alone?`,
  ]

  return deepeningQuestions[(messageCount - 5) % deepeningQuestions.length]
}

function getReflection(text: string): string {
  const words = text.split(' ').length
  if (words < 10) {
    return "I hear you."
  }
  if (words < 30) {
    return "That's meaningful."
  }
  return "There's a lot in what you just shared."
}

function getEmotionalValidation(emotion: string): string {
  const validations: Record<string, string> = {
    sad: "That sounds like it was really painful.",
    angry: "I can feel the weight of that frustration.",
    scared: "That must have been frightening.",
    happy: "There's warmth in how you describe that.",
    lonely: "That kind of loneliness stays with us.",
    default: "I can sense how much this matters to you.",
  }
  return validations[emotion] || validations.default
}

function containsEmotion(text: string): boolean {
  const emotionWords = ['sad', 'angry', 'scared', 'happy', 'lonely', 'hurt', 'afraid', 'love', 'hate', 'miss', 'lost', 'broken']
  return emotionWords.some(word => text.includes(word))
}

function detectEmotion(text: string): string {
  if (text.includes('sad') || text.includes('cry') || text.includes('miss')) return 'sad'
  if (text.includes('angry') || text.includes('mad') || text.includes('furious')) return 'angry'
  if (text.includes('scared') || text.includes('afraid') || text.includes('fear')) return 'scared'
  if (text.includes('happy') || text.includes('joy') || text.includes('love')) return 'happy'
  if (text.includes('alone') || text.includes('lonely')) return 'lonely'
  return 'default'
}

function containsPerson(text: string): boolean {
  const personWords = ['mother', 'father', 'mom', 'dad', 'brother', 'sister', 'friend', 'husband', 'wife', 'child', 'son', 'daughter']
  return personWords.some(word => text.includes(word))
}
