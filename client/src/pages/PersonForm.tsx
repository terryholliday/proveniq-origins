import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { personsApi, PersonCreateInput } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Save, X, Plus } from 'lucide-react'
import TagSuggestions from '@/components/TagSuggestions'

// Role to relationship type mapping
const ROLE_TO_RELATIONSHIP: Record<string, string> = {
  // Family
  mother: 'Family', mom: 'Family', father: 'Family', dad: 'Family',
  brother: 'Family', sister: 'Family', sibling: 'Family',
  son: 'Family', daughter: 'Family', child: 'Family',
  grandmother: 'Family', grandfather: 'Family', grandma: 'Family', grandpa: 'Family',
  aunt: 'Family', uncle: 'Family', cousin: 'Family',
  nephew: 'Family', niece: 'Family',
  'step-mother': 'Family', 'step-father': 'Family', 'step-brother': 'Family', 'step-sister': 'Family',
  'mother-in-law': 'Family', 'father-in-law': 'Family',
  // Romantic
  wife: 'Romantic', husband: 'Romantic', spouse: 'Romantic', partner: 'Romantic',
  boyfriend: 'Romantic', girlfriend: 'Romantic', fiancé: 'Romantic', fiancée: 'Romantic',
  ex: 'Romantic', 'ex-wife': 'Romantic', 'ex-husband': 'Romantic', 'ex-boyfriend': 'Romantic', 'ex-girlfriend': 'Romantic',
  // Professional
  boss: 'Professional', manager: 'Professional', supervisor: 'Professional',
  coworker: 'Professional', colleague: 'Professional', employee: 'Professional',
  mentor: 'Professional', mentee: 'Professional',
  teacher: 'Professional', professor: 'Professional', instructor: 'Professional',
  student: 'Professional',
  // Social
  friend: 'Social', 'best friend': 'Social', acquaintance: 'Social',
  neighbor: 'Social', roommate: 'Social',
  // Other
  therapist: 'Professional', doctor: 'Professional', coach: 'Professional',
}

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
    tags: [],
  })
  const [newTag, setNewTag] = useState('')

  // Auto-fill relationship type based on role
  const handleRoleChange = (role: string) => {
    const normalizedRole = role.toLowerCase().trim()
    const relationshipType = ROLE_TO_RELATIONSHIP[normalizedRole]
    
    setFormData((prev) => ({
      ...prev,
      role,
      // Only auto-fill if relationship type is empty or was auto-filled before
      relationshipType: relationshipType && !prev.relationshipType ? relationshipType : prev.relationshipType,
    }))
  }

  const handleAddCustomTag = () => {
    const tag = newTag.trim().toLowerCase()
    if (tag && !formData.tags?.includes(tag)) {
      setFormData((prev) => ({
        ...prev,
        tags: [...(prev.tags || []), tag],
      }))
      setNewTag('')
    }
  }

  const { data: person, isLoading: personLoading } = useQuery({
    queryKey: ['person', id],
    queryFn: () => personsApi.getById(id!),
    enabled: isEditing,
  })

  useEffect(() => {
    if (person) {
      // Parse tags from JSON string if needed
      let tags: string[] = []
      if (person.tags) {
        try {
          tags = typeof person.tags === 'string' ? JSON.parse(person.tags) : person.tags
        } catch {
          tags = []
        }
      }
      setFormData({
        name: person.name,
        role: person.role,
        relationshipType: person.relationshipType,
        notes: person.notes,
        isPrimary: person.isPrimary,
        tags,
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
                  onChange={(e) => handleRoleChange(e.target.value)}
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

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags</Label>
              {(formData.tags?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags?.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({
                          ...prev,
                          tags: prev.tags?.filter((t) => t !== tag) || [],
                        }))}
                        className="hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <TagSuggestions
                title={formData.name}
                summary={`${formData.role || ''} ${formData.relationshipType || ''}`}
                notes={formData.notes || ''}
                currentTags={formData.tags || []}
                onAddTag={(tag) => {
                  if (!formData.tags?.includes(tag)) {
                    setFormData((prev) => ({
                      ...prev,
                      tags: [...(prev.tags || []), tag],
                    }))
                  }
                }}
              />
              {/* Custom tag input */}
              <div className="flex gap-2 mt-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add custom tag..."
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddCustomTag()
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleAddCustomTag}
                  disabled={!newTag.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
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
