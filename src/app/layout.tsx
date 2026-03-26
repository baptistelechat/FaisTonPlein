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
  title: "FaisTonPlein",
  description: "Comparateur de prix de carburant local-first",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={cn(manrope.variable, spaceGrotesk.variable, "bg-background text-foreground font-sans antialiased")}
      >
        <DuckDBProvider>
          <FuelDataLoader />
          {children}
        </DuckDBProvider>
      </body>
    </html>
  );
}
