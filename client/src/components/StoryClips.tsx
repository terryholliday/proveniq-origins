import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Video, 
  Share2, 
  Download, 
  Play, 
  Pause, 
  Music, 
  Image as ImageIcon,
  Sparkles,
  Twitter,
  Facebook,
  Link2,
  Check,
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface StoryClipProps {
  eventId?: number;
  title: string;
  content: string;
  date?: string;
  photos?: string[];
  audioUrl?: string;
  onClose?: () => void;
}

interface ClipTemplate {
  id: string;
  name: string;
  style: 'cinematic' | 'vintage' | 'modern' | 'minimal';
  music: string;
  duration: number;
}

const templates: ClipTemplate[] = [
  { id: 'cinematic', name: 'Cinematic', style: 'cinematic', music: 'epic', duration: 60 },
  { id: 'vintage', name: 'Vintage', style: 'vintage', music: 'nostalgic', duration: 45 },
  { id: 'modern', name: 'Modern', style: 'modern', music: 'upbeat', duration: 30 },
  { id: 'minimal', name: 'Minimal', style: 'minimal', music: 'ambient', duration: 60 },
];

export default function StoryClips({ 
  eventId,
  title, 
  content, 
  date,
  photos = [],
  audioUrl,
  onClose 
}: StoryClipProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<ClipTemplate>(templates[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [clipGenerated, setClipGenerated] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Ken Burns effect for photos
  useEffect(() => {
    if (isPlaying && photos.length > 0) {
      const interval = setInterval(() => {
        setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isPlaying, photos.length]);

  // Progress bar simulation during playback
  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 0;
          }
          return prev + (100 / (selectedTemplate.duration * 10));
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isPlaying, selectedTemplate.duration]);

  const generateClip = async () => {
    setIsGenerating(true);
    // Simulate AI video generation
    await new Promise(resolve => setTimeout(resolve, 3000));
    setIsGenerating(false);
    setClipGenerated(true);
  };

  const handleShare = async (platform: string) => {
    const shareUrl = `https://myoriginstory.app/clip/${eventId}`;
    const shareText = `${title} - My story on Origins`;

    switch (platform) {
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
        break;
      case 'tiktok':
        // TikTok requires native app integration
        alert('Download the clip and upload to TikTok!');
        break;
      case 'copy':
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        break;
    }
    setShowShareMenu(false);
  };

  const downloadClip = () => {
    // In production, this would download the actual generated video
    alert('Downloading clip... (In production, this generates an MP4)');
  };

  // Extract key sentences for captions
  const captions = content.split('.').filter(s => s.trim().length > 20).slice(0, 5);

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D97757] to-orange-600 flex items-center justify-center">
              <Video className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-semibold">Create Story Clip</h2>
              <p className="text-gray-400 text-sm">Share your memory as a video</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6 p-6">
          {/* Preview Panel */}
          <div className="space-y-4">
            <div className="aspect-[9/16] bg-black rounded-xl overflow-hidden relative">
              {/* Video Preview */}
              <div className="absolute inset-0">
                {photos.length > 0 ? (
                  <motion.div
                    key={currentPhotoIndex}
                    initial={{ scale: 1.1, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ duration: 1 }}
                    className="w-full h-full"
                  >
                    <img
                      src={photos[currentPhotoIndex]}
                      alt="Story"
                      className="w-full h-full object-cover"
                      style={{
                        animation: isPlaying ? 'kenburns 10s ease-in-out infinite' : 'none'
                      }}
                    />
                  </motion.div>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#D97757]/20 to-orange-900/20 flex items-center justify-center">
                    <ImageIcon className="w-16 h-16 text-gray-600" />
                  </div>
                )}

                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />

                {/* Title overlay */}
                <div className="absolute top-4 left-4 right-4">
                  <p className="text-white/60 text-sm">{date}</p>
                </div>

                {/* Caption overlay */}
                <div className="absolute bottom-16 left-4 right-4">
                  <AnimatePresence mode="wait">
                    {isPlaying && captions.length > 0 && (
                      <motion.p
                        key={Math.floor(progress / 20)}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="text-white text-lg font-medium leading-relaxed"
                      >
                        {captions[Math.floor(progress / 20) % captions.length]}...
                      </motion.p>
                    )}
                  </AnimatePresence>
                  {!isPlaying && (
                    <h3 className="text-white text-xl font-bold">{title}</h3>
                  )}
                </div>

                {/* Progress bar */}
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-[#D97757]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Play button overlay */}
                {clipGenerated && !isPlaying && (
                  <button
                    onClick={() => setIsPlaying(true)}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors">
                      <Play className="w-8 h-8 text-white ml-1" />
                    </div>
                  </button>
                )}

                {/* Pause button */}
                {isPlaying && (
                  <button
                    onClick={() => setIsPlaying(false)}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 hover:opacity-100 transition-opacity"
                  >
                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Pause className="w-8 h-8 text-white" />
                    </div>
                  </button>
                )}

                {/* Watermark */}
                <div className="absolute bottom-8 right-4">
                  <span className="text-white/40 text-xs font-medium">PROVENIQ Origins</span>
                </div>
              </div>
            </div>

            {/* Photo navigation */}
            {photos.length > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length)}
                  className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-white" />
                </button>
                <span className="text-gray-400 text-sm">
                  {currentPhotoIndex + 1} / {photos.length}
                </span>
                <button
                  onClick={() => setCurrentPhotoIndex((prev) => (prev + 1) % photos.length)}
                  className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-white" />
                </button>
              </div>
            )}
          </div>

          {/* Controls Panel */}
          <div className="space-y-6">
            {/* Template Selection */}
            <div>
              <h3 className="text-white font-medium mb-3">Choose Style</h3>
              <div className="grid grid-cols-2 gap-3">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectedTemplate.id === template.id
                        ? 'border-[#D97757] bg-[#D97757]/10'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="text-left">
                      <p className="text-white font-medium">{template.name}</p>
                      <p className="text-gray-400 text-sm">{template.duration}s • {template.music}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Music Selection */}
            <div>
              <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                <Music className="w-4 h-4" />
                Background Music
              </h3>
              <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white">
                <option value="nostalgic">Nostalgic Piano</option>
                <option value="upbeat">Upbeat Acoustic</option>
                <option value="epic">Epic Cinematic</option>
                <option value="ambient">Soft Ambient</option>
                <option value="none">No Music</option>
              </select>
            </div>

            {/* AI Enhancement */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-[#D97757]/20 to-orange-900/20 border border-[#D97757]/30">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-[#D97757] mt-0.5" />
                <div>
                  <h4 className="text-white font-medium">AI Enhancement</h4>
                  <p className="text-gray-400 text-sm mt-1">
                    Ori will add smooth transitions, auto-captions, and optimize pacing for maximum engagement.
                  </p>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            {!clipGenerated ? (
              <button
                onClick={generateClip}
                disabled={isGenerating}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-[#D97757] to-orange-600 text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating your clip...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate Story Clip
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-3">
                {/* Share Button */}
                <div className="relative">
                  <button
                    onClick={() => setShowShareMenu(!showShareMenu)}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-[#D97757] to-orange-600 text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                  >
                    <Share2 className="w-5 h-5" />
                    Share Clip
                  </button>

                  {/* Share Menu */}
                  <AnimatePresence>
                    {showShareMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-full left-0 right-0 mb-2 bg-gray-800 rounded-xl p-2 border border-gray-700"
                      >
                        <button
                          onClick={() => handleShare('tiktok')}
                          className="w-full p-3 rounded-lg hover:bg-gray-700 flex items-center gap-3 text-white"
                        >
                          <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center">
                            <span className="text-sm font-bold">TT</span>
                          </div>
                          TikTok
                        </button>
                        <button
                          onClick={() => handleShare('twitter')}
                          className="w-full p-3 rounded-lg hover:bg-gray-700 flex items-center gap-3 text-white"
                        >
                          <Twitter className="w-8 h-8 p-1.5 rounded-full bg-blue-500" />
                          Twitter / X
                        </button>
                        <button
                          onClick={() => handleShare('facebook')}
                          className="w-full p-3 rounded-lg hover:bg-gray-700 flex items-center gap-3 text-white"
                        >
                          <Facebook className="w-8 h-8 p-1.5 rounded-full bg-blue-600" />
                          Facebook
                        </button>
                        <button
                          onClick={() => handleShare('copy')}
                          className="w-full p-3 rounded-lg hover:bg-gray-700 flex items-center gap-3 text-white"
                        >
                          {copied ? (
                            <Check className="w-8 h-8 p-1.5 rounded-full bg-green-500" />
                          ) : (
                            <Link2 className="w-8 h-8 p-1.5 rounded-full bg-gray-600" />
                          )}
                          {copied ? 'Copied!' : 'Copy Link'}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Download Button */}
                <button
                  onClick={downloadClip}
                  className="w-full py-4 rounded-xl bg-gray-800 text-white font-semibold flex items-center justify-center gap-2 hover:bg-gray-700 transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Download MP4
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <style>{`
        @keyframes kenburns {
          0% { transform: scale(1) translate(0, 0); }
          50% { transform: scale(1.1) translate(-2%, -2%); }
          100% { transform: scale(1) translate(0, 0); }
        }
      `}</style>
    </div>
  );
}
