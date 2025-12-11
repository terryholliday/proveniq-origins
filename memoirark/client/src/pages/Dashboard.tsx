import { useQuery } from '@tanstack/react-query'
import { statsApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, BookOpen, Zap, Music } from 'lucide-react'

export default function Dashboard() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['stats'],
    queryFn: statsApi.getStats,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-destructive">Failed to load dashboard stats</div>
      </div>
    )
  }

  const statCards = [
    {
      title: 'Events',
      value: stats?.events ?? 0,
      icon: Calendar,
      description: 'Life events recorded',
    },
    {
      title: 'Chapters',
      value: stats?.chapters ?? 0,
      icon: BookOpen,
      description: 'Memoir chapters',
    },
    {
      title: 'Trauma Cycles',
      value: stats?.traumaCycles ?? 0,
      icon: Zap,
      description: 'Identified patterns',
    },
    {
      title: 'Songs',
      value: stats?.songs ?? 0,
      icon: Music,
      description: 'Musical touchstones',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your memoir archive
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Welcome to MemoirArk</CardTitle>
        </CardHeader>
        <CardContent className="font-narrative">
          <p className="text-muted-foreground">
            MemoirArk is your personal archive for storing, organizing, and linking
            a lifetime of journals, chat logs, artifacts, and memories. Use it to
            build a structured foundation for writing your memoir.
          </p>
          <p className="mt-4 text-muted-foreground">
            Start by creating events to document the significant moments of your
            life. Link them to chapters, trauma cycles, and songs to build
            connections across your narrative.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
