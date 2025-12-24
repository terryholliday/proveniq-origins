import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { eventsApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkles, Calendar } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function ThisDayInYourLife() {
  const { data: events } = useQuery({
    queryKey: ['events'],
    queryFn: () => eventsApi.getAll(),
  })

  const todayEvents = useMemo(() => {
    if (!events) return []
    
    const today = new Date()
    const todayMonth = today.getMonth()
    const todayDay = today.getDate()

    return events.filter((event) => {
      if (!event.date) return false
      const eventDate = new Date(event.date)
      return eventDate.getMonth() === todayMonth && eventDate.getDate() === todayDay
    }).map((event) => ({
      ...event,
      yearsAgo: today.getFullYear() - new Date(event.date!).getFullYear(),
    })).sort((a, b) => b.yearsAgo - a.yearsAgo)
  }, [events])

  if (todayEvents.length === 0) {
    return null
  }

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-purple-200 dark:border-purple-800">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-purple-900 dark:text-purple-100">
          <Sparkles className="h-5 w-5 text-purple-500" />
          This Day in Your Life
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {todayEvents.map((event) => (
            <Link
              key={event.id}
              to={`/events/${event.id}`}
              className="block p-3 rounded-lg bg-white/50 dark:bg-black/20 hover:bg-white/80 dark:hover:bg-black/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-medium text-purple-900 dark:text-purple-100">
                    {event.title}
                  </h4>
                  {event.summary && (
                    <p className="text-sm text-purple-700 dark:text-purple-300 mt-1 line-clamp-2">
                      {event.summary}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs bg-purple-200 dark:bg-purple-800 px-2 py-1 rounded-full text-purple-800 dark:text-purple-200 whitespace-nowrap">
                  <Calendar className="h-3 w-3" />
                  {event.yearsAgo === 0 ? 'Today!' : `${event.yearsAgo} year${event.yearsAgo === 1 ? '' : 's'} ago`}
                </div>
              </div>
              {event.emotionTags && event.emotionTags.length > 0 && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {event.emotionTags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
