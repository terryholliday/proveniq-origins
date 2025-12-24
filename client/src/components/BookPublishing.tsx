import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  Download, 
  Printer,
  Package,
  Check,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  Palette,
  Type,
  Loader2,
  ExternalLink,
  Star
} from 'lucide-react';

interface BookPublishingProps {
  memoirTitle: string;
  authorName: string;
  chapterCount: number;
  wordCount: number;
  photoCount: number;
  onExport?: (format: string, options: BookOptions) => void;
}

interface BookOptions {
  format: 'pdf' | 'epub' | 'hardcover' | 'softcover';
  coverStyle: string;
  fontSize: 'small' | 'medium' | 'large';
  includePhotos: boolean;
  paperType?: 'standard' | 'premium' | 'photo';
}

interface CoverTemplate {
  id: string;
  name: string;
  preview: string;
  premium: boolean;
}

const coverTemplates: CoverTemplate[] = [
  { id: 'classic', name: 'Classic Elegance', preview: '📕', premium: false },
  { id: 'modern', name: 'Modern Minimal', preview: '📘', premium: false },
  { id: 'vintage', name: 'Vintage Heritage', preview: '📙', premium: false },
  { id: 'photo', name: 'Photo Cover', preview: '📗', premium: true },
  { id: 'leather', name: 'Leather Bound', preview: '📔', premium: true },
  { id: 'custom', name: 'Custom Design', preview: '✨', premium: true },
];

const formatPricing = {
  pdf: { price: 0, label: 'Free' },
  epub: { price: 0, label: 'Free' },
  softcover: { price: 29.99, label: '$29.99' },
  hardcover: { price: 49.99, label: '$49.99' },
};

export default function BookPublishing({ 
  memoirTitle,
  authorName,
  chapterCount,
  wordCount,
  photoCount,
  onExport
}: BookPublishingProps) {
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'epub' | 'hardcover' | 'softcover'>('pdf');
  const [selectedCover, setSelectedCover] = useState<string>('classic');
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [includePhotos, setIncludePhotos] = useState(true);
  const [paperType, setPaperType] = useState<'standard' | 'premium' | 'photo'>('standard');
  const [isGenerating, setIsGenerating] = useState(false);
  const [step, setStep] = useState<'format' | 'customize' | 'preview' | 'checkout'>('format');

  const isPhysical = selectedFormat === 'hardcover' || selectedFormat === 'softcover';
  const estimatedPages = Math.ceil(wordCount / 250) + (includePhotos ? Math.ceil(photoCount / 2) : 0);

  const handleGenerate = async () => {
    setIsGenerating(true);
    
    // Simulate generation
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const options: BookOptions = {
      format: selectedFormat,
      coverStyle: selectedCover,
      fontSize,
      includePhotos,
      paperType: isPhysical ? paperType : undefined
    };
    
    onExport?.(selectedFormat, options);
    setIsGenerating(false);
    
    if (!isPhysical) {
      // Trigger download for digital formats
      alert(`Your ${selectedFormat.toUpperCase()} is ready for download!`);
    } else {
      setStep('checkout');
    }
  };

  return (
    <div className="bg-gray-900 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-white font-semibold">Publish Your Memoir</h2>
            <p className="text-gray-400 text-sm">Create a beautiful book from your stories</p>
          </div>
        </div>
      </div>

      {/* Book Preview Card */}
      <div className="p-6 bg-gradient-to-br from-gray-800/50 to-gray-900 border-b border-gray-800">
        <div className="flex items-start gap-6">
          {/* Book Cover Preview */}
          <div className="relative">
            <div className="w-32 h-44 rounded-lg bg-gradient-to-br from-[#D97757] to-orange-700 shadow-xl flex flex-col items-center justify-center p-4 text-center">
              <span className="text-4xl mb-2">
                {coverTemplates.find(c => c.id === selectedCover)?.preview || '📕'}
              </span>
              <p className="text-white text-xs font-medium leading-tight">{memoirTitle}</p>
              <p className="text-white/60 text-[10px] mt-1">by {authorName}</p>
            </div>
            {/* Spine effect */}
            <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-r from-black/30 to-transparent rounded-l-lg" />
          </div>

          {/* Book Stats */}
          <div className="flex-1 space-y-3">
            <h3 className="text-white text-lg font-semibold">{memoirTitle}</h3>
            <p className="text-gray-400 text-sm">by {authorName}</p>
            
            <div className="grid grid-cols-3 gap-4 pt-2">
              <div>
                <p className="text-2xl font-bold text-white">{chapterCount}</p>
                <p className="text-gray-500 text-xs">Chapters</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{wordCount.toLocaleString()}</p>
                <p className="text-gray-500 text-xs">Words</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">~{estimatedPages}</p>
                <p className="text-gray-500 text-xs">Pages</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Step Navigation */}
      <div className="px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          {['format', 'customize', 'preview'].map((s, i) => (
            <div key={s} className="flex items-center">
              <button
                onClick={() => setStep(s as typeof step)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  step === s 
                    ? 'bg-[#D97757] text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
              {i < 2 && <ChevronRight className="w-4 h-4 text-gray-600 mx-1" />}
            </div>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* Step 1: Format Selection */}
        {step === 'format' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <h3 className="text-white font-medium">Choose Format</h3>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Digital Formats */}
              <button
                onClick={() => setSelectedFormat('pdf')}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  selectedFormat === 'pdf'
                    ? 'border-[#D97757] bg-[#D97757]/10'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <FileText className="w-6 h-6 text-[#D97757]" />
                  <span className="text-white font-medium">PDF</span>
                  <span className="ml-auto text-green-400 text-sm">Free</span>
                </div>
                <p className="text-gray-400 text-sm">Print-ready PDF for home printing or professional services</p>
              </button>

              <button
                onClick={() => setSelectedFormat('epub')}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  selectedFormat === 'epub'
                    ? 'border-[#D97757] bg-[#D97757]/10'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Download className="w-6 h-6 text-[#D97757]" />
                  <span className="text-white font-medium">ePub</span>
                  <span className="ml-auto text-green-400 text-sm">Free</span>
                </div>
                <p className="text-gray-400 text-sm">For Kindle, Apple Books, and other e-readers</p>
              </button>

              {/* Physical Formats */}
              <button
                onClick={() => setSelectedFormat('softcover')}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  selectedFormat === 'softcover'
                    ? 'border-[#D97757] bg-[#D97757]/10'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Printer className="w-6 h-6 text-[#D97757]" />
                  <span className="text-white font-medium">Softcover</span>
                  <span className="ml-auto text-white text-sm">$29.99</span>
                </div>
                <p className="text-gray-400 text-sm">Professional paperback, shipped to your door</p>
              </button>

              <button
                onClick={() => setSelectedFormat('hardcover')}
                className={`p-4 rounded-xl border-2 transition-all text-left relative overflow-hidden ${
                  selectedFormat === 'hardcover'
                    ? 'border-[#D97757] bg-[#D97757]/10'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="absolute top-2 right-2">
                  <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-medium flex items-center gap-1">
                    <Star className="w-3 h-3" /> Premium
                  </span>
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <Package className="w-6 h-6 text-[#D97757]" />
                  <span className="text-white font-medium">Hardcover</span>
                  <span className="ml-auto text-white text-sm">$49.99</span>
                </div>
                <p className="text-gray-400 text-sm">Heirloom quality, dust jacket included</p>
              </button>
            </div>

            <button
              onClick={() => setStep('customize')}
              className="w-full py-3 rounded-xl bg-[#D97757] text-white font-semibold hover:bg-[#c56a4d] transition-colors"
            >
              Continue
            </button>
          </motion.div>
        )}

        {/* Step 2: Customization */}
        {step === 'customize' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Cover Style */}
            <div>
              <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Cover Style
              </h4>
              <div className="grid grid-cols-3 gap-3">
                {coverTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => !template.premium && setSelectedCover(template.id)}
                    disabled={template.premium}
                    className={`p-4 rounded-xl border-2 transition-all relative ${
                      selectedCover === template.id
                        ? 'border-[#D97757] bg-[#D97757]/10'
                        : template.premium
                        ? 'border-gray-800 opacity-50 cursor-not-allowed'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <span className="text-3xl">{template.preview}</span>
                    <p className="text-white text-sm mt-2">{template.name}</p>
                    {template.premium && (
                      <span className="absolute top-2 right-2 text-xs text-yellow-400">PRO</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size */}
            <div>
              <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                <Type className="w-4 h-4" />
                Font Size
              </h4>
              <div className="flex gap-3">
                {(['small', 'medium', 'large'] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => setFontSize(size)}
                    className={`flex-1 py-3 rounded-lg border-2 transition-all ${
                      fontSize === size
                        ? 'border-[#D97757] bg-[#D97757]/10 text-white'
                        : 'border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    <span className={size === 'small' ? 'text-sm' : size === 'large' ? 'text-lg' : ''}>
                      {size.charAt(0).toUpperCase() + size.slice(1)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Include Photos */}
            <div>
              <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Photos
              </h4>
              <button
                onClick={() => setIncludePhotos(!includePhotos)}
                className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                  includePhotos
                    ? 'border-[#D97757] bg-[#D97757]/10'
                    : 'border-gray-700'
                }`}
              >
                <div>
                  <p className="text-white">Include {photoCount} photos</p>
                  <p className="text-gray-400 text-sm">Adds ~{Math.ceil(photoCount / 2)} pages</p>
                </div>
                <div className={`w-10 h-6 rounded-full transition-colors ${
                  includePhotos ? 'bg-[#D97757]' : 'bg-gray-700'
                }`}>
                  <motion.div
                    className="w-4 h-4 rounded-full bg-white mt-1"
                    animate={{ x: includePhotos ? 22 : 4 }}
                  />
                </div>
              </button>
            </div>

            {/* Paper Type (Physical only) */}
            {isPhysical && (
              <div>
                <h4 className="text-white font-medium mb-3">Paper Quality</h4>
                <div className="space-y-2">
                  {[
                    { id: 'standard', name: 'Standard', desc: 'Quality white paper', price: '+$0' },
                    { id: 'premium', name: 'Premium', desc: 'Thick, cream-colored', price: '+$10' },
                    { id: 'photo', name: 'Photo Paper', desc: 'Glossy, for photo-heavy books', price: '+$20' },
                  ].map((paper) => (
                    <button
                      key={paper.id}
                      onClick={() => setPaperType(paper.id as typeof paperType)}
                      className={`w-full p-3 rounded-lg border-2 transition-all flex items-center justify-between ${
                        paperType === paper.id
                          ? 'border-[#D97757] bg-[#D97757]/10'
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <div className="text-left">
                        <p className="text-white">{paper.name}</p>
                        <p className="text-gray-400 text-sm">{paper.desc}</p>
                      </div>
                      <span className="text-gray-400 text-sm">{paper.price}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep('format')}
                className="px-6 py-3 rounded-xl bg-gray-800 text-gray-300 font-medium hover:bg-gray-700 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep('preview')}
                className="flex-1 py-3 rounded-xl bg-[#D97757] text-white font-semibold hover:bg-[#c56a4d] transition-colors"
              >
                Preview
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Preview & Generate */}
        {step === 'preview' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Summary */}
            <div className="p-4 rounded-xl bg-gray-800">
              <h4 className="text-white font-medium mb-4">Order Summary</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Format</span>
                  <span className="text-white">{selectedFormat.charAt(0).toUpperCase() + selectedFormat.slice(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Cover</span>
                  <span className="text-white">{coverTemplates.find(c => c.id === selectedCover)?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Pages</span>
                  <span className="text-white">~{estimatedPages}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Photos</span>
                  <span className="text-white">{includePhotos ? `${photoCount} included` : 'Not included'}</span>
                </div>
                {isPhysical && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Paper</span>
                    <span className="text-white">{paperType.charAt(0).toUpperCase() + paperType.slice(1)}</span>
                  </div>
                )}
                <div className="border-t border-gray-700 pt-3 mt-3">
                  <div className="flex justify-between">
                    <span className="text-white font-medium">Total</span>
                    <span className="text-white font-bold text-lg">
                      {formatPricing[selectedFormat].label}
                      {isPhysical && paperType === 'premium' && ' + $10'}
                      {isPhysical && paperType === 'photo' && ' + $20'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* What's Included */}
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <h4 className="text-emerald-400 font-medium mb-3">What's Included</h4>
              <ul className="space-y-2">
                {[
                  'Professional typesetting',
                  'Table of contents',
                  'Chapter headers',
                  includePhotos && 'Photo pages with captions',
                  isPhysical && 'Free shipping',
                  selectedFormat === 'hardcover' && 'Dust jacket',
                ].filter(Boolean).map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-gray-300 text-sm">
                    <Check className="w-4 h-4 text-emerald-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('customize')}
                className="px-6 py-3 rounded-xl bg-gray-800 text-gray-300 font-medium hover:bg-gray-700 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : isPhysical ? (
                  <>
                    <Package className="w-5 h-5" />
                    Order Print Copy
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Download {selectedFormat.toUpperCase()}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* Checkout (Physical only) */}
        {step === 'checkout' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-white text-xl font-semibold mb-2">Book Ready!</h3>
            <p className="text-gray-400 mb-6">
              Your memoir is ready to print. Complete your order to receive a beautiful physical copy.
            </p>
            <button
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 mx-auto"
            >
              Complete Order
              <ExternalLink className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
