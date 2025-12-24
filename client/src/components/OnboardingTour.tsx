import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowRight, ArrowLeft, X, BookOpen, Calendar, Users, Clock, Search, Tag, FolderOpen, Home } from 'lucide-react'

interface TourStep {
  target: string
  title: string
  description: string
  icon: React.ElementType
  position?: 'top' | 'bottom' | 'left' | 'right'
  route?: string
  dropdownTrigger?: string // Selector for dropdown to open first
}

const tourSteps: TourStep[] = [
  {
    target: '[data-tour="dashboard"]',
    title: 'Your Dashboard',
    description: 'This is your home base. See stats about your memoir at a glance—events recorded, people mentioned, chapters written.',
    icon: Home,
    route: '/',
  },
  {
    target: '[data-tour="timeline"]',
    title: 'Timeline View',
    description: 'See your life events arranged chronologically. Watch your story unfold across the years.',
    icon: Clock,
  },
  {
    target: '[data-tour="my-story"]',
    title: 'My Story',
    description: 'Your memoir content lives here—life events, the people in your story, photos and artifacts, chapters, and meaningful synchronicities.',
    icon: BookOpen,
  },
  {
    target: '[data-tour="events"]',
    title: 'Life Events',
    description: 'The heart of your memoir. Each event is a moment—a memory, a turning point, a quiet afternoon that changed everything.',
    icon: Calendar,
    dropdownTrigger: '[data-tour="my-story"]',
  },
  {
    target: '[data-tour="people"]',
    title: 'People',
    description: 'The cast of your life. Parents, friends, lovers, mentors—everyone who shaped your journey.',
    icon: Users,
    dropdownTrigger: '[data-tour="my-story"]',
  },
  {
    target: '[data-tour="chapters"]',
    title: 'Chapters',
    description: 'Organize your events into chapters. Structure your story the way you want it told.',
    icon: BookOpen,
    dropdownTrigger: '[data-tour="my-story"]',
  },
  {
    target: '[data-tour="organize"]',
    title: 'Organize',
    description: 'Find, tag, and group your memories. Search across everything, add tags for themes, and create collections.',
    icon: FolderOpen,
  },
  {
    target: '[data-tour="search"]',
    title: 'Search',
    description: 'Find anything in your memoir. Search across all your events, people, and artifacts.',
    icon: Search,
    dropdownTrigger: '[data-tour="organize"]',
  },
  {
    target: '[data-tour="tags"]',
    title: 'Tags',
    description: 'Label your events with emotions, themes, or any category that helps you find patterns.',
    icon: Tag,
    dropdownTrigger: '[data-tour="organize"]',
  },
  {
    target: '[data-tour="collections"]',
    title: 'Collections',
    description: 'Group related events, people, and artifacts together. Create thematic bundles of your story.',
    icon: FolderOpen,
    dropdownTrigger: '[data-tour="organize"]',
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
    } else {
      setTargetRect(null)
    }
  }, [step.target])

  // Close any open dropdowns when tour step changes
  const closeAllDropdowns = useCallback(() => {
    // Press Escape to close any open dropdown
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  }, [])

  // Open dropdown if needed for this step
  const openDropdownIfNeeded = useCallback(() => {
    if (step.dropdownTrigger) {
      const trigger = document.querySelector(step.dropdownTrigger) as HTMLElement
      if (trigger) {
        trigger.click()
        // Wait for dropdown to open, then find target
        setTimeout(updateTargetPosition, 150)
      }
    } else {
      updateTargetPosition()
    }
  }, [step.dropdownTrigger, updateTargetPosition])

  useEffect(() => {
    if (step.route) {
      navigate(step.route)
    }
    
    // Close previous dropdowns first
    closeAllDropdowns()
    
    // Small delay then open dropdown if needed
    const timer = setTimeout(openDropdownIfNeeded, 100)
    
    window.addEventListener('resize', updateTargetPosition)
    window.addEventListener('scroll', updateTargetPosition)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', updateTargetPosition)
      window.removeEventListener('scroll', updateTargetPosition)
    }
  }, [step, navigate, updateTargetPosition, closeAllDropdowns, openDropdownIfNeeded])

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
    localStorage.setItem('origins-tour-completed', 'true')
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
    const completed = localStorage.getItem('origins-tour-completed')
    if (!completed) {
      const timer = setTimeout(() => setShowTour(true), 500)
      return () => clearTimeout(timer)
    }
  }, [])

  const startTour = () => setShowTour(true)
  const endTour = () => setShowTour(false)
  const resetTour = () => {
    localStorage.removeItem('origins-tour-completed')
    setShowTour(true)
  }

  return { showTour, startTour, endTour, resetTour }
}
