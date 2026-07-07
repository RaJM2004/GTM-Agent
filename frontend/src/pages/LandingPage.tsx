import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Bot, Target, Zap, BarChart, Users, MessageSquare, PhoneCall, Hourglass } from 'lucide-react';

export default function LandingPage() {
  const placeholders = [
    "Find me VP of Engineering at SaaS companies in California...",
    "SaaS founders in New York...",
    "CTOs who recently raised Series A...",
    "Marketing directors using Salesforce..."
  ];
  
  const [placeholderText, setPlaceholderText] = useState("");
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentPhrase = placeholders[phraseIndex];
    let timer: NodeJS.Timeout;
    
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
    <div className="min-h-screen bg-[#FAF9F6] selection:bg-primary/20">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-[#F2DED6] bg-[#FAF9F6]/80 backdrop-blur-xl">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white border border-[#F2DED6] flex items-center justify-center shadow-sm">
              <Hourglass className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">Genquantaa</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#features" className="hover:text-primary transition-colors">Features</a>
            <a href="#agents" className="hover:text-primary transition-colors">AI Agents</a>
            <a href="#pricing" className="hover:text-primary transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-gray-700 hover:text-primary transition-colors">
              Log in
            </Link>
            <Link to="/register" className="text-sm font-medium bg-primary text-white px-5 py-2.5 rounded-full hover:bg-primary/90 transition-colors shadow-sm">
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        {/* Soft radial background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[radial-gradient(circle_at_50%_50%,rgba(221,138,115,0.15),transparent_70%)] rounded-full pointer-events-none" />
        
        <div className="container mx-auto max-w-5xl text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#F2DED6] text-primary text-sm font-semibold mb-8 shadow-sm">
              <Zap className="w-4 h-4" /> Introducing Genquantaa GTM OS
            </span>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-[#5A4A42] mb-6 leading-[1.1]">
              Find your next customer. <br className="hidden md:block" />
              <span className="text-primary">Just ask.</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-12 leading-relaxed">
              Describe your ideal prospect in natural language, and our AI will search 250M+ verified B2B contacts to find them instantly.
            </p>
            
            {/* Giant ChatGPT Style Input */}
            <div className="max-w-3xl mx-auto relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary to-orange-400 rounded-[32px] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative bg-white border-2 border-[#F2DED6] hover:border-primary/50 transition-colors rounded-[28px] p-2 flex items-center shadow-xl">
                <div className="pl-4 pr-2">
                  <Bot className="w-6 h-6 text-primary/60" />
                </div>
                <input 
                  type="text" 
                  placeholder={placeholderText} 
                  className="flex-1 bg-transparent border-none py-5 px-2 text-lg text-gray-900 placeholder-gray-400 focus:ring-0 outline-none"
                />
                <Link to="/register" className="shrink-0 bg-primary hover:bg-primary/90 text-white rounded-[20px] px-6 py-4 font-medium flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]">
                  Search <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
              
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <span className="text-sm text-gray-500 font-medium mr-2">Try asking:</span>
                <button className="text-sm px-4 py-2 bg-white border border-[#F2DED6] rounded-full text-gray-600 hover:bg-[#FDF8F5] hover:text-primary hover:border-primary/30 transition-colors shadow-sm">
                  "SaaS founders in New York"
                </button>
                <button className="text-sm px-4 py-2 bg-white border border-[#F2DED6] rounded-full text-gray-600 hover:bg-[#FDF8F5] hover:text-primary hover:border-primary/30 transition-colors shadow-sm">
                  "CTOs who recently raised Series A"
                </button>
                <button className="text-sm px-4 py-2 bg-white border border-[#F2DED6] rounded-full text-gray-600 hover:bg-[#FDF8F5] hover:text-primary hover:border-primary/30 transition-colors shadow-sm">
                  "Marketing directors using Salesforce"
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-[#FDF8F5] border-y border-[#F2DED6]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">Everything you need to scale</h2>
            <p className="text-gray-600 text-lg">A complete operating system for your revenue team.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              { icon: Target, title: 'AI Lead Discovery', desc: 'Find your ideal buyers using natural language search across our 250M+ B2B database.' },
              { icon: PhoneCall, title: 'AI Calling Agents', desc: 'Deploy human-like voice AI to cold call, qualify, and book meetings 24/7.' },
              { icon: MessageSquare, title: 'Multi-channel Outreach', desc: 'Automate LinkedIn, Email, and WhatsApp campaigns from a single unified sequence.' },
              { icon: Users, title: 'Smart CRM', desc: 'Manage your pipeline with automatic data enrichment and intent signals.' },
              { icon: BarChart, title: 'Advanced Analytics', desc: 'Track campaign performance, call ROI, and agent effectiveness in real-time.' },
              { icon: Bot, title: 'Campaign Playbooks', desc: 'Use proven AI templates for product launches, event promotion, and follow-ups.' },
            ].map((feature, idx) => (
              <div key={idx} className="bg-white border border-[#F2DED6] hover:border-primary/50 shadow-sm hover:shadow-md transition-all p-8 rounded-2xl group">
                <div className="w-14 h-14 bg-[#FDF8F5] group-hover:bg-primary/10 transition-colors border border-[#F2DED6] rounded-xl flex items-center justify-center mb-6">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-12 border-t border-[#F2DED6]">
        <div className="container mx-auto px-6 text-center text-gray-500">
          <div className="flex justify-center items-center gap-2 mb-4">
             <Hourglass className="w-5 h-5 text-gray-400" />
             <span className="font-bold text-gray-800">Genquantaa GTM OS</span>
          </div>
          <p>© 2026 Genquantaa. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
