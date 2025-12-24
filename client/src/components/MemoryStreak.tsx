import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Flame, Trophy, Target, Calendar, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const API_BASE = 'http://localhost:3001/api'

interface StreakData {
  currentStreak: number
  longestStreak: number
  totalMemories: number
  last30Days: Record<string, number>
  milestones: Array<{ count: number; label: string; achieved: boolean }>
  nextMilestone: { count: number; label: string } | null
  addedToday: boolean
}

export default function MemoryStreak() {
  const { data, isLoading } = useQuery<StreakData>({
    queryKey: ['memory-streak'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/insights/streak`)
      return res.json()
    },
  })

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const streakColor = data.currentStreak >= 7 
    ? 'text-orange-500' 
    : data.currentStreak >= 3 
      ? 'text-amber-500' 
      : 'text-muted-foreground'

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Flame className={cn("h-5 w-5", streakColor)} />
            Memory Streak
          </span>
          {data.addedToday && (
            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              ✓ Added today
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Streak Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className={cn("text-3xl font-bold", streakColor)}>
              {data.currentStreak}
            </div>
            <div className="text-xs text-muted-foreground">Current Streak</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary">
              {data.longestStreak}
            </div>
            <div className="text-xs text-muted-foreground">Longest Streak</div>
          </div>
          <div>
            <div className="text-3xl font-bold">
              {data.totalMemories}
            </div>
            <div className="text-xs text-muted-foreground">Total Memories</div>
          </div>
        </div>

        {/* Activity Calendar (last 30 days) */}
        <div>
          <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Last 30 Days
          </div>
          <div className="flex gap-1 flex-wrap">
            {Object.entries(data.last30Days)
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([date, count]) => {
                const intensity = count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : 3
                return (
                  <div
                    key={date}
                    className={cn(
                      "w-3 h-3 rounded-sm",
                      intensity === 0 && "bg-muted",
                      intensity === 1 && "bg-green-200 dark:bg-green-900",
                      intensity === 2 && "bg-green-400 dark:bg-green-700",
                      intensity === 3 && "bg-green-600 dark:bg-green-500"
                    )}
                    title={`${date}: ${count} memories`}
                  />
                )
              })}
          </div>
        </div>

        {/* Next Milestone */}
        {data.nextMilestone && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Target className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <div className="text-sm font-medium">Next: {data.nextMilestone.label}</div>
              <div className="text-xs text-muted-foreground">
                {data.nextMilestone.count - data.totalMemories} more memories to go
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold">{data.totalMemories}/{data.nextMilestone.count}</div>
            </div>
          </div>
        )}

        {/* Achieved Milestones */}
        <div className="flex flex-wrap gap-2">
          {data.milestones.filter(m => m.achieved).map((milestone) => (
            <Badge 
              key={milestone.label} 
              variant="secondary"
              className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
            >
              <Trophy className="h-3 w-3 mr-1" />
              {milestone.label}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
