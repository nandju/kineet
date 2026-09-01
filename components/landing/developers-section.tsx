"use client";

import { useState, useEffect, useRef } from "react";

const features = [
  {
    title: "Import Excel et CSV",
    description: "Déposez un fichier et Chapnet détecte chaque colonne."
  },
  { 
    title: "Aperçu en direct", 
    description: "Visualisez le message personnalisé exact avant l'envoi."
  },
  { 
    title: "Variables de personnalisation", 
    description: "Utilisez {{prénom}} et {{nom}} partout."
  },
  { 
    title: "Test de connexion", 
    description: "Testez votre configuration SMTP ou fournisseur en un clic."
  },
];

export function DevelopersSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

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

  return (
    <section id="developers" ref={sectionRef} className="relative py-24 lg:py-32 overflow-hidden">

      {/* Decorative brand glow — absolute, bottom-right, behind all content */}
      <div
        className={`absolute bottom-0 right-0 w-[55%] h-[85%] pointer-events-none transition-all duration-1000 delay-300 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="absolute bottom-0 right-0 w-[420px] h-[420px] rounded-full brand-gradient opacity-[0.10] blur-[110px]" />
      </div>

      {/* All text content sits on top */}
      <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12">
        {/* Header — Full width */}
        <div
          className={`mb-16 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
            <span className="w-8 h-px bg-foreground/30" />
            Créateur de campagnes
          </span>
          <h2 className="text-6xl md:text-7xl lg:text-[128px] font-display font-extrabold tracking-tight leading-[0.9]">
            Créez une campagne.
            <br />
            <span className="text-muted-foreground">Touchez tout le monde.</span>
          </h2>
        </div>

        {/* Description + Features — left half only */}
        <div
          className={`max-w-[50%] transition-all duration-700 delay-100 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <p className="text-xl text-muted-foreground mb-12 leading-relaxed max-w-md">
            A guided campaign builder for WhatsApp, Email, and SMS. 
            Import recipients, personalize, preview, and send in minutes.
          </p>
          <div className="grid grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className={`transition-all duration-500 ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
                style={{ transitionDelay: `${index * 50 + 200}ms` }}
              >
                <h3 className="font-medium mb-1">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
