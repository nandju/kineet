"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { ChapnetMark } from "@/components/landing/logo";

export function CtaSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  return (
    <section ref={sectionRef} className="relative py-24 lg:py-32 overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div
          className={`relative rounded-3xl border border-border bg-card overflow-hidden transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
          onMouseMove={handleMouseMove}
        >
          {/* Spotlight effect */}
          <div
            className="absolute inset-0 opacity-30 pointer-events-none transition-opacity duration-300"
            style={{
              background: `radial-gradient(600px circle at ${mousePosition.x}% ${mousePosition.y}%, rgba(46,107,255,0.08), transparent 40%)`
            }}
          />

          <div className="relative z-10 px-8 lg:px-16 py-16 lg:py-24">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
              {/* Left content */}
              <div className="flex-1">
                <h2 className="text-6xl md:text-7xl lg:text-[72px] font-display font-extrabold tracking-tight mb-8 leading-[0.95]">
                  Prêt à toucher
                  <br />
                  des <span className="brand-gradient-text">milliers</span> ?
                </h2>

                <p className="text-xl text-muted-foreground mb-12 leading-relaxed max-w-xl">
                  Rejoignez les équipes qui envoient des campagnes WhatsApp, Email et SMS avec Chapnet.
                  Lancez votre première campagne en quelques minutes.
                </p>

                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <Button
                    asChild
                    size="lg"
                    className="brand-gradient border-0 text-white px-8 h-14 text-base rounded-full group hover:opacity-90"
                  >
                    <a href="/login">
                      Lancer votre première campagne
                      <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                    </a>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="h-14 px-8 text-base rounded-full border-border hover:bg-accent"
                  >
                    <a href="/login">Demander une démo</a>
                  </Button>
                </div>

                <p className="text-sm text-muted-foreground mt-8 font-mono">
                  1 000 messages gratuits avec Chapnet
                </p>
              </div>

              {/* Right visual */}
              <div className="hidden lg:flex items-center justify-center w-[320px] h-[320px] shrink-0 rounded-[2.5rem] bg-[oklch(0.20_0.03_265)] relative overflow-hidden">
                <div className="absolute inset-0 opacity-[0.08]" style={{
                  backgroundImage: "radial-gradient(white 1px, transparent 1px)",
                  backgroundSize: "22px 22px",
                }} />
                <div className="relative z-10 w-28 h-28 rounded-3xl brand-gradient flex items-center justify-center shadow-xl text-white">
                  <ChapnetMark className="w-16 h-16" />
                </div>
              </div>
            </div>
          </div>

          {/* Decorative corner */}
          <div className="absolute top-0 right-0 w-32 h-32 border-b border-l border-border" />
          <div className="absolute bottom-0 left-0 w-32 h-32 border-t border-r border-border" />
        </div>
      </div>
    </section>
  );
}
