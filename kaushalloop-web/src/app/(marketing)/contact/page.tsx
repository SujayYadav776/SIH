import type { Metadata } from "next";

import { ContactForm } from "@/components/marketing/contact-form";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-10 px-4 py-16 md:grid-cols-2 md:px-6 md:py-20">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Book a cohort demo</h1>
        <p className="mt-3 text-muted-foreground">
          Tell us the target role, city and cohort size. We will set up a pilot on your data and walk through the gap map and intervention plan.
        </p>
        <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
          <li>One role family and one geography is enough to start.</li>
          <li>Demonstrated on a synthetic dataset; architecture supports institution-provided data.</li>
        </ul>
      </div>
      <div className="rounded-2xl border bg-card p-6">
        <ContactForm />
      </div>
    </div>
  );
}
