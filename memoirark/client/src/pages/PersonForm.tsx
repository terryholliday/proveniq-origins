import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { personsApi, PersonCreateInput } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Save } from 'lucide-react'

export default function PersonForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEditing = Boolean(id)

  const [formData, setFormData] = useState<PersonCreateInput>({
    name: '',
    role: '',
    relationshipType: '',
    notes: '',
    isPrimary: false,
  })

  const { data: person, isLoading: personLoading } = useQuery({
    queryKey: ['person', id],
    queryFn: () => personsApi.getById(id!),
    enabled: isEditing,
  })

  useEffect(() => {
    if (person) {
      setFormData({
        name: person.name,
        role: person.role,
        relationshipType: person.relationshipType,
        notes: person.notes,
        isPrimary: person.isPrimary,
      })
    }
  }, [person])

  const createMutation = useMutation({
    mutationFn: personsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['persons'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      navigate('/people')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PersonCreateInput> }) =>
      personsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['persons'] })
      queryClient.invalidateQueries({ queryKey: ['person', id] })
      navigate('/people')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isEditing && id) {
      updateMutation.mutate({ id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  if (isEditing && personLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading person...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/people')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditing ? 'Edit Person' : 'New Person'}
          </h1>
          <p className="text-muted-foreground">
            {isEditing ? 'Update person details' : 'Add a new person to your memoir'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Person Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Person's name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value }))}
                  placeholder="e.g., mother, friend, boss"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="relationshipType">Relationship Type</Label>
                <Input
                  id="relationshipType"
                  value={formData.relationshipType}
                  onChange={(e) => setFormData((prev) => ({ ...prev, relationshipType: e.target.value }))}
                  placeholder="e.g., family, romantic, professional"
                />
              </div>

              <div className="space-y-2 flex items-center gap-2 pt-8">
                <input
                  type="checkbox"
                  id="isPrimary"
                  checked={formData.isPrimary}
                  onChange={(e) => setFormData((prev) => ({ ...prev, isPrimary: e.target.checked }))}
                  className="h-4 w-4"
                />
                <Label htmlFor="isPrimary">Primary/Central Person</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes about this person..."
                rows={6}
                className="font-narrative"
              />
            </div>

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => navigate('/people')}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                <Save className="mr-2 h-4 w-4" />
                {isPending ? 'Saving...' : isEditing ? 'Update Person' : 'Create Person'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
