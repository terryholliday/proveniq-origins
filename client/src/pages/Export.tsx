import { useQuery } from '@tanstack/react-query'
import { exportApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, FileJson, FileText, Calendar, Users, FileText as FileIcon, Sparkles, BookOpen, Music, Star } from 'lucide-react'

export default function Export() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['export-stats'],
    queryFn: exportApi.getStats,
  })

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Export</h1>
        <p className="text-muted-foreground">Download your memoir data</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Archive Statistics</CardTitle>
          <CardDescription>Overview of your memoir data</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-muted-foreground">Loading stats...</div>
          ) : stats ? (
            <div className="grid gap-4 md:grid-cols-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-muted-foreground" />
                <div>
                  <div className="text-2xl font-bold">{stats.events}</div>
                  <div className="text-sm text-muted-foreground">Events</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Star className="h-8 w-8 text-yellow-500" />
                <div>
                  <div className="text-2xl font-bold">{stats.keystoneEvents}</div>
                  <div className="text-sm text-muted-foreground">Keystone Events</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-muted-foreground" />
                <div>
                  <div className="text-2xl font-bold">{stats.persons}</div>
                  <div className="text-sm text-muted-foreground">People</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FileIcon className="h-8 w-8 text-muted-foreground" />
                <div>
                  <div className="text-2xl font-bold">{stats.artifacts}</div>
                  <div className="text-sm text-muted-foreground">Artifacts</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Sparkles className="h-8 w-8 text-muted-foreground" />
                <div>
                  <div className="text-2xl font-bold">{stats.synchronicities}</div>
                  <div className="text-sm text-muted-foreground">Synchronicities</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <BookOpen className="h-8 w-8 text-muted-foreground" />
                <div>
                  <div className="text-2xl font-bold">{stats.chapters}</div>
                  <div className="text-sm text-muted-foreground">Chapters</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Music className="h-8 w-8 text-muted-foreground" />
                <div>
                  <div className="text-2xl font-bold">{stats.songs}</div>
                  <div className="text-sm text-muted-foreground">Songs</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Date Range</div>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(stats.dateRange.earliest)} — {formatDate(stats.dateRange.latest)}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5" />
              JSON Export
            </CardTitle>
            <CardDescription>
              Export all your data as a structured JSON file. Ideal for backups or data migration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• All events with linked entities</li>
                <li>• All people, artifacts, synchronicities</li>
                <li>• Chapters, trauma cycles, songs</li>
                <li>• Complete relationship data</li>
              </ul>
              <Button onClick={exportApi.downloadJson} className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Download JSON
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Markdown Export
            </CardTitle>
            <CardDescription>
              Export as a formatted Markdown document. Perfect for memoir drafts or sharing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Organized by chapter</li>
                <li>• Events with full narrative text</li>
                <li>• People and songs included</li>
                <li>• Ready for editing or publishing</li>
              </ul>
              <Button onClick={exportApi.downloadMarkdown} className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Download Markdown
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Export Notes</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>JSON Export:</strong> Contains all data in a machine-readable format.
            Use this for backups or importing into other systems.
          </p>
          <p>
            <strong>Markdown Export:</strong> Generates a human-readable memoir draft.
            Events are organized by chapter with narrative formatting applied.
          </p>
          <p>
            Keystone events are marked with ⭐ in the Markdown export.
            All emotion tags, people, and songs are included for context.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
