import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Plus, 
  MessageCircle, 
  Eye,
  GitBranch,
  UserPlus,
  Mail,
  Link2,
  Check,
  ChevronDown,
  Play,
  Quote
} from 'lucide-react';
import OriAvatar from './OriAvatar';

interface FamilyRemixProps {
  eventId: number;
  eventTitle: string;
  originalContent: string;
  originalAuthor: string;
  onInvite?: (email: string) => void;
}

interface Perspective {
  id: string;
  author: string;
  relationship: string;
  content: string;
  timestamp: Date;
  avatar?: string;
}

export default function FamilyRemix({ 
  eventId,
  eventTitle,
  originalContent,
  originalAuthor,
  onInvite
}: FamilyRemixProps) {
  const [perspectives, setPerspectives] = useState<Perspective[]>([
    {
      id: '1',
      author: originalAuthor,
      relationship: 'Original',
      content: originalContent,
      timestamp: new Date(),
    }
  ]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRelationship, setInviteRelationship] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeView, setActiveView] = useState<'timeline' | 'sidebyside'>('timeline');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPerspectiveIndex, setCurrentPerspectiveIndex] = useState(0);

  const handleInvite = () => {
    if (inviteEmail && inviteRelationship) {
      onInvite?.(inviteEmail);
      // In production, send invite email
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRelationship('');
    }
  };

  const copyShareLink = async () => {
    const link = `https://myoriginstory.app/remix/${eventId}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const playNarration = () => {
    setIsPlaying(true);
    // Cycle through perspectives
    const interval = setInterval(() => {
      setCurrentPerspectiveIndex(prev => {
        if (prev >= perspectives.length - 1) {
          clearInterval(interval);
          setIsPlaying(false);
          return 0;
        }
        return prev + 1;
      });
    }, 5000);
  };

  const relationshipOptions = [
    'Mother', 'Father', 'Sister', 'Brother', 
    'Grandmother', 'Grandfather', 'Aunt', 'Uncle',
    'Cousin', 'Child', 'Spouse', 'Friend', 'Other'
  ];

  return (
    <div className="bg-gray-900 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
              <GitBranch className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-semibold">Family Remix</h2>
              <p className="text-gray-400 text-sm">Multiple perspectives, one memory</p>
            </div>
          </div>
          
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D97757] text-white font-medium hover:bg-[#c56a4d] transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Invite Family
          </button>
        </div>
      </div>

      {/* Event Title */}
      <div className="p-4 bg-gray-800/50 border-b border-gray-800">
        <h3 className="text-white text-lg font-medium">{eventTitle}</h3>
        <p className="text-gray-400 text-sm mt-1">
          {perspectives.length} perspective{perspectives.length !== 1 ? 's' : ''} shared
        </p>
      </div>

      {/* View Toggle */}
      <div className="p-4 flex items-center gap-4">
        <div className="flex bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setActiveView('timeline')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeView === 'timeline' 
                ? 'bg-[#D97757] text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Timeline
          </button>
          <button
            onClick={() => setActiveView('sidebyside')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeView === 'sidebyside' 
                ? 'bg-[#D97757] text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Side by Side
          </button>
        </div>

        {perspectives.length > 1 && (
          <button
            onClick={playNarration}
            disabled={isPlaying}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            Play All
          </button>
        )}
      </div>

      {/* Perspectives Display */}
      <div className="p-4">
        {activeView === 'timeline' ? (
          <div className="space-y-4">
            {perspectives.map((perspective, index) => (
              <motion.div
                key={perspective.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ 
                  opacity: 1, 
                  x: 0,
                  scale: isPlaying && currentPerspectiveIndex === index ? 1.02 : 1
                }}
                className={`relative pl-8 ${
                  isPlaying && currentPerspectiveIndex === index 
                    ? 'ring-2 ring-[#D97757] rounded-xl' 
                    : ''
                }`}
              >
                {/* Timeline line */}
                {index < perspectives.length - 1 && (
                  <div className="absolute left-3 top-10 bottom-0 w-0.5 bg-gray-700" />
                )}
                
                {/* Timeline dot */}
                <div 
                  className="absolute left-0 top-2 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ 
                    backgroundColor: index === 0 ? '#D97757' : '#48D5C0',
                  }}
                >
                  <span className="text-white text-xs font-bold">{index + 1}</span>
                </div>

                <div className="p-4 rounded-xl bg-gray-800">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {perspective.author.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="text-white font-medium">{perspective.author}</p>
                      <p className="text-gray-500 text-xs">{perspective.relationship}</p>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <Quote className="absolute -left-1 -top-1 w-4 h-4 text-gray-600" />
                    <p className="text-gray-300 leading-relaxed pl-4">
                      {perspective.content}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Add perspective prompt */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="pl-8"
            >
              <button
                onClick={() => setShowInviteModal(true)}
                className="w-full p-4 rounded-xl border-2 border-dashed border-gray-700 hover:border-[#D97757]/50 transition-colors flex items-center justify-center gap-2 text-gray-500 hover:text-gray-400"
              >
                <Plus className="w-5 h-5" />
                Add another perspective
              </button>
            </motion.div>
          </div>
        ) : (
          /* Side by Side View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {perspectives.map((perspective, index) => (
              <motion.div
                key={perspective.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 rounded-xl bg-gray-800 h-full"
              >
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-700">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ 
                      backgroundColor: index === 0 ? '#D97757' : '#48D5C0',
                    }}
                  >
                    <span className="text-white font-medium">
                      {perspective.author.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="text-white font-medium">{perspective.author}</p>
                    <p className="text-gray-500 text-xs">{perspective.relationship}'s perspective</p>
                  </div>
                </div>
                
                <p className="text-gray-300 leading-relaxed text-sm">
                  {perspective.content}
                </p>
              </motion.div>
            ))}

            {/* Add card */}
            <button
              onClick={() => setShowInviteModal(true)}
              className="p-4 rounded-xl border-2 border-dashed border-gray-700 hover:border-[#D97757]/50 transition-colors flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-gray-400 min-h-[200px]"
            >
              <Plus className="w-8 h-8" />
              <span>Add perspective</span>
            </button>
          </div>
        )}
      </div>

      {/* AI Insight */}
      {perspectives.length > 1 && (
        <div className="p-4 border-t border-gray-800">
          <div className="p-4 rounded-xl bg-gradient-to-r from-[#D97757]/10 to-orange-900/10 border border-[#D97757]/20">
            <div className="flex items-start gap-3">
              <OriAvatar size="sm" state="idle" />
              <div>
                <p className="text-[#D97757] font-medium text-sm mb-1">Ori's Insight</p>
                <p className="text-gray-300 text-sm">
                  "It's fascinating how the same moment can hold different meanings for each person. 
                  {perspectives.length === 2 
                    ? " These two perspectives together paint a richer picture of this memory."
                    : ` With ${perspectives.length} perspectives, you're creating a truly multi-dimensional record of this moment.`
                  }"
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setShowInviteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-900 rounded-2xl max-w-md w-full p-6"
            >
              <h3 className="text-white text-xl font-semibold mb-2">
                Invite Family Member
              </h3>
              <p className="text-gray-400 text-sm mb-6">
                Ask them to share their perspective on "{eventTitle}"
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="family@example.com"
                      className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-[#D97757]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Their relationship to you</label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <select
                      value={inviteRelationship}
                      onChange={(e) => setInviteRelationship(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white appearance-none focus:outline-none focus:border-[#D97757]"
                    >
                      <option value="">Select relationship</option>
                      {relationshipOptions.map(rel => (
                        <option key={rel} value={rel}>{rel}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleInvite}
                    disabled={!inviteEmail || !inviteRelationship}
                    className="w-full py-3 rounded-lg bg-[#D97757] text-white font-semibold hover:bg-[#c56a4d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Send Invite
                  </button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-700" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-gray-900 text-gray-500">or share link</span>
                  </div>
                </div>

                <button
                  onClick={copyShareLink}
                  className="w-full py-3 rounded-lg bg-gray-800 text-gray-300 font-medium hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="w-5 h-5 text-green-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Link2 className="w-5 h-5" />
                      Copy Share Link
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
