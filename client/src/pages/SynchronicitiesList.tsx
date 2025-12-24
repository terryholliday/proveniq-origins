import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { synchronicitiesApi, Synchronicity } from '@/lib/api'
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

const SYNCHRONICITY_TYPES = ['dream', 'omen', 'sign', 'symbolic event', 'coincidence', 'vision', 'other']

export default function SynchronicitiesList() {
  const queryClient = useQueryClient()
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const { data: synchronicities, isLoading } = useQuery({
    queryKey: ['synchronicities', typeFilter],
    queryFn: () => synchronicitiesApi.getAll({ type: typeFilter !== 'all' ? typeFilter : undefined }),
  })

  const deleteMutation = useMutation({
    mutationFn: synchronicitiesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['synchronicities'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
    },
  })

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this synchronicity?')) {
      deleteMutation.mutate(id)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Synchronicities</h1>
          <p className="text-muted-foreground">Track dreams, omens, and symbolic events</p>
        </div>
        <Link to="/synchronicities/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Synchronicity
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
                {SYNCHRONICITY_TYPES.map((type) => (
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
              <div className="text-muted-foreground">Loading synchronicities...</div>
            </div>
          ) : synchronicities && synchronicities.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Type</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Symbolic Tag</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Events</th>
                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {synchronicities.map((sync: Synchronicity) => (
                    <tr key={sync.id} className="border-b hover:bg-muted/50">
                      <td className="p-4 align-middle text-muted-foreground">
                        {formatDate(sync.date)}
                      </td>
                      <td className="p-4 align-middle">
                        <Link to={`/synchronicities/${sync.id}`} className="font-medium hover:underline capitalize">
                          {sync.type}
                        </Link>
                      </td>
                      <td className="p-4 align-middle text-muted-foreground">
                        {sync.symbolicTag || '—'}
                      </td>
                      <td className="p-4 align-middle text-muted-foreground">
                        {sync._count?.eventLinks ?? 0}
                      </td>
                      <td className="p-4 align-middle text-right">
                        <div className="flex justify-end gap-2">
                          <Link to={`/synchronicities/${sync.id}/edit`}>
                            <Button variant="ghost" size="icon">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(sync.id)}
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
              <div className="text-muted-foreground">No synchronicities found</div>
              <Link to="/synchronicities/new">
                <Button variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add your first synchronicity
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
