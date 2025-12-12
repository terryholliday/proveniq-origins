import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { eventsApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Home, Save, RotateCcw } from 'lucide-react'

interface Message {
  id: string
  speaker: 'noah' | 'user'
  text: string
  timestamp: Date
}

interface InterviewState {
  questionCount: number
  mentionedPeople: string[]
  emotionalWords: string[]
  hasGottenDeep: boolean
}

// Oprah sweeps week style - go for the jugular, dig into wounds
function generateNextQuestion(messages: Message[], state: InterviewState): string {
  const lastUserMessage = messages.filter(m => m.speaker === 'user').slice(-1)[0]?.text || ''
  const lastText = lastUserMessage.toLowerCase()
  
  // Opening - direct and provocative
  if (state.questionCount === 0) {
    return pickRandom([
      "What's the one thing from your past that you've never been able to forgive?",
      "Tell me about the moment that broke you. The one you still think about.",
      "Who hurt you the most? And why haven't you let it go?",
      "What's the secret you've been carrying that's eating you alive?",
    ])
  }

  // They're being evasive - call them out hard
  if (lastUserMessage.length < 50 && state.questionCount > 1) {
    return pickRandom([
      "No. That's not it. You're deflecting. What are you really trying to avoid telling me?",
      "I've interviewed hundreds of people. I know when someone's hiding something. What is it?",
      "That answer was safe. I don't want safe. I want the truth that scares you.",
      "You're protecting someone. Or protecting yourself. Which is it?",
      "Stop. Take a breath. Now tell me what you're actually feeling right now.",
    ])
  }

  // ANGER - dig into the rage
  if (lastText.includes('angry') || lastText.includes('furious') || lastText.includes('mad') || lastText.includes('hate')) {
    return pickRandom([
      "That anger—have you ever let yourself fully feel it? Or do you keep it locked away because you're afraid of what you might do?",
      "Who taught you that anger wasn't safe to express? What happened when you showed it as a child?",
      "If you could scream at them right now—really let it out—what would you say? Don't edit yourself.",
      "The anger is the easy part. What's the grief underneath it that you're not ready to face?",
    ])
  }

  // FEAR - expose the terror
  if (lastText.includes('scared') || lastText.includes('afraid') || lastText.includes('terrified') || lastText.includes('fear')) {
    return pickRandom([
      "What's the worst thing you've imagined happening? Say it out loud. Give it a name.",
      "That fear—is it about what might happen? Or is it about what already did?",
      "Who was supposed to protect you and didn't? Where were they?",
      "When you're alone at night and the fear comes—what does it whisper to you?",
    ])
  }

  // LOVE - expose the wounds
  if (lastText.includes('love') || lastText.includes('loved')) {
    return pickRandom([
      "Did they actually love you? Or did they just need you?",
      "What did you have to become to be loved in that house? What parts of yourself did you have to hide?",
      "When did you first realize that love could hurt this much?",
      "Do you even know what real love feels like? Or have you been chasing a broken version your whole life?",
    ])
  }

  // PAIN/HURT - go deeper into the wound
  if (lastText.includes('hurt') || lastText.includes('pain') || lastText.includes('broken') || lastText.includes('damage')) {
    return pickRandom([
      "That wound—do you pick at it? Do you keep going back to it, reliving it?",
      "Have you ever let yourself fully grieve this? Or do you just keep pushing through?",
      "What did this break in you that never healed right?",
      "If that pain could talk, what would it say it needs from you?",
    ])
  }

  // SHAME - expose it
  if (lastText.includes('shame') || lastText.includes('embarrass') || lastText.includes('guilty') || lastText.includes('fault')) {
    return pickRandom([
      "Whose voice is that? When you feel that shame—whose words are you hearing?",
      "What did you do that you've never forgiven yourself for? Say it.",
      "Do you actually believe you deserved what happened? Look at me. Do you?",
      "That shame isn't yours. Someone put it there. Who was it?",
    ])
  }

  // MOTHER - go for the maternal wound
  if (lastText.includes('mother') || lastText.includes('mom') || lastText.includes('mama')) {
    return pickRandom([
      "Did your mother see you? The real you? Or did she see what she wanted to see?",
      "What did you need from her that she couldn't give you? And have you spent your whole life looking for it in other people?",
      "When your mother looked at you—did you feel loved? Or did you feel like a burden?",
      "What's the conversation you never had with her that you're still having in your head?",
      "Did she protect you? When it mattered most, was she there?",
    ])
  }

  // FATHER - go for the paternal wound
  if (lastText.includes('father') || lastText.includes('dad') || lastText.includes('daddy')) {
    return pickRandom([
      "Was he there? I don't mean physically—was he emotionally present? Did he show up for you?",
      "What did his silence teach you? What did his absence say about your worth?",
      "Did you spend your childhood trying to earn his approval? Are you still trying?",
      "When you needed him most, where was he? And what did that teach you about men?",
      "Did he ever tell you he was proud of you? Did he ever say he loved you?",
    ])
  }

  // ABANDONMENT
  if (lastText.includes('left') || lastText.includes('abandon') || lastText.includes('alone') || lastText.includes('gone')) {
    return pickRandom([
      "When they left—what did you tell yourself about why? What story did you make up about your own worth?",
      "Do you leave people before they can leave you? Is that the pattern?",
      "That feeling of being left—do you still feel it? Even in a crowded room?",
      "Who was supposed to stay and didn't? And how has that shaped every relationship since?",
    ])
  }

  // BETRAYAL
  if (lastText.includes('betray') || lastText.includes('trust') || lastText.includes('lie') || lastText.includes('cheat')) {
    return pickRandom([
      "After that betrayal—did you ever really trust anyone again? Or do you just pretend to?",
      "What did that teach you about people? About yourself?",
      "Do you blame yourself? Part of you thinks you should have seen it coming, doesn't it?",
      "Have you become the kind of person who betrays others? Or the kind who waits to be betrayed?",
    ])
  }

  // DEATH/LOSS
  if (lastText.includes('died') || lastText.includes('death') || lastText.includes('lost') || lastText.includes('gone') || lastText.includes('passed')) {
    return pickRandom([
      "Did you get to say goodbye? What would you have said if you'd known?",
      "What did you lose when they died that you've never gotten back?",
      "Do you talk to them still? What do you say?",
      "What's the thing you never told them that you wish you had?",
    ])
  }

  // CHILDHOOD
  if (lastText.includes('child') || lastText.includes('kid') || lastText.includes('young') || lastText.includes('little') || lastText.includes('grew up')) {
    return pickRandom([
      "What did that child need that no one gave them? What are you still hungry for?",
      "If you could go back and hold that child—what would you tell them?",
      "Did you have a childhood? Or did you have to grow up too fast?",
      "What did you learn in that house that you're still unlearning?",
    ])
  }

  // Probing deeper - sweeps week intensity
  if (state.questionCount >= 3 && !state.hasGottenDeep) {
    return pickRandom([
      "We're dancing around it. What's the thing you've never said out loud? Say it now.",
      "I can see it in your words—there's something underneath all of this. What is it?",
      "What's the thing you're most afraid I'll ask you about? Let's go there.",
      "You've been telling me the story. Now tell me the truth. What really happened?",
      "What did this cost you? What part of yourself did you lose?",
    ])
  }

  // Emotional core - go for the kill
  if (state.questionCount >= 5) {
    return pickRandom([
      "Do you think you deserved what happened to you? Be honest.",
      "What's the lie you've been telling yourself to survive? And do you still believe it?",
      "If you could go back and change one thing—just one—what would it be?",
      "What would it take for you to finally forgive yourself?",
      "Are you living your life? Or are you still living in reaction to what happened to you?",
    ])
  }

  // Closing - meaning and resolution
  if (state.questionCount >= 7) {
    return pickRandom([
      "After everything—what do you know now that you wish you'd known then?",
      "Has this made you stronger? Or has it made you harder? There's a difference.",
      "What do you want the rest of your story to be? You get to write it now.",
      "If you could be free of this—truly free—what would your life look like?",
    ])
  }

  // Default follow-ups - still pointed
  return pickRandom([
    "And how did that make you feel? Don't give me the polite answer.",
    "What aren't you telling me about that?",
    "Why does that still matter to you? Why does it still have power?",
    "What did you do with that feeling? Where did you put it?",
    "Who else knows this? Have you ever told anyone?",
    "What did you learn about yourself in that moment?",
    "And what did you decide? About yourself, about the world?",
  ])
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function extractTitle(messages: Message[]): string {
  const firstUserMessage = messages.find(m => m.speaker === 'user')?.text || ''
  const words = firstUserMessage.split(' ').slice(0, 8).join(' ')
  return words.length > 5 ? words + '...' : 'Untitled Memory'
}

export default function NoahWizardPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [inputValue, setInputValue] = useState('')
  const [isNoahTyping, setIsNoahTyping] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [interviewState, setInterviewState] = useState<InterviewState>({
    questionCount: 0,
    mentionedPeople: [],
    emotionalWords: [],
    hasGottenDeep: false,
  })
  const [isSaved, setIsSaved] = useState(false)

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Start with Noah's opening - direct and provocative
  useEffect(() => {
    if (messages.length === 0) {
      setIsNoahTyping(true)
      setTimeout(() => {
        setMessages([{
          id: '1',
          speaker: 'noah',
          text: "I'm Noah. I'm not here to make you comfortable. I'm here to help you tell the truth—the one you've been avoiding. So let's start with the hard stuff: What's the one thing from your past that still has power over you?",
          timestamp: new Date(),
        }])
        setIsNoahTyping(false)
      }, 1500)
    }
  }, [])

  const { mutate: createEvent, isPending: isSaving } = useMutation({
    mutationFn: eventsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      setIsSaved(true)
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        speaker: 'noah',
        text: "This conversation has been saved to your archive. You've done important work here today. The truth you've shared—that's the raw material of memoir. Until next time.",
        timestamp: new Date(),
      }])
    },
  })

  const handleSend = () => {
    if (!inputValue.trim() || isNoahTyping) return

    const userMessage: Message = {
      id: Date.now().toString(),
      speaker: 'user',
      text: inputValue.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsNoahTyping(true)

    // Update state
    const newState: InterviewState = {
      ...interviewState,
      questionCount: interviewState.questionCount + 1,
      hasGottenDeep: interviewState.questionCount >= 4,
    }
    setInterviewState(newState)

    // Simulate Noah thinking and responding
    const thinkTime = 1500 + Math.random() * 1500
    setTimeout(() => {
      const nextQuestion = generateNextQuestion([...messages, userMessage], newState)
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        speaker: 'noah',
        text: nextQuestion,
        timestamp: new Date(),
      }])
      setIsNoahTyping(false)
      textareaRef.current?.focus()
    }, thinkTime)
  }

  const handleSaveInterview = () => {
    if (messages.filter(m => m.speaker === 'user').length < 2) return
    
    const title = extractTitle(messages)
    const transcript = messages.map(m => 
      m.speaker === 'noah' ? `**Noah:** ${m.text}` : m.text
    ).join('\n\n')

    createEvent({
      title,
      date: new Date().toISOString().split('T')[0],
      summary: messages.find(m => m.speaker === 'user')?.text.slice(0, 200) || '',
      notes: `## Interview with Noah\n\n${transcript}`,
      emotionTags: [],
      location: null,
      chapterId: null,
      traumaCycleId: null,
    })
  }

  const handleStartOver = () => {
    setMessages([])
    setIsSaved(false)
    setInterviewState({
      questionCount: 0,
      mentionedPeople: [],
      emotionalWords: [],
      hasGottenDeep: false,
    })
    setTimeout(() => {
      setIsNoahTyping(true)
      setTimeout(() => {
        setMessages([{
          id: '1',
          speaker: 'noah',
          text: "Let's begin again. What's on your mind?",
          timestamp: new Date(),
        }])
        setIsNoahTyping(false)
      }, 1000)
    }, 100)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const userMessageCount = messages.filter(m => m.speaker === 'user').length

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col">
      {/* Header */}
      <div className="border-b bg-card/80 backdrop-blur sticky top-0 z-10">
        <div className="container max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <Home className="w-4 h-4 mr-2" />
            Exit
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900 dark:to-amber-800 flex items-center justify-center text-lg">
              🧔
            </div>
            <span className="font-display font-semibold">Interview with Noah</span>
          </div>
          <div className="flex gap-2">
            {userMessageCount >= 2 && !isSaved && (
              <Button variant="outline" size="sm" onClick={handleSaveInterview} disabled={isSaving}>
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            )}
            {userMessageCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleStartOver}>
                <RotateCcw className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="container max-w-3xl mx-auto px-4 py-6 space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-4 ${message.speaker === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.speaker === 'noah' && (
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-200 to-amber-300 dark:from-amber-800 dark:to-amber-700 flex items-center justify-center text-3xl flex-shrink-0 shadow-lg">
                  🧔
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-6 py-4 ${
                  message.speaker === 'noah'
                    ? 'bg-card border border-border shadow-md rounded-tl-sm'
                    : 'bg-primary text-primary-foreground rounded-tr-sm'
                }`}
              >
                <p className={`text-lg leading-relaxed ${message.speaker === 'noah' ? 'font-narrative text-foreground' : ''}`}>
                  {message.speaker === 'noah' ? message.text : message.text}
                </p>
              </div>
            </div>
          ))}

          {isNoahTyping && (
            <div className="flex gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-200 to-amber-300 dark:from-amber-800 dark:to-amber-700 flex items-center justify-center text-3xl flex-shrink-0 shadow-lg">
                🧔
              </div>
              <div className="bg-card border border-border shadow-md rounded-2xl rounded-tl-sm px-6 py-4">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      {!isSaved && (
        <div className="border-t bg-card/80 backdrop-blur sticky bottom-0">
          <div className="container max-w-3xl mx-auto px-4 py-4">
            <div className="flex gap-3">
              <Textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Take your time. Be honest..."
                className="min-h-[60px] max-h-[200px] resize-none"
                disabled={isNoahTyping}
              />
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim() || isNoahTyping}
                size="icon"
                className="h-[60px] w-[60px]"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Press Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      )}

      {/* Saved state */}
      {isSaved && (
        <div className="border-t bg-card/80 backdrop-blur sticky bottom-0">
          <div className="container max-w-3xl mx-auto px-4 py-4 text-center">
            <p className="text-sm text-muted-foreground mb-3">Interview saved to your archive</p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => navigate('/events')}>
                View Events
              </Button>
              <Button onClick={handleStartOver}>
                Start New Interview
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
