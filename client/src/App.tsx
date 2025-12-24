import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Layout from './components/Layout'
import WelcomeModal from './components/WelcomeModal'
import OnboardingTour, { useTourState } from './components/OnboardingTour'
import OriGuide from './components/OriGuide'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Landing from './pages/Landing'
import LoginCallback from './pages/LoginCallback'
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
import Timeline from './pages/Timeline'
import Search from './pages/Search'
import ChaptersList from './pages/ChaptersList'
import ChapterNarrative from './pages/ChapterNarrative'
import Export from './pages/Export'
import TagsList from './pages/TagsList'
import TagDetail from './pages/TagDetail'
import CollectionsList from './pages/CollectionsList'
import CollectionDetail from './pages/CollectionDetail'
import QueryBuilder from './pages/QueryBuilder'
import AudioUpload from './pages/AudioUpload'
import ChaptersManage from './pages/ChaptersManage'
import TraumaCyclesManage from './pages/TraumaCyclesManage'
import SongsManage from './pages/SongsManage'
import UserGuide from './pages/UserGuide'
import MessengerImport from './pages/MessengerImport'
import SmsImport from './pages/SmsImport'
import ChatGptImport from './pages/ChatGptImport'
import MemoirExport from './pages/MemoirExport'
import PhotoMemory from './pages/PhotoMemory'
import FamilyTree from './pages/FamilyTree'
import VoiceCapture from './pages/VoiceCapture'
import FamilyCollaboration from './pages/FamilyCollaboration'
import CloudImport from './pages/CloudImport'
import BulkUpload from './pages/BulkUpload'
import OriInterviewer from './components/OriInterviewer'
import Insights from './pages/Insights'
import Settings from './pages/Settings'

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('origins-theme')
    if (stored === 'light' || stored === 'dark') return stored
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  const [showWelcome, setShowWelcome] = useState(() => {
    const tourCompleted = localStorage.getItem('origins-tour-completed')
    if (!tourCompleted) return false
    const lastDismissed = localStorage.getItem('origins-welcome-dismissed')
    if (!lastDismissed) return true
    const dismissedTime = new Date(lastDismissed).getTime()
    const hoursSince = (Date.now() - dismissedTime) / (1000 * 60 * 60)
    return hoursSince > 4
  })

  const { showTour, endTour } = useTourState()

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('origins-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  const handleCloseWelcome = () => {
    setShowWelcome(false)
    localStorage.setItem('origins-welcome-dismissed', new Date().toISOString())
  }

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        {/* Public routes */}
        <Route path="/welcome" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/login/callback" element={<LoginCallback />} />

        {/* Ori Interview - Full screen, outside main layout */}
        <Route path="/interview" element={
          <ProtectedRoute>
            <OriInterviewer />
          </ProtectedRoute>
        } />

        {/* Protected routes */}
        <Route path="/*" element={
          <ProtectedRoute>
            {showTour && <OnboardingTour onComplete={endTour} />}
            {showWelcome && !showTour && <WelcomeModal onClose={handleCloseWelcome} />}
            <Layout theme={theme} toggleTheme={toggleTheme}>
              <OriGuide />
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
                <Route path="/timeline" element={<Timeline />} />
                <Route path="/search" element={<Search />} />
                <Route path="/chapters" element={<ChaptersList />} />
                <Route path="/chapters/:id" element={<ChapterNarrative />} />
                <Route path="/export" element={<Export />} />
                <Route path="/tags" element={<TagsList />} />
                <Route path="/tags/:id" element={<TagDetail />} />
                <Route path="/collections" element={<CollectionsList />} />
                <Route path="/collections/:id" element={<CollectionDetail />} />
                <Route path="/query" element={<QueryBuilder />} />
                <Route path="/upload" element={<AudioUpload />} />
                <Route path="/manage/chapters" element={<ChaptersManage />} />
                <Route path="/manage/trauma-cycles" element={<TraumaCyclesManage />} />
                <Route path="/manage/songs" element={<SongsManage />} />
                <Route path="/guide" element={<UserGuide />} />
                <Route path="/wizard" element={<OriInterviewer />} />
                <Route path="/import/messenger" element={<MessengerImport />} />
                <Route path="/import/sms" element={<SmsImport />} />
                <Route path="/import/chatgpt" element={<ChatGptImport />} />
                <Route path="/memoir" element={<MemoirExport />} />
                <Route path="/photo-memory" element={<PhotoMemory />} />
                <Route path="/family-tree" element={<FamilyTree />} />
                <Route path="/voice-capture" element={<VoiceCapture />} />
                <Route path="/collaborate" element={<FamilyCollaboration />} />
                <Route path="/import/cloud" element={<CloudImport />} />
                <Route path="/bulk-upload" element={<BulkUpload />} />
                <Route path="/interview" element={<OriInterviewer />} />
                <Route path="/insights" element={<Insights />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
