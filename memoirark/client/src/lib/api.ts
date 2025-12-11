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

export interface Event {
  id: string
  title: string
  date: string | null
  location: string | null
  summary: string | null
  emotionTags: string[]
  notes: string | null
  chapterId: string | null
  traumaCycleId: string | null
  chapter?: Chapter | null
  traumaCycle?: TraumaCycle | null
  createdAt: string
  updatedAt: string
}

export interface Stats {
  events: number
  chapters: number
  traumaCycles: number
  songs: number
}

export interface EventCreateInput {
  title: string
  date?: string | null
  location?: string | null
  summary?: string | null
  emotionTags?: string[]
  notes?: string | null
  chapterId?: string | null
  traumaCycleId?: string | null
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

export default api
