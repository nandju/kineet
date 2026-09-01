import type { Metadata } from "next";
import { DocumentationPage } from "@/components/documentation/documentation-page";

export const metadata: Metadata = {
  title: "Documentation — CHAPNET",
  description:
    "Le parcours complet Chapnet : création de compte, configuration des fournisseurs Email et SMS, listes de diffusion et envoi de campagnes solo ou de masse.",
};

export default function Page() {
  return <DocumentationPage />;
}
