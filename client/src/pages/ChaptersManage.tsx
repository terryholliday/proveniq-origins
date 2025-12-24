import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { chaptersApi, Chapter, ChapterCreateInput } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Pencil, Trash2, BookOpen, Sparkles, Info } from 'lucide-react'

export default function ChaptersManage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null)
  const [formData, setFormData] = useState<ChapterCreateInput>({
    number: 1,
    title: '',
    yearsCovered: [],
    summary: '',
  })
  const [yearsInput, setYearsInput] = useState('')

  const { data: chapters, isLoading } = useQuery({
    queryKey: ['chapters'],
    queryFn: chaptersApi.getAll,
  })

  const createMutation = useMutation({
    mutationFn: chaptersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters'] })
      resetForm()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ChapterCreateInput> }) =>
      chaptersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters'] })
      resetForm()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: chaptersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters'] })
    },
  })

  const resetForm = () => {
    setShowForm(false)
    setEditingChapter(null)
    setFormData({ number: 1, title: '', yearsCovered: [], summary: '' })
    setYearsInput('')
  }

  const handleEdit = (chapter: Chapter) => {
    setEditingChapter(chapter)
    setFormData({
      number: chapter.number,
      title: chapter.title,
      yearsCovered: chapter.yearsCovered.map(Number),
      summary: chapter.summary,
    })
    setYearsInput(chapter.yearsCovered.join(', '))
    setShowForm(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const years = yearsInput
      .split(',')
      .map((y) => parseInt(y.trim()))
      .filter((y) => !isNaN(y))

    const payload = { ...formData, yearsCovered: years }

    if (editingChapter) {
      updateMutation.mutate({ id: editingChapter.id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this chapter? Events linked to it will be unlinked.')) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Chapters</h1>
          <p className="text-muted-foreground">Organize your memoir into meaningful chapters</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Chapter
        </Button>
      </div>

      {/* Guidance Card */}
      <Card className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-800">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-amber-900 dark:text-amber-100">Two Ways to Build Your Chapters</h3>
              <div className="text-sm text-amber-800 dark:text-amber-200 space-y-2">
                <p className="flex items-start gap-2">
                  <span className="font-medium">1.</span>
                  <span><strong>Add chapters manually</strong> if you already know your chapter titles — click "New Chapter" above to get started.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="font-medium">2.</span>
                  <span><strong>Let Ori help</strong> — as you share your story through interviews and events, Ori will analyze your narrative and suggest chapter titles that capture the themes and turning points of your life.</span>
                </p>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-3">
                <Info className="h-3 w-3" />
                You can always rename or reorganize chapters later as your memoir evolves.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingChapter ? 'Edit Chapter' : 'Create Chapter'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="number">Chapter Number *</Label>
                  <Input
                    id="number"
                    type="number"
                    value={formData.number}
                    onChange={(e) => setFormData((p) => ({ ...p, number: parseInt(e.target.value) || 1 }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                    placeholder="Chapter title"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="years">Years Covered (comma-separated)</Label>
                <Input
                  id="years"
                  value={yearsInput}
                  onChange={(e) => setYearsInput(e.target.value)}
                  placeholder="e.g., 1985, 1986, 1987"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="summary">Summary / Thematic Focus</Label>
                <Textarea
                  id="summary"
                  value={formData.summary}
                  onChange={(e) => setFormData((p) => ({ ...p, summary: e.target.value }))}
                  placeholder="Brief description of this chapter's themes"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingChapter ? 'Update' : 'Create'}
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
              <div className="text-muted-foreground">Loading chapters...</div>
            </div>
          ) : chapters && chapters.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-16">#</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Title</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Years</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Summary</th>
                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {chapters.map((chapter: Chapter) => (
                    <tr key={chapter.id} className="border-b hover:bg-muted/50">
                      <td className="p-4 align-middle font-medium">{chapter.number}</td>
                      <td className="p-4 align-middle">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          {chapter.title}
                        </div>
                      </td>
                      <td className="p-4 align-middle text-muted-foreground text-sm">
                        {chapter.yearsCovered.length > 0 ? chapter.yearsCovered.join(', ') : '—'}
                      </td>
                      <td className="p-4 align-middle text-muted-foreground text-sm max-w-xs truncate">
                        {chapter.summary || '—'}
                      </td>
                      <td className="p-4 align-middle text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(chapter)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(chapter.id)}
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
              <div className="text-muted-foreground">No chapters yet</div>
              <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create your first chapter
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
