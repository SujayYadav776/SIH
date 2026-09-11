import Link from "next/link";
import { ArrowRight, Building2 } from "lucide-react";

import { SiteHeader } from "@/components/marketing/site-header";

const footerLinks = [
  { href: "/product", label: "Product" },
  { href: "/institutions", label: "For institutions" },
  { href: "/evidence", label: "Evidence & trust" },
];

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="flex-1">{children}</main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 text-sm md:flex-row md:items-start md:justify-between md:px-6">
          <div>
            <div className="flex items-center gap-2 font-semibold">
              <span className="flex size-6 items-center justify-center rounded bg-primary text-primary-foreground"><Building2 className="size-3.5" /></span>
              KaushalLoop
            </div>
            <p className="mt-2 max-w-xs text-muted-foreground">Institutional employability intelligence. Demonstrated on a synthetic dataset.</p>
          </div>
          <div className="flex gap-12">
            <div className="flex flex-col gap-2">
              {footerLinks.map((l) => (
                <Link key={l.href} href={l.href} className="text-muted-foreground hover:text-foreground">{l.label}</Link>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <Link href="/contact" className="text-muted-foreground hover:text-foreground">Contact</Link>
              <Link href="/" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">Open the demo <ArrowRight className="size-3.5" /></Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
