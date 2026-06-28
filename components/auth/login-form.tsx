"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { notify } from "@/lib/kineet/notify";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "L'adresse e-mail est requise.")
    .email("Veuillez saisir une adresse e-mail valide."),
  password: z
    .string()
    .min(1, "Le mot de passe est requis.")
    .min(6, "Le mot de passe doit contenir au moins 6 caractères."),
  remember: z.boolean(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    notify.success("Connexion réussie", "Bienvenue sur Kineet.");
    router.push("/dashboard");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-md"
    >
      <div className="mb-10">
        <Link href="/" className="inline-flex items-center gap-2 group mb-12">
          <span className="font-display text-2xl tracking-tight text-foreground">KINEET</span>
          <span className="font-mono text-xs mt-1 text-muted-foreground">TM</span>
        </Link>
        <h1 className="font-display text-4xl lg:text-5xl tracking-tight text-foreground mb-4">
          Connectez-vous à votre compte Kineet
        </h1>
        <p className="text-muted-foreground">
          Accédez à votre tableau de bord pour gérer vos campagnes WhatsApp, Email et SMS.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="vous@entreprise.fr"
                    className="h-12 bg-input border-border"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mot de passe</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="h-12 bg-input border-border pr-12"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-center justify-between gap-4">
            <FormField
              control={form.control}
              name="remember"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="font-normal cursor-pointer">Se souvenir de moi</FormLabel>
                </FormItem>
              )}
            />
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => notify.info("Mot de passe oublié", "Un lien de réinitialisation simulé a été envoyé.")}
            >
              Mot de passe oublié ?
            </button>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 rounded-full bg-foreground hover:bg-foreground/90 text-background text-base"
          >
            {isSubmitting ? "Connexion..." : "Se connecter"}
          </Button>
        </form>
      </Form>
    </motion.div>
  );
}
