import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { 
  Sparkles, 
  Lightbulb, 
  Flame, 
  Mail, 
  Mic,
  Calendar,
} from 'lucide-react'
import ThisDayInYourLife from '@/components/ThisDayInYourLife'
import LifeThemes from '@/components/LifeThemes'
import MemoryStreak from '@/components/MemoryStreak'
import LegacyLetterGenerator from '@/components/LegacyLetterGenerator'

export default function Insights() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Life Insights</h1>
        <p className="text-muted-foreground">
          Discover patterns, themes, and deeper meaning in your life story
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="this-day" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">This Day</span>
          </TabsTrigger>
          <TabsTrigger value="themes" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            <span className="hidden sm:inline">Themes</span>
          </TabsTrigger>
          <TabsTrigger value="streak" className="flex items-center gap-2">
            <Flame className="h-4 w-4" />
            <span className="hidden sm:inline">Streak</span>
          </TabsTrigger>
          <TabsTrigger value="letters" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Letters</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Quick Stats Row */}
          <div className="grid md:grid-cols-2 gap-6">
            <ThisDayInYourLife />
            <MemoryStreak />
          </div>

          {/* Features Promo */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setActiveTab('themes')}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Lightbulb className="h-5 w-5 text-indigo-500" />
                  Life Themes
                </CardTitle>
                <CardDescription>
                  AI-powered analysis of recurring patterns and themes in your story
                </CardDescription>
              </CardHeader>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setActiveTab('letters')}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Mail className="h-5 w-5 text-rose-500" />
                  Legacy Letters
                </CardTitle>
                <CardDescription>
                  Generate heartfelt letters to the important people in your life
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-amber-900 dark:text-amber-100">
                  <Mic className="h-5 w-5 text-amber-500" />
                  Voice Memoir
                  <span className="text-xs bg-amber-200 dark:bg-amber-800 px-2 py-0.5 rounded-full">Coming Soon</span>
                </CardTitle>
                <CardDescription className="text-amber-700 dark:text-amber-300">
                  Listen to your chapters narrated in a warm, natural voice
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Daily Prompt */}
          <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Today's Memory Prompt</h3>
                  <p className="text-blue-800 dark:text-blue-200">
                    What's a skill or tradition you learned from a parent or grandparent that you still carry with you today?
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                    Tip: Add this as a new event to keep your memoir growing!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="this-day" className="mt-6">
          <ThisDayInYourLife />
          
          {/* Memory prompts for days with no events */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Memory Prompts</CardTitle>
              <CardDescription>
                Questions to help you recall and record more memories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  "What's your earliest memory of this time of year?",
                  "Who did you spend holidays with as a child?",
                  "What seasonal traditions did your family have?",
                  "What was happening in your life this month, years ago?",
                  "What songs remind you of this season?",
                  "What smells or foods bring back memories of this time?",
                ].map((prompt, i) => (
                  <div 
                    key={i}
                    className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                  >
                    <p className="text-sm">{prompt}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="themes" className="mt-6">
          <LifeThemes />
        </TabsContent>

        <TabsContent value="streak" className="mt-6">
          <div className="max-w-2xl mx-auto space-y-6">
            <MemoryStreak />
            
            <Card>
              <CardHeader>
                <CardTitle>Why Streaks Matter</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <p>
                  <strong className="text-foreground">Consistency builds legacy.</strong> The most complete memoirs aren't written in a single sitting — they're built one memory at a time, day after day.
                </p>
                <p>
                  Each day you add a memory, you're not just recording the past — you're building a gift for future generations who will want to know your story.
                </p>
                <p>
                  <strong className="text-foreground">Tips for maintaining your streak:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Set a daily reminder to add one memory</li>
                  <li>Use the "This Day" prompts for inspiration</li>
                  <li>Even a small memory counts — quality over quantity</li>
                  <li>Talk to Ori when you're not sure what to write about</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="letters" className="mt-6">
          <div className="max-w-2xl mx-auto">
            <LegacyLetterGenerator />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
