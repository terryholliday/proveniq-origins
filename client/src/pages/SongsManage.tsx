import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { songsApi, Song, SongCreateInput } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Pencil, Trash2, Music, Loader2, Search } from 'lucide-react'

const API_BASE = 'http://localhost:3001/api'

interface SpotifyTrack {
  spotifyId: string
  title: string
  artist: string
  album: string
  releaseYear: string | null
  albumArt: string | null
  spotifyUrl: string
  previewUrl: string | null
}

export default function SongsManage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingSong, setEditingSong] = useState<Song | null>(null)
  const [formData, setFormData] = useState<SongCreateInput>({
    title: '',
    artist: '',
    era: '',
    keyLyric: '',
    notes: '',
  })

  // Spotify search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [spotifyConfigured, setSpotifyConfigured] = useState<boolean | null>(null)
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Check if Spotify is configured
  useEffect(() => {
    fetch(`${API_BASE}/spotify/status`)
      .then(res => res.json())
      .then(data => setSpotifyConfigured(data.configured))
      .catch(() => setSpotifyConfigured(false))
  }, [])

  // Debounced Spotify search
  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current)
    }

    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    setIsSearching(true)
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/spotify/search?q=${encodeURIComponent(searchQuery)}`)
        const data = await res.json()
        setSearchResults(data.tracks || [])
        setShowResults(true)
      } catch (error) {
        console.error('Spotify search error:', error)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current)
      }
    }
  }, [searchQuery])

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (resultsRef.current && !resultsRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectSpotifyTrack = (track: SpotifyTrack) => {
    setFormData(prev => ({
      ...prev,
      title: track.title,
      artist: track.artist,
      era: track.releaseYear || '',
    }))
    setSearchQuery('')
    setShowResults(false)
    setSearchResults([])
  }

  const { data: songs, isLoading } = useQuery({
    queryKey: ['songs'],
    queryFn: songsApi.getAll,
  })

  const createMutation = useMutation({
    mutationFn: songsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] })
      resetForm()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SongCreateInput> }) =>
      songsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] })
      resetForm()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: songsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] })
    },
  })

  const resetForm = () => {
    setShowForm(false)
    setEditingSong(null)
    setFormData({ title: '', artist: '', era: '', keyLyric: '', notes: '' })
  }

  const handleEdit = (song: Song) => {
    setEditingSong(song)
    setFormData({
      title: song.title,
      artist: song.artist,
      era: song.era,
      keyLyric: song.keyLyric,
      notes: song.notes,
    })
    setShowForm(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingSong) {
      updateMutation.mutate({ id: editingSong.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this song? Events linked to it will be unlinked.')) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Songs</h1>
          <p className="text-muted-foreground">Add and edit songs that mark significant moments</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Song
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingSong ? 'Edit Song' : 'Add Song'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Spotify Search */}
              {spotifyConfigured && !editingSong && (
                <div className="space-y-2" ref={resultsRef}>
                  <Label htmlFor="search">Search Spotify</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Type a song name to search..."
                      className="pl-9"
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  {showResults && searchResults.length > 0 && (
                    <div className="absolute z-50 w-full max-w-md bg-background border rounded-md shadow-lg max-h-64 overflow-y-auto">
                      {searchResults.map((track) => (
                        <button
                          key={track.spotifyId}
                          type="button"
                          onClick={() => selectSpotifyTrack(track)}
                          className="w-full flex items-center gap-3 p-2 hover:bg-muted text-left"
                        >
                          {track.albumArt && (
                            <img src={track.albumArt} alt="" className="w-10 h-10 rounded" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{track.title}</div>
                            <div className="text-sm text-muted-foreground truncate">
                              {track.artist} {track.releaseYear && `• ${track.releaseYear}`}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {showResults && searchResults.length === 0 && searchQuery.length >= 2 && !isSearching && (
                    <div className="text-sm text-muted-foreground">No results found</div>
                  )}
                </div>
              )}

              {spotifyConfigured === false && !editingSong && (
                <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                  Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to .env for song search
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                    placeholder="Song title"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="artist">Artist *</Label>
                  <Input
                    id="artist"
                    value={formData.artist}
                    onChange={(e) => setFormData((p) => ({ ...p, artist: e.target.value }))}
                    placeholder="Artist name"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="era">Era</Label>
                <Input
                  id="era"
                  value={formData.era}
                  onChange={(e) => setFormData((p) => ({ ...p, era: e.target.value }))}
                  placeholder="e.g., High School, College, 2005"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="keyLyric">Key Lyric</Label>
                <Input
                  id="keyLyric"
                  value={formData.keyLyric}
                  onChange={(e) => setFormData((p) => ({ ...p, keyLyric: e.target.value }))}
                  placeholder="A lyric that resonates"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Why this song matters to your story"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingSong ? 'Update' : 'Add'}
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
              <div className="text-muted-foreground">Loading songs...</div>
            </div>
          ) : songs && songs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Title</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Artist</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Era</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Key Lyric</th>
                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {songs.map((song: Song) => (
                    <tr key={song.id} className="border-b hover:bg-muted/50">
                      <td className="p-4 align-middle">
                        <div className="flex items-center gap-2">
                          <Music className="h-4 w-4" />
                          <span className="font-medium">{song.title}</span>
                        </div>
                      </td>
                      <td className="p-4 align-middle text-muted-foreground">{song.artist}</td>
                      <td className="p-4 align-middle text-muted-foreground">{song.era || '—'}</td>
                      <td className="p-4 align-middle text-muted-foreground text-sm max-w-xs truncate italic">
                        {song.keyLyric || '—'}
                      </td>
                      <td className="p-4 align-middle text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(song)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(song.id)}
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
              <div className="text-muted-foreground">No songs added yet</div>
              <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add your first song
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
