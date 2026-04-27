"use client";

import { motion } from "framer-motion";
import { 
  ArrowRight, 
  Zap, 
  Shield, 
  Database, 
  CheckCircle2,
  Lock,
  Workflow,
  Search,
  AlertTriangle,
  History,
  Timer,
  FileSearch,
  Layers
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#07070E] text-[#F0F4FF] overflow-x-hidden font-sans">
      {/* Background Glows */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#4F8EF7] opacity-10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#6366F1] opacity-10 rounded-full blur-[120px]" />
      </div>

      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 md:px-12 py-8 max-w-7xl mx-auto border-b border-white/5">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="Sync Logo" className="w-10 h-10" />
          <span className="text-2xl font-bold tracking-tight text-[#F0F4FF]">Sync</span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-sm font-medium">
          <a href="#features" className="text-[#94A3B8] hover:text-white transition-colors">Features</a>
          <a href="#how-it-works" className="text-[#94A3B8] hover:text-white transition-colors">How it Works</a>
          <div className="h-4 w-[1px] bg-white/10 mx-2" />
          <button 
            className="text-[#F0F4FF] hover:text-[#4F8EF7] transition-colors"
            onClick={() => toast.info("Add to Home Screen", {
              description: "To install Sync, tap 'Share' and select 'Add to Home Screen'."
            })}
          >
            Launch App
          </button>
          <Link 
            href="/signup" 
            className="px-6 py-2.5 bg-[#4F8EF7] hover:bg-[#4F8EF7]/90 text-white rounded-full transition-all shadow-[0_0_20px_rgba(79,142,247,0.3)] font-bold"
          >
            Sign Up
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-6 pt-24 pb-20 max-w-7xl mx-auto text-center relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#4F8EF7]/10 border border-[#4F8EF7]/20 mb-8"
        >
          <Zap className="w-3.5 h-3.5 text-[#4F8EF7]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#4F8EF7]">Now in Early Access</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-5xl md:text-8xl font-bold tracking-tight mb-8 bg-clip-text text-transparent bg-gradient-to-b from-[#F0F4FF] to-[#94A3B8] leading-[1.1]"
        >
          Your startup is making decisions <br className="hidden md:block" />
          you'll forget by Friday.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg md:text-xl text-[#94A3B8] max-w-3xl mx-auto mb-12 leading-relaxed"
        >
          Sync connects to Slack, Notion, and Gmail — then builds a living memory of every commitment, 
          decision, and conversation your team has ever had. Ask it anything. Get the answer in seconds.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link 
            href="/signup" 
            className="w-full sm:w-auto px-8 py-4 bg-[#4F8EF7] hover:bg-[#4F8EF7]/90 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 group shadow-[0_0_30px_rgba(79,142,247,0.3)]"
          >
            Connect Your Stack
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <button className="w-full sm:w-auto px-8 py-4 bg-[#0E0E1A] hover:bg-[#141428] border border-[#1A1A2E] text-white rounded-2xl font-bold transition-all">
            See It In Action
          </button>
        </motion.div>
      </section>

      {/* Problem Bar */}
      <motion.section 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="bg-[#0E0E1A]/80 border-y border-white/5 py-12 relative overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left">
          {[
            { val: "2.1 hrs", text: "lost daily to context switching", color: "#4F8EF7" },
            { val: "67%", text: "of startup decisions are never documented", color: "#6366F1" },
            { val: "$0", text: "it costs to miss a commitment you forgot you made", color: "#fff" }
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="space-y-2"
            >
              <h3 className="text-4xl md:text-5xl font-bold" style={{ color: stat.color }}>{stat.val}</h3>
              <p className="text-sm font-bold text-[#3D4466] uppercase tracking-[0.2em]">{stat.text}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Feature Section */}
      <section id="features" className="px-6 py-32 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            {
              title: "Ask anything",
              quotes: [
                "Did we promise SSO to any investor?",
                "Why did we drop the mobile app?",
                "What did the customer say last week?"
              ],
              footer: "Sync answers in seconds — with the exact Slack message or email it pulled the answer from.",
              icon: Search
            },
            {
              title: "Catches what you missed",
              body: "You made a promise in an email. Your team never saw it. Three weeks later it breaks a deal.",
              footer: "Sync detects the gap between what was said and what was done — before it becomes a problem.",
              icon: AlertTriangle
            },
            {
              title: "Never lose a decision again",
              body: "Every decision your team makes gets logged automatically — who decided, why, and what changed since.",
              footer: "No more \"I thought we agreed on this.\"",
              icon: History
            },
            {
              title: "Works where you already work",
              body: "Slack. Notion. Gmail. Sync reads everything silently. You don't change how you work.",
              footer: "Sync learns from it.",
              icon: Layers
            }
          ].map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="p-10 rounded-3xl bg-[#0E0E1A] border border-[#1A1A2E] hover:border-[#4F8EF7]/30 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#07070E] flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-[#4F8EF7]" />
                </div>
                <h3 className="text-2xl font-bold mb-6">{feature.title}</h3>
                {feature.quotes ? (
                  <div className="space-y-3 mb-8">
                    {feature.quotes.map((q, qIdx) => (
                      <p key={qIdx} className="text-[#F0F4FF] font-mono text-sm border-l-2 border-[#4F8EF7]/30 pl-4 py-1 italic">"{q}"</p>
                    ))}
                  </div>
                ) : (
                  <p className="text-[#94A3B8] leading-relaxed mb-8">{feature.body}</p>
                )}
              </div>
              <p className="text-sm font-bold text-[#4F8EF7]/80 uppercase tracking-wider">{feature.footer}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="px-6 py-32 bg-[#0E0E1A]/50 border-y border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
            <h2 className="text-4xl md:text-6xl font-bold leading-tight">How It Works — <br /><span className="text-[#4F8EF7]">Honest Version</span></h2>
            <p className="text-[#94A3B8] text-lg max-w-md">No configuration. No setup calls. Sync starts reading immediately.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
            {[
              {
                step: "01",
                title: "Connect in 2 minutes",
                desc: "Link Slack, Notion, and Gmail. No configuration. No setup calls. Sync starts reading immediately."
              },
              {
                step: "02",
                title: "Your brain starts building",
                desc: "Every message, document, and email gets indexed, understood, and connected. Not stored as text — understood as context."
              },
              {
                step: "03",
                title: "Ask. Get answers. Move faster.",
                desc: "Type a question in plain English. Sync returns the answer — with the exact source it came from, timestamped and cited.\n\nNo hallucinations. No guessing. Only what your team actually said."
              }
            ].map((step, idx) => (
              <div key={idx} className="relative">
                <span className="text-8xl font-black text-white/5 absolute -top-12 -left-4 select-none">{step.step}</span>
                <div className="relative z-10">
                  <h4 className="text-xl font-bold mb-6 flex items-center gap-4">
                    <span className="w-8 h-[2px] bg-[#4F8EF7]" />
                    {step.title}
                  </h4>
                  <p className="text-[#94A3B8] leading-relaxed whitespace-pre-line">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="px-6 py-32 max-w-5xl mx-auto text-center">
        <h2 className="text-4xl md:text-7xl font-bold mb-8 italic">"We read your data so <br />you don't have to."</h2>
        <p className="text-[#94A3B8] text-xl mb-20 max-w-2xl mx-auto leading-relaxed">
          Sync processes your Slack, Notion, and Gmail to build context — not to train models, 
          not to sell insights, not to share with anyone.
        </p>

        <div className="bg-[#0E0E1A] border border-[#1A1A2E] rounded-3xl p-12 text-left relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Shield className="w-32 h-32 text-[#4F8EF7]" />
          </div>
          <h3 className="text-2xl font-bold mb-12">Your data builds your brain. <br /><span className="text-[#4F8EF7]">Nobody else's.</span></h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              "AES-256 encryption at rest",
              "Zero retention on raw messages",
              "You can delete everything, anytime",
              "We never train on your data. Ever."
            ].map((trust, idx) => (
              <div key={idx} className="flex items-center gap-4">
                <CheckCircle2 className="w-6 h-6 text-[#10B981]" />
                <span className="font-bold text-[#F0F4FF] tracking-tight">{trust}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-32 text-center border-t border-white/5 bg-gradient-to-b from-[#07070E] to-[#0E0E1A]">
        <motion.h2 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          className="text-4xl md:text-7xl font-bold mb-8 tracking-tight max-w-4xl mx-auto leading-tight"
        >
          The best startups move fast. <br className="hidden md:block" />
          The ones that win <span className="text-[#4F8EF7]">remember everything.</span>
        </motion.h2>
        <p className="text-[#94A3B8] text-xl mb-12 max-w-2xl mx-auto">
          Stop rebuilding context from scratch every Monday. <br className="hidden md:block" />
          Sync remembers so your team doesn't have to.
        </p>
        <Link 
          href="/signup" 
          className="inline-flex px-12 py-5 bg-[#4F8EF7] hover:bg-[#4F8EF7]/90 text-white rounded-2xl font-bold text-lg transition-all shadow-[0_0_50px_rgba(79,142,247,0.3)] mb-4"
        >
          Start For Free — No Credit Card
        </Link>
      </section>

      {/* Footer */}
      <footer className="px-6 py-20 border-t border-white/5 bg-[#07070E]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="Sync Logo" className="w-8 h-8 opacity-50" />
            <span className="text-[#3D4466] text-xs font-bold uppercase tracking-[0.3em]">
              Sync — Built for founding teams who move too fast to forget.
            </span>
          </div>
          <div className="text-[#3D4466] text-[10px] font-bold uppercase tracking-[0.4em]">
            &copy; 2026 Sync AI &bull; Built with Gemini &bull; Pacific Hackathon 2026
          </div>
        </div>
      </footer>
    </div>
  );
}
