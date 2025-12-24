import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  Image as ImageIcon, 
  Sparkles, 
  Users, 
  Calendar,
  MapPin,
  MessageCircle,
  ChevronRight,
  Loader2,
  Check,
  X,
  Wand2
} from 'lucide-react';
import OriAvatar from './OriAvatar';

interface PhotoToStoryProps {
  onStoryGenerated?: (story: {
    title: string;
    content: string;
    date?: string;
    people?: string[];
    location?: string;
    photoUrl: string;
  }) => void;
}

interface DetectedElement {
  type: 'person' | 'object' | 'location' | 'date' | 'emotion';
  value: string;
  confidence: number;
}

interface Question {
  id: string;
  question: string;
  answer?: string;
  type: 'text' | 'date' | 'people' | 'location';
}

export default function PhotoToStory({ onStoryGenerated }: PhotoToStoryProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [detectedElements, setDetectedElements] = useState<DetectedElement[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [generatedStory, setGeneratedStory] = useState<string | null>(null);
  const [oriState, setOriState] = useState<'idle' | 'thinking' | 'speaking'>('idle');

  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      processImage(file);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImage(file);
    }
  }, []);

  const processImage = async (file: File) => {
    const url = URL.createObjectURL(file);
    setPhotoUrl(url);
    setIsAnalyzing(true);
    setOriState('thinking');

    // Simulate AI image analysis
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock detected elements (in production, use Vision API)
    const mockDetections: DetectedElement[] = [
      { type: 'person', value: '2-3 people', confidence: 0.95 },
      { type: 'emotion', value: 'Happy/Celebratory', confidence: 0.88 },
      { type: 'date', value: 'Appears to be 1980s-1990s', confidence: 0.72 },
      { type: 'location', value: 'Indoor/Home setting', confidence: 0.85 },
    ];
    setDetectedElements(mockDetections);

    // Generate contextual questions
    const contextualQuestions: Question[] = [
      { id: '1', question: "Who are the people in this photo?", type: 'people' },
      { id: '2', question: "When was this photo taken?", type: 'date' },
      { id: '3', question: "Where was this?", type: 'location' },
      { id: '4', question: "What was happening in this moment?", type: 'text' },
      { id: '5', question: "Why is this photo special to you?", type: 'text' },
    ];
    setQuestions(contextualQuestions);

    setIsAnalyzing(false);
    setOriState('idle');
  };

  const handleAnswerSubmit = (answer: string) => {
    const updatedQuestions = [...questions];
    updatedQuestions[currentQuestionIndex].answer = answer;
    setQuestions(updatedQuestions);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      generateStory();
    }
  };

  const generateStory = async () => {
    setIsGenerating(true);
    setOriState('thinking');

    // Simulate AI story generation
    await new Promise(resolve => setTimeout(resolve, 2500));

    const answeredQuestions = questions.filter(q => q.answer);
    const peopleAnswer = answeredQuestions.find(q => q.type === 'people')?.answer || '';
    const dateAnswer = answeredQuestions.find(q => q.type === 'date')?.answer || '';
    const locationAnswer = answeredQuestions.find(q => q.type === 'location')?.answer || '';
    const contextAnswers = answeredQuestions.filter(q => q.type === 'text').map(q => q.answer).join(' ');

    // Generate narrative (in production, use GPT-4)
    const story = `This photograph captures a precious moment ${dateAnswer ? `from ${dateAnswer}` : 'in time'}${locationAnswer ? ` at ${locationAnswer}` : ''}. ${peopleAnswer ? `In the frame, we see ${peopleAnswer}.` : ''} ${contextAnswers} Looking at this image now, it serves as a beautiful reminder of the connections and experiences that shape our lives.`;

    setGeneratedStory(story);
    setIsGenerating(false);
    setOriState('speaking');

    // Callback with generated story
    onStoryGenerated?.({
      title: `Memory: ${dateAnswer || 'A Special Moment'}`,
      content: story,
      date: dateAnswer,
      people: peopleAnswer.split(',').map(p => p.trim()),
      location: locationAnswer,
      photoUrl: photoUrl!
    });
  };

  const resetFlow = () => {
    setPhotoUrl(null);
    setDetectedElements([]);
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setGeneratedStory(null);
    setOriState('idle');
  };

  const currentQuestion = questions[currentQuestionIndex];
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  return (
    <div className="bg-gray-900 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D97757] to-orange-600 flex items-center justify-center">
          <Wand2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-white font-semibold">Photo to Story</h2>
          <p className="text-gray-400 text-sm">Turn any photo into a memoir entry</p>
        </div>
      </div>

      <div className="p-6">
        {/* Upload State */}
        {!photoUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div
              onDrop={handleFileDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-gray-700 rounded-xl p-12 text-center hover:border-[#D97757]/50 transition-colors cursor-pointer"
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="photo-upload"
              />
              <label htmlFor="photo-upload" className="cursor-pointer">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center">
                    <Upload className="w-8 h-8 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Drop a photo here</p>
                    <p className="text-gray-400 text-sm mt-1">or click to browse</p>
                  </div>
                  <p className="text-gray-500 text-xs">Supports JPG, PNG, HEIC</p>
                </div>
              </label>
            </div>

            {/* Example prompts */}
            <div className="text-center">
              <p className="text-gray-500 text-sm mb-3">Try with photos like:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {['Wedding photos', 'Family gatherings', 'Childhood memories', 'Travel adventures'].map((example) => (
                  <span key={example} className="px-3 py-1 rounded-full bg-gray-800 text-gray-400 text-sm">
                    {example}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Analyzing State */}
        {photoUrl && isAnalyzing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="relative aspect-video rounded-xl overflow-hidden">
              <img src={photoUrl} alt="Uploaded" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="text-center">
                  <OriAvatar size="lg" state="thinking" />
                  <p className="text-white mt-4">Ori is analyzing your photo...</p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <Loader2 className="w-4 h-4 text-[#D97757] animate-spin" />
                    <span className="text-gray-400 text-sm">Detecting faces, objects, and context</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Question Flow */}
        {photoUrl && !isAnalyzing && !generatedStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Photo with detections */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="relative aspect-square rounded-xl overflow-hidden">
                <img src={photoUrl} alt="Uploaded" className="w-full h-full object-cover" />
                
                {/* Detection badges */}
                <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1">
                  {detectedElements.map((element, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 rounded-full bg-black/70 text-white text-xs flex items-center gap-1"
                    >
                      {element.type === 'person' && <Users className="w-3 h-3" />}
                      {element.type === 'date' && <Calendar className="w-3 h-3" />}
                      {element.type === 'location' && <MapPin className="w-3 h-3" />}
                      {element.type === 'emotion' && <Sparkles className="w-3 h-3" />}
                      {element.value}
                    </span>
                  ))}
                </div>
              </div>

              {/* Question panel */}
              <div className="flex flex-col">
                {/* Progress */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-400">Question {currentQuestionIndex + 1} of {questions.length}</span>
                    <span className="text-[#D97757]">{Math.round(progress)}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-[#D97757] to-orange-500"
                      animate={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Ori asking question */}
                <div className="flex items-start gap-3 mb-4">
                  <OriAvatar size="md" state={oriState} />
                  <div className="flex-1 p-4 rounded-xl bg-gray-800 rounded-tl-sm">
                    <p className="text-white">{currentQuestion?.question}</p>
                  </div>
                </div>

                {/* Answer input */}
                <QuestionInput
                  type={currentQuestion?.type || 'text'}
                  onSubmit={handleAnswerSubmit}
                  isGenerating={isGenerating}
                />

                {/* Skip option */}
                <button
                  onClick={() => handleAnswerSubmit('')}
                  className="mt-2 text-gray-500 text-sm hover:text-gray-400 transition-colors"
                >
                  Skip this question
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Generated Story */}
        {generatedStory && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="grid md:grid-cols-2 gap-6">
              <div className="aspect-square rounded-xl overflow-hidden">
                <img src={photoUrl!} alt="Memory" className="w-full h-full object-cover" />
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-4">
                  <Check className="w-5 h-5 text-green-400" />
                  <span className="text-green-400 font-medium">Story Generated!</span>
                </div>

                <div className="flex-1 p-4 rounded-xl bg-gray-800">
                  <p className="text-gray-300 leading-relaxed">{generatedStory}</p>
                </div>

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => onStoryGenerated?.({
                      title: 'Memory',
                      content: generatedStory,
                      photoUrl: photoUrl!
                    })}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#D97757] to-orange-600 text-white font-semibold hover:opacity-90 transition-opacity"
                  >
                    Save to Memoir
                  </button>
                  <button
                    onClick={resetFlow}
                    className="px-4 py-3 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// Question Input Component
function QuestionInput({ 
  type, 
  onSubmit, 
  isGenerating 
}: { 
  type: string; 
  onSubmit: (answer: string) => void;
  isGenerating: boolean;
}) {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    if (value.trim()) {
      onSubmit(value);
      setValue('');
    }
  };

  return (
    <div className="flex gap-2">
      <input
        type={type === 'date' ? 'text' : 'text'}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        placeholder={
          type === 'date' ? 'e.g., Summer 1985' :
          type === 'people' ? 'e.g., Mom, Dad, and my sister' :
          type === 'location' ? 'e.g., Our backyard in Ohio' :
          'Type your answer...'
        }
        className="flex-1 px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-[#D97757]"
        disabled={isGenerating}
      />
      <button
        onClick={handleSubmit}
        disabled={!value.trim() || isGenerating}
        className="px-4 py-3 rounded-xl bg-[#D97757] text-white hover:bg-[#c56a4d] transition-colors disabled:opacity-50"
      >
        {isGenerating ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <ChevronRight className="w-5 h-5" />
        )}
      </button>
    </div>
  );
}
