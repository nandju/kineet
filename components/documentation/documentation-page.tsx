"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  UserPlus,
  Settings,
  Users,
  Send,
  Mail,
  MessageSquare,
  Phone,
  Check,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChapnetLogo } from "@/components/landing/logo";
import { cn } from "@/lib/utils";

interface Step {
  title: string;
  description: string;
}

interface InfoBox {
  tone: "info" | "warning";
  text: string;
}

interface Section {
  id: string;
  number: string;
  icon: typeof UserPlus;
  eyebrow: string;
  title: string;
  intro: string;
  steps: Step[];
  info?: InfoBox[];
}

const SECTIONS: Section[] = [
  {
    id: "compte",
    number: "01",
    icon: UserPlus,
    eyebrow: "Prise en main",
    title: "Créer votre compte",
    intro:
      "Chapnet s'appuie sur Supabase Auth pour l'authentification. Chaque compte dispose de son propre espace : campagnes, listes de diffusion et configurations de fournisseurs sont isolés par utilisateur.",
    steps: [
      {
        title: "Inscription",
        description:
          "Créez un compte avec une adresse e-mail et un mot de passe. Un e-mail de confirmation est envoyé automatiquement — le compte n'est activé qu'après validation du lien reçu.",
      },
      {
        title: "Profil créé automatiquement",
        description:
          "Dès la confirmation, un profil (nom, avatar) est généré côté base de données et lié à votre compte. Vous pouvez le compléter depuis la section « Profil » du tableau de bord.",
      },
      {
        title: "Connexion",
        description:
          "Rendez-vous sur /login, saisissez votre e-mail et votre mot de passe. L'option « Se souvenir de moi » garde la session active. En cas d'erreur « e-mail non confirmé », vérifiez votre boîte de réception avant de réessayer.",
      },
    ],
    info: [
      {
        tone: "info",
        text: "Une fois connecté, vous êtes redirigé vers /dashboard — le tableau de bord central d'où partent toutes les actions suivantes.",
      },
    ],
  },
  {
    id: "fournisseurs",
    number: "02",
    icon: Settings,
    eyebrow: "Configuration",
    title: "Configurer vos fournisseurs d'envoi",
    intro:
      "Avant d'envoyer le moindre message, direction Paramètres → Fournisseurs. Chaque canal (Email, WhatsApp, SMS) a sa propre configuration, testée et enregistrée indépendamment.",
    steps: [
      {
        title: "Email (SMTP)",
        description:
          "Renseignez expéditeur, adresse e-mail, serveur SMTP, port, identifiants et sécurité (aucune / TLS / SSL). La signature et l'adresse de réponse sont optionnelles. Pour Gmail, utilisez un mot de passe d'application plutôt que votre mot de passe principal.",
      },
      {
        title: "WhatsApp",
        description:
          "Fournissez la clé API et le numéro de téléphone connecté à votre fournisseur WhatsApp compatible (ID Business optionnel).",
      },
      {
        title: "SMS (TextBee)",
        description:
          "Installez l'application TextBee sur un téléphone Android connecté à internet, enregistrez l'appareil sur app.textbee.dev/dashboard, puis reportez la clé API et l'identifiant d'appareil ici. Le Sender ID est optionnel.",
      },
      {
        title: "Enregistrer et tester",
        description:
          "Chaque bloc dispose d'un bouton « Enregistrer et tester » qui sauvegarde la configuration puis vérifie la connexion. Un badge « Connecté » ou « Configuré » confirme que le canal est prêt à l'emploi.",
      },
    ],
    info: [
      {
        tone: "warning",
        text: "TextBee ne publie pas de vérification de statut à l'enregistrement : la connexion réelle n'est confirmée qu'au premier SMS envoyé.",
      },
    ],
  },
  {
    id: "listes",
    number: "03",
    icon: Users,
    eyebrow: "Destinataires",
    title: "Ajouter vos listes de diffusion",
    intro:
      "La section « Listes de diffusion » permet de préparer vos destinataires une fois pour les réutiliser dans toutes vos campagnes, plutôt que de ressaisir les contacts à chaque envoi.",
    steps: [
      {
        title: "Créer une liste",
        description:
          "Cliquez sur « Nouvelle liste », donnez-lui un nom (ex. « Clients VIP ») et une description optionnelle.",
      },
      {
        title: "Ajouter des contacts",
        description:
          "Deux méthodes : saisie manuelle ligne par ligne (nom, prénom, contact) ou import direct d'un fichier .xlsx / .csv — les colonnes sont détectées automatiquement.",
      },
      {
        title: "Gérer une liste existante",
        description:
          "Ouvrez une liste depuis le tableau pour consulter ses contacts, en ajouter de nouveaux (saisie ou import) ou en retirer un par un. La liste peut être supprimée entièrement à tout moment.",
      },
    ],
  },
  {
    id: "envoi",
    number: "04",
    icon: Send,
    eyebrow: "Diffusion",
    title: "Envoyer des SMS et e-mails, en solo ou en masse",
    intro:
      "« Nouvelle campagne » ouvre un assistant en 5 étapes. Le même parcours sert aussi bien pour un message solo (un seul destinataire) que pour une campagne de masse (import ou liste entière) — seule la taille de la liste de destinataires change.",
    steps: [
      {
        title: "01 · Canal",
        description:
          "Choisissez WhatsApp, Email ou SMS. Le formulaire des étapes suivantes s'adapte automatiquement au canal sélectionné.",
      },
      {
        title: "02 · Expéditeur",
        description:
          "Confirmez les informations d'expédition pour ce canal (numéro, adresse e-mail + SMTP, etc.). Pour l'e-mail, un bouton « Tester la connexion » vérifie les identifiants avant d'aller plus loin.",
      },
      {
        title: "03 · Destinataires",
        description:
          "Pour un envoi solo, ajoutez ou saisissez un seul contact valide. Pour un envoi de masse, importez un fichier Excel/CSV ou ajoutez plusieurs lignes manuellement — chaque contact est validé en temps réel (badge « Valide » / « Invalide »).",
      },
      {
        title: "04 · Message",
        description:
          "Rédigez le message (et l'objet pour l'e-mail) en utilisant des variables de personnalisation : {{nom}}, {{prénom}}, {{entreprise}}, {{email}}, {{contact}}.",
      },
      {
        title: "05 · Aperçu",
        description:
          "Prévisualisez le message final tel qu'il sera reçu par un destinataire réel, variables remplacées et signature incluse.",
      },
      {
        title: "Récapitulatif et envoi",
        description:
          "Vérifiez canal, expéditeur, nombre de destinataires, message et coût estimé, puis cliquez sur « Envoyer ». La progression s'affiche en direct (envoyés / en attente / échecs) avec possibilité de mettre en pause et reprendre l'envoi à tout moment.",
      },
      {
        title: "Historique",
        description:
          "Chaque campagne — solo ou de masse — reste consultable dans « Historique », filtrable par canal et par statut, avec le détail des destinataires atteints ou en échec.",
      },
    ],
    info: [
      {
        tone: "info",
        text: "Astuce : pour réutiliser une liste de diffusion créée à l'étape 3, importez son export (.xlsx/.csv) depuis l'étape « Destinataires » de la nouvelle campagne.",
      },
    ],
  },
];

const CHANNEL_ICONS = [
  { icon: Mail, label: "Email" },
  { icon: MessageSquare, label: "WhatsApp" },
  { icon: Phone, label: "SMS" },
];

export function DocumentationPage() {
  const [activeId, setActiveId] = useState(SECTIONS[0].id);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
    );

    Object.values(sectionRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 h-20 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2">
            <ChapnetLogo markClassName="w-6 h-6" wordmarkClassName="text-xl" />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:inline">
              Accueil
            </Link>
            <Button asChild size="sm" className="rounded-full brand-gradient border-0 text-white hover:opacity-90">
              <Link href="/login">Se connecter</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-border">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-16 lg:py-24">
          <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-8">
            <span className="w-12 h-px bg-foreground/20" />
            Documentation
          </span>
          <h1 className="font-display font-extrabold text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[0.95] mb-6 max-w-4xl">
            Du compte au premier envoi.
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed mb-8">
            Le parcours complet pour utiliser Chapnet : créer votre compte, configurer vos fournisseurs
            d'envoi Email et SMS, préparer vos listes de diffusion, puis envoyer vos messages — à un
            destinataire ou à des milliers.
          </p>
          <div className="flex items-center gap-3">
            {CHANNEL_ICONS.map(({ icon: Icon, label }) => (
              <span key={label} className="inline-flex items-center gap-2 border border-border px-3 py-1.5 text-xs font-mono text-muted-foreground">
                <Icon className="w-3.5 h-3.5" /> {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Body: TOC + content */}
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-16 grid lg:grid-cols-[240px_1fr] gap-12">
        {/* Table of contents */}
        <nav className="hidden lg:block">
          <div className="sticky top-16 space-y-1">
            <p className="text-xs font-mono text-muted-foreground mb-4">Sommaire</p>
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 text-sm border-l-2 transition-colors",
                  activeId === s.id
                    ? "border-foreground text-foreground bg-secondary/50"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40",
                )}
              >
                <span className="font-mono text-xs">{s.number}</span>
                {s.title}
              </a>
            ))}
          </div>
        </nav>

        {/* Sections */}
        <div className="space-y-24 min-w-0">
          {SECTIONS.map((section) => (
            <section
              key={section.id}
              id={section.id}
              ref={(el) => { sectionRefs.current[section.id] = el; }}
              className="scroll-mt-16"
            >
              <div className="flex items-center gap-4 mb-6">
                <span className="text-5xl font-display text-muted-foreground/30">{section.number}</span>
                <div className="flex-1 h-px bg-border" />
                <section.icon className="w-5 h-5 text-muted-foreground shrink-0" />
              </div>

              <span className="text-sm font-mono text-muted-foreground mb-2 block">{section.eyebrow}</span>
              <h2 className="font-display text-3xl md:text-4xl tracking-tight mb-4">{section.title}</h2>
              <p className="text-muted-foreground leading-relaxed mb-8 max-w-2xl">{section.intro}</p>

              <div className="border border-border bg-card divide-y divide-border">
                {section.steps.map((step) => (
                  <div key={step.title} className="p-5 sm:p-6 flex flex-col sm:flex-row gap-2 sm:gap-6">
                    <div className="sm:w-52 shrink-0 flex items-start gap-2">
                      <Check className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium">{step.title}</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                  </div>
                ))}
              </div>

              {section.info?.map((box, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-start gap-3 border p-4 mt-4 text-sm",
                    box.tone === "warning"
                      ? "border-border bg-secondary/50 text-foreground"
                      : "border-border text-muted-foreground",
                  )}
                >
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{box.text}</span>
                </div>
              ))}
            </section>
          ))}
        </div>
      </div>

      {/* Closing CTA */}
      <section className="border-t border-border bg-secondary/30">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-16 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <h3 className="font-display text-2xl mb-2">Prêt à envoyer votre première campagne ?</h3>
            <p className="text-muted-foreground text-sm">Connectez-vous et suivez ces quatre étapes depuis le tableau de bord.</p>
          </div>
          <Button asChild size="lg" className="rounded-full bg-foreground text-background hover:bg-foreground/90 shrink-0">
            <Link href="/login">
              Ouvrir le tableau de bord <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
