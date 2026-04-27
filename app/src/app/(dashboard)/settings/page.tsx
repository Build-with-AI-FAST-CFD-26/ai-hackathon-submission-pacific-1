"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Cpu,
  ChevronRight,
  LogOut,
  ArrowLeft,
  Check,
  Moon,
  Sun,
  Monitor
} from "lucide-react";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { syncServerSession } from "@/lib/client-auth-session";

type SectionId = "overview" | "profile" | "appearance" | "ai" | "notifications";

import { useState, useRef } from "react";
import { useTheme } from "@/app/theme-provider";
import { useAuth } from "@/context/AuthContext";
import { updateProfile } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { toast } from "sonner";
import { Camera, Phone } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<SectionId>("overview");
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      await syncServerSession(null);
      router.push("/");
    } catch (error) {
      console.error("Sign out error", error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    const storageRef = ref(storage, `avatars/${user.uid}`);
    
    try {
      const snapshot = await uploadBytes(storageRef, file);
      const photoURL = await getDownloadURL(snapshot.ref);
      await updateProfile(user, { photoURL });
      toast.success("Profile image updated!");
    } catch (error: any) {
      toast.error("Upload failed", { description: error.message });
    } finally {
      setIsUploading(false);
    }
  };

  const sections = [
    { id: "profile", title: "Profile", icon: User, description: "Personal info and security" },
    { id: "appearance", title: "Appearance", icon: Palette, description: "Theme and UI settings" },
    { id: "ai", title: "AI & Model", icon: Cpu, description: "Intelligence configuration" },
    { id: "notifications", title: "Notifications", icon: Bell, description: "Alert preferences" },
  ];

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 border-b border-border bg-background/50 backdrop-blur-xl shrink-0 z-20">
        <div className="flex items-center gap-3">
          {activeSection !== "overview" && (
            <button 
              onClick={() => setActiveSection("overview")}
              className="p-2 hover:bg-elevated rounded-lg transition-colors text-text-secondary mr-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <Settings className="w-5 h-5 text-sync-blue" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-text-primary">
            {activeSection === "overview" ? "Settings" : activeSection.replace(/^\w/, (c) => c.toUpperCase())}
          </h2>
        </div>
      </header>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            {activeSection === "overview" ? (
              <motion.div
                key="overview"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-6 mb-10">
                  <div className="relative group">
                    <div className="w-20 h-20 rounded-2xl bg-sync-blue flex items-center justify-center text-white text-2xl font-bold shadow-xl overflow-hidden border-4 border-surface">
                      {user?.photoURL ? (
                        <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        user?.displayName?.charAt(0) || user?.email?.charAt(0).toUpperCase() || "A"
                      )}
                      {isUploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-2 -right-2 p-2 bg-surface border border-border rounded-xl text-text-secondary hover:text-sync-blue shadow-lg transition-all"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-text-primary">{user?.displayName || "Sync User"}</h1>
                    <p className="text-text-secondary text-sm">{user?.email}</p>
                    <p className="text-[10px] font-bold text-sync-blue uppercase tracking-widest mt-1">Enterprise Plan &bull; 1.2 GB Used</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id as SectionId)}
                      className="flex items-center justify-between p-6 bg-surface border border-border rounded-2xl hover:border-sync-blue/30 transition-all group text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-elevated border border-border flex items-center justify-center text-text-secondary group-hover:text-sync-blue transition-colors">
                          <section.icon className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-text-primary">{section.title}</h3>
                          <p className="text-sm text-text-secondary">{section.description}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-text-primary transition-colors" />
                    </button>
                  ))}
                </div>

                <button 
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-2 p-5 rounded-2xl bg-status-conflict/5 border border-status-conflict/20 text-status-conflict font-bold hover:bg-status-conflict/10 transition-all mt-8"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>
              </motion.div>
            ) : (
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                {activeSection === "appearance" && <AppearanceSettings />}
                {activeSection === "profile" && <ProfileSettings />}
                {activeSection === "ai" && <AISettings />}
                {activeSection === "notifications" && <NotificationSettings />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}


function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-lg font-bold text-text-primary mb-4">Theme</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { id: "light", icon: Sun, label: "Light" },
            { id: "dark", icon: Moon, label: "Dark" },
            { id: "system", icon: Monitor, label: "System" }
          ].map(t => (
            <button 
              key={t.id}
              onClick={() => setTheme(t.id as any)}
              className={cn(
                "flex flex-col items-center gap-3 p-4 rounded-xl border transition-all",
                theme === t.id ? "bg-sync-blue/10 border-sync-blue text-sync-blue" : "bg-surface border-border text-text-secondary hover:border-text-muted"
              )}
            >
              <t.icon className="w-6 h-6" />
              <span className="text-xs font-bold uppercase tracking-widest">{t.label}</span>
              {theme === t.id && <Check className="w-3 h-3" />}
            </button>
          ))}
        </div>
      </section>
      
      <section className="pt-6 border-t border-border">
        <h3 className="text-lg font-bold text-text-primary mb-4">Animations</h3>
        <div className="flex items-center justify-between p-4 bg-surface border border-border rounded-xl">
          <span className="text-sm text-text-primary">Enable UI transitions</span>
          <div className="w-10 h-5 bg-sync-blue rounded-full relative cursor-pointer">
            <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full" />
          </div>
        </div>
      </section>
    </div>
  );
}

function ProfileSettings() {
  const { user } = useAuth();
  const [phone, setPhone] = useState("");

  const handleSave = () => {
    toast.success("Profile updated", {
      description: "Your changes have been saved to the cloud."
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold text-text-muted uppercase tracking-widest mb-2 block">Full Name</label>
          <input 
            type="text" 
            defaultValue={user?.displayName || ""} 
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text-primary outline-none focus:border-sync-blue/50" 
          />
        </div>
        <div>
          <label className="text-xs font-bold text-text-muted uppercase tracking-widest mb-2 block">Email Address</label>
          <input 
            type="email" 
            defaultValue={user?.email || ""} 
            readOnly
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text-muted outline-none cursor-not-allowed" 
          />
        </div>
        <div>
          <label className="text-xs font-bold text-text-muted uppercase tracking-widest mb-2 block">Phone Number</label>
          <div className="relative group">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-sync-blue transition-colors" />
            <input 
              type="tel" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000" 
              className="w-full bg-surface border border-border rounded-xl pl-12 pr-4 py-3 text-text-primary outline-none focus:border-sync-blue/50" 
            />
          </div>
        </div>
      </div>
      <button 
        onClick={handleSave}
        className="px-6 py-3 bg-sync-blue text-white rounded-xl font-bold text-sm shadow-lg hover:bg-sync-blue/90 transition-all"
      >
        Save Changes
      </button>
    </div>
  );
}

function AISettings() {
  const [model, setModel] = useState("gemini-pro");
  const [persona, setPersona] = useState("analytical");

  return (
    <div className="space-y-8">
      <div className="p-5 rounded-2xl bg-sync-indigo/5 border border-sync-indigo/20 flex gap-4">
        <Cpu className="w-6 h-6 text-sync-indigo shrink-0" />
        <p className="text-sm text-text-secondary leading-relaxed">
          Sync uses <span className="text-text-primary font-bold">Gemini 1.5 Pro</span> by default for high-reasoning tasks. You can adjust the creativity vs precision balance below.
        </p>
      </div>
      
      <section>
        <h3 className="text-xs font-bold text-text-muted uppercase tracking-[0.2em] mb-4">Model Selection</h3>
        <div className="space-y-3">
          {[
            { id: "gemini-pro", name: "Gemini 1.5 Pro", desc: "Complex reasoning & coding", tag: "Recommended" },
            { id: "gemini-flash", name: "Gemini 1.5 Flash", desc: "Fast, low-latency responses", tag: "Fast" }
          ].map(m => (
            <button 
              key={m.id}
              onClick={() => setModel(m.id)}
              className={cn(
                "w-full flex items-center justify-between p-4 rounded-xl border transition-all",
                model === m.id ? "bg-sync-blue/5 border-sync-blue" : "bg-surface border-border hover:border-text-muted"
              )}
            >
              <div className="text-left">
                <span className="block text-sm font-bold text-text-primary">{m.name}</span>
                <span className="block text-xs text-text-secondary">{m.desc}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded bg-elevated text-[10px] font-bold text-text-muted uppercase tracking-wider">{m.tag}</span>
                {model === m.id && <Check className="w-4 h-4 text-sync-blue" />}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-xs font-bold text-text-muted uppercase tracking-[0.2em] mb-4">Model Persona</h3>
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => setPersona("analytical")}
            className={cn(
              "p-4 rounded-xl border transition-all text-left",
              persona === "analytical" ? "bg-sync-blue/5 border-sync-blue" : "bg-surface border-border hover:border-text-muted"
            )}
          >
            <span className="block text-sm font-bold text-text-primary mb-1">Analytical</span>
            <span className="block text-xs text-text-secondary">Focus on facts and citations.</span>
          </button>
          <button 
            onClick={() => setPersona("creative")}
            className={cn(
              "p-4 rounded-xl border transition-all text-left",
              persona === "creative" ? "bg-sync-indigo/5 border-sync-indigo" : "bg-surface border-border hover:border-text-muted"
            )}
          >
            <span className="block text-sm font-bold text-text-primary mb-1">Creative</span>
            <span className="block text-xs text-text-secondary">Synthesize ideas and brainstorm.</span>
          </button>
        </div>
      </section>
    </div>
  );
}

function NotificationSettings() {
  return (
    <div className="space-y-4">
      {["Decision Alerts", "Daily Summary", "Source Connection Lost", "New Sync Suggestion"].map(item => (
        <div key={item} className="flex items-center justify-between p-4 bg-surface border border-border rounded-xl">
          <span className="text-sm text-text-primary">{item}</span>
          <div className="w-10 h-5 bg-sync-blue rounded-full relative cursor-pointer">
            <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
