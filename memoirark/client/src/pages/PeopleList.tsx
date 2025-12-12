import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { personsApi, Person } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Plus, Pencil, Trash2, Search, Star } from 'lucide-react'

export default function PeopleList() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')

  const { data: persons, isLoading } = useQuery({
    queryKey: ['persons', search],
    queryFn: () => personsApi.getAll({ search: search || undefined }),
  })

  const deleteMutation = useMutation({
    mutationFn: personsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['persons'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
    },
  })

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this person?')) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">People</h1>
          <p className="text-muted-foreground">Manage people in your memoir</p>
        </div>
        <Link to="/people/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Person
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-muted-foreground">Loading people...</div>
            </div>
          ) : persons && persons.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Name</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Role</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Relationship</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Events</th>
                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {persons.map((person: Person) => (
                    <tr key={person.id} className="border-b hover:bg-muted/50">
                      <td className="p-4 align-middle">
                        <Link to={`/people/${person.id}`} className="font-medium hover:underline flex items-center gap-2">
                          {person.name}
                          {person.isPrimary && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                        </Link>
                      </td>
                      <td className="p-4 align-middle text-muted-foreground">{person.role || '—'}</td>
                      <td className="p-4 align-middle text-muted-foreground">{person.relationshipType || '—'}</td>
                      <td className="p-4 align-middle text-muted-foreground">{person._count?.eventLinks ?? 0}</td>
                      <td className="p-4 align-middle text-right">
                        <div className="flex justify-end gap-2">
                          <Link to={`/people/${person.id}/edit`}>
                            <Button variant="ghost" size="icon">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(person.id)}
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
              <div className="text-muted-foreground">No people found</div>
              <Link to="/people/new">
                <Button variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add your first person
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
