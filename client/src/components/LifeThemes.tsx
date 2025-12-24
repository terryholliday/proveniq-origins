import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Lightbulb, TrendingUp, Users, Tag, Heart } from 'lucide-react'

const API_BASE = 'http://localhost:3001/api'

interface LifeThemesData {
  totalEvents: number
  topTags: [string, number][]
  topEmotions: [string, number][]
  topPeople: [string, number][]
  decadeDistribution: Record<string, number>
  themes: string[]
  patterns: string[]
  message?: string
}

export default function LifeThemes() {
  const { data, isLoading } = useQuery<LifeThemesData>({
    queryKey: ['life-themes'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/insights/life-themes`)
      return res.json()
    },
  })

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (!data || data.message) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="py-8 text-center">
          <Lightbulb className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">
            {data?.message || 'Add more events to discover life themes and patterns.'}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* AI-Generated Themes */}
      {data.themes.length > 0 && (
        <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border-indigo-200 dark:border-indigo-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-indigo-900 dark:text-indigo-100">
              <Lightbulb className="h-5 w-5 text-indigo-500" />
              Life Themes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.themes.map((theme, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-white/60 dark:bg-black/20 border border-indigo-100 dark:border-indigo-800"
                >
                  <p className="text-indigo-900 dark:text-indigo-100 font-medium">{theme}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI-Generated Patterns */}
      {data.patterns.length > 0 && (
        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-900 dark:text-emerald-100">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              Life Patterns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.patterns.map((pattern, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-white/60 dark:bg-black/20 border border-emerald-100 dark:border-emerald-800"
                >
                  <p className="text-emerald-900 dark:text-emerald-100">{pattern}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Top Emotions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Heart className="h-4 w-4 text-rose-500" />
              Emotional Landscape
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.topEmotions.slice(0, 6).map(([emotion, count]) => (
                <Badge key={emotion} variant="secondary" className="text-xs">
                  {emotion} ({count})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top People */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              Key People
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.topPeople.slice(0, 6).map(([person, count]) => (
                <Badge key={person} variant="outline" className="text-xs">
                  {person} ({count})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Tags */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Tag className="h-4 w-4 text-amber-500" />
              Common Themes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.topTags.slice(0, 6).map(([tag, count]) => (
                <Badge key={tag} variant="secondary" className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200">
                  {tag} ({count})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Decade Distribution */}
      {Object.keys(data.decadeDistribution).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Events by Decade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-24">
              {Object.entries(data.decadeDistribution)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([decade, count]) => {
                  const maxCount = Math.max(...Object.values(data.decadeDistribution))
                  const height = (count / maxCount) * 100
                  return (
                    <div key={decade} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-gradient-to-t from-primary/80 to-primary/40 rounded-t"
                        style={{ height: `${height}%`, minHeight: '4px' }}
                      />
                      <span className="text-xs text-muted-foreground">{decade}</span>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
