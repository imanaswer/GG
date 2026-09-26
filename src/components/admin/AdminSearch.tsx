"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X, User, Star, Gamepad2, CalendarCheck, ArrowRight } from "lucide-react";

export function AdminSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    } else {
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      fetch(`/api/admin/search?q=${encodeURIComponent(query)}`)
        .then((res) => res.json())
        .then((data) => {
          setResults(data.results || []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.1)", padding: "8px 16px", borderRadius: 100, color: "rgba(255,255,255,0.5)", fontSize: 13, cursor: "pointer", transition: "all 0.2s ease" }}
        onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"}
        onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"}
      >
        <Search size={16} /> 
        <span>Search admin...</span>
        <span style={{ marginLeft: 20, fontSize: 10, border: "1px solid rgba(255,255,255,0.2)", padding: "2px 6px", borderRadius: 4, background: "rgba(255,255,255,0.05)" }}>⌘K</span>
      </button>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "10vh" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }} onClick={() => setIsOpen(false)} />
      
      <div style={{ position: "relative", width: "100%", maxWidth: 600, background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, overflow: "hidden", boxShadow: "0 20px 40px rgba(0,0,0,0.5)", display: "flex", flexDirection: "column" }}>
        
        <div style={{ display: "flex", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <Search size={20} color="rgba(255,255,255,0.4)" />
          <input 
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users, coaches, games, bookings..."
            style={{ flex: 1, background: "transparent", border: "none", color: "#fff", fontSize: 16, padding: "0 16px", outline: "none", fontFamily: "var(--font-sans)" }}
          />
          <button onClick={() => setIsOpen(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", display: "flex" }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ maxHeight: "60vh", overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: 4 }}>
          {query.trim().length > 0 && query.trim().length < 2 && (
            <div style={{ padding: "24px", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Type at least 2 characters...</div>
          )}
          {loading && (
            <div style={{ padding: "24px", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Searching...</div>
          )}
          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <div style={{ padding: "24px", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>No results found for "{query}"</div>
          )}
          
          {!loading && results.map((item: any, i) => {
            let Icon = User;
            let badge = "";
            let color = "#fff";
            
            if (item.type === "user") { Icon = User; badge = "USER"; color = "#3b82f6"; }
            if (item.type === "coach") { Icon = Star; badge = "COACH"; color = "#eab308"; }
            if (item.type === "game") { Icon = Gamepad2; badge = "GAME"; color = "#10b981"; }
            if (item.type === "booking") { Icon = CalendarCheck; badge = "BOOKING"; color = "#a855f7"; }
            
            return (
              <button 
                key={`${item.type}-${item.id}`}
                onClick={() => {
                  setIsOpen(false);
                  router.push(item.url);
                }}
                style={{ 
                  display: "flex", alignItems: "center", gap: 16, padding: "12px 16px", background: "transparent", 
                  border: "none", borderRadius: 8, cursor: "pointer", textAlign: "left", transition: "background 0.2s ease" 
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: `rgba(${Icon === Star ? '234, 179, 8' : '255, 255, 255'}, 0.1)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={20} color={color} />
                </div>
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {item.title}
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 4, border: `1px solid ${color}40`, color: color, textTransform: "uppercase" }}>
                      {badge}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {item.subtitle}
                  </div>
                </div>
                <ArrowRight size={16} color="rgba(255,255,255,0.2)" />
              </button>
            )
          })}
        </div>
        
      </div>
    </div>
  );
}
