"use client";

import { ArrowUpRight } from "lucide-react";
import { ChapnetLogo } from "@/components/landing/logo";

const footerLinks = {
  Produit: [
    { name: "Canaux", href: "#features" },
    { name: "Comment ça marche", href: "#how-it-works" },
    { name: "Tarifs", href: "#pricing" },
    { name: "Intégrations", href: "#integrations" },
  ],
  Canaux: [
    { name: "Campagnes WhatsApp", href: "/login" },
    { name: "Campagnes Email", href: "/login" },
    { name: "Campagnes SMS", href: "/login" },
    { name: "Tableau de bord", href: "/login" },
  ],
  Entreprise: [
    { name: "Documentation", href: "/documentation" },
    { name: "À propos", href: "#" },
    { name: "Blog", href: "#" },
    { name: "Carrières", href: "#", badge: "Recrute" },
    { name: "Contact", href: "#" },
  ],
  Légal: [
    { name: "Confidentialité", href: "#" },
    { name: "Conditions", href: "#" },
    { name: "Sécurité", href: "#security" },
  ],
};

const socialLinks = [
  { name: "Twitter", href: "#" },
  { name: "GitHub", href: "#" },
  { name: "LinkedIn", href: "#" },
];

export function FooterSection() {
  return (
    <footer className="relative bg-muted border-t border-border">
      <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12">
        {/* Main Footer */}
        <div className="py-16 lg:py-20">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-12 lg:gap-8">
            {/* Brand Column */}
            <div className="col-span-2">
              <a href="#" className="inline-flex items-center gap-2 mb-6">
                <ChapnetLogo markClassName="w-7 h-7" wordmarkClassName="text-xl" />
              </a>

              <p className="text-muted-foreground leading-relaxed mb-8 max-w-xs text-sm">
                Communiquez avec des milliers de personnes depuis une seule plateforme. Campagnes WhatsApp, Email et SMS simplifiées.
              </p>

              {/* Social Links */}
              <div className="flex gap-6">
                {socialLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 group"
                  >
                    {link.name}
                    <ArrowUpRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </a>
                ))}
              </div>
            </div>

            {/* Link Columns */}
            {Object.entries(footerLinks).map(([title, links]) => (
              <div key={title}>
                <h3 className="text-sm font-medium text-foreground mb-6">{title}</h3>
                <ul className="space-y-4">
                  {links.map((link) => (
                    <li key={link.name}>
                      <a
                        href={link.href}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2"
                      >
                        {link.name}
                        {"badge" in link && link.badge && (
                          <span className="text-xs px-2 py-0.5 brand-gradient text-white rounded-full">
                            {link.badge}
                          </span>
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="py-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; 2026 Chapnet. Tous droits réservés.
          </p>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#2E6BFF]" />
              Tous les canaux opérationnels
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
