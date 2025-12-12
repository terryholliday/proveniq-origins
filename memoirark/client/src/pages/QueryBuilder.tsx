import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  filterApi,
  chaptersApi,
  traumaCyclesApi,
  personsApi,
  tagsApi,
  FilterPayload,
  Event,
} from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Search, Filter, Star, Calendar, RotateCcw } from 'lucide-react'

export default function QueryBuilder() {
  const [filters, setFilters] = useState<FilterPayload>({
    text: '',
    searchIn: ['title', 'summary', 'notes'],
    chapterIds: [],
    traumaCycleIds: [],
    personIds: [],
    tagIds: [],
    dateRange: {},
    isKeystone: undefined,
    hasArtifacts: undefined,
    hasSynchronicities: undefined,
    limit: 50,
  })

  const [results, setResults] = useState<Event[] | null>(null)

  const { data: chapters } = useQuery({
    queryKey: ['chapters'],
    queryFn: chaptersApi.getAll,
  })

  const { data: traumaCycles } = useQuery({
    queryKey: ['traumaCycles'],
    queryFn: traumaCyclesApi.getAll,
  })

  const { data: persons } = useQuery({
    queryKey: ['persons'],
    queryFn: personsApi.getAll,
  })

  const { data: tags } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.getAll,
  })

  const filterMutation = useMutation({
    mutationFn: filterApi.filter,
    onSuccess: (data) => setResults(data.results),
  })

  const handleSearch = () => {
    filterMutation.mutate(filters)
  }

  const resetFilters = () => {
    setFilters({
      text: '',
      searchIn: ['title', 'summary', 'notes'],
      chapterIds: [],
      traumaCycleIds: [],
      personIds: [],
      tagIds: [],
      dateRange: {},
      isKeystone: undefined,
      hasArtifacts: undefined,
      hasSynchronicities: undefined,
      limit: 50,
    })
    setResults(null)
  }

  const toggleArrayFilter = (key: keyof FilterPayload, value: string) => {
    setFilters((prev) => {
      const arr = (prev[key] as string[]) || []
      if (arr.includes(value)) {
        return { ...prev, [key]: arr.filter((v) => v !== value) }
      }
      return { ...prev, [key]: [...arr, value] }
    })
  }

  const toggleSearchIn = (field: string) => {
    setFilters((prev) => {
      const arr = prev.searchIn || []
      if (arr.includes(field)) {
        return { ...prev, searchIn: arr.filter((v) => v !== field) }
      }
      return { ...prev, searchIn: [...arr, field] }
    })
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Query Builder</h1>
        <p className="text-muted-foreground">Build complex queries to find specific events</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Filters Panel */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Text Search */}
              <div className="space-y-2">
                <Label>Text Search</Label>
                <Input
                  placeholder="Search text..."
                  value={filters.text || ''}
                  onChange={(e) => setFilters((p) => ({ ...p, text: e.target.value }))}
                />
                <div className="flex flex-wrap gap-2 text-xs">
                  {['title', 'summary', 'notes'].map((field) => (
                    <label key={field} className="flex items-center gap-1">
                      <Checkbox
                        checked={filters.searchIn?.includes(field)}
                        onCheckedChange={() => toggleSearchIn(field)}
                      />
                      {field}
                    </label>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <Label>Date Range</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    placeholder="Start"
                    value={filters.dateRange?.start || ''}
                    onChange={(e) =>
                      setFilters((p) => ({
                        ...p,
                        dateRange: { ...p.dateRange, start: e.target.value },
                      }))
                    }
                  />
                  <Input
                    type="date"
                    placeholder="End"
                    value={filters.dateRange?.end || ''}
                    onChange={(e) =>
                      setFilters((p) => ({
                        ...p,
                        dateRange: { ...p.dateRange, end: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>

              {/* Chapters */}
              <div className="space-y-2">
                <Label>Chapters</Label>
                <div className="max-h-32 overflow-y-auto space-y-1 text-sm">
                  {chapters?.map((ch) => (
                    <label key={ch.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={filters.chapterIds?.includes(ch.id)}
                        onCheckedChange={() => toggleArrayFilter('chapterIds', ch.id)}
                      />
                      {ch.number}. {ch.title}
                    </label>
                  ))}
                </div>
              </div>

              {/* Trauma Cycles */}
              <div className="space-y-2">
                <Label>Trauma Cycles</Label>
                <div className="max-h-32 overflow-y-auto space-y-1 text-sm">
                  {traumaCycles?.map((tc) => (
                    <label key={tc.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={filters.traumaCycleIds?.includes(tc.id)}
                        onCheckedChange={() => toggleArrayFilter('traumaCycleIds', tc.id)}
                      />
                      {tc.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* People */}
              <div className="space-y-2">
                <Label>People</Label>
                <div className="max-h-32 overflow-y-auto space-y-1 text-sm">
                  {persons?.map((p) => (
                    <label key={p.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={filters.personIds?.includes(p.id)}
                        onCheckedChange={() => toggleArrayFilter('personIds', p.id)}
                      />
                      {p.name}
                    </label>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="max-h-32 overflow-y-auto space-y-1 text-sm">
                  {tags?.map((t) => (
                    <label key={t.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={filters.tagIds?.includes(t.id)}
                        onCheckedChange={() => toggleArrayFilter('tagIds', t.id)}
                      />
                      {t.name}
                    </label>
                  ))}
                </div>
              </div>

              {/* Boolean Filters */}
              <div className="space-y-2">
                <Label>Special Filters</Label>
                <div className="space-y-1 text-sm">
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={filters.isKeystone === true}
                      onCheckedChange={(checked) =>
                        setFilters((p) => ({ ...p, isKeystone: checked ? true : undefined }))
                      }
                    />
                    Keystone events only
                  </label>
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={filters.hasArtifacts === true}
                      onCheckedChange={(checked) =>
                        setFilters((p) => ({ ...p, hasArtifacts: checked ? true : undefined }))
                      }
                    />
                    Has artifacts
                  </label>
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={filters.hasSynchronicities === true}
                      onCheckedChange={(checked) =>
                        setFilters((p) => ({ ...p, hasSynchronicities: checked ? true : undefined }))
                      }
                    />
                    Has synchronicities
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleSearch} disabled={filterMutation.isPending} className="flex-1">
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </Button>
                <Button variant="outline" onClick={resetFilters}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Results</span>
                {results && <span className="text-sm font-normal text-muted-foreground">{results.length} events</span>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filterMutation.isPending ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-muted-foreground">Searching...</div>
                </div>
              ) : results ? (
                results.length > 0 ? (
                  <ul className="space-y-3">
                    {results.map((event: Event) => (
                      <li key={event.id} className="border-b pb-3 last:border-0">
                        <Link to={`/events/${event.id}`} className="hover:underline">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{event.title}</span>
                            {event.isKeystone && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <Calendar className="inline h-3 w-3 mr-1" />
                            {formatDate(event.date)}
                            {event.location && ` • ${event.location}`}
                            {event.chapter && ` • Ch. ${event.chapter.number}`}
                          </div>
                          {event.summary && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{event.summary}</p>
                          )}
                          {event.tags && event.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {event.tags.map((tag: any) => (
                                <span key={tag.id} className="px-2 py-0.5 bg-muted rounded text-xs">
                                  {tag.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No events match your filters
                  </div>
                )
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Configure filters and click Search to find events
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
