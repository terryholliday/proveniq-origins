import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  Upload, 
  Play, 
  Pause,
  Volume2,
  Wand2,
  AlertCircle,
  Check,
  Loader2,
  FileAudio,
  Clock,
  Heart,
  Sparkles
} from 'lucide-react';
import OriAvatar from './OriAvatar';

interface VoiceCloningProps {
  personId?: number;
  personName: string;
  onVoiceCreated?: (voiceId: string) => void;
}

interface VoiceSample {
  id: string;
  name: string;
  duration: number;
  url: string;
}

export default function VoiceCloning({ 
  personName,
  onVoiceCreated 
}: VoiceCloningProps) {
  const [samples, setSamples] = useState<VoiceSample[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [voiceCreated, setVoiceCreated] = useState(false);
  const [previewText, setPreviewText] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [totalDuration, setTotalDuration] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const MIN_DURATION = 30; // Minimum 30 seconds of audio needed
  const RECOMMENDED_DURATION = 120; // 2 minutes recommended

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        const newSample: VoiceSample = {
          id: Date.now().toString(),
          name: `Recording ${samples.length + 1}`,
          duration: recordingTime,
          url
        };
        setSamples(prev => [...prev, newSample]);
        setTotalDuration(prev => prev + recordingTime);
        setRecordingTime(0);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);

      // Start recording timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const url = URL.createObjectURL(file);
        // Get audio duration
        const audio = new Audio(url);
        audio.onloadedmetadata = () => {
          const newSample: VoiceSample = {
            id: Date.now().toString() + Math.random(),
            name: file.name,
            duration: Math.round(audio.duration),
            url
          };
          setSamples(prev => [...prev, newSample]);
          setTotalDuration(prev => prev + Math.round(audio.duration));
        };
      });
    }
  };

  const removeSample = (id: string) => {
    const sample = samples.find(s => s.id === id);
    if (sample) {
      setTotalDuration(prev => prev - sample.duration);
      setSamples(prev => prev.filter(s => s.id !== id));
    }
  };

  const createVoice = async () => {
    if (totalDuration < MIN_DURATION) return;

    setIsProcessing(true);

    // Simulate voice cloning process (in production, call ElevenLabs API)
    await new Promise(resolve => setTimeout(resolve, 5000));

    setIsProcessing(false);
    setVoiceCreated(true);
    onVoiceCreated?.('voice_' + Date.now());
  };

  const playPreview = () => {
    if (!previewText) return;
    setIsPlaying(true);
    
    // Simulate TTS playback (in production, call ElevenLabs API)
    setTimeout(() => {
      setIsPlaying(false);
    }, 3000);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = Math.min((totalDuration / RECOMMENDED_DURATION) * 100, 100);
  const canCreate = totalDuration >= MIN_DURATION;

  return (
    <div className="bg-gray-900 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
            <Wand2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-white font-semibold">Voice Legacy</h2>
            <p className="text-gray-400 text-sm">Clone {personName}'s voice</p>
          </div>
        </div>
      </div>

      {!voiceCreated ? (
        <div className="p-6 space-y-6">
          {/* Explanation */}
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <div className="flex items-start gap-3">
              <Heart className="w-5 h-5 text-purple-400 mt-0.5" />
              <div>
                <h4 className="text-white font-medium">Preserve Their Voice Forever</h4>
                <p className="text-gray-400 text-sm mt-1">
                  Upload recordings of {personName} speaking. We'll create an AI voice that can 
                  read their memoir entries in their own voice.
                </p>
              </div>
            </div>
          </div>

          {/* Progress */}
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-400">Audio collected</span>
              <span className={totalDuration >= MIN_DURATION ? 'text-green-400' : 'text-[#D97757]'}>
                {formatTime(totalDuration)} / {formatTime(RECOMMENDED_DURATION)} recommended
              </span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                className={`h-full ${
                  totalDuration >= MIN_DURATION 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                    : 'bg-gradient-to-r from-[#D97757] to-orange-500'
                }`}
                animate={{ width: `${progress}%` }}
              />
            </div>
            {totalDuration < MIN_DURATION && (
              <p className="text-gray-500 text-xs mt-2">
                Need at least {formatTime(MIN_DURATION - totalDuration)} more audio
              </p>
            )}
          </div>

          {/* Recording Controls */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Record */}
            <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700">
              <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                <Mic className="w-4 h-4" />
                Record New
              </h4>
              <p className="text-gray-400 text-sm mb-4">
                Record {personName} speaking naturally - reading a story, telling a memory, etc.
              </p>
              
              {isRecording ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-3">
                    <motion.div
                      className="w-3 h-3 rounded-full bg-red-500"
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                    <span className="text-white font-mono text-lg">
                      {formatTime(recordingTime)}
                    </span>
                  </div>
                  <button
                    onClick={stopRecording}
                    className="w-full py-3 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
                  >
                    Stop Recording
                  </button>
                </div>
              ) : (
                <button
                  onClick={startRecording}
                  className="w-full py-3 rounded-lg bg-[#D97757] text-white font-medium hover:bg-[#c56a4d] transition-colors flex items-center justify-center gap-2"
                >
                  <Mic className="w-4 h-4" />
                  Start Recording
                </button>
              )}
            </div>

            {/* Upload */}
            <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700">
              <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload Audio
              </h4>
              <p className="text-gray-400 text-sm mb-4">
                Upload existing recordings - voicemails, videos, audio messages, etc.
              </p>
              
              <input
                type="file"
                accept="audio/*,video/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="audio-upload"
              />
              <label
                htmlFor="audio-upload"
                className="w-full py-3 rounded-lg bg-gray-700 text-white font-medium hover:bg-gray-600 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <FileAudio className="w-4 h-4" />
                Choose Files
              </label>
            </div>
          </div>

          {/* Samples List */}
          {samples.length > 0 && (
            <div>
              <h4 className="text-white font-medium mb-3">Audio Samples ({samples.length})</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {samples.map((sample) => (
                  <div
                    key={sample.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-800"
                  >
                    <div className="flex items-center gap-3">
                      <button className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors">
                        <Play className="w-4 h-4 text-white" />
                      </button>
                      <div>
                        <p className="text-white text-sm">{sample.name}</p>
                        <p className="text-gray-500 text-xs">{formatTime(sample.duration)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeSample(sample.id)}
                      className="text-gray-500 hover:text-red-400 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Create Voice Button */}
          <button
            onClick={createVoice}
            disabled={!canCreate || isProcessing}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating voice... This may take a few minutes
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Create {personName}'s Voice
              </>
            )}
          </button>

          {/* Privacy Notice */}
          <div className="flex items-start gap-2 text-gray-500 text-xs">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>
              Voice cloning requires consent. Only clone voices of people who have given permission 
              or are deceased family members whose legacy you're preserving.
            </p>
          </div>
        </div>
      ) : (
        /* Voice Created State */
        <div className="p-6 space-y-6">
          <div className="text-center py-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4"
            >
              <Check className="w-8 h-8 text-green-400" />
            </motion.div>
            <h3 className="text-white text-xl font-semibold">{personName}'s Voice Created!</h3>
            <p className="text-gray-400 mt-2">
              Their memoir entries can now be read in their own voice.
            </p>
          </div>

          {/* Preview */}
          <div className="p-4 rounded-xl bg-gray-800">
            <h4 className="text-white font-medium mb-3">Try it out</h4>
            <textarea
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              placeholder={`Type something for ${personName} to say...`}
              className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-[#D97757]"
              rows={3}
            />
            <button
              onClick={playPreview}
              disabled={!previewText || isPlaying}
              className="mt-3 w-full py-3 rounded-lg bg-[#D97757] text-white font-medium hover:bg-[#c56a4d] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isPlaying ? (
                <>
                  <Volume2 className="w-4 h-4 animate-pulse" />
                  Playing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Play Preview
                </>
              )}
            </button>
          </div>

          {/* Use Cases */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-gray-800/50 text-center">
              <p className="text-gray-400 text-sm">Read their memoir aloud</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-800/50 text-center">
              <p className="text-gray-400 text-sm">Narrate Story Clips</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-800/50 text-center">
              <p className="text-gray-400 text-sm">Legacy Letters</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-800/50 text-center">
              <p className="text-gray-400 text-sm">Time Machine chats</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
