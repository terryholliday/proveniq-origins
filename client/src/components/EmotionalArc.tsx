import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { eventsApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Heart, TrendingUp, TrendingDown, Minus } from 'lucide-react'

// Emotion to sentiment mapping
const emotionSentiment: Record<string, number> = {
  // Positive
  joy: 1, happy: 1, love: 1, excited: 1, grateful: 0.8, proud: 0.8,
  hopeful: 0.7, peaceful: 0.6, content: 0.6, amused: 0.5, relieved: 0.5,
  // Negative
  sad: -0.8, grief: -1, angry: -0.7, fear: -0.6, anxious: -0.5,
  frustrated: -0.5, disappointed: -0.6, lonely: -0.7, guilty: -0.6,
  ashamed: -0.7, jealous: -0.4, bitter: -0.6,
  // Neutral/Mixed
  nostalgic: 0.2, bittersweet: 0, surprised: 0.1, confused: -0.2,
}

interface YearData {
  year: number
  sentiment: number
  eventCount: number
  dominantEmotions: string[]
}

export default function EmotionalArc() {
  const { data: events } = useQuery({
    queryKey: ['events'],
    queryFn: () => eventsApi.getAll(),
  })

  const arcData = useMemo(() => {
    if (!events) return []

    // Group events by year
    const yearMap: Record<number, { sentiments: number[]; emotions: string[] }> = {}

    events.forEach((event) => {
      if (!event.date) return
      const year = new Date(event.date).getFullYear()
      
      if (!yearMap[year]) {
        yearMap[year] = { sentiments: [], emotions: [] }
      }

      if (event.emotionTags) {
        event.emotionTags.forEach((tag) => {
          const sentiment = emotionSentiment[tag.toLowerCase()] ?? 0
          yearMap[year].sentiments.push(sentiment)
          yearMap[year].emotions.push(tag)
        })
      }
    })

    // Calculate average sentiment per year
    const data: YearData[] = Object.entries(yearMap)
      .map(([year, { sentiments, emotions }]) => {
        const avgSentiment = sentiments.length > 0
          ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length
          : 0

        // Count emotion frequencies
        const emotionCounts: Record<string, number> = {}
        emotions.forEach((e) => {
          emotionCounts[e] = (emotionCounts[e] || 0) + 1
        })
        const dominantEmotions = Object.entries(emotionCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([e]) => e)

        return {
          year: parseInt(year),
          sentiment: avgSentiment,
          eventCount: sentiments.length,
          dominantEmotions,
        }
      })
      .sort((a, b) => a.year - b.year)

    return data
  }, [events])

  const overallTrend = useMemo(() => {
    if (arcData.length < 2) return 'neutral'
    const firstHalf = arcData.slice(0, Math.floor(arcData.length / 2))
    const secondHalf = arcData.slice(Math.floor(arcData.length / 2))
    
    const firstAvg = firstHalf.reduce((sum, d) => sum + d.sentiment, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.sentiment, 0) / secondHalf.length
    
    if (secondAvg - firstAvg > 0.2) return 'rising'
    if (firstAvg - secondAvg > 0.2) return 'falling'
    return 'stable'
  }, [arcData])

  if (arcData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Emotional Arc
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Add emotion tags to your events to see your emotional journey over time.
          </p>
        </CardContent>
      </Card>
    )
  }

  const maxSentiment = Math.max(...arcData.map(d => Math.abs(d.sentiment)), 1)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5" />
          Emotional Arc
          {overallTrend === 'rising' && <TrendingUp className="h-4 w-4 text-green-500" />}
          {overallTrend === 'falling' && <TrendingDown className="h-4 w-4 text-red-500" />}
          {overallTrend === 'stable' && <Minus className="h-4 w-4 text-gray-500" />}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Visual arc */}
          <div className="relative h-32 flex items-end gap-1">
            {/* Center line */}
            <div className="absolute left-0 right-0 top-1/2 h-px bg-gray-300 dark:bg-gray-700" />
            
            {arcData.map((data) => {
              const height = Math.abs(data.sentiment) / maxSentiment * 50
              const isPositive = data.sentiment >= 0
              
              return (
                <div
                  key={data.year}
                  className="flex-1 flex flex-col items-center justify-center relative group"
                  style={{ minWidth: '20px' }}
                >
                  {/* Bar */}
                  <div
                    className={`w-full max-w-[30px] rounded transition-all ${
                      isPositive
                        ? 'bg-green-400 dark:bg-green-600'
                        : 'bg-red-400 dark:bg-red-600'
                    }`}
                    style={{
                      height: `${height}%`,
                      position: 'absolute',
                      [isPositive ? 'bottom' : 'top']: '50%',
                    }}
                  />
                  
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:block z-10 bg-popover text-popover-foreground p-2 rounded shadow-lg text-xs whitespace-nowrap">
                    <div className="font-bold">{data.year}</div>
                    <div>Sentiment: {data.sentiment.toFixed(2)}</div>
                    <div>Events: {data.eventCount}</div>
                    {data.dominantEmotions.length > 0 && (
                      <div>Emotions: {data.dominantEmotions.join(', ')}</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Year labels */}
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{arcData[0]?.year}</span>
            <span>{arcData[arcData.length - 1]?.year}</span>
          </div>

          {/* Legend */}
          <div className="flex justify-center gap-6 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-400 dark:bg-green-600" />
              <span>Positive</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-400 dark:bg-red-600" />
              <span>Challenging</span>
            </div>
          </div>

          {/* Insights */}
          <div className="pt-4 border-t space-y-2">
            <h4 className="text-sm font-medium">Insights</h4>
            <div className="text-sm text-muted-foreground">
              {overallTrend === 'rising' && (
                <p>📈 Your emotional journey shows an upward trend over time. The later years reflect more positive experiences.</p>
              )}
              {overallTrend === 'falling' && (
                <p>📉 Your story shows some challenging periods in recent years. These moments of difficulty often contain the most growth.</p>
              )}
              {overallTrend === 'stable' && (
                <p>➡️ Your emotional journey has been relatively balanced, with both highs and lows throughout.</p>
              )}
            </div>
            
            {/* Peak moments */}
            {arcData.length > 0 && (
              <div className="text-sm">
                <span className="text-green-600 dark:text-green-400">
                  Happiest year: {arcData.reduce((max, d) => d.sentiment > max.sentiment ? d : max, arcData[0]).year}
                </span>
                {' • '}
                <span className="text-red-600 dark:text-red-400">
                  Most challenging: {arcData.reduce((min, d) => d.sentiment < min.sentiment ? d : min, arcData[0]).year}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
