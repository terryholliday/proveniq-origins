import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

type OriMood = 'welcoming' | 'thinking' | 'encouraging' | 'serious' | 'pleased'

interface OriTip {
  message: string
  mood: OriMood
}

// Contextual help - only shown when user explicitly clicks Ori or on first login
const PAGE_HELP: Record<string, OriTip> = {
  '/': { message: "Welcome to Origins. Start by creating events from your memories, or talk to me in the Interview section.", mood: 'welcoming' },
  '/events': { message: "Events are the building blocks of your memoir. Click 'New Event' to add one.", mood: 'thinking' },
  '/events/new': { message: "Fill in what you remember. The date, title, and a summary are most important.", mood: 'encouraging' },
  '/people': { message: "Add the people who shaped your story. You can link them to events later.", mood: 'thinking' },
  '/artifacts': { message: "Upload photos, documents, or recordings that connect to your memories.", mood: 'thinking' },
  '/timeline': { message: "Your life events displayed chronologically. Click any event to see details.", mood: 'serious' },
  '/search': { message: "Search across all your events, people, and artifacts.", mood: 'welcoming' },
  '/export': { message: "Export your memoir as a document when you're ready to share it.", mood: 'encouraging' },
  '/interview': { message: "I'll guide you through your memories with questions. Just answer honestly.", mood: 'welcoming' },
  '/wizard': { message: "I'll guide you through your memories with questions. Just answer honestly.", mood: 'welcoming' },
  '/import/messenger': { message: "Upload your Facebook Messenger export to preserve those conversations.", mood: 'thinking' },
  '/import/sms': { message: "Upload your SMS backup to import text message conversations.", mood: 'thinking' },
  '/import/chatgpt': { message: "Upload your ChatGPT export to bring AI conversations into your memoir.", mood: 'thinking' },
}

function OriAvatar({ mood, className = '' }: { mood: OriMood; className?: string }) {
  // Eye and mouth expressions for different moods
  const eyeStyles: Record<OriMood, string> = {
    welcoming: 'M32 38 Q35 34 38 38 M52 38 Q55 34 58 38', // friendly curved
    thinking: 'M32 37 L38 37 M52 37 L58 37', // flat, contemplative
    encouraging: 'M32 38 Q35 33 38 38 M52 38 Q55 33 58 38', // bright
    serious: 'M32 38 L38 38 M52 38 L58 38', // stern
    pleased: 'M32 39 Q35 35 38 39 M52 39 Q55 35 58 39', // happy squint
  }

  const browStyles: Record<OriMood, string> = {
    welcoming: 'M30 32 Q35 30 40 32 M50 32 Q55 30 60 32',
    thinking: 'M30 31 L40 33 M50 33 L60 31', // one raised
    encouraging: 'M30 31 Q35 29 40 31 M50 31 Q55 29 60 31',
    serious: 'M30 33 L40 31 M50 31 L60 33', // furrowed
    pleased: 'M30 32 Q35 31 40 32 M50 32 Q55 31 60 32',
  }

  const mouthStyles: Record<OriMood, string> = {
    welcoming: 'M38 62 Q45 68 52 62', // warm smile
    thinking: 'M40 64 Q45 62 50 64', // slight frown
    encouraging: 'M36 61 Q45 70 54 61', // big smile
    serious: 'M40 64 L50 64', // straight line
    pleased: 'M38 62 Q45 69 52 62', // content smile
  }

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg viewBox="0 0 90 100" className="w-full h-full">
        {/* Background circle */}
        <circle cx="45" cy="45" r="42" fill="#E8DCC8" />
        
        {/* Headcovering */}
        <path
          d="M10 40 Q10 10 45 5 Q80 10 80 40 L82 55 Q75 60 45 62 Q15 60 8 55 Z"
          fill="#D4C4A8"
        />
        
        {/* Headband */}
        <path
          d="M12 42 Q28 35 45 33 Q62 35 78 42"
          stroke="#8B6914"
          strokeWidth="3"
          fill="none"
        />
        
        {/* Face */}
        <ellipse cx="45" cy="48" rx="25" ry="28" fill="#F5DEB3" />
        
        {/* Beard */}
        <path
          d="M25 55 Q22 70 28 85 Q38 95 45 96 Q52 95 62 85 Q68 70 65 55 Q55 50 45 48 Q35 50 25 55"
          fill="#9CA3AF"
        />
        
        {/* Beard texture lines */}
        <path
          d="M30 60 Q32 75 35 85 M45 55 L45 90 M60 60 Q58 75 55 85"
          stroke="#6B7280"
          strokeWidth="1"
          fill="none"
          opacity="0.5"
        />
        
        {/* Eyes */}
        <path
          d={eyeStyles[mood]}
          stroke="#2D1B0E"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        
        {/* Eyebrows */}
        <path
          d={browStyles[mood]}
          stroke="#6B7280"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        
        {/* Nose */}
        <path
          d="M45 45 Q48 52 45 55"
          stroke="#D4A574"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        
        {/* Mouth */}
        <path
          d={mouthStyles[mood]}
          stroke="#8B4513"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </div>
  )
}

export default function OriGuide() {
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [currentTip, setCurrentTip] = useState<OriTip | null>(null)
  
  // Only show on first ever login
  const [hasShownWelcome] = useState(() => {
    const shown = localStorage.getItem('origins-ori-guide-shown')
    if (!shown) {
      localStorage.setItem('origins-ori-guide-shown', 'true')
      return false
    }
    return true
  })

  // Get help for current page
  const getPageHelp = (): OriTip => {
    const path = location.pathname
    if (PAGE_HELP[path]) return PAGE_HELP[path]
    const basePath = '/' + path.split('/')[1]
    if (PAGE_HELP[basePath]) return PAGE_HELP[basePath]
    return { message: "Click around to explore. I'm here if you need guidance.", mood: 'welcoming' }
  }

  // Show Ori only on first login (dashboard)
  useEffect(() => {
    if (!hasShownWelcome && location.pathname === '/') {
      setCurrentTip(PAGE_HELP['/'])
      setIsOpen(true)
    }
  }, [])

  const handleClose = () => {
    setIsOpen(false)
  }

  const handleSummonOri = () => {
    setCurrentTip(getPageHelp())
    setIsOpen(true)
  }

  // When closed, show small summon button in corner
  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={handleSummonOri}
          className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-100 to-amber-100 dark:from-blue-900 dark:to-amber-900 border-2 border-blue-300 dark:border-blue-600 shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center overflow-hidden"
          title="Summon Ori"
        >
          <OriAvatar mood="welcoming" className="w-12 h-16" />
        </button>
      </div>
    )
  }

  // Full Ori modal - centered on screen
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-200">
      <div className="bg-card border-2 border-primary/20 rounded-3xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-muted hover:bg-destructive hover:text-destructive-foreground transition-colors flex items-center justify-center"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col md:flex-row">
          {/* Ori illustration */}
          <div className="bg-gradient-to-br from-blue-50 via-amber-50 to-blue-100 dark:from-blue-950 dark:via-amber-950 dark:to-blue-900 p-6 flex items-center justify-center md:w-48">
            <OriAvatar mood={currentTip?.mood || 'welcoming'} className="w-32 h-44" />
          </div>

          {/* Speech content */}
          <div className="flex-1 p-6">
            <div className="mb-2">
              <h3 className="text-lg font-display font-semibold text-primary">Ori</h3>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Your Memoir Guide</p>
            </div>
            
            <div className="min-h-[80px] mb-4">
              <p className="text-base leading-relaxed font-narrative">
                "{currentTip?.message}"
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                size="sm"
                onClick={handleClose}
              >
                Continue
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
