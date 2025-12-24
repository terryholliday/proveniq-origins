import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { traumaCyclesApi, TraumaCycle, TraumaCycleCreateInput } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Pencil, Trash2, RotateCcw } from 'lucide-react'

export default function TraumaCyclesManage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingCycle, setEditingCycle] = useState<TraumaCycle | null>(null)
  const [formData, setFormData] = useState<TraumaCycleCreateInput>({
    label: '',
    startYear: null,
    endYear: null,
    description: '',
  })

  const { data: cycles, isLoading } = useQuery({
    queryKey: ['traumaCycles'],
    queryFn: traumaCyclesApi.getAll,
  })

  const createMutation = useMutation({
    mutationFn: traumaCyclesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traumaCycles'] })
      resetForm()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TraumaCycleCreateInput> }) =>
      traumaCyclesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traumaCycles'] })
      resetForm()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: traumaCyclesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traumaCycles'] })
    },
  })

  const resetForm = () => {
    setShowForm(false)
    setEditingCycle(null)
    setFormData({ label: '', startYear: null, endYear: null, description: '' })
  }

  const handleEdit = (cycle: TraumaCycle) => {
    setEditingCycle(cycle)
    setFormData({
      label: cycle.label,
      startYear: cycle.startYear,
      endYear: cycle.endYear,
      description: cycle.description,
    })
    setShowForm(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingCycle) {
      updateMutation.mutate({ id: editingCycle.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this trauma cycle? Events linked to it will be unlinked.')) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Trauma Cycles</h1>
          <p className="text-muted-foreground">Define recurring patterns and their time periods</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Cycle
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingCycle ? 'Edit Trauma Cycle' : 'Create Trauma Cycle'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="label">Label *</Label>
                <Input
                  id="label"
                  value={formData.label}
                  onChange={(e) => setFormData((p) => ({ ...p, label: e.target.value }))}
                  placeholder="e.g., Abandonment Pattern"
                  required
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startYear">Start Year</Label>
                  <Input
                    id="startYear"
                    type="number"
                    value={formData.startYear ?? ''}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        startYear: e.target.value ? parseInt(e.target.value) : null,
                      }))
                    }
                    placeholder="e.g., 1985"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endYear">End Year</Label>
                  <Input
                    id="endYear"
                    type="number"
                    value={formData.endYear ?? ''}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        endYear: e.target.value ? parseInt(e.target.value) : null,
                      }))
                    }
                    placeholder="e.g., 1995 (or leave blank if ongoing)"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Describe this pattern and its manifestations"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingCycle ? 'Update' : 'Create'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-muted-foreground">Loading trauma cycles...</div>
            </div>
          ) : cycles && cycles.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Label</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Years</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Description</th>
                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cycles.map((cycle: TraumaCycle) => (
                    <tr key={cycle.id} className="border-b hover:bg-muted/50">
                      <td className="p-4 align-middle">
                        <div className="flex items-center gap-2">
                          <RotateCcw className="h-4 w-4" />
                          <span className="font-medium">{cycle.label}</span>
                        </div>
                      </td>
                      <td className="p-4 align-middle text-muted-foreground">
                        {cycle.startYear}
                        {cycle.endYear ? ` – ${cycle.endYear}` : ' – present'}
                      </td>
                      <td className="p-4 align-middle text-muted-foreground text-sm max-w-xs truncate">
                        {cycle.description || '—'}
                      </td>
                      <td className="p-4 align-middle text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(cycle)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(cycle.id)}
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
              <div className="text-muted-foreground">No trauma cycles defined yet</div>
              <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Define your first cycle
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
