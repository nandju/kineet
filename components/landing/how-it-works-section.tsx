"use client";

import { useEffect, useRef, useState } from "react";

const steps = [
  {
    number: "01",
    title: "Choisissez",
    subtitle: "votre canal",
    description: "Sélectionnez WhatsApp, Email ou SMS et configurez vos informations d'expéditeur. Le formulaire s'adapte automatiquement au canal choisi.",
  },
  {
    number: "02",
    title: "Ajoutez",
    subtitle: "vos destinataires",
    description: "Importez un fichier Excel ou CSV, ou ajoutez vos contacts manuellement. Chapnet détecte les colonnes et signale les lignes invalides.",
  },
  {
    number: "03",
    title: "Envoyez",
    subtitle: "et suivez",
    description: "Prévisualisez le message personnalisé, vérifiez le récapitulatif, puis envoyez. Suivez la livraison en direct et retrouvez tout dans l'historique.",
  },
];

export function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="relative py-24 lg:py-32 bg-muted overflow-hidden"
    >
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-[#7C35E2]/10 blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="relative mb-16 lg:mb-20">
          <div className={`transition-all duration-1000 ${isVisible ? "translate-x-0 opacity-100" : "-translate-x-12 opacity-0"}`}>
            <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-8">
              <span className="w-12 h-px bg-foreground/20" />
              Comment ça marche
            </span>
          </div>

          <h2 className={`text-6xl md:text-7xl lg:text-[110px] font-display font-extrabold tracking-tight leading-[0.9] transition-all duration-1000 delay-100 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-16 opacity-0"
          }`}>
            Choisissez. Ajoutez.
            <br />
            <span className="brand-gradient-text">Envoyez.</span>
          </h2>
        </div>

        {/* Horizontal Steps Layout */}
        <div className="grid lg:grid-cols-3 gap-4">
          {steps.map((step, index) => (
            <button
              key={step.number}
              type="button"
              onClick={() => setActiveStep(index)}
              className={`relative text-left p-8 lg:p-12 rounded-2xl border bg-card transition-all duration-500 overflow-hidden ${
                activeStep === index
                  ? "border-[#7C35E2]/50 shadow-lg shadow-[#7C35E2]/5"
                  : "border-border hover:border-foreground/20"
              }`}
            >
              {/* Step number with animated line */}
              <div className="flex items-center gap-4 mb-8">
                <span className={`text-4xl font-display font-bold transition-colors duration-300 ${
                  activeStep === index ? "brand-gradient-text" : "text-foreground/20"
                }`}>
                  {step.number}
                </span>
                <div className="flex-1 h-px bg-border overflow-hidden">
                  {activeStep === index && (
                    <div className="h-full brand-gradient animate-progress" />
                  )}
                </div>
              </div>

              {/* Title */}
              <h3 className="text-3xl lg:text-4xl font-display font-bold mb-2">
                {step.title}
              </h3>
              <span className="text-xl text-muted-foreground font-display block mb-6">
                {step.subtitle}
              </span>

              {/* Description */}
              <p className={`text-muted-foreground leading-relaxed transition-opacity duration-300 ${
                activeStep === index ? "opacity-100" : "opacity-60"
              }`}>
                {step.description}
              </p>

              {/* Active indicator */}
              <div className={`absolute bottom-0 left-0 right-0 h-1 brand-gradient transition-transform duration-500 origin-left ${
                activeStep === index ? "scale-x-100" : "scale-x-0"
              }`} />
            </button>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
        .animate-progress {
          animation: progress 6s linear forwards;
        }
      `}</style>
    </section>
  );
}
