import { DuckDBProvider } from "@/components/DuckDBProvider";
import { FuelDataLoader } from "@/components/FuelDataLoader";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "FaisTonPlein",
    template: "%s | FaisTonPlein",
  },
  description:
    "Trouvez la station-service la moins chère près de chez vous. Comparez les prix du Gazole, E10, SP95, SP98, E85 et GPLc en temps réel.",
  keywords: [
    "prix carburant",
    "station-service",
    "comparer carburant",
    "gazole",
    "essence",
    "E10",
    "SP95",
    "SP98",
    "E85",
    "GPLc",
    "France",
  ],
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon.png", type: "image/png" },
    ],
    apple: { url: "/icon.png" },
  },
  openGraph: {
    title: "FaisTonPlein",
    description:
      "Trouvez la station-service la moins chère près de chez vous. Comparez les prix des carburants en France.",
    type: "website",
    locale: "fr_FR",
    siteName: "FaisTonPlein",
  },
  twitter: {
    card: "summary",
    title: "FaisTonPlein",
    description: "Trouvez la station-service la moins chère près de chez vous.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={cn(
          manrope.variable,
          spaceGrotesk.variable,
          "bg-background text-foreground font-sans antialiased",
        )}
      >
        <DuckDBProvider>
          <FuelDataLoader />
          {children}
        </DuckDBProvider>
      </body>
    </html>
  );
}
