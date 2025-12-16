import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  MicOff, 
  Square, 
  Loader2,
  Sparkles,
  Volume2,
  VolumeX,
  MessageCircle,
  Clock,
  CheckCircle
} from 'lucide-react';
import OriAvatar from './OriAvatar';

interface VoiceInterfaceProps {
  onTranscript?: (text: string) => void;
  onStoryGenerated?: (story: { title: string; content: string; date?: string }) => void;
  mode?: 'conversation' | 'quick-capture';
}

interface Message {
  id: string;
  role: 'user' | 'ori';
  content: string;
  timestamp: Date;
}

export default function VoiceInterface({ 
  onTranscript, 
  onStoryGenerated,
  mode = 'conversation' 
}: VoiceInterfaceProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [oriState, setOriState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [sessionDuration, setSessionDuration] = useState(0);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Session timer
  useEffect(() => {
    const interval = setInterval(() => {
      if (isListening || isProcessing || isSpeaking) {
        setSessionDuration(prev => prev + 1);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isListening, isProcessing, isSpeaking]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event) => {
          let finalTranscript = '';
          let interimTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          setTranscript(interimTranscript || finalTranscript);

          if (finalTranscript) {
            handleUserInput(finalTranscript);
          }
        };

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          setOriState('idle');
        };

        recognitionRef.current.onend = () => {
          if (isListening) {
            recognitionRef.current?.start();
          }
        };
      }
    }

    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const handleUserInput = useCallback(async (text: string) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setTranscript('');
    onTranscript?.(text);

    // Process with AI
    setIsProcessing(true);
    setOriState('thinking');

    try {
      // Simulate AI response (in production, call your AI endpoint)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const oriResponse = generateOriResponse(text, messages);
      
      const oriMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ori',
        content: oriResponse,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, oriMessage]);

      // Speak response if audio enabled
      if (audioEnabled) {
        speakResponse(oriResponse);
      } else {
        setOriState('idle');
      }

      // Check if we have enough for a story
      if (messages.length >= 4) {
        const story = extractStory(messages);
        onStoryGenerated?.(story);
      }
    } catch (error) {
      console.error('Error processing input:', error);
      setOriState('idle');
    } finally {
      setIsProcessing(false);
    }
  }, [messages, audioEnabled, onTranscript, onStoryGenerated]);

  const generateOriResponse = (userInput: string, history: Message[]): string => {
    // Context-aware response generation
    const lowerInput = userInput.toLowerCase();
    
    if (history.length === 0) {
      return "I'd love to hear more about that. Can you tell me when this happened and who was there with you?";
    }
    
    if (lowerInput.includes('mother') || lowerInput.includes('mom') || lowerInput.includes('father') || lowerInput.includes('dad')) {
      return "Your relationship with your parents sounds meaningful. What's a specific moment with them that you'll never forget?";
    }
    
    if (lowerInput.includes('remember') || lowerInput.includes('memory')) {
      return "That's a powerful memory. How did that experience shape who you are today?";
    }
    
    if (lowerInput.includes('happy') || lowerInput.includes('joy') || lowerInput.includes('love')) {
      return "I can hear the joy in your words. What made that moment so special to you?";
    }
    
    if (lowerInput.includes('hard') || lowerInput.includes('difficult') || lowerInput.includes('sad')) {
      return "Thank you for sharing something so personal. How did you find the strength to get through that time?";
    }

    const followUps = [
      "That's fascinating. What happened next?",
      "I can picture it. What were you feeling in that moment?",
      "Tell me more about that. What details stand out most vividly?",
      "That sounds like a defining moment. How old were you then?",
      "What would you want your grandchildren to know about this experience?"
    ];
    
    return followUps[Math.floor(Math.random() * followUps.length)];
  };

  const extractStory = (history: Message[]): { title: string; content: string; date?: string } => {
    const userMessages = history.filter(m => m.role === 'user');
    const content = userMessages.map(m => m.content).join(' ');
    
    // Extract potential title from first message
    const firstMessage = userMessages[0]?.content || '';
    const title = firstMessage.split('.')[0].slice(0, 50) || 'My Story';
    
    return { title, content };
  };

  const speakResponse = (text: string) => {
    if ('speechSynthesis' in window) {
      setIsSpeaking(true);
      setOriState('speaking');
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      
      // Try to find a good voice
      const voices = speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => 
        v.name.includes('Samantha') || 
        v.name.includes('Google') || 
        v.lang === 'en-US'
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onend = () => {
        setIsSpeaking(false);
        setOriState('idle');
      };

      synthRef.current = utterance;
      speechSynthesis.speak(utterance);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setOriState('idle');
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
      setOriState('listening');
    }
  };

  const stopSpeaking = () => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
    setOriState('idle');
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Quick capture prompts
  const quickPrompts = [
    "Tell me about your childhood home",
    "What's your earliest memory?",
    "Describe your favorite family tradition",
    "Who was your best friend growing up?",
    "What's a lesson your parents taught you?"
  ];

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <OriAvatar size="md" state={oriState} />
          <div>
            <h2 className="text-white font-semibold">Talk to Ori</h2>
            <p className="text-gray-400 text-sm flex items-center gap-2">
              <Clock className="w-3 h-3" />
              {formatDuration(sessionDuration)}
            </p>
          </div>
        </div>
        <button
          onClick={() => setAudioEnabled(!audioEnabled)}
          className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          {audioEnabled ? (
            <Volume2 className="w-5 h-5 text-gray-400" />
          ) : (
            <VolumeX className="w-5 h-5 text-gray-400" />
          )}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex justify-center">
                <OriAvatar size="xl" state={oriState} />
              </div>
              <h3 className="text-white text-xl font-semibold">
                Hi! I'm Ori, your memoir guide.
              </h3>
              <p className="text-gray-400 max-w-md mx-auto">
                Just start talking and I'll help you capture your stories. 
                Tap the microphone when you're ready.
              </p>
              
              {/* Quick prompts */}
              <div className="mt-6 space-y-2">
                <p className="text-gray-500 text-sm">Or try one of these:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {quickPrompts.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => handleUserInput(prompt)}
                      className="px-3 py-1.5 rounded-full bg-gray-800 text-gray-300 text-sm hover:bg-gray-700 transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}

        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-4 rounded-2xl ${
                  message.role === 'user'
                    ? 'bg-[#D97757] text-white rounded-br-sm'
                    : 'bg-gray-800 text-gray-100 rounded-bl-sm'
                }`}
              >
                {message.role === 'ori' && (
                  <div className="flex items-center gap-2 mb-2">
                    <OriAvatar size="sm" state="idle" />
                    <span className="text-[#D97757] text-sm font-medium">Ori</span>
                  </div>
                )}
                <p className="leading-relaxed">{message.content}</p>
                <p className={`text-xs mt-2 ${
                  message.role === 'user' ? 'text-white/60' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Transcript preview */}
        {transcript && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-end"
          >
            <div className="max-w-[80%] p-4 rounded-2xl bg-[#D97757]/50 text-white/80 rounded-br-sm">
              <p className="italic">{transcript}...</p>
            </div>
          </motion.div>
        )}

        {/* Processing indicator */}
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="p-4 rounded-2xl bg-gray-800 rounded-bl-sm">
              <div className="flex items-center gap-2">
                <OriAvatar size="sm" state="thinking" />
                <span className="text-gray-400">Ori is thinking...</span>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Controls */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center justify-center gap-4">
          {/* Main mic button */}
          <motion.button
            onClick={toggleListening}
            disabled={isProcessing || isSpeaking}
            whileTap={{ scale: 0.95 }}
            className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all ${
              isListening
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-[#D97757] hover:bg-[#c56a4d]'
            } disabled:opacity-50`}
          >
            {isListening ? (
              <Square className="w-6 h-6 text-white" />
            ) : (
              <Mic className="w-6 h-6 text-white" />
            )}
            
            {/* Pulse animation when listening */}
            {isListening && (
              <>
                <motion.div
                  className="absolute inset-0 rounded-full bg-red-500"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full bg-red-500"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                />
              </>
            )}
          </motion.button>

          {/* Stop speaking button */}
          {isSpeaking && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={stopSpeaking}
              className="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors"
            >
              <VolumeX className="w-5 h-5 text-white" />
            </motion.button>
          )}
        </div>

        <p className="text-center text-gray-500 text-sm mt-3">
          {isListening ? 'Listening... Tap to stop' : 'Tap to start talking'}
        </p>

        {/* Story progress */}
        {messages.length > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-gray-800/50">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Story progress</span>
              <span className="text-[#D97757]">{messages.filter(m => m.role === 'user').length} memories captured</span>
            </div>
            <div className="mt-2 h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#D97757] to-orange-500"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(messages.filter(m => m.role === 'user').length * 20, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Add type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}
