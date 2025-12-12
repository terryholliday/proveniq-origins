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

export const chaptersApi = {
  getAll: async (): Promise<Chapter[]> => {
    const { data } = await api.get('/chapters')
    return data
  },
}

export const traumaCyclesApi = {
  getAll: async (): Promise<TraumaCycle[]> => {
    const { data } = await api.get('/trauma-cycles')
    return data
  },
}

export const songsApi = {
  getAll: async (): Promise<Song[]> => {
    const { data } = await api.get('/songs')
    return data
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
