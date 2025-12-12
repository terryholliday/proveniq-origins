import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowRight, ArrowLeft, X, BookOpen, Calendar, Users, FileText, Sparkles, Clock, Search, Tag, FolderOpen } from 'lucide-react'

interface TourStep {
  target: string
  title: string
  description: string
  icon: React.ElementType
  position?: 'top' | 'bottom' | 'left' | 'right'
  route?: string
}

const tourSteps: TourStep[] = [
  {
    target: '[data-tour="dashboard"]',
    title: 'Your Dashboard',
    description: 'This is your home base. See stats about your memoir at a glance—events recorded, people mentioned, chapters written.',
    icon: BookOpen,
    route: '/',
  },
  {
    target: '[data-tour="timeline"]',
    title: 'Timeline View',
    description: 'See your life events arranged chronologically. Watch your story unfold across the years.',
    icon: Clock,
  },
  {
    target: '[data-tour="events"]',
    title: 'Events',
    description: 'The heart of your memoir. Each event is a moment—a memory, a turning point, a quiet afternoon that changed everything.',
    icon: Calendar,
  },
  {
    target: '[data-tour="chapters"]',
    title: 'Chapters',
    description: 'Organize your events into chapters. Structure your story the way you want it told.',
    icon: BookOpen,
  },
  {
    target: '[data-tour="people"]',
    title: 'People',
    description: 'The cast of your life. Parents, friends, lovers, mentors—everyone who shaped your journey.',
    icon: Users,
  },
  {
    target: '[data-tour="artifacts"]',
    title: 'Artifacts',
    description: 'Photos, letters, recordings, documents. The tangible pieces of your past.',
    icon: FileText,
  },
  {
    target: '[data-tour="synchronicities"]',
    title: 'Synchronicities',
    description: 'Those meaningful coincidences. Patterns that emerged. Moments when the universe seemed to wink.',
    icon: Sparkles,
  },
  {
    target: '[data-tour="tags"]',
    title: 'Tags',
    description: 'Label your events with emotions, themes, or any category that helps you find patterns.',
    icon: Tag,
  },
  {
    target: '[data-tour="collections"]',
    title: 'Collections',
    description: 'Group related events, people, and artifacts together. Create thematic bundles of your story.',
    icon: FolderOpen,
  },
  {
    target: '[data-tour="search"]',
    title: 'Search',
    description: 'Find anything in your memoir. Search across all your events, people, and artifacts.',
    icon: Search,
  },
]

interface OnboardingTourProps {
  onComplete: () => void
}

export default function OnboardingTour({ onComplete }: OnboardingTourProps) {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [isVisible, setIsVisible] = useState(true)

  const step = tourSteps[currentStep]

  const updateTargetPosition = useCallback(() => {
    const target = document.querySelector(step.target)
    if (target) {
      setTargetRect(target.getBoundingClientRect())
    }
  }, [step.target])

  useEffect(() => {
    if (step.route) {
      navigate(step.route)
    }
    
    const timer = setTimeout(updateTargetPosition, 100)
    window.addEventListener('resize', updateTargetPosition)
    window.addEventListener('scroll', updateTargetPosition)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', updateTargetPosition)
      window.removeEventListener('scroll', updateTargetPosition)
    }
  }, [step, navigate, updateTargetPosition])

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = () => {
    setIsVisible(false)
    localStorage.setItem('memoirark-tour-completed', 'true')
    onComplete()
  }

  const handleSkip = () => {
    handleComplete()
  }

  if (!isVisible) return null

  const Icon = step.icon
  const isLastStep = currentStep === tourSteps.length - 1

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop with spotlight cutout */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - 8}
                y={targetRect.top - 8}
                width={targetRect.width + 16}
                height={targetRect.height + 16}
                rx="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.75)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* Spotlight ring */}
      {targetRect && (
        <div
          className="absolute border-2 border-primary rounded-xl pointer-events-none animate-pulse"
          style={{
            left: targetRect.left - 8,
            top: targetRect.top - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
          }}
        />
      )}

      {/* Tour card */}
      <div
        className="absolute bg-card rounded-2xl shadow-2xl border border-border/50 w-80 p-0 overflow-hidden"
        style={{
          left: targetRect ? Math.min(targetRect.left, window.innerWidth - 340) : '50%',
          top: targetRect ? targetRect.bottom + 20 : '50%',
          transform: targetRect ? 'none' : 'translate(-50%, -50%)',
        }}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-primary/10 via-accent/5 to-transparent p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground">{step.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Step {currentStep + 1} of {tourSteps.length}
            </p>
          </div>
          <button
            onClick={handleSkip}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 pt-2">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {step.description}
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 pb-3">
          {tourSteps.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === currentStep
                  ? 'bg-primary w-4'
                  : idx < currentStep
                  ? 'bg-primary/50'
                  : 'bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="p-4 pt-0 flex gap-2">
          {currentStep > 0 && (
            <Button variant="outline" size="sm" onClick={handlePrev} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleNext}
            className={currentStep === 0 ? 'w-full' : 'flex-1'}
          >
            {isLastStep ? (
              <>
                Build Your Ark
                <BookOpen className="w-4 h-4 ml-1" />
              </>
            ) : (
              <>
                Next
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function useTourState() {
  const [showTour, setShowTour] = useState(false)

  useEffect(() => {
    const completed = localStorage.getItem('memoirark-tour-completed')
    if (!completed) {
      const timer = setTimeout(() => setShowTour(true), 500)
      return () => clearTimeout(timer)
    }
  }, [])

  const startTour = () => setShowTour(true)
  const endTour = () => setShowTour(false)
  const resetTour = () => {
    localStorage.removeItem('memoirark-tour-completed')
    setShowTour(true)
  }

  return { showTour, startTour, endTour, resetTour }
}
