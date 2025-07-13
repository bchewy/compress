import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Image, 
  Download, 
  Zap, 
  Shield, 
  FileCheck,
  Upload,
  Settings,
  Sparkles,
  Github,
  ArrowRight,
  CheckCircle,
  FileArchive
} from 'lucide-react';
import UniversalCompressor from './UniversalCompressor';
import ParticleBackground from './ParticleBackground';

const FeatureCard = ({ icon: Icon, title, description, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay }}
    className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 hover:bg-white/15 group"
  >
    <div className="flex items-center mb-6">
      <div className="p-3 bg-gradient-to-br from-blue-400 to-purple-600 rounded-xl group-hover:scale-110 transition-transform duration-300">
        <Icon className="w-8 h-8 text-white" />
      </div>
      <h3 className="text-xl font-bold text-white ml-4">{title}</h3>
    </div>
    <p className="text-gray-200 leading-relaxed">{description}</p>
  </motion.div>
);

const FloatingIcon = ({ icon: Icon, className, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.5, delay }}
    className={`absolute ${className} hidden lg:block`}
  >
    <motion.div
      animate={{ 
        y: [0, -15, 0],
        rotate: [0, 3, -3, 0]
      }}
      transition={{ 
        duration: 6,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      className="p-3 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 shadow-lg"
    >
      <Icon className="w-6 h-6 text-white/70" />
    </motion.div>
  </motion.div>
);

export default function ModernLandingPage() {
  const [showCompressor, setShowCompressor] = useState(false);

  if (showCompressor) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-8"
          >
            <button
              onClick={() => setShowCompressor(false)}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-300 shadow-lg"
            >
              ← Back to Home
            </button>
            <h1 className="text-3xl font-bold text-gray-800">Universal File Compressor</h1>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <UniversalCompressor />
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Modern Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {/* Animated gradient orbs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-500/30 to-purple-500/30 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-cyan-500/30 to-blue-500/30 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.4, 0.2, 0.4],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 4 }}
          className="absolute top-3/4 left-1/2 transform -translate-x-1/2 w-72 h-72 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full blur-3xl"
        />
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
        
        {/* Noise texture */}
        <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZGVmcz4KICAgIDxmaWx0ZXIgaWQ9Im5vaXNlIj4KICAgICAgPGZlVHVyYnVsZW5jZSBiYXNlRnJlcXVlbmN5PSIwLjkiIG51bU9jdGF2ZXM9IjEiIHR5cGU9ImZyYWN0YWxOb2lzZSIvPgogICAgPC9maWx0ZXI+CiAgPC9kZWZzPgogIDxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNub2lzZSkiIG9wYWNpdHk9IjAuMSIvPgo8L3N2Zz4K')]"></div>
      </div>

      {/* Floating Icons */}
      <FloatingIcon icon={FileText} className="top-20 left-10" delay={0.2} />
      <FloatingIcon icon={Image} className="top-40 right-16" delay={0.4} />
      <FloatingIcon icon={FileArchive} className="bottom-40 left-20" delay={0.6} />
      <FloatingIcon icon={Download} className="bottom-20 right-10" delay={0.8} />

      {/* Content */}
      <div className="relative z-10 min-h-screen">
        {/* Hero Section */}
        <section className="px-6 pt-20 pb-32 relative">
          {/* Hero background decoration */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={{ 
                rotate: [0, 360],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                rotate: { duration: 30, repeat: Infinity, ease: "linear" },
                scale: { duration: 8, repeat: Infinity, ease: "easeInOut" }
              }}
              className="w-[800px] h-[800px] border border-white/5 rounded-full"
            />
          </div>
          
          <div className="max-w-7xl mx-auto text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="mb-8"
            >
              <motion.div
                animate={{ 
                  rotate: [0, 360],
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                  scale: { duration: 4, repeat: Infinity, ease: "easeInOut" }
                }}
                className="inline-block mb-8"
              >
                <div className="relative">
                  <Sparkles className="w-20 h-20 text-yellow-400 drop-shadow-glow" />
                  <div className="absolute inset-0 w-20 h-20 bg-yellow-400/20 rounded-full blur-xl"></div>
                </div>
              </motion.div>
              
              <h1 className="text-6xl md:text-8xl font-extrabold mb-6 leading-tight">
                <motion.span 
                  className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
                  animate={{
                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                  }}
                  transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  Ultra
                </motion.span>
                <br />
                <span className="text-white drop-shadow-2xl">Compress</span>
              </h1>
              
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="text-xl md:text-2xl text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed"
              >
                Transform your files with the power of{' '}
                <span className="text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text font-semibold">
                  intelligent compression
                </span>
                . Fast, secure, and incredibly efficient.
              </motion.p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16"
            >
              <motion.button
                onClick={() => setShowCompressor(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-12 py-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xl font-bold rounded-2xl shadow-2xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 flex items-center gap-3 group"
              >
                Start Compressing
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </motion.button>
              
              <motion.a
                href="https://github.com/bchewy/compress"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.05 }}
                className="px-8 py-4 bg-white/10 backdrop-blur-lg text-white border border-white/20 rounded-2xl hover:bg-white/20 transition-all duration-300 flex items-center gap-3"
              >
                <Github className="w-6 h-6" />
                View on GitHub
              </motion.a>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto"
            >
              {[
                { label: "File Types Supported", value: "15+" },
                { label: "Average Compression", value: "70%" },
                { label: "Processing Speed", value: "5MB/s" }
              ].map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-4xl font-bold text-white mb-2">{stat.value}</div>
                  <div className="text-gray-300">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="px-6 py-20">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-20"
            >
              <h2 className="text-5xl font-bold text-white mb-6">
                Why Choose UltraCompress?
              </h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Experience the next generation of file compression with our cutting-edge technology
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard
                icon={Zap}
                title="Lightning Fast"
                description="Process multiple files simultaneously with our optimized compression algorithms. Get results in seconds, not minutes."
                delay={0.1}
              />
              <FeatureCard
                icon={Shield}
                title="100% Secure"
                description="All processing happens locally in your browser. Your files never leave your device, ensuring complete privacy and security."
                delay={0.2}
              />
              <FeatureCard
                icon={FileCheck}
                title="Universal Support"
                description="Support for 15+ file formats including PDF, images, documents, and more. One tool for all your compression needs."
                delay={0.3}
              />
              <FeatureCard
                icon={Settings}
                title="Smart Optimization"
                description="AI-powered compression that maintains quality while maximizing size reduction. Customize settings for perfect results."
                delay={0.4}
              />
              <FeatureCard
                icon={Upload}
                title="Drag & Drop"
                description="Intuitive interface with drag-and-drop support. Batch process multiple files with just a few clicks."
                delay={0.5}
              />
              <FeatureCard
                icon={Download}
                title="Instant Download"
                description="Download compressed files individually or as a combined package. Multiple format options available."
                delay={0.6}
              />
            </div>
          </div>
        </section>

        {/* Supported Formats */}
        <section className="px-6 py-20">
          <div className="max-w-6xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="mb-16"
            >
              <h2 className="text-4xl font-bold text-white mb-6">
                Supported File Formats
              </h2>
              <p className="text-xl text-gray-300 mb-12">
                Compress any file type with confidence
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.3 }}
              className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6"
            >
              {[
                { name: "PDF", color: "from-red-500 to-red-600" },
                { name: "JPEG", color: "from-green-500 to-green-600" },
                { name: "PNG", color: "from-blue-500 to-blue-600" },
                { name: "WebP", color: "from-purple-500 to-purple-600" },
                { name: "TXT", color: "from-yellow-500 to-yellow-600" },
                { name: "JSON", color: "from-indigo-500 to-indigo-600" },
                { name: "XML", color: "from-pink-500 to-pink-600" },
                { name: "CSV", color: "from-teal-500 to-teal-600" },
                { name: "MD", color: "from-orange-500 to-orange-600" },
                { name: "GIF", color: "from-cyan-500 to-cyan-600" },
                { name: "DOCX", color: "from-blue-600 to-blue-700" },
                { name: "ZIP", color: "from-gray-500 to-gray-600" }
              ].map((format, index) => (
                <motion.div
                  key={format.name}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.1 * index }}
                  className={`p-4 bg-gradient-to-br ${format.color} rounded-xl text-white font-bold text-center shadow-lg hover:scale-105 transition-transform duration-300`}
                >
                  {format.name}
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-6 py-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto"
          >
            <h2 className="text-5xl font-bold text-white mb-6">
              Ready to Compress?
            </h2>
            <p className="text-xl text-gray-300 mb-12">
              Join thousands of users who trust UltraCompress for their file compression needs
            </p>
            
            <motion.button
              onClick={() => setShowCompressor(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-16 py-6 bg-gradient-to-r from-green-500 to-blue-600 text-white text-2xl font-bold rounded-2xl shadow-2xl hover:from-green-600 hover:to-blue-700 transition-all duration-300 flex items-center gap-4 mx-auto group"
            >
              <CheckCircle className="w-8 h-8" />
              Get Started Now
              <ArrowRight className="w-8 h-8 group-hover:translate-x-2 transition-transform" />
            </motion.button>
          </motion.div>
        </section>
      </div>
    </div>
  );
}