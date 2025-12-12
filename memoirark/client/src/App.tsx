import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import EventList from './pages/EventList'
import EventForm from './pages/EventForm'
import EventDetail from './pages/EventDetail'
import PeopleList from './pages/PeopleList'
import PersonDetail from './pages/PersonDetail'
import PersonForm from './pages/PersonForm'
import ArtifactsList from './pages/ArtifactsList'
import ArtifactDetail from './pages/ArtifactDetail'
import ArtifactForm from './pages/ArtifactForm'
import SynchronicitiesList from './pages/SynchronicitiesList'
import SynchronicityDetail from './pages/SynchronicityDetail'
import SynchronicityForm from './pages/SynchronicityForm'

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('memoirark-theme')
    if (stored === 'light' || stored === 'dark') return stored
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('memoirark-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  return (
    <BrowserRouter>
      <Layout theme={theme} toggleTheme={toggleTheme}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/events" element={<EventList />} />
          <Route path="/events/new" element={<EventForm />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/events/:id/edit" element={<EventForm />} />
          <Route path="/people" element={<PeopleList />} />
          <Route path="/people/new" element={<PersonForm />} />
          <Route path="/people/:id" element={<PersonDetail />} />
          <Route path="/people/:id/edit" element={<PersonForm />} />
          <Route path="/artifacts" element={<ArtifactsList />} />
          <Route path="/artifacts/new" element={<ArtifactForm />} />
          <Route path="/artifacts/:id" element={<ArtifactDetail />} />
          <Route path="/artifacts/:id/edit" element={<ArtifactForm />} />
          <Route path="/synchronicities" element={<SynchronicitiesList />} />
          <Route path="/synchronicities/new" element={<SynchronicityForm />} />
          <Route path="/synchronicities/:id" element={<SynchronicityDetail />} />
          <Route path="/synchronicities/:id/edit" element={<SynchronicityForm />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
