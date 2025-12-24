import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { narrativeApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, Calendar, Star } from 'lucide-react'

export default function ChaptersList() {
  const { data: chapters, isLoading } = useQuery({
    queryKey: ['narrative-chapters'],
    queryFn: narrativeApi.getChapters,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Chapters</h1>
        <p className="text-muted-foreground">Read your memoir by chapter</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading chapters...</div>
        </div>
      ) : chapters && chapters.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {chapters.map((chapter) => (
            <Link key={chapter.id} to={`/chapters/${chapter.id}`}>
              <Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    <span>
                      {chapter.number}. {chapter.title}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {chapter.yearsCovered && chapter.yearsCovered.length > 0 && (
                    <div className="text-sm text-muted-foreground mb-2">
                      Years: {chapter.yearsCovered.join(', ')}
                    </div>
                  )}
                  {chapter.summary && (
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                      {chapter.summary}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {chapter.eventCount} event{chapter.eventCount !== 1 ? 's' : ''}
                    </span>
                    {chapter.events?.some((e) => e.isKeystone) && (
                      <span className="flex items-center gap-1 text-yellow-500">
                        <Star className="h-4 w-4 fill-yellow-500" />
                        Keystone
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">No chapters available</div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
