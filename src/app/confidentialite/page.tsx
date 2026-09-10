import { Card } from "@/components/ui/card";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart2,
  Mail,
  Server,
  Shield,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Confidentialité",
  description:
    "Ce que FaisTonPlein collecte, avec quel outil et pourquoi — sans donnée personnelle, sans cookie.",
};

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <p className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase">
        <Icon className="size-3.5" />
        {title}
      </p>
      <Card className="text-foreground gap-2 px-4 text-sm leading-relaxed">
        {children}
      </Card>
    </section>
  );
}

export default function ConfidentialitePage() {
  return (
    <div className="bg-background mx-auto flex min-h-dvh max-w-lg flex-col gap-6 p-6">
      <div>
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="size-4" />
          Retour à la carte
        </Link>
        <h1 className="mt-4 text-xl font-bold">Confidentialité</h1>
      </div>

      <Section icon={BarChart2} title="Données collectées">
        <p>
          FaisTonPlein utilise{" "}
          <a
            href="https://posthog.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            PostHog
          </a>{" "}
          (hébergé en Europe) pour comprendre comment l&apos;application est
          utilisée. Nous collectons des événements anonymes : mode de tri
          choisi, carburant sélectionné, ouverture d&apos;un itinéraire vers
          Google Maps ou Waze, qualité de connexion réseau.
        </p>
        <p>
          Aucune coordonnée GPS précise, aucun identifiant de station et aucune
          donnée permettant de vous identifier personnellement n&apos;est
          transmise.
        </p>
      </Section>

      <Section icon={Shield} title="Cookies et stockage local">
        <p>
          Aucun cookie de suivi n&apos;est utilisé. Les données d&apos;analytics
          sont stockées uniquement en mémoire de session et effacées dès la
          fermeture de l&apos;onglet — l&apos;enregistrement de session (Session
          Replay) est désactivé.
        </p>
        <p>
          Vos préférences (carburant favori, véhicule, mode de tri, rayon de
          recherche) sont sauvegardées dans le <em>localStorage</em> de votre
          navigateur. Elles ne quittent jamais votre appareil.
        </p>
      </Section>

      <Section icon={Server} title="Hébergement">
        <p>
          FaisTonPlein est déployé sur Vercel. Les données analytiques
          transitent vers PostHog Cloud EU (serveurs localisés dans l&apos;Union
          Européenne, conformes au RGPD).
        </p>
        <p>
          <a
            href="https://posthog.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            En savoir plus sur la politique de confidentialité de PostHog
          </a>
        </p>
      </Section>

      <Section icon={Mail} title="Nous contacter">
        <p>
          Une question sur ces pratiques ?{" "}
          <a href="mailto:baptistelechat.dev@gmail.com" className="underline">
            baptistelechat.dev@gmail.com
          </a>
        </p>
      </Section>
    </div>
  );
}
