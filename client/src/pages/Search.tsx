import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { searchApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search as SearchIcon, Calendar, Users, FileText, Sparkles, BookOpen, Music } from 'lucide-react'

const SEARCH_TYPES = [
  { value: 'all', label: 'All', icon: SearchIcon },
  { value: 'events', label: 'Events', icon: Calendar },
  { value: 'persons', label: 'People', icon: Users },
  { value: 'artifacts', label: 'Artifacts', icon: FileText },
  { value: 'synchronicities', label: 'Synchronicities', icon: Sparkles },
  { value: 'chapters', label: 'Chapters', icon: BookOpen },
  { value: 'songs', label: 'Songs', icon: Music },
]

export default function Search() {
  const [query, setQuery] = useState('')
  const [searchType, setSearchType] = useState('all')
  const [submittedQuery, setSubmittedQuery] = useState('')

  const { data: results, isLoading, isFetching } = useQuery({
    queryKey: ['search', submittedQuery, searchType],
    queryFn: () => searchApi.search(submittedQuery, searchType !== 'all' ? searchType : undefined),
    enabled: submittedQuery.length >= 2,
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim().length >= 2) {
      setSubmittedQuery(query.trim())
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Search</h1>
        <p className="text-muted-foreground">Search across all your memoir data</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events, people, artifacts..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={searchType} onValueChange={setSearchType}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEARCH_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" disabled={query.length < 2}>
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      {isLoading || isFetching ? (
        <div className="flex items-center justify-center h-32">
          <div className="text-muted-foreground">Searching...</div>
        </div>
      ) : results ? (
        <div className="space-y-6">
          <div className="text-sm text-muted-foreground">
            Found {results.totalResults} result{results.totalResults !== 1 ? 's' : ''} for "{results.query}"
          </div>

          {results.results.events.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Events ({results.results.events.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {results.results.events.map((event) => (
                    <li key={event.id} className="border-b pb-2 last:border-0">
                      <Link to={`/events/${event.id}`} className="hover:underline">
                        <div className="font-medium">{event.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(event.date)}
                          {event.location && ` • ${event.location}`}
                          {event.chapter && ` • Ch. ${event.chapter.number}`}
                        </div>
                        {event.summary && (
                          <div className="text-sm text-muted-foreground mt-1 line-clamp-1">
                            {event.summary}
                          </div>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {results.results.persons.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  People ({results.results.persons.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {results.results.persons.map((person) => (
                    <li key={person.id}>
                      <Link to={`/people/${person.id}`} className="hover:underline">
                        <span className="font-medium">{person.name}</span>
                        {person.role && <span className="text-muted-foreground ml-2">({person.role})</span>}
                        <span className="text-muted-foreground ml-2 text-sm">
                          • {person._count?.eventLinks ?? 0} events
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {results.results.artifacts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Artifacts ({results.results.artifacts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {results.results.artifacts.map((artifact) => (
                    <li key={artifact.id}>
                      <Link to={`/artifacts/${artifact.id}`} className="hover:underline">
                        <span className="font-medium capitalize">{artifact.type}</span>
                        {artifact.shortDescription && (
                          <span className="text-muted-foreground ml-2">— {artifact.shortDescription}</span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {results.results.synchronicities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Synchronicities ({results.results.synchronicities.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {results.results.synchronicities.map((sync) => (
                    <li key={sync.id}>
                      <Link to={`/synchronicities/${sync.id}`} className="hover:underline">
                        <span className="font-medium capitalize">{sync.type}</span>
                        {sync.symbolicTag && (
                          <span className="text-muted-foreground ml-2">({sync.symbolicTag})</span>
                        )}
                        <span className="text-muted-foreground ml-2 text-sm">
                          {formatDate(sync.date)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {results.results.chapters.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Chapters ({results.results.chapters.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {results.results.chapters.map((chapter) => (
                    <li key={chapter.id}>
                      <Link to={`/chapters/${chapter.id}`} className="hover:underline">
                        <span className="font-medium">
                          {chapter.number}. {chapter.title}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {results.results.songs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music className="h-5 w-5" />
                  Songs ({results.results.songs.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {results.results.songs.map((song) => (
                    <li key={song.id}>
                      <span className="font-medium">{song.title}</span>
                      <span className="text-muted-foreground ml-2">— {song.artist}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {results.totalResults === 0 && (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <div className="text-muted-foreground">No results found for "{results.query}"</div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : submittedQuery ? null : (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">Enter at least 2 characters to search</div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
