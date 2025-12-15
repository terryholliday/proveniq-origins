import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { personsApi, Person } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, User, Users, Heart, Star, ChevronRight } from 'lucide-react'

const RELATIONSHIP_CATEGORIES = {
  family: ['parent', 'mother', 'father', 'child', 'son', 'daughter', 'sibling', 'brother', 'sister', 'grandparent', 'grandmother', 'grandfather', 'grandchild', 'aunt', 'uncle', 'cousin', 'niece', 'nephew', 'in-law', 'step-parent', 'step-child', 'step-sibling'],
  romantic: ['spouse', 'husband', 'wife', 'partner', 'ex-spouse', 'ex-partner', 'boyfriend', 'girlfriend', 'fiancé', 'fiancée'],
  social: ['friend', 'best friend', 'childhood friend', 'colleague', 'coworker', 'neighbor', 'acquaintance', 'roommate'],
  professional: ['mentor', 'mentee', 'boss', 'employee', 'teacher', 'student', 'coach', 'therapist', 'doctor'],
  other: ['other', 'unknown'],
}

function getRelationshipCategory(relationshipType: string): string {
  const lower = relationshipType.toLowerCase()
  for (const [category, types] of Object.entries(RELATIONSHIP_CATEGORIES)) {
    if (types.some(t => lower.includes(t))) {
      return category
    }
  }
  return 'other'
}

function getCategoryColor(category: string): string {
  switch (category) {
    case 'family': return 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700'
    case 'romantic': return 'bg-rose-100 dark:bg-rose-900/30 border-rose-300 dark:border-rose-700'
    case 'social': return 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700'
    case 'professional': return 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700'
    default: return 'bg-gray-100 dark:bg-gray-900/30 border-gray-300 dark:border-gray-700'
  }
}

function getCategoryIcon(category: string) {
  switch (category) {
    case 'family': return <Users className="w-4 h-4" />
    case 'romantic': return <Heart className="w-4 h-4" />
    case 'social': return <User className="w-4 h-4" />
    case 'professional': return <Star className="w-4 h-4" />
    default: return <User className="w-4 h-4" />
  }
}

interface PersonNode {
  person: Person
  category: string
  eventCount: number
}

export default function FamilyTree() {
  const [viewMode, setViewMode] = useState<'tree' | 'list' | 'circles'>('circles')
  const [filterCategory, setFilterCategory] = useState<string>('all')

  const { data: persons, isLoading } = useQuery({
    queryKey: ['persons'],
    queryFn: () => personsApi.getAll(),
  })

  const personNodes: PersonNode[] = useMemo(() => {
    if (!persons) return []
    return persons.map(p => ({
      person: p,
      category: getRelationshipCategory(p.relationshipType || p.role || ''),
      eventCount: p._count?.eventLinks || 0,
    }))
  }, [persons])

  const filteredNodes = useMemo(() => {
    if (filterCategory === 'all') return personNodes
    return personNodes.filter(n => n.category === filterCategory)
  }, [personNodes, filterCategory])

  const groupedByCategory = useMemo(() => {
    const groups: Record<string, PersonNode[]> = {}
    for (const node of filteredNodes) {
      if (!groups[node.category]) groups[node.category] = []
      groups[node.category].push(node)
    }
    // Sort each group by event count
    for (const category of Object.keys(groups)) {
      groups[category].sort((a, b) => b.eventCount - a.eventCount)
    }
    return groups
  }, [filteredNodes])

  const categoryOrder = ['family', 'romantic', 'social', 'professional', 'other']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">People in Your Story</h1>
          <p className="text-muted-foreground">
            {persons?.length || 0} people across your memoir
          </p>
        </div>
        <Link to="/people/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Person
          </Button>
        </Link>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-4 flex-wrap items-center">
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'circles' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('circles')}
              >
                Circles
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                List
              </Button>
            </div>
            
            <div className="w-48">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All relationships" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All relationships</SelectItem>
                  <SelectItem value="family">Family</SelectItem>
                  <SelectItem value="romantic">Romantic</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading people...</div>
        </div>
      ) : filteredNodes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64 gap-2">
            <Users className="w-12 h-12 text-muted-foreground/50" />
            <div className="text-muted-foreground">No people found</div>
            <Link to="/people/new">
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add your first person
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : viewMode === 'circles' ? (
        /* Circles View - Visual relationship map */
        <div className="space-y-8">
          {categoryOrder.map(category => {
            const nodes = groupedByCategory[category]
            if (!nodes || nodes.length === 0) return null
            
            return (
              <div key={category}>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 capitalize">
                  {getCategoryIcon(category)}
                  {category}
                  <span className="text-sm font-normal text-muted-foreground">
                    ({nodes.length})
                  </span>
                </h2>
                
                <div className="flex flex-wrap gap-4">
                  {nodes.map(node => {
                    // Size based on event count
                    const size = Math.min(Math.max(node.eventCount * 8 + 60, 60), 120)
                    
                    return (
                      <Link
                        key={node.person.id}
                        to={`/people/${node.person.id}`}
                        className={`rounded-full border-2 flex flex-col items-center justify-center text-center p-2 hover:scale-105 transition-transform ${getCategoryColor(node.category)}`}
                        style={{ width: size, height: size }}
                      >
                        <span className="font-medium text-sm truncate max-w-full px-1">
                          {node.person.name.split(' ')[0]}
                        </span>
                        {node.eventCount > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {node.eventCount} events
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* List View */
        <div className="space-y-4">
          {categoryOrder.map(category => {
            const nodes = groupedByCategory[category]
            if (!nodes || nodes.length === 0) return null
            
            return (
              <Card key={category}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2 capitalize">
                    {getCategoryIcon(category)}
                    {category}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="divide-y">
                    {nodes.map(node => (
                      <Link
                        key={node.person.id}
                        to={`/people/${node.person.id}`}
                        className="flex items-center justify-between py-3 hover:bg-muted/50 -mx-2 px-2 rounded transition-colors"
                      >
                        <div>
                          <div className="font-medium">{node.person.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {node.person.relationshipType || node.person.role || 'No role specified'}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-muted-foreground">
                          {node.person.isPrimary && (
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          )}
                          <span className="text-sm">{node.eventCount} events</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Legend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 text-sm">
            {categoryOrder.map(category => (
              <div key={category} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full border ${getCategoryColor(category)}`} />
                <span className="capitalize">{category}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Circle size indicates how many events feature this person.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
