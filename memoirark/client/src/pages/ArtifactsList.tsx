import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { artifactsApi, Artifact } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Pencil, Trash2 } from 'lucide-react'

const ARTIFACT_TYPES = ['journal', 'email', 'photo', 'chatlog', 'document', 'video', 'audio', 'other']

export default function ArtifactsList() {
  const queryClient = useQueryClient()
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const { data: artifacts, isLoading } = useQuery({
    queryKey: ['artifacts', typeFilter],
    queryFn: () => artifactsApi.getAll({ type: typeFilter !== 'all' ? typeFilter : undefined }),
  })

  const deleteMutation = useMutation({
    mutationFn: artifactsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artifacts'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
    },
  })

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this artifact?')) {
      deleteMutation.mutate(id)
    }
  }

  const truncateUrl = (url: string, maxLength: number = 40) => {
    if (url.length <= maxLength) return url
    return url.substring(0, maxLength) + '...'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Artifacts</h1>
          <p className="text-muted-foreground">Manage journals, photos, emails, and other artifacts</p>
        </div>
        <Link to="/artifacts/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Artifact
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-64">
            <label className="text-sm font-medium mb-2 block">Type</label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {ARTIFACT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-muted-foreground">Loading artifacts...</div>
            </div>
          ) : artifacts && artifacts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Type</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Description</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Source</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Path/URL</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Events</th>
                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {artifacts.map((artifact: Artifact) => (
                    <tr key={artifact.id} className="border-b hover:bg-muted/50">
                      <td className="p-4 align-middle">
                        <Link to={`/artifacts/${artifact.id}`} className="font-medium hover:underline capitalize">
                          {artifact.type}
                        </Link>
                      </td>
                      <td className="p-4 align-middle text-muted-foreground">
                        {artifact.shortDescription || '—'}
                      </td>
                      <td className="p-4 align-middle text-muted-foreground">
                        {artifact.sourceSystem || '—'}
                      </td>
                      <td className="p-4 align-middle text-muted-foreground text-sm">
                        {artifact.sourcePathOrUrl ? truncateUrl(artifact.sourcePathOrUrl) : '—'}
                      </td>
                      <td className="p-4 align-middle text-muted-foreground">
                        {artifact._count?.eventLinks ?? 0}
                      </td>
                      <td className="p-4 align-middle text-right">
                        <div className="flex justify-end gap-2">
                          <Link to={`/artifacts/${artifact.id}/edit`}>
                            <Button variant="ghost" size="icon">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(artifact.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <div className="text-muted-foreground">No artifacts found</div>
              <Link to="/artifacts/new">
                <Button variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add your first artifact
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
