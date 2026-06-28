import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-background flex">
      <div className="flex-1 flex items-center justify-center px-6 lg:px-12 py-16">
        <LoginForm />
      </div>
      <div className="hidden lg:flex flex-1 relative overflow-hidden border-l border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-secondary to-background" />
        <div className="relative z-10 flex flex-col justify-center px-16">
          <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-8">
            <span className="w-12 h-px bg-foreground/20" />
            Campagnes multi-canal
          </span>
          <h2 className="font-display text-5xl tracking-tight text-foreground leading-[0.95] mb-6">
            Communiquez avec des milliers de personnes depuis une seule plateforme.
          </h2>
          <p className="text-muted-foreground text-lg max-w-md leading-relaxed">
            WhatsApp, Email et SMS — créez, prévisualisez et suivez vos campagnes en temps réel.
          </p>
        </div>
        <img
          src="/images/shield.png"
          alt="Illustration Kineet"
          className="absolute bottom-0 right-0 w-[65%] opacity-30 object-contain pointer-events-none"
        />
      </div>
    </main>
  );
}
