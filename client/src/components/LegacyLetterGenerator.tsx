import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { personsApi, eventsApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Mail, Heart, Copy, Download } from 'lucide-react'

export default function LegacyLetterGenerator() {
  const [selectedPersonId, setSelectedPersonId] = useState<string>('')
  const [letterType, setLetterType] = useState<string>('gratitude')
  const [generatedLetter, setGeneratedLetter] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  const { data: persons } = useQuery({
    queryKey: ['persons'],
    queryFn: () => personsApi.getAll(),
  })

  const { data: events } = useQuery({
    queryKey: ['events'],
    queryFn: () => eventsApi.getAll(),
  })

  const generateLetterMutation = useMutation({
    mutationFn: async ({ personId, type }: { personId: string; type: string }) => {
      const person = persons?.find(p => p.id === personId)
      if (!person) throw new Error('Person not found')

      // Find events involving this person
      const personEvents = events?.filter(e => 
        e.persons?.some(p => p.id === personId)
      ) || []

      const eventSummaries = personEvents.map(e => 
        `- ${e.title}${e.date ? ` (${new Date(e.date).getFullYear()})` : ''}: ${e.summary || 'No details'}`
      ).join('\n')

      const letterPrompts: Record<string, string> = {
        gratitude: `Write a heartfelt letter of gratitude to ${person.name}. Express deep appreciation for their presence in the author's life and the specific ways they've made a difference.`,
        forgiveness: `Write a letter of forgiveness and healing to ${person.name}. This is about releasing old hurts and finding peace, while honoring the complexity of the relationship.`,
        celebration: `Write a celebratory letter to ${person.name}, honoring who they are and the joy they've brought. Focus on their best qualities and happiest shared moments.`,
        farewell: `Write a farewell letter to ${person.name}. This could be for someone who has passed or someone the author has lost touch with. Express what was left unsaid.`,
        wisdom: `Write a letter sharing life wisdom with ${person.name}. Pass on lessons learned, hopes for their future, and guidance from experience.`,
      }

      const response = await fetch('http://localhost:3001/api/ai/Ori', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: `You are a skilled ghostwriter helping create a deeply personal legacy letter. Write in first person as if you are the memoir author. The letter should be:
- Emotionally authentic and specific
- Based ONLY on the details provided about this person and shared experiences
- Written in a warm, personal voice
- Between 300-500 words
- Structured as a proper letter with greeting and closing

Do NOT invent specific details that weren't mentioned. If information is sparse, focus on emotional truth and general sentiments.`,
          conversationHistory: '',
          userMessage: `${letterPrompts[type]}

Person: ${person.name}
Relationship: ${person.relationshipType || 'Not specified'}
${person.notes ? `Notes about them: ${person.notes}` : ''}

Shared memories/events:
${eventSummaries || 'No specific events recorded yet'}`,
        }),
      })
      const data = await response.json()
      return data.response
    },
    onSuccess: (letter) => {
      setGeneratedLetter(letter)
      setIsEditing(false)
    },
  })

  const handleGenerate = () => {
    if (selectedPersonId) {
      generateLetterMutation.mutate({ personId: selectedPersonId, type: letterType })
    }
  }

  const handleCopy = () => {
    if (generatedLetter) {
      navigator.clipboard.writeText(generatedLetter)
    }
  }

  const handleDownload = () => {
    if (generatedLetter) {
      const person = persons?.find(p => p.id === selectedPersonId)
      const blob = new Blob([generatedLetter], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Letter to ${person?.name || 'Someone Special'}.txt`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const letterTypes = [
    { value: 'gratitude', label: '💝 Letter of Gratitude', desc: 'Express appreciation and thanks' },
    { value: 'forgiveness', label: '🕊️ Letter of Forgiveness', desc: 'Release and heal old wounds' },
    { value: 'celebration', label: '🎉 Letter of Celebration', desc: 'Honor and celebrate them' },
    { value: 'farewell', label: '👋 Farewell Letter', desc: 'Say what was left unsaid' },
    { value: 'wisdom', label: '📚 Letter of Wisdom', desc: 'Share life lessons and guidance' },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Legacy Letter Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Create meaningful letters to the important people in your life. These letters can express gratitude, seek closure, or pass on wisdom.
        </p>

        {!generatedLetter ? (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Who is this letter for?</label>
                <Select value={selectedPersonId} onValueChange={setSelectedPersonId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a person..." />
                  </SelectTrigger>
                  <SelectContent>
                    {persons?.map((person) => (
                      <SelectItem key={person.id} value={person.id}>
                        {person.name} {person.relationshipType && `(${person.relationshipType})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Type of letter</label>
                <div className="grid gap-2">
                  {letterTypes.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setLetterType(type.value)}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        letterType === type.value
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:border-primary/50'
                      }`}
                    >
                      <div className="font-medium">{type.label}</div>
                      <div className="text-xs text-muted-foreground">{type.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Button 
              onClick={handleGenerate} 
              disabled={!selectedPersonId || generateLetterMutation.isPending}
              className="w-full"
            >
              {generateLetterMutation.isPending ? (
                'Writing your letter...'
              ) : (
                <>
                  <Heart className="mr-2 h-4 w-4" />
                  Generate Letter
                </>
              )}
            </Button>
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">
                Your Letter to {persons?.find(p => p.id === selectedPersonId)?.name}
              </h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {isEditing ? (
              <Textarea
                value={generatedLetter}
                onChange={(e) => setGeneratedLetter(e.target.value)}
                rows={15}
                className="font-narrative"
              />
            ) : (
              <div className="p-4 bg-muted/50 rounded-lg max-h-96 overflow-y-auto">
                <p className="whitespace-pre-wrap font-narrative">{generatedLetter}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
                {isEditing ? 'Preview' : 'Edit'}
              </Button>
              <Button variant="outline" onClick={() => setGeneratedLetter(null)}>
                Write Another Letter
              </Button>
            </div>
          </div>
        )}

        {(!persons || persons.length === 0) && (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Add people to your memoir first to write letters to them.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
