import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { MessageCircle, Send, ChevronRight, Check } from 'lucide-react'

interface Question {
  id: string
  question: string
  type: 'text' | 'textarea' | 'choice'
  choices?: string[]
  placeholder?: string
  field?: string
}

interface ContextAssistantProps {
  contentType: 'audio' | 'photo' | 'document' | 'event' | 'artifact' | 'person'
  contentSummary: string
  sourceType?: string
  onAnswersComplete: (answers: Record<string, string>) => void
  onSkip: () => void
}

const QUESTIONS_BY_TYPE: Record<string, Question[]> = {
  'audio-therapy-sessions': [
    { id: 'therapist', question: "Who was your therapist for this session?", type: 'text', placeholder: "e.g., Joy, Dr. Smith", field: 'therapist' },
    { id: 'timeframe', question: "When was this recorded (approximate date or period)?", type: 'text', placeholder: "e.g., Summer 2005, March 2006", field: 'timeframe' },
    { id: 'topic', question: "What was the main topic or focus of this session?", type: 'textarea', placeholder: "e.g., Processing childhood trauma, relationship issues...", field: 'topic' },
    { id: 'breakthrough', question: "Were there any breakthroughs or significant moments?", type: 'textarea', placeholder: "Describe any insights or emotional moments...", field: 'breakthrough' },
    { id: 'emotions', question: "What emotions come up when you think about this session?", type: 'choice', choices: ['healing', 'painful', 'hopeful', 'angry', 'sad', 'relieved', 'confused', 'empowered'], field: 'emotions' },
  ],
  'audio-voicemail': [
    { id: 'caller', question: "Who left this voicemail?", type: 'text', placeholder: "e.g., Mom, Dad, Ex-partner", field: 'caller' },
    { id: 'timeframe', question: "When was this message left (approximate)?", type: 'text', placeholder: "e.g., Christmas 2003, After the divorce", field: 'timeframe' },
    { id: 'context', question: "What was happening in your life when you received this?", type: 'textarea', placeholder: "Describe the circumstances...", field: 'context' },
    { id: 'significance', question: "Why did you save this message? What makes it significant?", type: 'textarea', placeholder: "What does this message mean to you?", field: 'significance' },
  ],
  'audio-interview': [
    { id: 'subject', question: "Who is being interviewed?", type: 'text', placeholder: "e.g., Grandmother, Uncle Joe", field: 'subject' },
    { id: 'interviewer', question: "Who conducted the interview?", type: 'text', placeholder: "e.g., Me, My sister", field: 'interviewer' },
    { id: 'topics', question: "What topics were covered?", type: 'textarea', placeholder: "e.g., Family history, immigration story, childhood memories", field: 'topics' },
    { id: 'revelations', question: "Were there any surprising revelations or stories?", type: 'textarea', placeholder: "Anything you learned for the first time?", field: 'revelations' },
  ],
  'audio-recording': [
    { id: 'what', question: "What is this recording of?", type: 'textarea', placeholder: "Describe what's captured in this audio...", field: 'what' },
    { id: 'when', question: "When was this recorded?", type: 'text', placeholder: "Date or time period", field: 'when' },
    { id: 'why', question: "Why did you record this? What made it worth capturing?", type: 'textarea', placeholder: "The significance of this moment...", field: 'why' },
  ],
  'photo': [
    { id: 'who', question: "Who is in this photo?", type: 'text', placeholder: "List the people pictured", field: 'who' },
    { id: 'when', question: "When was this taken?", type: 'text', placeholder: "Date or approximate time period", field: 'when' },
    { id: 'where', question: "Where was this taken?", type: 'text', placeholder: "Location", field: 'where' },
    { id: 'occasion', question: "What was the occasion or context?", type: 'textarea', placeholder: "Birthday, vacation, random Tuesday...", field: 'occasion' },
    { id: 'memory', question: "What memory does this photo trigger for you?", type: 'textarea', placeholder: "What do you remember about this moment?", field: 'memory' },
  ],
  'document': [
    { id: 'what', question: "What type of document is this?", type: 'choice', choices: ['letter', 'journal entry', 'email', 'legal document', 'school paper', 'medical record', 'other'], field: 'what' },
    { id: 'author', question: "Who wrote or created this document?", type: 'text', placeholder: "Author or source", field: 'author' },
    { id: 'date', question: "When was this written/created?", type: 'text', placeholder: "Date or time period", field: 'date' },
    { id: 'context', question: "What was happening in your life when this was written?", type: 'textarea', placeholder: "The circumstances surrounding this document...", field: 'context' },
    { id: 'significance', question: "Why is this document significant to your story?", type: 'textarea', placeholder: "What makes this worth preserving?", field: 'significance' },
  ],
  'event': [
    { id: 'before', question: "What led up to this event? What was happening before?", type: 'textarea', placeholder: "The context and buildup...", field: 'before' },
    { id: 'feelings', question: "How did you feel during this event?", type: 'textarea', placeholder: "Your emotional state...", field: 'feelings' },
    { id: 'others', question: "Who else was involved or affected by this event?", type: 'text', placeholder: "Other people present or impacted", field: 'others' },
    { id: 'aftermath', question: "What happened after? How did this event change things?", type: 'textarea', placeholder: "The consequences and ripple effects...", field: 'aftermath' },
    { id: 'meaning', question: "Looking back, what does this event mean to you now?", type: 'textarea', placeholder: "Your current perspective on this moment...", field: 'meaning' },
  ],
  'person': [
    { id: 'howmet', question: "How did you meet this person?", type: 'textarea', placeholder: "The story of how you first connected...", field: 'howmet' },
    { id: 'impact', question: "How has this person impacted your life?", type: 'textarea', placeholder: "Their influence on you...", field: 'impact' },
    { id: 'keymoment', question: "What's a key moment or memory with this person?", type: 'textarea', placeholder: "A defining moment in your relationship...", field: 'keymoment' },
    { id: 'current', question: "What is your relationship with them now?", type: 'choice', choices: ['close', 'distant', 'estranged', 'deceased', 'complicated', 'reconnecting'], field: 'current' },
  ],
  'artifact': [
    { id: 'origin', question: "Where did this artifact come from?", type: 'textarea', placeholder: "How did you acquire this?", field: 'origin' },
    { id: 'timeperiod', question: "What time period does this represent?", type: 'text', placeholder: "Era or date range", field: 'timeperiod' },
    { id: 'connection', question: "Who or what is this connected to?", type: 'text', placeholder: "People, events, or places", field: 'connection' },
    { id: 'preservation', question: "Why have you kept/preserved this?", type: 'textarea', placeholder: "What makes this worth keeping?", field: 'preservation' },
  ],
}

export default function ContextAssistant({
  contentType,
  contentSummary,
  sourceType,
  onAnswersComplete,
  onSkip,
}: ContextAssistantProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [isComplete, setIsComplete] = useState(false)

  // Determine which question set to use
  const questionKey = sourceType ? `${contentType}-${sourceType}` : contentType
  const questions = QUESTIONS_BY_TYPE[questionKey] || QUESTIONS_BY_TYPE[contentType] || []

  const currentQuestion = questions[currentQuestionIndex]
  const progress = questions.length > 0 ? ((currentQuestionIndex) / questions.length) * 100 : 0

  const handleNext = () => {
    if (currentAnswer.trim()) {
      setAnswers((prev) => ({
        ...prev,
        [currentQuestion.id]: currentAnswer,
      }))
    }

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1)
      setCurrentAnswer('')
    } else {
      setIsComplete(true)
      const finalAnswers = {
        ...answers,
        [currentQuestion.id]: currentAnswer,
      }
      onAnswersComplete(finalAnswers)
    }
  }

  const handleChoiceSelect = (choice: string) => {
    setCurrentAnswer(choice)
  }

  const handleSkipQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1)
      setCurrentAnswer('')
    } else {
      setIsComplete(true)
      onAnswersComplete(answers)
    }
  }

  if (questions.length === 0) {
    return null
  }

  if (isComplete) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-6">
          <div className="flex items-center gap-3 text-primary">
            <Check className="w-6 h-6" />
            <div>
              <p className="font-medium">Context captured!</p>
              <p className="text-sm text-muted-foreground">
                Your answers will help enrich this content in your memoir.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            Let's add some context
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onSkip}>
            Skip all
          </Button>
        </div>
        <div className="w-full bg-muted rounded-full h-1.5 mt-2">
          <div
            className="bg-primary h-1.5 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Question {currentQuestionIndex + 1} of {questions.length}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {contentSummary && (
          <p className="text-sm text-muted-foreground italic border-l-2 border-primary/30 pl-3">
            About: {contentSummary}
          </p>
        )}

        <div className="space-y-3">
          <Label className="text-base font-medium">{currentQuestion.question}</Label>

          {currentQuestion.type === 'text' && (
            <Input
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              placeholder={currentQuestion.placeholder}
              onKeyDown={(e) => e.key === 'Enter' && handleNext()}
            />
          )}

          {currentQuestion.type === 'textarea' && (
            <Textarea
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              placeholder={currentQuestion.placeholder}
              rows={3}
            />
          )}

          {currentQuestion.type === 'choice' && currentQuestion.choices && (
            <div className="flex flex-wrap gap-2">
              {currentQuestion.choices.map((choice) => (
                <Button
                  key={choice}
                  type="button"
                  variant={currentAnswer === choice ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleChoiceSelect(choice)}
                >
                  {choice}
                </Button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkipQuestion}
            className="text-muted-foreground"
          >
            Skip
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
          <Button onClick={handleNext} size="sm" className="ml-auto">
            {currentQuestionIndex === questions.length - 1 ? (
              <>
                <Check className="w-4 h-4 mr-1" />
                Done
              </>
            ) : (
              <>
                Next
                <Send className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
