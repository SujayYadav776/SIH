"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email("Enter a valid work email"),
  institution: z.string().min(1),
  role: z.enum(["placement_cell", "faculty", "principal", "other"]),
  message: z.string().max(600).optional(),
});
type Values = z.infer<typeof schema>;

export function ContactForm() {
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<Values>({ resolver: zodResolver(schema), defaultValues: { role: "placement_cell" } });

  const onSubmit = handleSubmit(async () => {
    // Demo: no CRM wired. A real build would call a Convex mutation or email here.
    toast.success("Thanks, we will be in touch.");
    reset();
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" id="name" error={errors.name?.message}>
          <Input id="name" {...register("name")} aria-describedby={errors.name ? "name-error" : undefined} />
        </Field>
        <Field label="Work email" id="email" error={errors.email?.message}>
          <Input id="email" type="email" {...register("email")} aria-describedby={errors.email ? "email-error" : undefined} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Institution" id="institution" error={errors.institution?.message}>
          <Input id="institution" {...register("institution")} aria-describedby={errors.institution ? "institution-error" : undefined} />
        </Field>
        <Field label="Your role" id="role">
          <Select value={watch("role")} onValueChange={(v) => setValue("role", v as Values["role"], { shouldValidate: true })}>
            <SelectTrigger id="role"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="placement_cell">Placement cell</SelectItem>
              <SelectItem value="faculty">Faculty</SelectItem>
              <SelectItem value="principal">Principal / Dean</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Message" id="message" error={errors.message?.message}>
        <Textarea id="message" rows={4} placeholder="Target role, city, cohort size…" {...register("message")} aria-describedby={errors.message ? "message-error" : undefined} />
      </Field>
      <div>
        <Button type="submit" disabled={isSubmitting} size="lg">{isSubmitting ? "Sending…" : "Book a cohort demo"}</Button>
      </div>
    </form>
  );
}

function Field({
  label,
  id,
  error,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p id={`${id}-error`} className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
