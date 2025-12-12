import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { eventsApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Home, Save, RotateCcw, Mic, MicOff } from 'lucide-react'
import { NOAH_SYSTEM_PROMPT, NOAH_OPENINGS, NOAH_CONFIG } from '@/ai/personas/NoahPersona'

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
  role: 'noah' | 'user'
  content: string
  timestamp: Date
}

interface TimelineEvent {
  type: 'date' | 'year' | 'life_event' | 'person'
  value: string
  context: string
  messageId: string
}

interface InterviewMemory {
  messages: Message[]
  timelineEvents: TimelineEvent[]
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
    }, NOAH_CONFIG.typingSpeed + Math.random() * 20)

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
    const role = m.role === 'noah' ? 'Noah' : 'User'
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
// NOAH PRESENCE ANIMATION
// ============================================

function NoahPresence({ state }: { state: 'listening' | 'thinking' | 'speaking' | 'waiting' }) {
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

export default function NoahInterviewer() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  // State
  const [inputValue, setInputValue] = useState('')
  const [noahState, setNoahState] = useState<'listening' | 'thinking' | 'speaking' | 'waiting'>('waiting')
  const [memory, setMemory] = useState<InterviewMemory>({
    messages: [],
    timelineEvents: [],
    themes: [],
    emotionalPeaks: [],
    sessionStart: new Date(),
  })
  const [currentNoahMessage, setCurrentNoahMessage] = useState<Message | null>(null)
  const [isSaved, setIsSaved] = useState(false)
  const [isFirstVisit] = useState(() => {
    const visited = localStorage.getItem('memoirark-noah-visited')
    if (!visited) {
      localStorage.setItem('memoirark-noah-visited', 'true')
      return true
    }
    return false
  })

  // Hooks
  const { displayedText, isTyping, simulateTyping, skipToEnd } = useTypingSimulation()
  const { isListening, transcript, startListening, stopListening, clearTranscript } = useSpeechRecognition()

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [memory.messages, displayedText])

  // Handle voice transcript
  useEffect(() => {
    if (transcript.trim()) {
      setInputValue(prev => (prev + ' ' + transcript).trim())
      clearTranscript()
    }
  }, [transcript, clearTranscript])

  // Initial greeting
  useEffect(() => {
    if (memory.messages.length === 0) {
      const greeting = isFirstVisit ? NOAH_OPENINGS.firstTime : NOAH_OPENINGS.returning
      
      setTimeout(() => {
        setNoahState('speaking')
        const noahMessage: Message = {
          id: Date.now().toString(),
          role: 'noah',
          content: greeting,
          timestamp: new Date(),
        }
        setCurrentNoahMessage(noahMessage)
        
        simulateTyping(greeting, () => {
          setMemory(prev => ({
            ...prev,
            messages: [...prev.messages, noahMessage],
          }))
          setCurrentNoahMessage(null)
          setNoahState('listening')
        })
      }, NOAH_CONFIG.thinkingDelay)
    }
  }, [])

  // Save mutation
  const { mutate: createEvent, isPending: isSaving } = useMutation({
    mutationFn: eventsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      setIsSaved(true)
      
      // Noah's closing
      const closingMessage = "This conversation has been saved to your archive. What you've shared here—these are the threads of your story. They matter. Until next time."
      
      setNoahState('speaking')
      const noahMessage: Message = {
        id: Date.now().toString(),
        role: 'noah',
        content: closingMessage,
        timestamp: new Date(),
      }
      setCurrentNoahMessage(noahMessage)
      
      simulateTyping(closingMessage, () => {
        setMemory(prev => ({
          ...prev,
          messages: [...prev.messages, noahMessage],
        }))
        setCurrentNoahMessage(null)
        setNoahState('waiting')
      })
    },
  })

  // Generate Noah's response (this would connect to your LLM API)
  const generateNoahResponse = async (userMessage: string, conversationContext: string): Promise<string> => {
    // In production, this would call your LLM API with:
    // - NOAH_SYSTEM_PROMPT as the system message
    // - conversationContext as the conversation history
    // - userMessage as the latest user input
    
    // For now, we'll use a placeholder that demonstrates the expected behavior
    // This should be replaced with actual API call
    
    const apiEndpoint = '/api/ai/noah'
    
    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: NOAH_SYSTEM_PROMPT,
          conversationHistory: conversationContext,
          userMessage,
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        return data.response
      }
    } catch (error) {
      console.log('AI endpoint not available, using fallback')
    }
    
    // Fallback response pattern (demonstrates correct Noah behavior)
    // This follows the Active Listening Loop: Reflect → Validate → Ask ONE question
    return generateFallbackResponse(userMessage, memory)
  }

  const handleSend = async () => {
    if (!inputValue.trim() || noahState === 'thinking' || noahState === 'speaking') return

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
    setNoahState('thinking')

    // Build context for LLM
    const context = buildConversationContext({
      ...memory,
      messages: [...memory.messages, userMessage],
    })

    // Simulate thinking time
    const thinkTime = NOAH_CONFIG.minThinkingTime + 
      Math.random() * (NOAH_CONFIG.maxThinkingTime - NOAH_CONFIG.minThinkingTime)

    setTimeout(async () => {
      try {
        const response = await generateNoahResponse(userMessage.content, context)
        
        setNoahState('speaking')
        const noahMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'noah',
          content: response,
          timestamp: new Date(),
        }
        setCurrentNoahMessage(noahMessage)

        simulateTyping(response, () => {
          setMemory(prev => ({
            ...prev,
            messages: [...prev.messages, noahMessage],
          }))
          setCurrentNoahMessage(null)
          setNoahState('listening')
          textareaRef.current?.focus()
        })
      } catch (error) {
        console.error('Error generating response:', error)
        setNoahState('listening')
      }
    }, thinkTime)
  }

  const handleSaveInterview = () => {
    const userMessages = memory.messages.filter(m => m.role === 'user')
    if (userMessages.length < 2) return

    const title = extractTitle(memory.messages)
    const transcript = memory.messages.map(m => 
      m.role === 'noah' ? `**Noah:** ${m.content}` : `**You:** ${m.content}`
    ).join('\n\n')

    // Include timeline events as metadata
    const timelineNotes = memory.timelineEvents.length > 0
      ? `\n\n---\n\n### Timeline References\n${memory.timelineEvents.map(e => `- ${e.type}: ${e.value}`).join('\n')}`
      : ''

    createEvent({
      title,
      date: new Date().toISOString().split('T')[0],
      summary: userMessages[0]?.content.slice(0, 200) || '',
      notes: `## Interview with Noah\n\n${transcript}${timelineNotes}`,
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
      themes: [],
      emotionalPeaks: [],
      sessionStart: new Date(),
    })
    setIsSaved(false)
    setCurrentNoahMessage(null)
    setNoahState('waiting')

    setTimeout(() => {
      const greeting = NOAH_OPENINGS.returning
      setNoahState('speaking')
      const noahMessage: Message = {
        id: Date.now().toString(),
        role: 'noah',
        content: greeting,
        timestamp: new Date(),
      }
      setCurrentNoahMessage(noahMessage)
      
      simulateTyping(greeting, () => {
        setMemory(prev => ({
          ...prev,
          messages: [noahMessage],
        }))
        setCurrentNoahMessage(null)
        setNoahState('listening')
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
    if (currentNoahMessage && isTyping) {
      skipToEnd(currentNoahMessage.content)
      setMemory(prev => ({
        ...prev,
        messages: [...prev.messages, currentNoahMessage],
      }))
      setCurrentNoahMessage(null)
      setNoahState('listening')
    }
  }

  const userMessageCount = memory.messages.filter(m => m.role === 'user').length

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-stone-100 dark:from-stone-950 dark:to-stone-900 flex flex-col">
      {/* Breathing animation keyframes */}
      <style>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.15); opacity: 0.6; }
        }
      `}</style>

      {/* Header - minimal, calm */}
      <div className="border-b border-stone-200 dark:border-stone-800 bg-white/50 dark:bg-stone-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/')}
            className="text-stone-500 hover:text-stone-700 dark:text-stone-400"
          >
            <Home className="w-4 h-4 mr-2" />
            Exit
          </Button>
          
          <div className="text-sm text-stone-500 dark:text-stone-400 font-medium">
            Interview with Noah
          </div>
          
          <div className="flex gap-2">
            {userMessageCount >= 2 && !isSaved && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSaveInterview} 
                disabled={isSaving}
                className="text-stone-500 hover:text-stone-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            )}
            {userMessageCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleStartOver}
                className="text-stone-500 hover:text-stone-700"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Messages - calm, spacious */}
      <div className="flex-1 overflow-y-auto" onClick={handleSkipTyping}>
        <div className="container max-w-2xl mx-auto px-4 py-8 space-y-8">
          {memory.messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'noah' && (
                <div className="flex-shrink-0">
                  <NoahPresence state="waiting" />
                </div>
              )}
              <div
                className={`max-w-[80%] ${
                  message.role === 'noah'
                    ? 'text-stone-700 dark:text-stone-300'
                    : 'bg-stone-200 dark:bg-stone-800 rounded-2xl rounded-tr-sm px-5 py-4 text-stone-800 dark:text-stone-200'
                }`}
              >
                <p className="text-lg leading-relaxed whitespace-pre-wrap">
                  {message.content}
                </p>
              </div>
            </div>
          ))}

          {/* Current Noah message being typed */}
          {currentNoahMessage && (
            <div className="flex gap-4 justify-start">
              <div className="flex-shrink-0">
                <NoahPresence state={noahState} />
              </div>
              <div className="max-w-[80%] text-stone-700 dark:text-stone-300">
                <p className="text-lg leading-relaxed whitespace-pre-wrap">
                  {displayedText}
                  {isTyping && <span className="animate-pulse">|</span>}
                </p>
              </div>
            </div>
          )}

          {/* Thinking state */}
          {noahState === 'thinking' && !currentNoahMessage && (
            <div className="flex gap-4 justify-start">
              <div className="flex-shrink-0">
                <NoahPresence state="thinking" />
              </div>
              <div className="text-stone-400 dark:text-stone-500 text-lg italic">
                {/* No loading indicator - just presence */}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input - warm, inviting */}
      {!isSaved && (
        <div className="border-t border-stone-200 dark:border-stone-800 bg-white/50 dark:bg-stone-900/50 backdrop-blur-sm sticky bottom-0">
          <div className="container max-w-2xl mx-auto px-4 py-4">
            <div className="flex gap-3 items-end">
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={noahState === 'listening' ? "Take your time..." : ""}
                  className="min-h-[56px] max-h-[200px] resize-none bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700 focus:border-amber-400 dark:focus:border-amber-600 rounded-xl pr-12"
                  disabled={noahState === 'thinking' || noahState === 'speaking'}
                />
                
                {/* Voice input button */}
                {'webkitSpeechRecognition' in window && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={isListening ? stopListening : startListening}
                    className={`absolute right-2 bottom-2 h-8 w-8 ${isListening ? 'text-red-500' : 'text-stone-400'}`}
                    disabled={noahState === 'thinking' || noahState === 'speaking'}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </Button>
                )}
              </div>
              
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim() || noahState === 'thinking' || noahState === 'speaking'}
                size="icon"
                className="h-14 w-14 rounded-xl bg-amber-500 hover:bg-amber-600 text-white"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
            
            <p className="text-xs text-stone-400 mt-2 text-center">
              Press Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      )}

      {/* Saved state */}
      {isSaved && (
        <div className="border-t border-stone-200 dark:border-stone-800 bg-white/50 dark:bg-stone-900/50 backdrop-blur-sm sticky bottom-0">
          <div className="container max-w-2xl mx-auto px-4 py-6 text-center">
            <p className="text-sm text-stone-500 mb-4">Interview saved to your archive</p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => navigate('/events')}>
                View Events
              </Button>
              <Button onClick={handleStartOver} className="bg-amber-500 hover:bg-amber-600 text-white">
                Start New Interview
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
  return words.length > 5 ? words + '...' : 'Interview with Noah'
}

function generateFallbackResponse(userMessage: string, memory: InterviewMemory): string {
  const messageCount = memory.messages.filter(m => m.role === 'user').length
  const text = userMessage.toLowerCase()
  const isShortResponse = userMessage.split(' ').length < 15

  // Active Listening Loop: Reflect → Validate → Ask ONE question

  // Opening exchanges - establish safety
  if (messageCount === 0) {
    return `Thank you for sharing that with me. ${getReflection(userMessage)}

What comes up for you when you sit with that memory?`
  }

  // Short/vague response - use sensory grounding
  if (isShortResponse && messageCount > 0) {
    return `I hear you. ${getReflection(userMessage)}

Take me back to that moment. What do you remember seeing around you?`
  }

  // Emotional content detected
  if (containsEmotion(text)) {
    const emotion = detectEmotion(text)
    return `${getEmotionalValidation(emotion)} ${getReflection(userMessage)}

Where did you feel that in your body?`
  }

  // Person mentioned
  if (containsPerson(text)) {
    return `${getReflection(userMessage)} It sounds like this person was significant.

What did they mean to you during that time?`
  }

  // Default deepening
  const reflections = [
    `${getReflection(userMessage)} There's something important there.

What stayed with you after that?`,

    `${getReflection(userMessage)} I can sense the weight of that.

How did that shape who you became?`,

    `${getReflection(userMessage)} Thank you for trusting me with that.

What do you know now that you didn't know then?`,
  ]

  return reflections[messageCount % reflections.length]
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
