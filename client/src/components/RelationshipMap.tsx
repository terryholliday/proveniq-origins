import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { personsApi, eventsApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Heart, Star } from 'lucide-react'
import { Link } from 'react-router-dom'

interface PersonStats {
  id: string
  name: string
  relationship?: string
  mentionCount: number
  firstMention?: Date
  lastMention?: Date
  emotionalWeight: number
}

export default function RelationshipMap() {
  const { data: persons } = useQuery({
    queryKey: ['persons'],
    queryFn: () => personsApi.getAll(),
  })

  const { data: events } = useQuery({
    queryKey: ['events'],
    queryFn: () => eventsApi.getAll(),
  })

  const personStats = useMemo(() => {
    if (!persons || !events) return []

    const stats: PersonStats[] = persons.map((person) => {
      // Count mentions in events
      const linkedEvents = events.filter((event) =>
        event.persons?.some((p) => p.id === person.id)
      )

      const dates = linkedEvents
        .filter((e) => e.date)
        .map((e) => new Date(e.date!))
        .sort((a, b) => a.getTime() - b.getTime())

      // Calculate emotional weight based on emotion tags
      let emotionalWeight = 0
      linkedEvents.forEach((event) => {
        if (event.emotionTags) {
          emotionalWeight += event.emotionTags.length
        }
      })

      return {
        id: person.id,
        name: person.name,
        relationship: person.relationshipType || undefined,
        mentionCount: linkedEvents.length,
        firstMention: dates[0],
        lastMention: dates[dates.length - 1],
        emotionalWeight,
      }
    })

    // Sort by mention count
    return stats.sort((a, b) => b.mentionCount - a.mentionCount)
  }, [persons, events])

  const topPeople = personStats.slice(0, 10)
  const totalMentions = personStats.reduce((sum, p) => sum + p.mentionCount, 0)

  if (personStats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Relationship Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No people added yet. Add people to your memoir to see your relationship map!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Relationship Map
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Visual representation */}
          <div className="relative h-48 flex items-center justify-center">
            {/* Center - You */}
            <div className="absolute z-10 w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shadow-lg">
              You
            </div>
            
            {/* Orbiting people based on mention count */}
            {topPeople.slice(0, 6).map((person, idx) => {
              const angle = (idx * 60 - 90) * (Math.PI / 180)
              const radius = 70 + (6 - Math.min(person.mentionCount, 6)) * 5
              const x = Math.cos(angle) * radius
              const y = Math.sin(angle) * radius
              const size = Math.min(12 + person.mentionCount * 2, 48)

              return (
                <Link
                  key={person.id}
                  to={`/persons/${person.id}`}
                  className="absolute transition-transform hover:scale-110"
                  style={{
                    transform: `translate(${x}px, ${y}px)`,
                  }}
                  title={`${person.name}: ${person.mentionCount} mentions`}
                >
                  <div
                    className="rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 flex items-center justify-center text-xs font-medium border-2 border-blue-300 dark:border-blue-700"
                    style={{
                      width: `${size}px`,
                      height: `${size}px`,
                      fontSize: size < 24 ? '8px' : '10px',
                    }}
                  >
                    {person.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                </Link>
              )
            })}
          </div>

          {/* List view */}
          <div className="space-y-2 pt-4 border-t">
            <h4 className="text-sm font-medium text-muted-foreground">Key People in Your Story</h4>
            {topPeople.map((person) => (
              <Link
                key={person.id}
                to={`/persons/${person.id}`}
                className="flex items-center justify-between p-2 rounded hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs font-medium">
                    {person.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{person.name}</div>
                    {person.relationship && (
                      <div className="text-xs text-muted-foreground">{person.relationship}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    {person.mentionCount} mentions
                  </span>
                  {person.emotionalWeight > 0 && (
                    <span className="flex items-center gap-1 text-pink-500">
                      <Heart className="h-3 w-3" />
                      {person.emotionalWeight}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t text-center">
            <div>
              <div className="text-2xl font-bold text-primary">{persons?.length || 0}</div>
              <div className="text-xs text-muted-foreground">People</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{totalMentions}</div>
              <div className="text-xs text-muted-foreground">Total Mentions</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-pink-600">
                {personStats.filter(p => p.emotionalWeight > 0).length}
              </div>
              <div className="text-xs text-muted-foreground">Emotional Connections</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
