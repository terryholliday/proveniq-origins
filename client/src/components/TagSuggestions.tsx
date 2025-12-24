import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { tagsApi } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Plus, X } from 'lucide-react'

const EMOTION_KEYWORDS: Record<string, string[]> = {
  joy: ['happy', 'excited', 'celebration', 'birthday', 'wedding', 'success', 'won', 'achievement', 'proud', 'love', 'loved'],
  grief: ['death', 'died', 'funeral', 'loss', 'lost', 'mourning', 'passed away', 'goodbye'],
  fear: ['scared', 'afraid', 'terrified', 'anxiety', 'panic', 'worried', 'nightmare', 'threat'],
  anger: ['angry', 'furious', 'rage', 'betrayed', 'betrayal', 'unfair', 'injustice', 'fight', 'argument'],
  sadness: ['sad', 'depressed', 'lonely', 'alone', 'crying', 'tears', 'heartbreak', 'disappointed'],
  love: ['love', 'romance', 'kiss', 'relationship', 'dating', 'married', 'partner', 'soulmate'],
  trauma: ['abuse', 'assault', 'violence', 'accident', 'hospital', 'emergency', 'crisis', 'ptsd'],
  healing: ['therapy', 'recovery', 'healing', 'growth', 'breakthrough', 'realization', 'forgiveness'],
  family: ['mother', 'father', 'mom', 'dad', 'parent', 'sibling', 'brother', 'sister', 'child', 'family'],
  friendship: ['friend', 'friendship', 'buddy', 'companion', 'support', 'together'],
  work: ['job', 'career', 'work', 'office', 'boss', 'promotion', 'fired', 'hired', 'interview'],
  school: ['school', 'college', 'university', 'graduation', 'teacher', 'student', 'class', 'exam'],
  milestone: ['first', 'last', 'beginning', 'ending', 'turning point', 'decision', 'choice', 'change'],
  childhood: ['child', 'childhood', 'kid', 'young', 'growing up', 'memory', 'early'],
  conflict: ['fight', 'argument', 'disagreement', 'tension', 'conflict', 'confrontation'],
  revelation: ['realized', 'discovered', 'found out', 'truth', 'secret', 'revelation', 'understood'],
  transition: ['moved', 'moving', 'new', 'started', 'ended', 'transition', 'change', 'different'],
  celebration: ['party', 'celebration', 'holiday', 'christmas', 'thanksgiving', 'birthday', 'anniversary'],
  loss: ['lost', 'losing', 'gone', 'missing', 'absence', 'empty', 'void'],
  hope: ['hope', 'hopeful', 'optimistic', 'future', 'dream', 'wish', 'possibility'],
  regret: ['regret', 'wish', 'should have', 'mistake', 'wrong', 'sorry', 'guilt'],
  gratitude: ['thankful', 'grateful', 'appreciation', 'blessed', 'lucky', 'fortune'],
}

interface TagSuggestionsProps {
  title: string
  summary: string
  notes: string
  currentTags: string[]
  onAddTag: (tag: string) => void
}

export default function TagSuggestions({
  title,
  summary,
  notes,
  currentTags,
  onAddTag,
}: TagSuggestionsProps) {
  const [dismissed, setDismissed] = useState<string[]>([])

  const { data: existingTags } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.getAll,
  })

  const suggestedTags = useMemo(() => {
    const text = `${title} ${summary} ${notes}`.toLowerCase()
    if (text.trim().length < 10) return []

    const suggestions = new Set<string>()

    // Check against emotion keywords
    for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          suggestions.add(emotion)
          break
        }
      }
    }

    // Check against existing tags in the system
    if (existingTags) {
      for (const tag of existingTags) {
        const tagName = tag.name.toLowerCase()
        if (text.includes(tagName) && !suggestions.has(tagName)) {
          suggestions.add(tag.name)
        }
      }
    }

    // Filter out already applied tags and dismissed suggestions
    const currentLower = currentTags.map(t => t.toLowerCase())
    const dismissedLower = dismissed.map(t => t.toLowerCase())
    
    return Array.from(suggestions)
      .filter(tag => !currentLower.includes(tag.toLowerCase()))
      .filter(tag => !dismissedLower.includes(tag.toLowerCase()))
      .slice(0, 6)
  }, [title, summary, notes, currentTags, existingTags, dismissed])

  const handleDismiss = (tag: string) => {
    setDismissed(prev => [...prev, tag])
  }

  if (suggestedTags.length === 0) return null

  return (
    <div className="bg-accent/30 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Sparkles className="w-4 h-4 text-primary" />
        Suggested Tags
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestedTags.map((tag) => (
          <Badge
            key={tag}
            variant="outline"
            className="cursor-pointer hover:bg-primary/10 transition-colors group pr-1"
          >
            <button
              type="button"
              onClick={() => onAddTag(tag)}
              className="flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              {tag}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleDismiss(tag)
              }}
              className="ml-1 opacity-50 hover:opacity-100"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Click to add, or × to dismiss
      </p>
    </div>
  )
}
