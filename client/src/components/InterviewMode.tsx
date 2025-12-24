import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Mic, Play, ChevronRight, CheckCircle } from 'lucide-react'

interface InterviewQuestion {
  id: string
  question: string
  category: string
  followUps: string[]
}

const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  {
    id: '1',
    question: "Let's start at the beginning. What's your earliest memory?",
    category: 'Childhood',
    followUps: [
      'How old were you?',
      'Who was with you?',
      'What made this memory stick with you?',
    ],
  },
  {
    id: '2',
    question: 'Tell me about your childhood home. What did it look like? Smell like? Sound like?',
    category: 'Childhood',
    followUps: [
      'Which room was your favorite?',
      'What happened in that room?',
      'Who else lived there?',
    ],
  },
  {
    id: '3',
    question: 'Who was the most influential person in your early life?',
    category: 'Relationships',
    followUps: [
      'What did they teach you?',
      'Can you share a specific moment with them?',
      'How did they shape who you became?',
    ],
  },
  {
    id: '4',
    question: "What's a moment in your life when everything changed?",
    category: 'Turning Points',
    followUps: [
      'How did you feel in that moment?',
      'What did you do next?',
      'Looking back, what do you understand now that you didn\'t then?',
    ],
  },
  {
    id: '5',
    question: 'Tell me about a time you failed at something important.',
    category: 'Growth',
    followUps: [
      'What did you learn from it?',
      'How did it change your approach to life?',
      'Would you do anything differently?',
    ],
  },
  {
    id: '6',
    question: "What's the happiest you've ever been?",
    category: 'Joy',
    followUps: [
      'Where were you?',
      'Who was there?',
      'What made it so special?',
    ],
  },
  {
    id: '7',
    question: 'Tell me about someone you lost.',
    category: 'Loss',
    followUps: [
      'What do you miss most about them?',
      'What would you say to them now?',
      'How do you carry them with you?',
    ],
  },
  {
    id: '8',
    question: "What's something you've never told anyone?",
    category: 'Secrets',
    followUps: [
      'Why have you kept it private?',
      'How has holding this affected you?',
      'What would it mean to share it now?',
    ],
  },
]

interface Answer {
  questionId: string
  mainAnswer: string
  followUpAnswers: string[]
}

export default function InterviewMode() {
  const [isActive, setIsActive] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [currentFollowUpIndex, setCurrentFollowUpIndex] = useState(-1)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [isComplete, setIsComplete] = useState(false)
  const [generatedChapter, setGeneratedChapter] = useState<string | null>(null)

  const currentQuestion = INTERVIEW_QUESTIONS[currentQuestionIndex]

  const generateChapterMutation = useMutation({
    mutationFn: async (interviewData: Answer[]) => {
      const response = await fetch('http://localhost:3001/api/ai/Ori', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: `You are a skilled ghostwriter helping create a memoir chapter. Based on the interview answers provided, write a compelling, narrative chapter that weaves together the person's responses into a cohesive story.

Write in first person. Use vivid details from their answers. Create smooth transitions between topics. The tone should be warm, reflective, and authentic.

Do NOT add any details that weren't mentioned in the answers. Stay true to their voice and experiences.`,
          conversationHistory: '',
          userMessage: `Here are the interview responses to turn into a chapter:\n\n${interviewData.map(a => {
            const q = INTERVIEW_QUESTIONS.find(q => q.id === a.questionId)
            return `Q: ${q?.question}\nA: ${a.mainAnswer}\n${a.followUpAnswers.map((fa, i) => `Follow-up (${q?.followUps[i]}): ${fa}`).join('\n')}`
          }).join('\n\n')}`,
        }),
      })
      const data = await response.json()
      return data.response
    },
    onSuccess: (chapter) => {
      setGeneratedChapter(chapter)
    },
  })

  const handleStartInterview = () => {
    setIsActive(true)
    setCurrentQuestionIndex(0)
    setCurrentFollowUpIndex(-1)
    setAnswers([])
    setCurrentAnswer('')
    setIsComplete(false)
    setGeneratedChapter(null)
  }

  const handleNextQuestion = () => {
    if (currentFollowUpIndex === -1) {
      // Save main answer and move to first follow-up
      const newAnswer: Answer = {
        questionId: currentQuestion.id,
        mainAnswer: currentAnswer,
        followUpAnswers: [],
      }
      setAnswers([...answers, newAnswer])
      setCurrentAnswer('')
      setCurrentFollowUpIndex(0)
    } else if (currentFollowUpIndex < currentQuestion.followUps.length - 1) {
      // Save follow-up answer and move to next follow-up
      const updatedAnswers = [...answers]
      updatedAnswers[updatedAnswers.length - 1].followUpAnswers.push(currentAnswer)
      setAnswers(updatedAnswers)
      setCurrentAnswer('')
      setCurrentFollowUpIndex(currentFollowUpIndex + 1)
    } else {
      // Save last follow-up and move to next question
      const updatedAnswers = [...answers]
      updatedAnswers[updatedAnswers.length - 1].followUpAnswers.push(currentAnswer)
      setAnswers(updatedAnswers)
      setCurrentAnswer('')
      
      if (currentQuestionIndex < INTERVIEW_QUESTIONS.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1)
        setCurrentFollowUpIndex(-1)
      } else {
        setIsComplete(true)
      }
    }
  }

  const handleSkip = () => {
    if (currentFollowUpIndex === -1) {
      setCurrentFollowUpIndex(0)
    } else if (currentFollowUpIndex < currentQuestion.followUps.length - 1) {
      setCurrentFollowUpIndex(currentFollowUpIndex + 1)
    } else {
      if (currentQuestionIndex < INTERVIEW_QUESTIONS.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1)
        setCurrentFollowUpIndex(-1)
      } else {
        setIsComplete(true)
      }
    }
    setCurrentAnswer('')
  }

  const handleGenerateChapter = () => {
    generateChapterMutation.mutate(answers)
  }

  if (!isActive) {
    return (
      <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Interview Mode
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Let Ori guide you through a structured 20-minute interview session. Answer questions about your life, and Ori will draft a memoir chapter based on your responses.
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>📝 {INTERVIEW_QUESTIONS.length} questions</span>
            <span>⏱️ ~20 minutes</span>
            <span>📖 Auto-generated chapter</span>
          </div>
          <Button onClick={handleStartInterview} className="w-full">
            <Play className="mr-2 h-4 w-4" />
            Start Interview Session
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (isComplete) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Interview Complete!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            You answered {answers.length} questions. Ori can now draft a chapter based on your responses.
          </p>
          
          {!generatedChapter && (
            <Button 
              onClick={handleGenerateChapter} 
              disabled={generateChapterMutation.isPending}
              className="w-full"
            >
              {generateChapterMutation.isPending ? 'Writing chapter...' : 'Generate Chapter Draft'}
            </Button>
          )}

          {generatedChapter && (
            <div className="space-y-4">
              <h3 className="font-semibold">Your Chapter Draft</h3>
              <div className="p-4 bg-muted rounded-lg max-h-96 overflow-y-auto">
                <p className="whitespace-pre-wrap font-narrative">{generatedChapter}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleStartInterview}>
                  Start New Interview
                </Button>
                <Button onClick={() => navigator.clipboard.writeText(generatedChapter)}>
                  Copy to Clipboard
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const currentPrompt = currentFollowUpIndex === -1 
    ? currentQuestion.question 
    : currentQuestion.followUps[currentFollowUpIndex]

  const progress = ((currentQuestionIndex + (currentFollowUpIndex + 1) / (currentQuestion.followUps.length + 1)) / INTERVIEW_QUESTIONS.length) * 100

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-red-500 animate-pulse" />
            Interview in Progress
          </span>
          <span className="text-sm font-normal text-muted-foreground">
            Question {currentQuestionIndex + 1} of {INTERVIEW_QUESTIONS.length}
          </span>
        </CardTitle>
        {/* Progress bar */}
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-muted/50 rounded-lg">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">
            {currentQuestion.category} {currentFollowUpIndex >= 0 && '• Follow-up'}
          </span>
          <p className="text-lg font-medium mt-1">{currentPrompt}</p>
        </div>

        <Textarea
          value={currentAnswer}
          onChange={(e) => setCurrentAnswer(e.target.value)}
          placeholder="Share your thoughts..."
          rows={6}
          className="font-narrative"
        />

        <div className="flex justify-between">
          <Button variant="ghost" onClick={handleSkip}>
            Skip this question
          </Button>
          <Button onClick={handleNextQuestion} disabled={!currentAnswer.trim()}>
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
