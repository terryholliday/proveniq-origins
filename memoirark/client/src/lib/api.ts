import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

export interface Chapter {
  id: string
  number: number
  title: string
  summary: string
  yearsCovered: string[]
  createdAt: string
  updatedAt: string
}

export interface TraumaCycle {
  id: string
  label: string
  startYear: number
  endYear: number
  description: string
  createdAt: string
  updatedAt: string
}

export interface Song {
  id: string
  title: string
  artist: string
  era: string
  keyLyric: string
  notes: string
  createdAt: string
  updatedAt: string
}

export interface Person {
  id: string
  name: string
  role: string
  relationshipType: string
  notes: string
  isPrimary: boolean
  createdAt: string
  updatedAt: string
  _count?: { eventLinks: number }
}

export interface Artifact {
  id: string
  type: string
  sourceSystem: string
  sourcePathOrUrl: string
  shortDescription: string
  transcribedText: string | null
  importedFrom: string | null
  createdAt: string
  updatedAt: string
  _count?: { eventLinks: number; personLinks: number }
}

export interface Synchronicity {
  id: string
  date: string | null
  type: string
  description: string
  symbolicTag: string | null
  createdAt: string
  updatedAt: string
  _count?: { eventLinks: number }
}

export interface Event {
  id: string
  title: string
  date: string | null
  location: string | null
  summary: string | null
  emotionTags: string[]
  notes: string | null
  isKeystone: boolean
  chapterId: string | null
  traumaCycleId: string | null
  chapter?: Chapter | null
  traumaCycle?: TraumaCycle | null
  persons?: Person[]
  songs?: Song[]
  artifacts?: Artifact[]
  synchronicities?: Synchronicity[]
  _count?: {
    personLinks: number
    songLinks: number
    artifactLinks: number
    synchronicityLinks: number
  }
  createdAt: string
  updatedAt: string
}

export interface Stats {
  events: number
  chapters: number
  traumaCycles: number
  songs: number
  persons: number
  artifacts: number
  synchronicities: number
}

export interface EventCreateInput {
  title: string
  date?: string | null
  location?: string | null
  summary?: string | null
  emotionTags?: string[]
  notes?: string | null
  isKeystone?: boolean
  chapterId?: string | null
  traumaCycleId?: string | null
}

export interface PersonCreateInput {
  name: string
  role?: string
  relationshipType?: string
  notes?: string
  isPrimary?: boolean
}

export interface ArtifactCreateInput {
  type: string
  sourceSystem?: string
  sourcePathOrUrl?: string
  shortDescription?: string
  transcribedText?: string | null
  importedFrom?: string | null
}

export interface SynchronicityCreateInput {
  date?: string | null
  type: string
  description: string
  symbolicTag?: string | null
}

export const statsApi = {
  getStats: async (): Promise<Stats> => {
    const { data } = await api.get('/stats')
    return data
  },
}

export const eventsApi = {
  getAll: async (params?: { chapterId?: string; traumaCycleId?: string }): Promise<Event[]> => {
    const { data } = await api.get('/events', { params })
    return data
  },
  getById: async (id: string): Promise<Event> => {
    const { data } = await api.get(`/events/${id}`)
    return data
  },
  create: async (event: EventCreateInput): Promise<Event> => {
    const { data } = await api.post('/events', event)
    return data
  },
  update: async (id: string, event: Partial<EventCreateInput>): Promise<Event> => {
    const { data } = await api.put(`/events/${id}`, event)
    return data
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/events/${id}`)
  },
}

export interface ChapterCreateInput {
  number: number
  title: string
  yearsCovered?: number[]
  summary?: string
}

export interface TraumaCycleCreateInput {
  label: string
  startYear?: number | null
  endYear?: number | null
  description?: string
}

export interface SongCreateInput {
  title: string
  artist: string
  era?: string
  keyLyric?: string
  notes?: string
}

export const chaptersApi = {
  getAll: async (): Promise<Chapter[]> => {
    const { data } = await api.get('/chapters')
    return data
  },
  getById: async (id: string): Promise<Chapter> => {
    const { data } = await api.get(`/chapters/${id}`)
    return data
  },
  create: async (chapter: ChapterCreateInput): Promise<Chapter> => {
    const { data } = await api.post('/chapters', chapter)
    return data
  },
  update: async (id: string, chapter: Partial<ChapterCreateInput>): Promise<Chapter> => {
    const { data } = await api.put(`/chapters/${id}`, chapter)
    return data
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/chapters/${id}`)
  },
}

export const traumaCyclesApi = {
  getAll: async (): Promise<TraumaCycle[]> => {
    const { data } = await api.get('/trauma-cycles')
    return data
  },
  getById: async (id: string): Promise<TraumaCycle> => {
    const { data } = await api.get(`/trauma-cycles/${id}`)
    return data
  },
  create: async (tc: TraumaCycleCreateInput): Promise<TraumaCycle> => {
    const { data } = await api.post('/trauma-cycles', tc)
    return data
  },
  update: async (id: string, tc: Partial<TraumaCycleCreateInput>): Promise<TraumaCycle> => {
    const { data } = await api.put(`/trauma-cycles/${id}`, tc)
    return data
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/trauma-cycles/${id}`)
  },
}

export const songsApi = {
  getAll: async (): Promise<Song[]> => {
    const { data } = await api.get('/songs')
    return data
  },
  getById: async (id: string): Promise<Song & { events: Event[] }> => {
    const { data } = await api.get(`/songs/${id}`)
    return data
  },
  create: async (song: SongCreateInput): Promise<Song> => {
    const { data } = await api.post('/songs', song)
    return data
  },
  update: async (id: string, song: Partial<SongCreateInput>): Promise<Song> => {
    const { data } = await api.put(`/songs/${id}`, song)
    return data
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/songs/${id}`)
  },
}

export const personsApi = {
  getAll: async (params?: { search?: string }): Promise<Person[]> => {
    const { data } = await api.get('/persons', { params })
    return data
  },
  getById: async (id: string): Promise<Person & { eventLinks: Array<{ event: Event }>; artifactLinks: Array<{ artifact: Artifact }> }> => {
    const { data } = await api.get(`/persons/${id}`)
    return data
  },
  create: async (person: PersonCreateInput): Promise<Person> => {
    const { data } = await api.post('/persons', person)
    return data
  },
  update: async (id: string, person: Partial<PersonCreateInput>): Promise<Person> => {
    const { data } = await api.put(`/persons/${id}`, person)
    return data
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/persons/${id}`)
  },
}

export const artifactsApi = {
  getAll: async (params?: { type?: string }): Promise<Artifact[]> => {
    const { data } = await api.get('/artifacts', { params })
    return data
  },
  getById: async (id: string): Promise<Artifact & { eventLinks: Array<{ event: Event }>; personLinks: Array<{ person: Person }> }> => {
    const { data } = await api.get(`/artifacts/${id}`)
    return data
  },
  create: async (artifact: ArtifactCreateInput): Promise<Artifact> => {
    const { data } = await api.post('/artifacts', artifact)
    return data
  },
  update: async (id: string, artifact: Partial<ArtifactCreateInput>): Promise<Artifact> => {
    const { data } = await api.put(`/artifacts/${id}`, artifact)
    return data
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/artifacts/${id}`)
  },
}

export const synchronicitiesApi = {
  getAll: async (params?: { type?: string }): Promise<Synchronicity[]> => {
    const { data } = await api.get('/synchronicities', { params })
    return data
  },
  getById: async (id: string): Promise<Synchronicity & { eventLinks: Array<{ event: Event }> }> => {
    const { data } = await api.get(`/synchronicities/${id}`)
    return data
  },
  create: async (synchronicity: SynchronicityCreateInput): Promise<Synchronicity> => {
    const { data } = await api.post('/synchronicities', synchronicity)
    return data
  },
  update: async (id: string, synchronicity: Partial<SynchronicityCreateInput>): Promise<Synchronicity> => {
    const { data } = await api.put(`/synchronicities/${id}`, synchronicity)
    return data
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/synchronicities/${id}`)
  },
}

// Phase 3 APIs
export interface TimelineYear {
  year: number
  events: Event[]
}

export interface TimelineData {
  totalEvents: number
  yearRange: { start: number; end: number } | null
  timeline: TimelineYear[]
}

export interface SearchResults {
  query: string
  totalResults: number
  results: {
    events: Event[]
    persons: Person[]
    artifacts: Artifact[]
    synchronicities: Synchronicity[]
    chapters: Chapter[]
    songs: Song[]
  }
}

export interface NarrativeChapter extends Chapter {
  eventCount: number
  events: Event[]
  prevChapter?: { id: string; number: number; title: string } | null
  nextChapter?: { id: string; number: number; title: string } | null
}

export interface ExportStats {
  events: number
  eventsWithDates: number
  keystoneEvents: number
  persons: number
  artifacts: number
  synchronicities: number
  chapters: number
  songs: number
  dateRange: { earliest: string | null; latest: string | null }
}

export const timelineApi = {
  get: async (params?: { startYear?: number; endYear?: number; chapterId?: string; traumaCycleId?: string }): Promise<TimelineData> => {
    const { data } = await api.get('/timeline', { params })
    return data
  },
}

export const searchApi = {
  search: async (q: string, type?: string): Promise<SearchResults> => {
    const { data } = await api.get('/search', { params: { q, type } })
    return data
  },
}

export const narrativeApi = {
  getChapters: async (): Promise<NarrativeChapter[]> => {
    const { data } = await api.get('/narrative/chapters')
    return data
  },
  getChapter: async (id: string): Promise<NarrativeChapter> => {
    const { data } = await api.get(`/narrative/chapters/${id}`)
    return data
  },
}

export const exportApi = {
  getStats: async (): Promise<ExportStats> => {
    const { data } = await api.get('/export/stats')
    return data
  },
  downloadJson: () => {
    window.open('/api/export/json', '_blank')
  },
  downloadMarkdown: () => {
    window.open('/api/export/markdown', '_blank')
  },
}

// Phase 4 APIs
export interface Tag {
  id: string
  name: string
  description: string
  _count?: { eventLinks: number }
  events?: Event[]
  createdAt: string
  updatedAt: string
}

export interface TagCreateInput {
  name: string
  description?: string
}

export interface Collection {
  id: string
  name: string
  description: string
  _count?: { eventLinks: number; artifactLinks: number; personLinks: number }
  events?: Event[]
  artifacts?: Artifact[]
  persons?: Person[]
  createdAt: string
  updatedAt: string
}

export interface CollectionCreateInput {
  name: string
  description?: string
}

export interface FilterPayload {
  text?: string
  searchIn?: string[]
  chapterIds?: string[]
  traumaCycleIds?: string[]
  personIds?: string[]
  tagIds?: string[]
  dateRange?: { start?: string; end?: string }
  isKeystone?: boolean
  hasArtifacts?: boolean
  hasSynchronicities?: boolean
  limit?: number
}

export interface FilterResults {
  totalResults: number
  filters: FilterPayload
  results: Event[]
}

export const tagsApi = {
  getAll: async (): Promise<Tag[]> => {
    const { data } = await api.get('/tags')
    return data
  },
  getById: async (id: string): Promise<Tag> => {
    const { data } = await api.get(`/tags/${id}`)
    return data
  },
  create: async (tag: TagCreateInput): Promise<Tag> => {
    const { data } = await api.post('/tags', tag)
    return data
  },
  update: async (id: string, tag: Partial<TagCreateInput>): Promise<Tag> => {
    const { data } = await api.put(`/tags/${id}`, tag)
    return data
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/tags/${id}`)
  },
  linkToEvent: async (tagId: string, eventId: string) => {
    const { data } = await api.post(`/tags/${tagId}/events/${eventId}`)
    return data
  },
  unlinkFromEvent: async (tagId: string, eventId: string) => {
    await api.delete(`/tags/${tagId}/events/${eventId}`)
  },
}

export const collectionsApi = {
  getAll: async (): Promise<Collection[]> => {
    const { data } = await api.get('/collections')
    return data
  },
  getById: async (id: string): Promise<Collection> => {
    const { data } = await api.get(`/collections/${id}`)
    return data
  },
  create: async (collection: CollectionCreateInput): Promise<Collection> => {
    const { data } = await api.post('/collections', collection)
    return data
  },
  update: async (id: string, collection: Partial<CollectionCreateInput>): Promise<Collection> => {
    const { data } = await api.put(`/collections/${id}`, collection)
    return data
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/collections/${id}`)
  },
  addEvent: async (collectionId: string, eventId: string) => {
    const { data } = await api.post(`/collections/${collectionId}/events/${eventId}`)
    return data
  },
  removeEvent: async (collectionId: string, eventId: string) => {
    await api.delete(`/collections/${collectionId}/events/${eventId}`)
  },
  addArtifact: async (collectionId: string, artifactId: string) => {
    const { data } = await api.post(`/collections/${collectionId}/artifacts/${artifactId}`)
    return data
  },
  removeArtifact: async (collectionId: string, artifactId: string) => {
    await api.delete(`/collections/${collectionId}/artifacts/${artifactId}`)
  },
  addPerson: async (collectionId: string, personId: string) => {
    const { data } = await api.post(`/collections/${collectionId}/persons/${personId}`)
    return data
  },
  removePerson: async (collectionId: string, personId: string) => {
    await api.delete(`/collections/${collectionId}/persons/${personId}`)
  },
}

export const filterApi = {
  filter: async (payload: FilterPayload): Promise<FilterResults> => {
    const { data } = await api.post('/search/filter', payload)
    return data
  },
}

// Audio Upload API
export interface UploadResult {
  artifact: Artifact
  file: {
    filename: string
    originalName: string
    size: number
    mimetype: string
  }
}

export interface BatchUploadResult {
  count: number
  artifacts: Artifact[]
}

export const uploadsApi = {
  uploadAudio: async (file: File, shortDescription?: string, sourceSystem?: string): Promise<UploadResult> => {
    const formData = new FormData()
    formData.append('audio', file)
    if (shortDescription) formData.append('shortDescription', shortDescription)
    if (sourceSystem) formData.append('sourceSystem', sourceSystem)
    
    const { data } = await api.post('/uploads/audio', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },
  uploadAudioBatch: async (files: File[], sourceSystem?: string): Promise<BatchUploadResult> => {
    const formData = new FormData()
    files.forEach((file) => formData.append('audio', file))
    if (sourceSystem) formData.append('sourceSystem', sourceSystem)
    
    const { data } = await api.post('/uploads/audio/batch', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },
  getAudioUrl: (filename: string): string => {
    return `${api.defaults.baseURL}/uploads/${filename}`
  },
}

export const linksApi = {
  // Event ↔ Person
  linkPersonToEvent: async (eventId: string, personId: string) => {
    const { data } = await api.post(`/events/${eventId}/persons/${personId}`)
    return data
  },
  unlinkPersonFromEvent: async (eventId: string, personId: string) => {
    await api.delete(`/events/${eventId}/persons/${personId}`)
  },
  // Event ↔ Song
  linkSongToEvent: async (eventId: string, songId: string) => {
    const { data } = await api.post(`/events/${eventId}/songs/${songId}`)
    return data
  },
  unlinkSongFromEvent: async (eventId: string, songId: string) => {
    await api.delete(`/events/${eventId}/songs/${songId}`)
  },
  // Event ↔ Artifact
  linkArtifactToEvent: async (eventId: string, artifactId: string) => {
    const { data } = await api.post(`/events/${eventId}/artifacts/${artifactId}`)
    return data
  },
  unlinkArtifactFromEvent: async (eventId: string, artifactId: string) => {
    await api.delete(`/events/${eventId}/artifacts/${artifactId}`)
  },
  // Event ↔ Synchronicity
  linkSynchronicityToEvent: async (eventId: string, synchronicityId: string) => {
    const { data } = await api.post(`/events/${eventId}/synchronicities/${synchronicityId}`)
    return data
  },
  unlinkSynchronicityFromEvent: async (eventId: string, synchronicityId: string) => {
    await api.delete(`/events/${eventId}/synchronicities/${synchronicityId}`)
  },
  // Artifact ↔ Person
  linkPersonToArtifact: async (artifactId: string, personId: string) => {
    const { data } = await api.post(`/artifacts/${artifactId}/persons/${personId}`)
    return data
  },
  unlinkPersonFromArtifact: async (artifactId: string, personId: string) => {
    await api.delete(`/artifacts/${artifactId}/persons/${personId}`)
  },
}

export default api
