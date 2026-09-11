import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useSpring, useInView } from 'framer-motion';
import { 
  ArrowRight, Bot, Target, Zap, BarChart, Users, MessageSquare, PhoneCall, 
  Hourglass, CheckCircle2, Shield, Lock, Search, Globe, ChevronDown, Play,
  Monitor, Plus, Mail, Database
} from 'lucide-react';

// ─── Animation Utilities ──────────────────────────────────────────────────────

/** Thin scroll-progress bar pinned to the top of the viewport */
const ScrollProgress = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[3px] bg-primary origin-left z-[9999]"
      style={{ scaleX }}
    />
  );
};

/** Parent container that staggers child animations */
const StaggerContainer = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <motion.div
    className={className}
    initial="hidden"
    whileInView="show"
    viewport={{ once: true, margin: '-60px' }}
    variants={{
      hidden: {},
      show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
    }}
  >
    {children}
  </motion.div>
);

/** Child item used inside StaggerContainer */
const StaggerItem = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <motion.div
    className={className}
    variants={{
      hidden: { opacity: 0, y: 32 },
      show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
    }}
  >
    {children}
  </motion.div>
);

/** Animated number counter that counts up when it enters view */
const CountUp = ({ to, suffix = '' }: { to: number; suffix?: string }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const duration = 1800;
    const step = 16;
    const increment = to / (duration / step);
    const timer = setInterval(() => {
      start += increment;
      if (start >= to) { setCount(to); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, step);
    return () => clearInterval(timer);
  }, [isInView, to]);

  return <span ref={ref}>{isInView ? count : 0}{suffix}</span>;
};

// ─── Reusable Components ───────────────────────────────────────────────────────
const SectionHeading = ({ title, subtitle, badge }: { title: string, subtitle?: string, badge?: string }) => (
  <div className="text-center mb-16 max-w-3xl mx-auto px-4">
    {badge && (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#F2DED6] text-primary text-xs font-bold mb-6 shadow-sm uppercase tracking-wider">
        {badge}
      </span>
    )}
    <h2 className="text-4xl md:text-5xl font-extrabold text-[#3D322C] tracking-tight mb-4">{title}</h2>
    {subtitle && <p className="text-lg text-gray-600 leading-relaxed">{subtitle}</p>}
  </div>
);



// Lead Discovery Animated Image Component
const LeadDiscoveryImage = () => {
  const [isZoomed, setIsZoomed] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsZoomed(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Ken Burns keyframes — scale + pan on the INNER wrapper so outer overflow-hidden clips cleanly
  const kenBurns = {
    animate: {
      scale: [1, 1.18, 1.12, 1.2, 1.1, 1],
      translateX: [0, -18, 12, -22, 8, 0],
      translateY: [0, -10, 15, -8, 12, 0],
    },
    transition: {
      duration: 20,
      repeat: Infinity,
      ease: 'easeInOut' as const,
      times: [0, 0.25, 0.5, 0.65, 0.85, 1],
    },
  };

  return (
    <>
      {/* Thumbnail card */}
      <div
        className="relative rounded-2xl shadow-2xl border border-white/10 cursor-zoom-in group/img select-none"
        style={{ aspectRatio: '16/10', overflow: 'hidden' }}
        onClick={() => setIsZoomed(true)}
      >
        {/* Inner motion wrapper — this is what scales/pans; outer clips it */}
        <motion.div
          className="absolute inset-0 w-full h-full"
          style={{ willChange: 'transform' }}
          animate={kenBurns.animate}
          transition={kenBurns.transition}
        >
          <img
            src="/lead_discovery_flow - Copy.webp"
            alt="Lead Discovery Flow"
            className="w-full h-full object-cover object-left-top"
            draggable={false}
          />
        </motion.div>

        {/* Dark gradient overlay at bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1A1614]/70 via-transparent to-transparent pointer-events-none z-10" />

        {/* Hover tint */}
        <div className="absolute inset-0 bg-white/0 group-hover/img:bg-white/5 transition-all duration-500 z-10 pointer-events-none" />

        {/* Zoom hint */}
        <motion.div
          className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm text-white text-[10px] font-semibold px-2.5 py-1.5 rounded-full border border-white/20 pointer-events-none"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><path d="M11 8v6M8 11h6"/>
          </svg>
          Click to zoom
        </motion.div>
      </div>

      {/* Fullscreen Lightbox */}
      <AnimatePresence>
        {isZoomed && (
          <motion.div
            key="lightbox"
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setIsZoomed(false)}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/85"
              initial={{ backdropFilter: 'blur(0px)' }}
              animate={{ backdropFilter: 'blur(16px)' }}
              exit={{ backdropFilter: 'blur(0px)' }}
              transition={{ duration: 0.3 }}
            />

            {/* Image panel */}
            <motion.div
              className="relative z-10 w-full max-w-6xl rounded-2xl overflow-hidden shadow-[0_0_120px_rgba(0,0,0,0.9)] border border-white/10 cursor-zoom-out"
              initial={{ scale: 0.6, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.7, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src="/lead_discovery_flow - Copy.webp"
                alt="Lead Discovery Flow — Full View"
                className="w-full h-auto block"
                draggable={false}
              />

              {/* Close ✕ */}
              <button
                onClick={() => setIsZoomed(false)}
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/70 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-black transition-colors z-20"
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>

              {/* Press ESC hint */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white/40 text-[10px] font-mono pointer-events-none">
                Press ESC to close
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};


export default function LandingPage() {
  const placeholders = [
    "Find me VP of Engineering at SaaS companies in California...",
    "SaaS founders in New York...",
    "CTOs who recently raised Series A...",
    "Marketing directors using Salesforce..."
  ];

  const [scrolled, setScrolled] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annually'>('monthly');

  const [placeholderText, setPlaceholderText] = useState("");
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggleAudio = (e: React.MouseEvent) => {
    e.preventDefault();
    if (audioRef.current) {
      if (isPlayingAudio) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlayingAudio(!isPlayingAudio);
    }
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const currentPhrase = placeholders[phraseIndex];
    let timer: ReturnType<typeof setTimeout>;

    if (isDeleting) {
      if (placeholderText.length > 0) {
        timer = setTimeout(() => {
          setPlaceholderText(currentPhrase.substring(0, placeholderText.length - 1));
        }, 30);
      } else {
        setIsDeleting(false);
        setPhraseIndex((prev) => (prev + 1) % placeholders.length);
      }
    } else {
      if (placeholderText.length < currentPhrase.length) {
        timer = setTimeout(() => {
          setPlaceholderText(currentPhrase.substring(0, placeholderText.length + 1));
        }, 50);
      } else {
        timer = setTimeout(() => {
          setIsDeleting(true);
        }, 2000);
      }
    }

    return () => clearTimeout(timer);
  }, [placeholderText, isDeleting, phraseIndex]);

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#3D322C] font-sans selection:bg-primary/20">
      <ScrollProgress />

      {/* 1. Navbar */}
      <div className="fixed top-0 left-0 w-full z-50 flex justify-center pt-4 md:pt-6 px-4 pointer-events-none">
        <nav className={`pointer-events-auto transition-all duration-500 rounded-full border flex items-center justify-between px-4 md:px-6 py-3 w-full max-w-5xl ${
          scrolled 
            ? 'bg-white/80 backdrop-blur-xl border-[#F2DED6] shadow-[0_8px_30px_rgb(0,0,0,0.06)]' 
            : 'bg-white/40 backdrop-blur-md border-white/50 shadow-sm'
        }`}>
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-orange-400 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Hourglass className="w-4 h-4" />
            </div>
            <span className="text-lg font-bold tracking-tight">Genquantaa</span>
          </Link>

          <div className="hidden lg:flex items-center gap-8 text-sm font-semibold text-gray-700">
            <button className="flex items-center gap-1 hover:text-primary transition-colors">Products <ChevronDown className="w-3.5 h-3.5 opacity-50" /></button>
            <button className="flex items-center gap-1 hover:text-primary transition-colors">Solutions <ChevronDown className="w-3.5 h-3.5 opacity-50" /></button>
            <a href="#pricing" className="hover:text-primary transition-colors">Pricing</a>
            <button className="flex items-center gap-1 hover:text-primary transition-colors">Resources <ChevronDown className="w-3.5 h-3.5 opacity-50" /></button>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden md:block text-sm font-bold text-gray-700 hover:text-primary transition-colors">
              Log in
            </Link>
            <Link to="/register" className="text-sm font-bold bg-[#1A1614] text-white px-5 py-2.5 rounded-full hover:bg-black transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5">
              Try for free
            </Link>
          </div>
        </nav>
      </div>

      {/* 2. Hero Section */}
      <section className="pt-28 md:pt-36 pb-14 md:pb-20 px-4 sm:px-6 relative overflow-hidden">
        {/* Soft radial background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[radial-gradient(circle_at_50%_50%,rgba(221,138,115,0.15),transparent_70%)] rounded-full pointer-events-none z-0" />

        {/* Floating Integration Icons — DESKTOP ONLY */}
        <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none z-0">
          <motion.div animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="absolute top-[15%] left-[8%] w-24 h-24 drop-shadow-lg">
            <img src="/images-removebg-preview.png" alt="Integration 1" className="w-full h-full object-contain" />
          </motion.div>
          <motion.div animate={{ y: [0, 30, 0], rotate: [0, -12, 0] }} transition={{ duration: 8.5, repeat: Infinity, ease: "easeInOut", delay: 1.2 }} className="absolute top-[40%] left-[18%] w-24 h-24 opacity-90 drop-shadow-xl">
            <img src="/images-removebg-preview (1).png" alt="Integration 2" className="w-full h-full object-contain" />
          </motion.div>
          <motion.div animate={{ y: [0, 20, 0], rotate: [0, -8, 0] }} transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut", delay: 2.5 }} className="absolute top-[75%] left-[10%] w-20 h-20 opacity-80 blur-[1px]">
            <img src="/images-removebg-preview (2).png" alt="Integration 3" className="w-full h-full object-contain" />
          </motion.div>
          <motion.div animate={{ y: [0, -40, 0], rotate: [0, 15, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }} className="absolute top-[20%] right-[12%] w-28 h-28 drop-shadow-2xl">
            <img src="/images-removebg-preview (3).png" alt="Integration 4" className="w-full h-full object-contain" />
          </motion.div>
          <motion.div animate={{ y: [0, -15, 0], rotate: [0, 8, 0] }} transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }} className="absolute top-[50%] right-[18%] w-20 h-20 opacity-90 drop-shadow-xl">
            <img src="/images-removebg-preview (4).png" alt="Integration 5" className="w-full h-full object-contain" />
          </motion.div>
          <motion.div animate={{ y: [0, 25, 0], rotate: [0, -5, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }} className="absolute top-[80%] right-[8%] w-20 h-20 opacity-70 blur-[2px]">
            <img src="/images-removebg-preview (5).png" alt="Integration 6" className="w-full h-full object-contain" />
          </motion.div>
        </div>

        <div className="container mx-auto max-w-[1400px] text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#F2DED6] text-primary text-xs sm:text-sm font-semibold mb-6 sm:mb-8 shadow-sm">
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Introducing Genquantaa GTM OS
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight text-[#5A4A42] mb-4 sm:mb-6 leading-[1.1]">
              Find your next customer. <br className="hidden md:block" />
              <span className="text-primary">Just ask.</span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-8 sm:mb-12 leading-relaxed">
              Describe your ideal prospect in natural language, and our AI will search 250M+ verified B2B contacts to find them instantly.
            </p>

            {/* Giant ChatGPT Style Input - Fully Responsive & Mobile-Optimized */}
            <div className="max-w-3xl mx-auto relative group w-full">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary to-orange-400 rounded-2xl sm:rounded-[32px] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative bg-white border-2 border-[#F2DED6] hover:border-primary/50 transition-colors rounded-2xl sm:rounded-[28px] p-1.5 sm:p-2 flex items-center shadow-xl w-full">
                <div className="pl-2.5 sm:pl-4 pr-1 sm:pr-2 shrink-0">
                  <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-primary/60" />
                </div>
                <input
                  type="text"
                  placeholder={placeholderText}
                  className="flex-1 min-w-0 bg-transparent border-none py-3 sm:py-5 px-2 text-sm sm:text-base md:text-lg text-gray-900 placeholder-gray-400 focus:ring-0 outline-none truncate"
                />
                <Link to="/register" className="animate-shine shrink-0 bg-primary hover:bg-primary/90 text-white rounded-xl sm:rounded-[20px] px-4 sm:px-6 py-2.5 sm:py-4 font-semibold text-xs sm:text-sm md:text-base flex items-center gap-1.5 sm:gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm">
                  Search <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </Link>
              </div>

              <div className="mt-4 sm:mt-6 flex flex-wrap justify-center items-center gap-2 sm:gap-3">
                <span className="text-xs sm:text-sm text-gray-500 font-medium mr-1 sm:mr-2">Try asking:</span>
                <button className="text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2 bg-white border border-[#F2DED6] rounded-full text-gray-600 hover:bg-[#FDF8F5] hover:text-primary hover:border-primary/30 transition-colors shadow-sm">
                  "SaaS founders in New York"
                </button>
                <button className="text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2 bg-white border border-[#F2DED6] rounded-full text-gray-600 hover:bg-[#FDF8F5] hover:text-primary hover:border-primary/30 transition-colors shadow-sm">
                  "CTOs who recently raised Series A"
                </button>
                <button className="text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2 bg-white border border-[#F2DED6] rounded-full text-gray-600 hover:bg-[#FDF8F5] hover:text-primary hover:border-primary/30 transition-colors shadow-sm">
                  "Marketing directors using Salesforce"
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Hero Video Showcase - Increased Screen Size on Mobile */}
      <section className="pb-16 md:pb-24 px-3 sm:px-6 md:px-8 relative z-20">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative"
          >
            {/* Glow halo */}
            <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-orange-400/20 to-primary/20 rounded-3xl blur-2xl opacity-70 pointer-events-none" />

            {/* ── Floating logos on mobile — Orbiting around video edges without clipping ── */}

            {/* Top-left */}
            <motion.div
              animate={{ y: [0, -10, 0], rotate: [0, 6, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-3 -left-2 sm:-top-8 sm:-left-8 w-10 h-10 sm:w-14 sm:h-14 z-20 drop-shadow-xl md:hidden"
            >
              <div className="w-full h-full bg-white rounded-xl sm:rounded-2xl shadow-lg border border-[#F2DED6] flex items-center justify-center p-1.5 sm:p-2.5">
                <img src="/images-removebg-preview.png" alt="Integration" className="w-full h-full object-contain" />
              </div>
            </motion.div>

            {/* Top-right */}
            <motion.div
              animate={{ y: [0, -12, 0], rotate: [0, -8, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
              className="absolute -top-3 -right-2 sm:-top-6 sm:-right-8 w-10 h-10 sm:w-14 sm:h-14 z-20 drop-shadow-xl md:hidden"
            >
              <div className="w-full h-full bg-white rounded-xl sm:rounded-2xl shadow-lg border border-[#F2DED6] flex items-center justify-center p-1.5 sm:p-2.5">
                <img src="/images-removebg-preview (3).png" alt="Integration" className="w-full h-full object-contain" />
              </div>
            </motion.div>

            {/* Mid-left */}
            <motion.div
              animate={{ y: [0, 14, 0], rotate: [0, -5, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
              className="absolute top-1/3 -left-2 sm:-left-8 w-9 h-9 sm:w-12 sm:h-12 z-20 drop-shadow-lg md:hidden"
            >
              <div className="w-full h-full bg-white rounded-xl sm:rounded-2xl shadow-lg border border-[#F2DED6] flex items-center justify-center p-1.5 sm:p-2.5">
                <img src="/images-removebg-preview (1).png" alt="Integration" className="w-full h-full object-contain" />
              </div>
            </motion.div>

            {/* Mid-right */}
            <motion.div
              animate={{ y: [0, -10, 0], rotate: [0, 10, 0] }}
              transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: 2.2 }}
              className="absolute top-1/3 -right-2 sm:-right-8 w-9 h-9 sm:w-12 sm:h-12 z-20 drop-shadow-lg md:hidden"
            >
              <div className="w-full h-full bg-white rounded-xl sm:rounded-2xl shadow-lg border border-[#F2DED6] flex items-center justify-center p-1.5 sm:p-2.5">
                <img src="/images-removebg-preview (4).png" alt="Integration" className="w-full h-full object-contain" />
              </div>
            </motion.div>

            {/* Bottom-left */}
            <motion.div
              animate={{ y: [0, 12, 0], rotate: [0, 5, 0] }}
              transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -bottom-3 -left-2 sm:-bottom-8 sm:-left-6 w-9 h-9 sm:w-12 sm:h-12 z-20 drop-shadow-lg opacity-90 md:hidden"
            >
              <div className="w-full h-full bg-white rounded-xl sm:rounded-2xl shadow-lg border border-[#F2DED6] flex items-center justify-center p-1.5 sm:p-2.5">
                <img src="/images-removebg-preview (2).png" alt="Integration" className="w-full h-full object-contain" />
              </div>
            </motion.div>

            {/* Bottom-right */}
            <motion.div
              animate={{ y: [0, 14, 0], rotate: [0, -12, 0] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
              className="absolute -bottom-3 -right-2 sm:-bottom-8 sm:-right-6 w-9 h-9 sm:w-12 sm:h-12 z-20 drop-shadow-lg opacity-90 md:hidden"
            >
              <div className="w-full h-full bg-white rounded-xl sm:rounded-2xl shadow-lg border border-[#F2DED6] flex items-center justify-center p-1.5 sm:p-2.5">
                <img src="/images-removebg-preview (5).png" alt="Integration" className="w-full h-full object-contain" />
              </div>
            </motion.div>

            {/* ── The video frame — Maximized display area ── */}
            <div className="relative rounded-xl sm:rounded-2xl md:rounded-3xl border-[4px] sm:border-[8px] md:border-[10px] border-[#1A1614] bg-[#1A1614] shadow-[0_20px_50px_-10px_rgba(221,138,115,0.35)] overflow-hidden pt-6 sm:pt-8 w-full">
              {/* Browser chrome */}
              <div className="absolute top-0 left-0 w-full h-6 sm:h-8 bg-[#231E1B] flex items-center px-3 sm:px-4 gap-1.5 sm:gap-2 z-10 border-b border-white/10">
                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-red-400/90"></div>
                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-amber-400/90"></div>
                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-green-400/90"></div>
                <div className="flex-1 mx-3 sm:mx-6 h-3.5 sm:h-4 bg-[#2A2220] rounded flex items-center px-2 sm:px-3">
                  <span className="text-[8px] sm:text-[9px] text-gray-500 font-mono truncate">app.genquantaa.com</span>
                </div>
              </div>
              <div className="w-full bg-[#1A1614]">
                <img
                  src="/lead_discovery_flow.webp"
                  alt="Genquantaa Lead Discovery in Action"
                  className="w-full h-auto block brightness-[1.05] contrast-[1.08] saturate-[1.15]"
                  style={{ clipPath: "inset(0px 0px 14px 0px)", marginBottom: "-14px" }}
                />
              </div>
            </div>
          </motion.div>
        </div>
      </section>


      {/* 2.5 Top Cards Row */}
      <section className="w-full bg-[#FAF9F6] py-16 border-b border-[#F2DED6]">
        <div className="container mx-auto px-6 max-w-[1400px]">
          <audio 
            ref={audioRef} 
            src="/PATIENT RECRUITMENT.wav" 
            onEnded={() => setIsPlayingAudio(false)} 
            className="hidden" 
          />

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StaggerItem className="bg-white rounded-3xl p-6 border border-[#F2DED6] shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="w-10 h-10 border border-[#F2DED6] rounded-xl flex items-center justify-center mb-4 bg-[#FDF8F5]">
                   <PhoneCall className="w-5 h-5 text-primary" />
                </div>
                <h4 className="font-bold text-lg mb-2 text-[#3D322C] flex items-center gap-2">AI Calling Agents</h4>
                <p className="text-gray-500 text-sm mb-6 leading-relaxed">Deploy hyper-realistic voice AI agents that sound perfectly human. They can autonomously navigate gatekeepers, handle complex objections, qualify prospects, and book meetings directly onto your calendar 24/7.</p>
              </div>
              <div>
                <button onClick={toggleAudio} className="text-[#1A1614] font-bold text-sm flex items-center gap-2 hover:text-primary transition-colors">
                  {isPlayingAudio ? "Stop Audio" : "Explore Voice AI"} <ArrowRight className="w-4 h-4" />
                </button>
                {/* Waveform animation if playing */}
                {isPlayingAudio && (
                   <div className="mt-4 flex items-end gap-1 h-6">
                    {[40, 70, 45, 90, 65, 100, 80, 50, 85, 60, 30, 80, 50].map((height, i) => (
                      <motion.div 
                        key={i}
                        animate={{ height: [`${height}%`, `${height * 0.3}%`, `${height}%`] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1, ease: "easeInOut" }}
                        className="w-1.5 rounded-t-full bg-primary flex-1"
                        style={{ maxHeight: '100%' }}
                      />
                    ))}
                   </div>
                )}
              </div>
            </StaggerItem>

            <StaggerItem className="bg-white rounded-3xl p-6 border border-[#F2DED6] shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="w-10 h-10 border border-[#F2DED6] rounded-xl flex items-center justify-center mb-4 bg-[#FDF8F5]">
                   <Mail className="w-5 h-5 text-primary" />
                </div>
                <h4 className="font-bold text-lg mb-2 text-[#3D322C]">Omnichannel</h4>
                <p className="text-gray-500 text-sm mb-6 leading-relaxed">Orchestrate highly personalized, multi-touch campaigns across LinkedIn, Email, and WhatsApp from a single unified sequence. Reach prospects exactly where they are most active.</p>
              </div>
              <Link to="/features" className="text-[#1A1614] font-bold text-sm flex items-center gap-2 hover:text-primary transition-colors">
                Learn more <ArrowRight className="w-4 h-4" />
              </Link>
            </StaggerItem>

            <StaggerItem className="bg-white rounded-3xl p-6 border border-[#F2DED6] shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="w-10 h-10 border border-[#F2DED6] rounded-xl flex items-center justify-center mb-4 bg-[#FDF8F5]">
                   <Database className="w-5 h-5 text-primary" />
                </div>
                <h4 className="font-bold text-lg mb-2 text-[#3D322C]">B2B Database</h4>
                <p className="text-gray-500 text-sm mb-6 leading-relaxed">Instantly access our proprietary global database of over 250 million verified B2B contacts. Skip manual research and leverage deep intent signals to find exactly who is ready to buy.</p>
              </div>
              <Link to="/features" className="text-[#1A1614] font-bold text-sm flex items-center gap-2 hover:text-primary transition-colors">
                Learn more <ArrowRight className="w-4 h-4" />
              </Link>
            </StaggerItem>

            <StaggerItem className="bg-white rounded-3xl p-6 border border-[#F2DED6] shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="w-10 h-10 border border-[#F2DED6] rounded-xl flex items-center justify-center mb-4 bg-[#FDF8F5]">
                   <Users className="w-5 h-5 text-primary" />
                </div>
                <h4 className="font-bold text-lg mb-2 text-[#3D322C]">CRM Sync</h4>
                <p className="text-gray-500 text-sm mb-6 leading-relaxed">Seamlessly push perfectly enriched contact data, interaction history, and recorded call transcripts directly into Salesforce, HubSpot, or your CRM of choice with zero manual entry.</p>
              </div>
              <Link to="/features" className="text-[#1A1614] font-bold text-sm flex items-center gap-2 hover:text-primary transition-colors">
                Learn more <ArrowRight className="w-4 h-4" />
              </Link>
            </StaggerItem>
          </StaggerContainer>
        </div>
      </section>


      {/* 3. Features/Metrics Row */}
      <section className="py-12 border-y border-[#F2DED6] bg-white">
        <div className="container mx-auto px-6">
          <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4 divide-x-0 md:divide-x divide-[#F2DED6]">
            {[
              { label: 'Verified Contacts', to: 250, suffix: 'M+' },
              { label: 'Meeting Booked Rate', to: 3, suffix: 'x' },
              { label: 'Hours Saved Weekly', to: 40, suffix: '+' },
              { label: 'Uptime', to: 99, suffix: '.9%' }
            ].map((stat, i) => (
              <StaggerItem key={i} className="text-center px-4">
                <div className="text-3xl md:text-4xl font-black text-[#3D322C] mb-1">
                  <CountUp to={stat.to} suffix={stat.suffix} />
                </div>
                <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{stat.label}</div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* 4. "Everything You Need" Grid */}
      <section className="py-24 bg-[#FAF9F6]">
        <div className="container mx-auto px-6 max-w-[1400px]">
          <SectionHeading
            badge="Platform features"
            title="Everything You Need, All In One Place"
            subtitle="Genquantaa replaces multiple disjointed sales tools with one unified, intelligent operating system."
          />

          <div className="grid md:grid-cols-2 gap-6">
            {/* Top Full-Width Dark Card */}
            <div className="md:col-span-2 bg-[#1A1614] rounded-3xl p-8 md:p-12 text-white relative overflow-hidden group shadow-xl border border-white/10 flex flex-col md:flex-row gap-12 items-center">
              <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 blur-[120px] rounded-full pointer-events-none group-hover:bg-primary/20 transition-colors duration-1000"></div>
              
              <div className="relative z-10 md:w-1/2">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-semibold mb-8 text-gray-300">
                  <Search className="w-3 h-3 text-primary" /> Natural Language Prospecting
                </div>
                <h3 className="text-4xl md:text-5xl font-bold mb-6 leading-tight font-mono">Full Discovery Support</h3>
                <p className="text-gray-400 text-lg mb-8 leading-relaxed max-w-lg">
                  You can use Genquantaa AI for complex lead generation. It parses natural language search queries and scans 250M+ verified contacts, then syncs the ideal prospects directly to your CRM in real-time.
                </p>
                <Link to="/register" className="inline-flex items-center gap-2 bg-white text-[#1A1614] px-6 py-3.5 rounded-xl font-bold hover:bg-gray-100 transition-colors shadow-lg text-sm">
                  <Play className="w-4 h-4" /> Learn More
                </Link>
              </div>

              {/* Lead Discovery Flow Image - Interactive */}
              <div className="relative z-10 md:w-1/2 w-full">
                <LeadDiscoveryImage />
              </div>
            </div>

            {/* Bottom Left Card */}
            <div className="bg-white border border-[#F2DED6] rounded-3xl p-8 md:p-10 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
              <div className="mb-12 relative z-10 flex flex-col items-center justify-center h-48">
                {/* Simulated Data Waveform */}
                <div className="flex items-end justify-center gap-1.5 h-32 w-full px-4">
                  {[40, 70, 45, 90, 65, 100, 80, 50, 85, 60, 30, 75, 45, 90, 60, 100, 70].map((height, i) => (
                    <motion.div 
                      key={i}
                      animate={{ height: [`${height}%`, `${height * 0.5}%`, `${height}%`] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1, ease: "easeInOut" }}
                      className="w-2.5 rounded-t-full bg-gradient-to-t from-primary/30 to-primary flex-1"
                      style={{ maxHeight: '100%' }}
                    />
                  ))}
                </div>
                <div className="mt-8 flex items-center justify-between w-full text-sm font-medium text-gray-400">
                  <span>Enrichment pipeline latency</span>
                  <span className="flex items-center gap-2 text-[#1A1614] font-bold"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> 124 ms</span>
                </div>
              </div>

              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1A1614] text-white text-[11px] uppercase tracking-wider font-bold mb-6">
                  <Zap className="w-3 h-3" /> Real-time Processing
                </div>
                <h3 className="text-2xl md:text-3xl font-bold mb-3 text-[#3D322C] tracking-tight">Blazing Fast Enrichment</h3>
                <p className="text-gray-500 leading-relaxed text-sm">We use a state-of-the-art data pipeline that provides a highly accurate contact model in record-breaking speed.</p>
              </div>
            </div>

            {/* Bottom Right Card */}
            <div className="bg-white border border-[#F2DED6] rounded-3xl p-8 md:p-10 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
              <div className="mb-12 relative z-10 flex flex-col items-center justify-center h-48">
                {/* Routing / Tree Graphic */}
                <div className="relative w-full h-full">
                   {/* Abstract Lines */}
                   <svg viewBox="0 0 100 100" className="absolute top-[15%] left-0 w-full h-[65%] z-0" preserveAspectRatio="none">
                     <path d="M 50 0 Q 20 50 20 100" fill="none" stroke="#E5D1C9" strokeWidth="2" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" className="animate-flow-line" />
                     <path d="M 50 0 Q 50 50 50 100" fill="none" stroke="#E5D1C9" strokeWidth="2" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" className="animate-flow-line" style={{ animationDelay: '0.3s' }} />
                     <path d="M 50 0 Q 80 50 80 100" fill="none" stroke="#E5D1C9" strokeWidth="2" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" className="animate-flow-line" style={{ animationDelay: '0.6s' }} />
                   </svg>
                   
                   {/* Starting Node */}
                   <div className="absolute top-[15%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full z-10 ring-[6px] ring-primary/20"></div>

                   {/* Icons */}
                   <div className="absolute bottom-0 left-[20%] -translate-x-1/2 w-16 h-16 bg-white rounded-2xl shadow-xl border border-[#F2DED6] flex items-center justify-center p-3.5 hover:-translate-y-1 transition-transform z-10">
                     <img src="/images-removebg-preview (1).png" className="w-full h-full object-contain" alt="CRM 1" />
                   </div>
                   <div className="absolute bottom-0 left-[50%] -translate-x-1/2 w-16 h-16 bg-white rounded-2xl shadow-xl border border-[#F2DED6] flex items-center justify-center p-3.5 hover:-translate-y-1 transition-transform z-10">
                     <img src="/images-removebg-preview (3).png" className="w-full h-full object-contain" alt="CRM 2" />
                   </div>
                   <div className="absolute bottom-0 left-[80%] -translate-x-1/2 w-16 h-16 bg-white rounded-2xl shadow-xl border border-[#F2DED6] flex items-center justify-center p-3.5 hover:-translate-y-1 transition-transform z-10">
                     <img src="/images-removebg-preview (4).png" className="w-full h-full object-contain" alt="CRM 3" />
                   </div>
                </div>
              </div>

              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1A1614] text-white text-[11px] uppercase tracking-wider font-bold mb-6">
                  <Target className="w-3 h-3" /> Omni-channel Sync
                </div>
                <h3 className="text-2xl md:text-3xl font-bold mb-3 text-[#3D322C] tracking-tight">100% Accurate Routing</h3>
                <p className="text-gray-500 leading-relaxed text-sm">We orchestrate the data flow seamlessly. Push verified contact data directly into your CRM and sales engagement tools, automatically.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Dark Section - 100% Secure Advantage */}
      <section className="py-24 bg-[#1A1614] text-white overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,rgba(221,138,115,0.15),transparent_50%)]"></div>
        <div className="container mx-auto px-6 max-w-[1400px] relative z-10">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
              Your 100% <span className="text-primary">Secure</span> Advantage
            </h2>
            <p className="text-gray-400 text-lg">
              Built for enterprise scale and compliant with global standards. Completely protected, completely yours.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            {[
              { id: "01", icon: Shield, title: "SOC2 Type II Certified", desc: "Built to the highest standards of security, privacy, and compliance." },
              { id: "02", icon: Database, title: "Dedicated Instances", desc: "Isolated infrastructure for enterprise-level deployments." },
              { id: "03", icon: Lock, title: "End-to-End Encryption", desc: "Your data and outreach campaigns are protected by bank-level security." },
              { id: "04", icon: Globe, title: "Domain Protection", desc: "Intelligently switch domains and IPs to prevent spam detection." },
              { id: "05", icon: Users, title: "Role-Based Access", desc: "Granular permissions for enterprise-wide team collaboration." }
            ].map((feature, idx) => (
              <div key={idx} className="bg-[#231E1B] rounded-2xl border border-[#F2DED6]/10 p-6 flex flex-col group hover:border-primary/30 transition-colors shadow-lg">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-[#8C7C77] text-3xl font-light tracking-tight">{feature.id}</span>
                  <div className="w-6 h-6 rounded-md bg-[#1A1614] border border-[#F2DED6]/10 flex items-center justify-center text-[#8C7C77] group-hover:text-primary transition-colors">
                    <Plus className="w-3 h-3" />
                  </div>
                </div>

                <div className="w-full aspect-[4/3] rounded-xl bg-[#1A1614] border border-[#F2DED6]/10 flex items-center justify-center mb-8 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(221,138,115,0.1),transparent_70%)] group-hover:bg-[radial-gradient(circle_at_center,rgba(221,138,115,0.25),transparent_70%)] transition-all duration-500"></div>
                  <feature.icon className="w-10 h-10 text-[#F2DED6] group-hover:text-white relative z-10 stroke-[1.5] transition-colors" />
                </div>

                <div className="mt-auto">
                  <h4 className="font-bold text-white mb-2 text-lg tracking-tight">{feature.title}</h4>
                  <p className="text-[#8C7C77] text-sm leading-relaxed min-h-[60px]">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Workflow / 5 Stages */}
      <section className="py-24 bg-white border-b border-[#F2DED6]">
        <div className="container mx-auto px-6 max-w-[1400px]">
          <div className="text-center mb-16 max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-4 text-[#3D322C]">
              Before, During, <span className="text-primary font-bold">And After The Campaign.</span>
            </h2>
            <p className="text-gray-500 text-lg">
              Genquantaa runs autonomously, knows your ideal customer, and handles the outreach from sourcing to booked meetings.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-16">
            {[
              { id: "01", title: "Lead Discovery", desc: "Instantly search and find your perfect ICP from 250M+ verified contacts.", icon: Search },
              { id: "02", title: "Enrichment", desc: "Waterfalls through 15+ data providers to find accurate mobile numbers and emails.", icon: Database },
              { id: "03", title: "AI Calling", desc: "Human-like voice AI navigates IVRs, bypasses gatekeepers, and pitches your product.", icon: PhoneCall },
              { id: "04", title: "Omnichannel", desc: "Automatically follows up across LinkedIn and Email if the prospect doesn't answer.", icon: MessageSquare },
              { id: "05", title: "CRM Sync", desc: "Call notes, exact transcripts, and intent signals are instantly pushed to your CRM.", icon: BarChart }
            ].map((stage, idx) => (
              <div key={idx} className="flex flex-col group">
                <div className="w-full aspect-square md:aspect-[4/5] rounded-3xl border border-[#F2DED6] bg-[#FAF9F6] flex flex-col items-center justify-center mb-6 relative overflow-hidden transition-all duration-300 group-hover:shadow-lg group-hover:border-primary/30">
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/50"></div>
                  {/* Abstract Mockup Representation */}
                  <div className="w-20 h-20 rounded-2xl bg-white shadow-sm border border-[#F2DED6] flex items-center justify-center relative z-10 group-hover:-translate-y-2 transition-transform duration-500">
                    <stage.icon className="w-8 h-8 text-primary" />
                  </div>
                </div>
                
                <div className="text-xs font-bold text-gray-400 mb-2 tracking-widest">{stage.id}</div>
                <h4 className="font-bold text-[#3D322C] text-lg mb-2">{stage.title}</h4>
                <p className="text-gray-500 text-sm leading-relaxed">{stage.desc}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center justify-center">
            <Link to="/register" className="bg-primary hover:bg-[#C97963] text-white font-bold py-3.5 px-8 rounded-full shadow-md hover:shadow-xl transition-all flex items-center gap-2 hover:-translate-y-0.5">
              Try for Free <ArrowRight className="w-4 h-4" />
            </Link>
            <span className="text-xs text-gray-400 mt-3 font-medium">No credit card required</span>
          </div>
        </div>
      </section>

      {/* 7. Platform Anywhere */}
      <section className="py-24 bg-white border-b border-[#F2DED6]">
        <div className="container mx-auto px-6 max-w-[1200px]">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-4 text-[#3D322C]">
              Your Outbound Engine, <span className="text-primary font-bold">Everywhere</span>
            </h2>
            <p className="text-gray-500 text-lg">
              Access your campaigns from any device. Your AI agents work 24/7, wherever you are.
            </p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Full Card */}
            <div className="md:col-span-2 bg-[#FAF9F6] border border-[#F2DED6] rounded-3xl overflow-hidden flex flex-col md:flex-row relative group hover:border-primary/30 transition-colors shadow-sm hover:shadow-lg">
              <div className="p-10 md:w-1/2 flex flex-col justify-center relative z-10">
                <h3 className="text-3xl font-bold text-[#3D322C] mb-4 tracking-tight">Unified Command Center</h3>
                <p className="text-gray-500 mb-8 leading-relaxed">
                  Manage your AI agents, track live calls, and build pipelines all from our powerful web application. No switching windows.
                </p>
                <button className="bg-primary hover:bg-[#C97963] text-white font-bold py-3 px-6 rounded-xl shadow-md transition-colors w-max flex items-center gap-2">
                  <Monitor className="w-5 h-5" /> Access Web Platform
                </button>
              </div>
              <div className="md:w-1/2 relative bg-gradient-to-br from-primary/10 to-orange-400/10 flex items-center justify-center p-6 min-h-[300px]">
                 <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(221,138,115,0.2),transparent_70%)]"></div>
                 {/* Real Platform Demo */}
                 <div className="w-full max-w-md rounded-2xl shadow-2xl border border-white/60 relative z-10 overflow-hidden group-hover:-translate-y-2 transition-transform duration-500 bg-[#1A1614]">
                    {/* Browser chrome */}
                    <div className="h-8 bg-[#2A2220] flex items-center px-4 gap-2 shrink-0">
                       <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                       <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80"></div>
                       <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
                       <div className="flex-1 mx-4 h-4 bg-[#3A3230] rounded-md flex items-center px-2">
                         <span className="text-[9px] text-gray-500 font-mono truncate">app.genquantaa.com</span>
                       </div>
                    </div>
                    {/* Demo media */}
                    <img
                      src="/platform_demo.webp"
                      alt="Genquantaa Platform Demo"
                      className="w-full object-cover object-top"
                      style={{ maxHeight: '240px' }}
                    />
                 </div>
               </div>
            </div>

            {/* Bottom Left Card */}
            <div className="bg-[#FAF9F6] border border-[#F2DED6] rounded-3xl overflow-hidden flex flex-col group hover:border-primary/30 transition-colors shadow-sm hover:shadow-lg">
              <div className="p-10 flex-grow">
                <h3 className="text-2xl font-bold text-[#3D322C] mb-3 tracking-tight">Works directly in your CRM</h3>
                <p className="text-gray-500 leading-relaxed">
                  Access Genquantaa directly from Salesforce or HubSpot. Push exact data and call transcripts instantly.
                </p>
              </div>
              <div className="bg-gradient-to-t from-gray-100 to-transparent pt-8 px-10 pb-0 flex justify-center mt-auto">
                 <div className="w-full h-44 bg-white rounded-t-2xl shadow-xl border border-gray-200 border-b-0 p-5 group-hover:-translate-y-2 transition-transform duration-500">
                    <div className="flex justify-between items-center mb-5 pb-5 border-b border-gray-100">
                      <div className="flex gap-3 items-center"><div className="w-8 h-8 bg-[#00A1E0] rounded text-white text-[11px] flex items-center justify-center font-bold shadow-sm">sf</div><span className="font-bold text-gray-700">Lead: John Doe</span></div>
                      <div className="px-3 py-1 bg-green-100 rounded-full text-green-700 text-xs flex items-center justify-center font-bold border border-green-200">Enriched</div>
                    </div>
                    <div className="space-y-3">
                      <div className="h-3 bg-gray-100 rounded w-full"></div>
                      <div className="h-3 bg-gray-100 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-50 rounded w-1/2 mt-4"></div>
                    </div>
                 </div>
              </div>
            </div>

            {/* Bottom Right Card */}
            <div className="bg-[#FAF9F6] border border-[#F2DED6] rounded-3xl overflow-hidden flex flex-col group hover:border-primary/30 transition-colors shadow-sm hover:shadow-lg">
              <div className="p-10 flex-grow">
                <h3 className="text-2xl font-bold text-[#3D322C] mb-3 tracking-tight">Works on Your Phone</h3>
                <p className="text-gray-500 leading-relaxed">
                  Same powerful platform, accessible on mobile. Monitor live calls and approve campaigns from anywhere.
                </p>
              </div>
              <div className="bg-gradient-to-t from-primary/10 to-transparent pt-8 flex justify-center mt-auto">
                 <div className="w-52 h-52 bg-[#1A1614] rounded-t-[2.5rem] border-[6px] border-[#1A1614] shadow-2xl relative group-hover:-translate-y-2 transition-transform duration-500">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-[#1A1614] rounded-b-[1rem] z-20"></div>
                    <div className="w-full h-full bg-white rounded-t-[2rem] overflow-hidden p-5 relative z-10 flex flex-col">
                      <div className="flex justify-between items-center mb-6 pt-5">
                        <div className="font-bold text-sm text-gray-800">Live Campaign</div>
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div><span className="text-[10px] text-gray-400 font-bold uppercase">Active</span></div>
                      </div>
                      <div className="space-y-3">
                        <div className="w-full bg-[#FAF9F6] p-3 rounded-xl border border-[#F2DED6] flex gap-3 items-center">
                           <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0"><PhoneCall className="w-4 h-4 text-primary" /></div>
                           <div className="flex-1 h-2.5 bg-gray-200 rounded-full"></div>
                        </div>
                        <div className="w-full bg-[#FAF9F6] p-3 rounded-xl border border-[#F2DED6] flex gap-3 items-center">
                           <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0"><CheckCircle2 className="w-4 h-4 text-green-500" /></div>
                           <div className="flex-1 h-2.5 bg-gray-200 rounded-full"></div>
                        </div>
                      </div>
                    </div>
                 </div>
              </div>
               </div>
            </div>
          </div>
      </section>

      {/* 9. Pricing */}
      <section id="pricing" className="py-24 bg-white border-y border-[#F2DED6]">
        <div className="container mx-auto px-6 max-w-[1400px]">
          <SectionHeading
            badge="Pricing"
            title="Transparent Pricing Options"
            subtitle="Pay only for what you use. No seat limits. No hidden fees."
          />

          {/* Toggle */}
          <div className="flex justify-center mb-12">
            <div className="bg-[#FAF9F6] border border-[#F2DED6] p-1.5 rounded-full inline-flex">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-8 py-3 rounded-full text-sm font-bold transition-all ${billingCycle === 'monthly' ? 'bg-white shadow-sm text-[#3D322C]' : 'text-gray-500 hover:text-gray-900'}`}
              >
                Pay as you go
              </button>
              <button
                onClick={() => setBillingCycle('annually')}
                className={`px-8 py-3 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${billingCycle === 'annually' ? 'bg-white shadow-sm text-[#3D322C]' : 'text-gray-500 hover:text-gray-900'}`}
              >
                Volume Packages <span className="bg-green-100 text-green-700 text-[10px] uppercase px-2 py-0.5 rounded-full">Save 20%</span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Starter */}
            <div className="border border-[#F2DED6] bg-white rounded-3xl p-10 hover:shadow-xl transition-shadow">
              <h3 className="text-2xl font-bold mb-2">1 Million Tokens</h3>
              <p className="text-gray-500 mb-6 h-12">Perfect for solo founders testing campaigns.</p>
              <div className="mb-8">
                <span className="text-5xl font-black">₹1,000</span>
              </div>
              <Link to="/register" className="block w-full text-center border-2 border-[#3D322C] text-[#3D322C] font-bold py-4 rounded-full hover:bg-[#3D322C] hover:text-white transition-colors mb-8">
                Get Started
              </Link>
              <div className="space-y-4">
                <div className="text-sm font-bold text-gray-900 mb-4">Includes:</div>
                {['~ 10,000 Emails / SMS', '~ 1,600 LinkedIn Posts', '~ 100 Voice Call Minutes', 'Access to 250M+ Database'].map((item, i) => (
                  <div key={i} className="flex gap-3 text-gray-600 items-center">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Pro */}
            <div className="border-2 border-primary bg-[#FDF8F5] rounded-3xl p-10 shadow-xl relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white px-4 py-1.5 rounded-full text-sm font-bold">
                Most Popular
              </div>
              <h3 className="text-2xl font-bold mb-2">5 Million Tokens</h3>
              <p className="text-gray-500 mb-6 h-12">For scaling revenue teams & high-volume calling.</p>
              <div className="mb-8">
                <span className="text-5xl font-black">₹4,000</span>
                {billingCycle === 'annually' && <span className="text-gray-400 line-through ml-2">₹5,000</span>}
              </div>
              <Link to="/register" className="block w-full text-center bg-primary text-white font-bold py-4 rounded-full hover:bg-primary/90 transition-colors shadow-lg shadow-primary/30 mb-8">
                Get Started
              </Link>
              <div className="space-y-4">
                <div className="text-sm font-bold text-gray-900 mb-4">Everything in 1M, plus:</div>
                {['~ 50,000 Emails / SMS', '~ 8,000 LinkedIn Posts', '~ 500 Voice Call Minutes', 'Priority Support', 'Custom AI Agent Training'].map((item, i) => (
                  <div key={i} className="flex gap-3 text-[#3D322C] font-medium items-center">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 11. FAQs — Two-column layout */}
      <section className="py-24 bg-white border-t border-[#F2DED6]">
        <div className="container mx-auto px-6 max-w-[1200px]">
          <div className="flex flex-col md:flex-row gap-16">

            {/* Left: Title + Category Filter */}
            <div className="md:w-72 shrink-0">
              <h2 className="text-4xl font-extrabold text-[#3D322C] leading-tight mb-10">
                Frequently Asked<br />
                <span className="text-primary">Questions</span>
              </h2>

              {/* Category pills */}
              <div className="flex flex-col gap-1">
                {[
                  { label: 'Platform', count: 4 },
                  { label: 'Pricing', count: 3 },
                  { label: 'Security', count: 2 },
                ].map((cat, i) => (
                  <button
                    key={i}
                    onClick={() => setFaqOpen(i === 0 ? 0 : i * 4)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold text-left transition-colors ${
                      i === 0
                        ? 'border-l-2 border-primary text-[#3D322C] bg-[#FDF8F5]'
                        : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {cat.label}
                    <span className="text-xs font-bold text-gray-400 ml-auto">{cat.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Accordion list */}
            <div className="flex-1 divide-y divide-[#F2DED6]">
              {[
                { q: "How does the AI Discovery work?", a: "Simply type what you're looking for (e.g., 'SaaS founders in NY'). Our AI translates this into complex queries across our 250M+ verified B2B contact database, returning perfect matches instantly." },
                { q: "Do you use my data to train your models?", a: "No. Your data is your data. We maintain strict isolation between customer instances and never use your proprietary campaign data to train our foundational models." },
                { q: "How real do the AI Voice Agents sound?", a: "Extremely realistic. They feature ultra-low latency (<500ms), can handle interruptions naturally, and are trained on thousands of successful sales calls to handle objections perfectly." },
                { q: "How does the token system work?", a: "Tokens are consumed based on usage. Simple actions like a database search or email cost very few tokens. Complex actions like real-time voice synthesis during a call cost more (~10k tokens/min)." },
                { q: "Is my data secure?", a: "Absolutely. We use AES-256 encryption at rest and TLS 1.3 in transit. We are SOC 2 Type II compliant and undergo regular third-party penetration tests." },
                { q: "Can I integrate Genquantaa with my existing CRM?", a: "Yes. We have native integrations with Salesforce, HubSpot, Pipedrive, and more. Data is pushed automatically after every interaction — no manual entry needed." },
                { q: "What support options are available?", a: "All plans include email support. Volume package customers get priority Slack support and a dedicated customer success manager." },
              ].map((faq, i) => (
                <div key={i} className="py-5">
                  <button
                    onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                    className="w-full flex items-center justify-between text-left gap-6 group focus:outline-none"
                  >
                    <span className={`text-base font-semibold transition-colors ${faqOpen === i ? 'text-[#3D322C]' : 'text-gray-700 group-hover:text-[#3D322C]'}`}>
                      {faq.q}
                    </span>
                    <div className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 transition-all duration-200 ${
                      faqOpen === i
                        ? 'bg-primary border-primary text-white rotate-45'
                        : 'border-gray-300 text-gray-500 group-hover:border-primary group-hover:text-primary'
                    }`}>
                      <Plus className="w-3.5 h-3.5" />
                    </div>
                  </button>
                  <AnimatePresence>
                    {faqOpen === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <p className="pt-4 text-gray-500 leading-relaxed text-sm pr-12">
                          {faq.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 12. Dark CTA + Footer */}
      <footer className="bg-[#1A1614] text-white">

        {/* CTA Band */}
        <div className="text-center py-24 px-6 relative overflow-hidden border-b border-white/10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/15 blur-[120px] rounded-full pointer-events-none" />
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-5xl md:text-6xl font-extrabold leading-tight mb-4">
              Ready To Close<br />
              <span className="text-primary">Every Deal?</span>
            </h2>
            <p className="text-gray-400 mb-10 text-lg">Join teams already scaling with Genquantaa. No credit card required.</p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 border border-primary text-white px-8 py-4 rounded-full font-bold text-base hover:bg-primary transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary/30"
            >
              Try for Free <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Footer Body */}
        <div className="container mx-auto px-6 max-w-[1200px] py-16">
          <div className="flex flex-col md:flex-row gap-12 justify-between">

            {/* Brand */}
            <div className="md:w-56 shrink-0">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-orange-400 text-white flex items-center justify-center shadow-sm">
                  <Hourglass className="w-4 h-4" />
                </div>
                <span className="font-bold text-lg tracking-tight">Genquantaa</span>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed">
                The AI-powered GTM OS for modern revenue teams.
              </p>
            </div>

            {/* Nav columns */}
            <div className="flex flex-wrap gap-12 md:gap-16">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Product</div>
                <div className="flex flex-col gap-3">
                  {['Platform', 'Pricing', 'Integrations', 'Changelog'].map(l => (
                    <a key={l} href="#" className="text-sm text-gray-400 hover:text-white transition-colors">{l}</a>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Company</div>
                <div className="flex flex-col gap-3">
                  {['About', 'Blog', 'Careers', 'Contact'].map(l => (
                    <a key={l} href="#" className="text-sm text-gray-400 hover:text-white transition-colors">{l}</a>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Legal</div>
                <div className="flex flex-col gap-3">
                  {['Privacy Policy', 'Terms of Service', 'Security', 'Cookie Settings'].map(l => (
                    <a key={l} href="#" className="text-sm text-gray-400 hover:text-white transition-colors">{l}</a>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Support</div>
                <div className="flex flex-col gap-3">
                  {['Help Center', 'API Docs', 'Status', 'Feedback'].map(l => (
                    <a key={l} href="#" className="text-sm text-gray-400 hover:text-white transition-colors">{l}</a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-white/10 mt-14 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-600 text-sm">© {new Date().getFullYear()} Genquantaa. All rights reserved.</p>

            {/* Social icons */}
            <div className="flex items-center gap-4">
              {[
                { label: 'X (Twitter)', path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
                { label: 'LinkedIn', path: 'M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z M4 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z' },
                { label: 'YouTube', path: 'M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.95C5.12 20 12 20 12 20s6.88 0 8.59-.47a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58zM9.75 15.02V8.98L15.5 12z' },
                { label: 'Instagram', path: 'M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37zm1.5-4.87h.01M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4A5.8 5.8 0 0 1 16.2 22H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2z' },
              ].map(({ label, path }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-gray-500 hover:text-white hover:border-white/30 transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

