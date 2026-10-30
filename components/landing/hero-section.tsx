"use client";

import { useEffect, useState, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChapnetMark } from "@/components/landing/logo";

const words = ["WhatsApp", "Email", "SMS", "tous"];

function BlurWord({ word, trigger }: { word: string; trigger: number }) {
  const letters = word.split("");
  const STAGGER = 45;      // ms between each letter
  const DURATION = 500;    // blur+opacity fade duration per letter
  const GRADIENT_HOLD = STAGGER * letters.length + DURATION + 200;

  const [letterStates, setLetterStates] = useState<{ opacity: number; blur: number }[]>(
    letters.map(() => ({ opacity: 0, blur: 20 }))
  );
  const [showGradient, setShowGradient] = useState(true);
  const framesRef = useRef<number[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    // reset
    framesRef.current.forEach(cancelAnimationFrame);
    timersRef.current.forEach(clearTimeout);
    framesRef.current = [];
    timersRef.current = [];

    setLetterStates(letters.map(() => ({ opacity: 0, blur: 20 })));
    setShowGradient(true);

    // stagger each letter
    letters.forEach((_, i) => {
      const t = setTimeout(() => {
        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min((now - start) / DURATION, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setLetterStates(prev => {
            const next = [...prev];
            next[i] = { opacity: eased, blur: 20 * (1 - eased) };
            return next;
          });
          if (progress < 1) {
            const id = requestAnimationFrame(tick);
            framesRef.current.push(id);
          }
        };
        const id = requestAnimationFrame(tick);
        framesRef.current.push(id);
      }, i * STAGGER);
      timersRef.current.push(t);
    });

    // remove gradient once all letters are settled
    const gt = setTimeout(() => setShowGradient(false), GRADIENT_HOLD);
    timersRef.current.push(gt);

    return () => {
      framesRef.current.forEach(cancelAnimationFrame);
      timersRef.current.forEach(clearTimeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  // gradient colours cycling across letter positions — brand purple → blue
  const gradientColors = ["#7C35E2", "#532396", "#344AE3", "#532396", "#7C35E2"];

  return (
    <>
      {letters.map((char, i) => {
        const colorIndex = (i / Math.max(letters.length - 1, 1)) * (gradientColors.length - 1);
        const lower = Math.floor(colorIndex);
        const upper = Math.min(lower + 1, gradientColors.length - 1);
        const t = colorIndex - lower;

        // lerp hex colours
        const hex2rgb = (hex: string) => {
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          return [r, g, b];
        };
        const [r1, g1, b1] = hex2rgb(gradientColors[lower]);
        const [r2, g2, b2] = hex2rgb(gradientColors[upper]);
        const r = Math.round(r1 + (r2 - r1) * t);
        const g = Math.round(g1 + (g2 - g1) * t);
        const b = Math.round(b1 + (b2 - b1) * t);

        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: letterStates[i]?.opacity ?? 0,
              filter: `blur(${letterStates[i]?.blur ?? 20}px)`,
              color: showGradient ? `rgb(${r},${g},${b})` : "var(--foreground)",
              transition: "color 0.4s ease",
            }}
          >
            {char}
          </span>
        );
      })}
    </>
  );
}

export function HeroSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % words.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-background pt-32 pb-16 lg:pt-40">
      {/* Soft brand-colored glows */}
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-[#7C35E2]/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-[#344AE3]/10 blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left: copy */}
          <div className="lg:col-span-7">
            {/* Eyebrow */}
            <div
              className={`mb-8 transition-all duration-700 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              <span className="inline-flex items-center gap-3 text-sm font-mono font-medium tracking-wide brand-gradient-text">
                Envoyez. Touchez. Rassurez.
              </span>
            </div>

            {/* Main headline */}
            <div className="mb-10">
              <h1
                className={`text-left text-[clamp(2.25rem,5.5vw,6rem)] font-display font-extrabold leading-[0.98] tracking-tight text-foreground transition-all duration-1000 ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
              >
                <span className="block">Touchez des milliers,</span>
                <span className="block">
                  un message sur{" "}
                  <span className="relative inline-block">
                    <BlurWord word={words[wordIndex]} trigger={wordIndex} />
                  </span>
                </span>
              </h1>
            </div>

            <p
              className={`text-lg text-muted-foreground max-w-lg mb-10 leading-relaxed transition-all duration-1000 delay-100 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              Campagnes WhatsApp, Email et SMS depuis une seule plateforme. Créez, prévisualisez et distribuez à des milliers de destinataires en quelques minutes.
            </p>

            <div
              className={`flex flex-col sm:flex-row items-start gap-4 mb-16 transition-all duration-1000 delay-200 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              <Button asChild size="lg" className="brand-gradient border-0 text-white px-8 h-14 text-base rounded-full group hover:opacity-90">
                <a href="/login">
                  Commencer gratuitement
                  <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-14 px-8 text-base rounded-full border-border hover:bg-accent">
                <a href="#how-it-works">Voir comment ça marche</a>
              </Button>
            </div>

            {/* Stats */}
            <div
              className={`flex items-start gap-10 lg:gap-16 transition-all duration-700 delay-500 ${
                isVisible ? "opacity-100" : "opacity-0"
              }`}
            >
              {[
                { value: "12M+", label: "messages distribués" },
                { value: "98,9%", label: "taux de livraison moyen" },
                { value: "3", label: "canaux en un seul endroit" },
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col gap-1">
                  <span className="text-2xl lg:text-3xl font-display font-bold text-foreground">{stat.value}</span>
                  <span className="text-xs text-muted-foreground leading-tight max-w-[9rem]">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: brand panel */}
          <div
            className={`lg:col-span-5 transition-all duration-1000 delay-300 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <div className="relative rounded-[2rem] bg-[oklch(0.20_0.03_265)] p-10 lg:p-12 overflow-hidden">
              {/* Grid texture */}
              <div className="absolute inset-0 opacity-[0.06]" style={{
                backgroundImage: "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
                backgroundSize: "28px 28px",
              }} />

              <div className="relative z-10 flex flex-col items-center text-center gap-8 text-white">
                <ChapnetMark className="w-16 h-16" />
                <div>
                  <span className="block font-display font-extrabold text-3xl tracking-tight text-white">Chapnet</span>
                  <span className="block mt-2 text-sm text-white/50 tracking-[0.2em] uppercase">Envoyez. Touchez. Rassurez.</span>
                </div>

                {/* Phone mockup */}
                <div className="relative mt-4 w-40 h-80 rounded-[2rem] border-4 border-white/15 bg-white/5 backdrop-blur-sm flex items-center justify-center">
                  <div className="absolute top-3 w-12 h-1.5 rounded-full bg-white/20" />
                  <div className="w-16 h-16 rounded-2xl brand-gradient flex items-center justify-center text-white">
                    <ChapnetMark className="w-8 h-8" />
                  </div>
                  <div className="absolute bottom-6 left-6 right-6 flex flex-col gap-2">
                    <div className="h-2 rounded-full bg-white/15 w-full" />
                    <div className="h-2 rounded-full bg-white/10 w-2/3" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
