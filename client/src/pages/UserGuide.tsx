import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  BookOpen,
  Calendar,
  Users,
  FileText,
  Sparkles,
  Clock,
  Search,
  Tag,
  Upload,
  Download,
  ChevronRight,
  CheckCircle2,
  ArrowRight,
  Music,
  RotateCcw,
  HelpCircle,
  Video,
  Mic,
  Image,
  GitBranch,
  Printer,
  Wand2,
  Flame,
} from 'lucide-react'

interface GuideSection {
  id: string
  title: string
  icon: React.ElementType
  description: string
  steps: string[]
  tips?: string[]
  link?: string
}

const guideSections: GuideSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: BookOpen,
    description: 'Welcome to MemoirArk! This guide will walk you through building your personal memoir from raw memories to a publishable narrative.',
    steps: [
      'Take the onboarding tour to familiarize yourself with the interface',
      'Start by creating your first Event—a significant memory or moment',
      'Add People who were involved in your life events',
      'Upload Artifacts like photos, letters, or audio recordings',
      'Organize events into Chapters to structure your story',
    ],
    tips: [
      'Don\'t worry about chronological order at first—just capture memories as they come',
      'Use emotion tags to track how events made you feel',
      'The more detail you add, the richer your narrative will be',
    ],
  },
  {
    id: 'events',
    title: 'Creating Events',
    icon: Calendar,
    description: 'Events are the building blocks of your memoir. Each event represents a moment, memory, or experience worth preserving.',
    steps: [
      'Click "Events" in the navigation, then "New Event"',
      'Enter a descriptive title (e.g., "First Day at Lincoln High School")',
      'Add the date if you remember it (approximate dates are fine)',
      'Write a summary—a brief overview of what happened',
      'Use the Notes field for detailed narrative description',
      'Add emotion tags to capture how you felt (the system will suggest tags based on your content)',
      'Assign to a Chapter and/or Trauma Cycle if applicable',
    ],
    tips: [
      'Mark significant events as "Keystone" events—these are turning points in your story',
      'Link related People, Artifacts, and Synchronicities after creating the event',
      'Use the narrative font in Notes for a more literary feel',
    ],
    link: '/events/new',
  },
  {
    id: 'people',
    title: 'Adding People',
    icon: Users,
    description: 'Document the cast of characters in your life story—family, friends, mentors, and others who shaped your journey.',
    steps: [
      'Navigate to "People" and click "New Person"',
      'Enter their name and relationship type (family, friend, colleague, etc.)',
      'Add their role in your life (mother, best friend, therapist, etc.)',
      'Write notes about who they are and their significance',
      'Mark primary figures (like parents) with the "Primary" flag',
    ],
    tips: [
      'You can link people to multiple events',
      'Add people even if they only appear briefly—they may become more significant later',
      'Use consistent naming (decide between "Mom" vs "Mother" vs their actual name)',
    ],
    link: '/people/new',
  },
  {
    id: 'artifacts',
    title: 'Managing Artifacts',
    icon: FileText,
    description: 'Artifacts are the tangible evidence of your past—photos, documents, letters, recordings, and other memorabilia.',
    steps: [
      'Go to "Artifacts" and click "New Artifact"',
      'Select the type: photo, document, letter, audio, video, etc.',
      'Add a short description of what the artifact is',
      'Specify the source system (where it came from) and path/URL',
      'Add transcribed text for letters or documents if desired',
      'Link the artifact to relevant events and people',
    ],
    tips: [
      'For audio files, use the Upload feature for direct file storage',
      'Transcribe important letters and documents for searchability',
      'Group related artifacts in Collections',
    ],
    link: '/artifacts/new',
  },
  {
    id: 'audio-upload',
    title: 'Uploading Audio',
    icon: Upload,
    description: 'Upload audio recordings like therapy sessions, voicemails, interviews, or personal recordings.',
    steps: [
      'Click "Upload" in the navigation',
      'Select your audio files (MP3, WAV, M4A, AAC, OGG, FLAC supported)',
      'Choose a source type (therapy-sessions, voicemail, interview, recording, other)',
      'Click "Upload" to process the files',
      'Each file creates an Artifact record automatically',
      'Go to the Artifact detail page to play back and link to events',
    ],
    tips: [
      'You can upload multiple files at once (batch upload)',
      'Maximum file size is 500MB per file',
      'Add descriptions to artifacts after upload for better organization',
    ],
    link: '/upload',
  },
  {
    id: 'chapters',
    title: 'Organizing Chapters',
    icon: BookOpen,
    description: 'Chapters give structure to your memoir. Organize your events into meaningful sections.',
    steps: [
      'Go to "Edit Chapters" to create and manage chapters',
      'Give each chapter a number, title, and year range',
      'Add a summary describing the chapter\'s themes',
      'Assign events to chapters when creating or editing events',
      'View chapter narratives in "Chapters" to see events in context',
    ],
    tips: [
      'Chapters don\'t have to be chronological—organize thematically if you prefer',
      'Use the summary field to capture the chapter\'s emotional arc',
      'Review chapter narratives to see how your story flows',
    ],
    link: '/manage/chapters',
  },
  {
    id: 'trauma-cycles',
    title: 'Tracking Trauma Cycles',
    icon: RotateCcw,
    description: 'Identify recurring patterns in your life—cycles of behavior, relationships, or experiences that repeat.',
    steps: [
      'Go to "Edit Cycles" to define trauma cycles',
      'Name the pattern (e.g., "Abandonment Pattern", "People-Pleasing Cycle")',
      'Set the year range when this pattern was active',
      'Add a description of how this cycle manifested',
      'Link events to trauma cycles to track the pattern over time',
    ],
    tips: [
      'Trauma cycles help you see patterns you might not notice otherwise',
      'An event can belong to multiple cycles',
      'Use the Query Builder to find all events in a specific cycle',
    ],
    link: '/manage/trauma-cycles',
  },
  {
    id: 'synchronicities',
    title: 'Recording Synchronicities',
    icon: Sparkles,
    description: 'Document meaningful coincidences, patterns, and moments when the universe seemed to align.',
    steps: [
      'Navigate to "Sync" and click "New Synchronicity"',
      'Describe what happened and why it felt significant',
      'Add a symbolic tag if there\'s a recurring symbol or theme',
      'Set the date if known',
      'Link to related events',
    ],
    tips: [
      'Synchronicities often connect events across time',
      'Look for recurring numbers, names, places, or themes',
      'These can become powerful narrative threads in your memoir',
    ],
    link: '/synchronicities/new',
  },
  {
    id: 'tags-collections',
    title: 'Tags & Collections',
    icon: Tag,
    description: 'Use tags for emotional/thematic labeling and collections for grouping related content.',
    steps: [
      'Tags: Go to "Tags" to create emotion or theme tags',
      'Apply tags to events via the emotion tags field',
      'Collections: Go to "Collections" to create groupings',
      'Add events, people, and artifacts to collections',
      'Use collections for themes like "College Years" or "Relationship with Dad"',
    ],
    tips: [
      'Tags are great for emotions: joy, grief, anger, fear, love',
      'Collections are great for themes or time periods',
      'Both help you find related content later',
    ],
    link: '/tags',
  },
  {
    id: 'songs',
    title: 'Adding Songs',
    icon: Music,
    description: 'Music often marks significant moments. Track the songs that defined different eras of your life.',
    steps: [
      'Go to "Edit Songs" to add songs to your archive',
      'Enter the title and artist',
      'Specify the era when this song was significant',
      'Add a key lyric that resonates',
      'Write notes about why this song matters',
      'Link songs to events where they played a role',
    ],
    tips: [
      'Songs can trigger powerful memories',
      'Include songs from different life stages',
      'The key lyric field is great for capturing emotional essence',
    ],
    link: '/manage/songs',
  },
  {
    id: 'search-query',
    title: 'Search & Query',
    icon: Search,
    description: 'Find anything in your memoir with search, or build complex queries to discover patterns.',
    steps: [
      'Search: Use the Search page for quick keyword searches',
      'Search works across events, people, artifacts, and more',
      'Query Builder: Use "Query" for advanced filtering',
      'Filter by chapter, trauma cycle, person, tag, date range',
      'Combine multiple filters to find specific events',
    ],
    tips: [
      'Search is great for finding specific memories',
      'Query Builder is great for discovering patterns',
      'Try filtering by emotion tag to see emotional patterns over time',
    ],
    link: '/search',
  },
  {
    id: 'timeline',
    title: 'Timeline View',
    icon: Clock,
    description: 'See your life events arranged chronologically to understand the flow of your story.',
    steps: [
      'Click "Timeline" in the navigation',
      'Events are grouped by year',
      'Filter by chapter or trauma cycle',
      'Click any event to view its details',
      'Use timeline to spot gaps in your narrative',
    ],
    tips: [
      'Timeline helps you see the big picture',
      'Look for clusters of events—these may be significant periods',
      'Gaps might indicate times you haven\'t documented yet',
    ],
    link: '/timeline',
  },
  {
    id: 'export',
    title: 'Exporting Your Memoir',
    icon: Download,
    description: 'Export your memoir data for backup, sharing, or publishing preparation.',
    steps: [
      'Go to "Export" in the navigation',
      'Review your archive statistics',
      'Choose export format (JSON for data, Markdown for narrative)',
      'Download your complete memoir archive',
      'Use exported data for backup or further processing',
    ],
    tips: [
      'Export regularly as a backup',
      'Markdown export is great for sharing or editing in other tools',
      'JSON export preserves all data and relationships',
    ],
    link: '/export',
  },
  {
    id: 'story-clips',
    title: 'Story Clips',
    icon: Video,
    description: 'Create shareable 30-60 second video clips from your memories with music, captions, and Ken Burns photo effects.',
    steps: [
      'Open any event and click "Create Story Clip"',
      'Select photos to include in your clip',
      'Choose a template style (Cinematic, Nostalgic, Minimal, etc.)',
      'Add background music from our library',
      'Preview your clip and adjust timing',
      'Share directly to TikTok, Instagram, or download',
    ],
    tips: [
      'Story Clips are perfect for sharing memories with family',
      'Use the "Nostalgic" template for vintage photos',
      'Clips under 60 seconds perform best on social media',
      'Add captions for accessibility and engagement',
    ],
  },
  {
    id: 'voice-interface',
    title: 'Voice Interface',
    icon: Mic,
    description: 'Talk to Ori, your AI memoir guide. Capture memories hands-free through natural conversation.',
    steps: [
      'Click "Talk to Ori" in the navigation',
      'Tap the microphone button to start speaking',
      'Tell Ori about a memory—just speak naturally',
      'Ori will ask follow-up questions to capture more detail',
      'Your conversation is transcribed and saved automatically',
      'Review and edit the transcript to create events',
    ],
    tips: [
      'Voice capture is great for detailed storytelling',
      'Speak as if you\'re telling a friend—Ori will organize it',
      'Use voice when typing feels too slow or formal',
      'Perfect for capturing memories while driving or walking',
    ],
  },
  {
    id: 'daily-prompts',
    title: 'Daily Memory Prompts',
    icon: Flame,
    description: 'Build a memoir habit with daily prompts. Maintain streaks and unlock achievements.',
    steps: [
      'Check your daily prompt on the dashboard',
      'Tap the prompt to start writing or recording',
      'Complete the prompt to maintain your streak',
      'Browse all prompts by category (childhood, family, milestones, etc.)',
      'Enable notifications to never miss a day',
    ],
    tips: [
      'Streaks build momentum—try for 7 days to start',
      'Skip prompts that don\'t resonate; come back later',
      'Prompts are designed to unlock forgotten memories',
      'Share your streak progress with family for accountability',
    ],
  },
  {
    id: 'photo-to-story',
    title: 'Photo to Story',
    icon: Image,
    description: 'Upload any photo and let AI help you turn it into a rich memoir entry.',
    steps: [
      'Click "Photo to Story" or drag a photo anywhere',
      'AI analyzes the photo for people, setting, and era',
      'Answer Ori\'s questions about the photo',
      'AI generates a narrative based on your answers',
      'Edit and save as a new event with the photo attached',
    ],
    tips: [
      'Works great with old family photos',
      'The more questions you answer, the richer the story',
      'AI can detect approximate dates from photo style',
      'Batch upload multiple photos for a photo memoir session',
    ],
  },
  {
    id: 'family-remix',
    title: 'Family Remix',
    icon: GitBranch,
    description: 'Invite family members to add their perspective to the same memory. See events from multiple viewpoints.',
    steps: [
      'Open any event and click "Family Remix"',
      'Invite family members by email',
      'They receive a link to add their perspective',
      'View all perspectives in timeline or side-by-side mode',
      'AI highlights differences and commonalities',
    ],
    tips: [
      'Different perspectives make memories richer',
      'Great for family reunions and holidays',
      'Siblings often remember the same event differently',
      'Remix creates a multi-dimensional family archive',
    ],
  },
  {
    id: 'voice-cloning',
    title: 'Voice Legacy',
    icon: Wand2,
    description: 'Clone a loved one\'s voice from recordings. Have their memoir read in their own voice.',
    steps: [
      'Go to a person\'s profile and click "Create Voice"',
      'Upload audio recordings (voicemails, videos, interviews)',
      'Need at least 30 seconds of clear speech',
      'AI creates a voice clone (takes a few minutes)',
      'Use the cloned voice to narrate their stories',
    ],
    tips: [
      'More audio = better voice quality (2+ minutes ideal)',
      'Clear speech without background noise works best',
      'Only clone voices with consent or for deceased loved ones',
      'Voice clones can narrate Story Clips and full memoirs',
    ],
  },
  {
    id: 'book-publishing',
    title: 'Book Publishing',
    icon: Printer,
    description: 'Turn your digital memoir into a beautiful physical book. PDF, ePub, or printed hardcover.',
    steps: [
      'Go to "Publish Book" when your memoir is ready',
      'Choose format: PDF (free), ePub (free), or Print',
      'Select cover style and customize options',
      'Preview your book layout',
      'Download digital or order physical copies',
    ],
    tips: [
      'PDF and ePub exports are always free',
      'Softcover starts at $29.99, hardcover at $49.99',
      'Include photos for a richer printed book',
      'Order extra copies as gifts for family members',
    ],
  },
  {
    id: 'publishing',
    title: 'Path to Publishing',
    icon: CheckCircle2,
    description: 'From raw memories to a publishable memoir—here\'s the complete workflow.',
    steps: [
      '1. CAPTURE: Enter memories via typing, voice, or photo upload',
      '2. POPULATE: Add people, artifacts, and synchronicities',
      '3. ORGANIZE: Create chapters and assign events to them',
      '4. CONNECT: Link events to people, artifacts, and each other',
      '5. TAG: Apply emotion tags and identify trauma cycles',
      '6. REMIX: Invite family to add their perspectives',
      '7. REVIEW: Use Timeline and Chapter views to see your story',
      '8. SHARE: Create Story Clips to share highlights',
      '9. CLONE: Create voice legacies for key people',
      '10. PUBLISH: Export as PDF/ePub or order a printed book',
    ],
    tips: [
      'Don\'t rush—memoir writing is a process of discovery',
      'Use Daily Prompts to build a consistent habit',
      'Voice capture is fastest; Photo to Story unlocks old memories',
      'Family Remix creates the richest, most complete stories',
      'Story Clips help you share progress and stay motivated',
    ],
  },
]

export default function UserGuide() {
  const [activeSection, setActiveSection] = useState<string | null>(null)

  return (
    <div className="space-y-8">
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <HelpCircle className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-4xl font-display mb-3">User Guide</h1>
        <p className="text-lg text-muted-foreground">
          Everything you need to know to build your memoir, from first memory to final manuscript.
        </p>
      </div>

      <Card className="bg-gradient-to-br from-primary/5 via-accent/5 to-transparent">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <ArrowRight className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-2">Quick Start</h2>
              <p className="text-muted-foreground mb-4">
                New to MemoirArk? Start here:
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link to="/events/new">
                    <Calendar className="w-4 h-4 mr-2" />
                    Create Your First Event
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/manage/chapters">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Set Up Chapters
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {guideSections.map((section) => {
          const Icon = section.icon
          const isExpanded = activeSection === section.id

          return (
            <Card
              key={section.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isExpanded ? 'md:col-span-2 lg:col-span-3' : ''
              }`}
              onClick={() => setActiveSection(isExpanded ? null : section.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {section.title}
                      <ChevronRight
                        className={`w-4 h-4 text-muted-foreground transition-transform ${
                          isExpanded ? 'rotate-90' : ''
                        }`}
                      />
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  {section.description}
                </p>

                {isExpanded && (
                  <div className="space-y-4 pt-4 border-t">
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                        Steps
                      </h4>
                      <ol className="space-y-2 text-sm">
                        {section.steps.map((step, idx) => (
                          <li key={idx} className="flex gap-2">
                            <span className="text-primary font-medium">{idx + 1}.</span>
                            <span className="text-muted-foreground">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {section.tips && (
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-accent" />
                          Tips
                        </h4>
                        <ul className="space-y-1 text-sm">
                          {section.tips.map((tip, idx) => (
                            <li key={idx} className="flex gap-2 text-muted-foreground">
                              <span>•</span>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {section.link && (
                      <Button asChild size="sm" className="mt-2">
                        <Link to={section.link} onClick={(e) => e.stopPropagation()}>
                          Go to {section.title}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Link>
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            Need More Help?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            MemoirArk is designed to be intuitive, but memoir writing is a deeply personal process. 
            Take your time, trust the process, and remember: every memory matters.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => {
              localStorage.removeItem('memoirark-tour-completed')
              window.location.href = '/'
            }}>
              Restart Onboarding Tour
            </Button>
            <Button variant="outline" asChild>
              <Link to="/">
                Return to Dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
