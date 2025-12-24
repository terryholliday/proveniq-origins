import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  Calendar, 
  Flame, 
  Gift, 
  ChevronRight,
  Check,
  Clock,
  Sparkles,
  X
} from 'lucide-react';
import OriAvatar from './OriAvatar';

interface DailyPromptsProps {
  onPromptSelect?: (prompt: string) => void;
  currentStreak?: number;
  completedToday?: boolean;
}

interface Prompt {
  id: string;
  category: 'childhood' | 'family' | 'milestones' | 'relationships' | 'wisdom' | 'seasonal';
  question: string;
  followUp?: string;
  difficulty: 'easy' | 'medium' | 'deep';
}

const allPrompts: Prompt[] = [
  // Childhood
  { id: '1', category: 'childhood', question: "What's your earliest memory?", difficulty: 'easy' },
  { id: '2', category: 'childhood', question: "Describe your childhood bedroom in detail.", difficulty: 'easy' },
  { id: '3', category: 'childhood', question: "What was your favorite game to play as a child?", difficulty: 'easy' },
  { id: '4', category: 'childhood', question: "What did you want to be when you grew up?", difficulty: 'easy' },
  { id: '5', category: 'childhood', question: "What was the best gift you ever received as a child?", difficulty: 'medium' },
  
  // Family
  { id: '6', category: 'family', question: "What's a lesson your mother taught you?", difficulty: 'medium' },
  { id: '7', category: 'family', question: "Describe your father in three words, then explain why.", difficulty: 'medium' },
  { id: '8', category: 'family', question: "What family tradition do you cherish most?", difficulty: 'easy' },
  { id: '9', category: 'family', question: "Tell me about a grandparent you were close to.", difficulty: 'medium' },
  { id: '10', category: 'family', question: "What's a story your family tells about you?", difficulty: 'easy' },
  
  // Milestones
  { id: '11', category: 'milestones', question: "Describe your first day at a new job.", difficulty: 'medium' },
  { id: '12', category: 'milestones', question: "What was your wedding day like?", difficulty: 'medium' },
  { id: '13', category: 'milestones', question: "Tell me about the day your first child was born.", difficulty: 'deep' },
  { id: '14', category: 'milestones', question: "What was your proudest achievement?", difficulty: 'medium' },
  { id: '15', category: 'milestones', question: "Describe a moment that changed your life forever.", difficulty: 'deep' },
  
  // Relationships
  { id: '16', category: 'relationships', question: "How did you meet your best friend?", difficulty: 'easy' },
  { id: '17', category: 'relationships', question: "Tell me about your first love.", difficulty: 'deep' },
  { id: '18', category: 'relationships', question: "Who believed in you when no one else did?", difficulty: 'deep' },
  { id: '19', category: 'relationships', question: "Describe a mentor who shaped your path.", difficulty: 'medium' },
  { id: '20', category: 'relationships', question: "What's the kindest thing someone ever did for you?", difficulty: 'medium' },
  
  // Wisdom
  { id: '21', category: 'wisdom', question: "What advice would you give your 20-year-old self?", difficulty: 'deep' },
  { id: '22', category: 'wisdom', question: "What's a mistake that taught you an important lesson?", difficulty: 'deep' },
  { id: '23', category: 'wisdom', question: "What do you know now that you wish you knew earlier?", difficulty: 'medium' },
  { id: '24', category: 'wisdom', question: "What's the best decision you ever made?", difficulty: 'medium' },
  { id: '25', category: 'wisdom', question: "If you could relive one day, which would it be?", difficulty: 'deep' },
  
  // Seasonal/Special
  { id: '26', category: 'seasonal', question: "What's your favorite holiday memory?", difficulty: 'easy' },
  { id: '27', category: 'seasonal', question: "Describe a summer that changed you.", difficulty: 'medium' },
  { id: '28', category: 'seasonal', question: "What's your most memorable birthday?", difficulty: 'easy' },
  { id: '29', category: 'seasonal', question: "Tell me about a New Year's Eve you'll never forget.", difficulty: 'medium' },
  { id: '30', category: 'seasonal', question: "What's a family recipe and the story behind it?", difficulty: 'easy' },
];

const categoryColors: Record<string, string> = {
  childhood: '#FFB347',
  family: '#D97757',
  milestones: '#48D5C0',
  relationships: '#FF6B9D',
  wisdom: '#9B59B6',
  seasonal: '#3498DB',
};

const categoryIcons: Record<string, string> = {
  childhood: '🧒',
  family: '👨‍👩‍👧‍👦',
  milestones: '🏆',
  relationships: '💕',
  wisdom: '🦉',
  seasonal: '🎄',
};

export default function DailyPrompts({ 
  onPromptSelect, 
  currentStreak = 0,
  completedToday = false 
}: DailyPromptsProps) {
  const [todaysPrompt, setTodaysPrompt] = useState<Prompt | null>(null);
  const [showAllPrompts, setShowAllPrompts] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Get today's prompt based on date (deterministic)
  useEffect(() => {
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
    const promptIndex = dayOfYear % allPrompts.length;
    setTodaysPrompt(allPrompts[promptIndex]);
  }, []);

  const handlePromptClick = (prompt: Prompt) => {
    setIsAnimating(true);
    setTimeout(() => {
      onPromptSelect?.(prompt.question);
      setIsAnimating(false);
    }, 300);
  };

  const filteredPrompts = selectedCategory 
    ? allPrompts.filter(p => p.category === selectedCategory)
    : allPrompts;

  const streakMilestones = [7, 30, 100, 365];
  const nextMilestone = streakMilestones.find(m => m > currentStreak) || 365;
  const progressToMilestone = (currentStreak / nextMilestone) * 100;

  return (
    <div className="bg-gray-900 rounded-2xl overflow-hidden">
      {/* Today's Prompt Card */}
      <div className="p-6 bg-gradient-to-br from-[#D97757]/20 to-orange-900/20 border-b border-gray-800">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <OriAvatar size="md" state="idle" />
            <div>
              <h2 className="text-white font-semibold">Today's Memory Prompt</h2>
              <p className="text-gray-400 text-sm flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
          
          {/* Streak Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/20 border border-orange-500/30">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-orange-400 font-semibold">{currentStreak}</span>
          </div>
        </div>

        {todaysPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative"
          >
            {completedToday ? (
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-green-400 font-medium">Today's prompt completed!</p>
                    <p className="text-gray-400 text-sm">Come back tomorrow for a new one</p>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => handlePromptClick(todaysPrompt)}
                disabled={isAnimating}
                className="w-full text-left p-4 rounded-xl bg-gray-800/50 hover:bg-gray-800 border border-gray-700 hover:border-[#D97757]/50 transition-all group"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{categoryIcons[todaysPrompt.category]}</span>
                  <div className="flex-1">
                    <p className="text-white text-lg font-medium group-hover:text-[#D97757] transition-colors">
                      {todaysPrompt.question}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span 
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ 
                          backgroundColor: `${categoryColors[todaysPrompt.category]}20`,
                          color: categoryColors[todaysPrompt.category]
                        }}
                      >
                        {todaysPrompt.category}
                      </span>
                      <span className="text-gray-500 text-xs">
                        {todaysPrompt.difficulty === 'easy' ? '~2 min' : todaysPrompt.difficulty === 'medium' ? '~5 min' : '~10 min'}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-[#D97757] transition-colors" />
                </div>
              </button>
            )}
          </motion.div>
        )}

        {/* Streak Progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-400">Next milestone: {nextMilestone} days</span>
            <span className="text-[#D97757]">{currentStreak}/{nextMilestone}</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#D97757] to-orange-500"
              initial={{ width: 0 }}
              animate={{ width: `${progressToMilestone}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
          {currentStreak >= 7 && (
            <div className="flex items-center gap-2 mt-2">
              <Gift className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-400 text-sm">
                {currentStreak >= 365 ? '🏆 Legend!' : 
                 currentStreak >= 100 ? '⭐ Centurion!' :
                 currentStreak >= 30 ? '🔥 On Fire!' : '✨ Great start!'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Browse All Prompts */}
      <div className="p-4">
        <button
          onClick={() => setShowAllPrompts(!showAllPrompts)}
          className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <span className="text-gray-300 font-medium">Browse all prompts</span>
          <motion.div
            animate={{ rotate: showAllPrompts ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </motion.div>
        </button>

        <AnimatePresence>
          {showAllPrompts && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              {/* Category filters */}
              <div className="flex flex-wrap gap-2 py-4">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === null
                      ? 'bg-[#D97757] text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  All
                </button>
                {Object.keys(categoryColors).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                      selectedCategory === cat
                        ? 'text-white'
                        : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                    style={{
                      backgroundColor: selectedCategory === cat ? categoryColors[cat] : undefined
                    }}
                  >
                    <span>{categoryIcons[cat]}</span>
                    {cat}
                  </button>
                ))}
              </div>

              {/* Prompts list */}
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {filteredPrompts.map((prompt) => (
                  <button
                    key={prompt.id}
                    onClick={() => handlePromptClick(prompt)}
                    className="w-full text-left p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <span>{categoryIcons[prompt.category]}</span>
                      <p className="text-gray-300 group-hover:text-white transition-colors flex-1">
                        {prompt.question}
                      </p>
                      <span className="text-gray-600 text-xs">
                        {prompt.difficulty === 'easy' ? '⚡' : prompt.difficulty === 'medium' ? '⚡⚡' : '⚡⚡⚡'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Notification Settings */}
      <div className="p-4 border-t border-gray-800">
        <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-800 transition-colors">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-gray-400" />
            <div className="text-left">
              <p className="text-gray-300 font-medium">Daily Reminders</p>
              <p className="text-gray-500 text-sm">Get notified at 9:00 AM</p>
            </div>
          </div>
          <div className="w-10 h-6 rounded-full bg-[#D97757] relative">
            <div className="absolute right-1 top-1 w-4 h-4 rounded-full bg-white" />
          </div>
        </button>
      </div>
    </div>
  );
}
