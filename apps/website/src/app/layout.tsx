import type { Metadata } from "next";
import Link from "next/link";
import { Fraunces, Work_Sans } from "next/font/google";
import UnifiedFooter from "../components/UnifiedFooter";
import "./globals.css";

const displayFont = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

const bodyFont = Work_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const navItems = [
  { label: "Home", href: "/" },
  { label: "Studio", href: "/studio" },
  { label: "Projects", href: "/projects" },
  { label: "Farm", href: "/farm" },
  { label: "Principles", href: "/principles" },
  { label: "LCAA", href: "/lcaa" },
  { label: "Partners", href: "/partners" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export const metadata: Metadata = {
  title: "A Curious Tractor | Regenerative Innovation Studio",
  description:
    "A regenerative innovation studio stewarding a working farm on Jinibara Country.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body className="min-h-screen bg-[#F6F1E7] font-[var(--font-sans)] text-[#2F3E2E] antialiased">
        <div className="mx-auto flex min-h-screen max-w-[1200px] flex-col px-6">
          <header className="sticky top-0 z-40 -mx-6 border-b border-[#E4D7BF] bg-[#F6F1E7]/90 px-6 py-4 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Link
                href="/"
                className="text-lg font-semibold uppercase tracking-[0.2em]"
              >
                <span className="font-[var(--font-display)]">A Curious Tractor</span>
              </Link>
              <nav className="flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.2em] text-[#5A4A3A]">
                {navItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="transition hover:text-[#2F3E2E]"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>
          <main className="flex-1 py-10 md:py-16">{children}</main>
          <UnifiedFooter
            currentProject="A Curious Tractor"
            showProjects={true}
            customLinks={[
              { label: "About", href: "/about" },
              { label: "Studio", href: "/studio" },
              { label: "Projects", href: "/projects" },
              { label: "Principles", href: "/principles" },
              { label: "How We Work", href: "/how-we-work" },
              { label: "Partners", href: "/partners" },
              { label: "Contact", href: "/contact" },
            ]}
            contactEmail="hi@act.place"
          />
        </div>
      </body>
    </html>
  );
}
