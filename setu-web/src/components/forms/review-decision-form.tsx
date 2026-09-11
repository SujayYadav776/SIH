"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * The canonical submit pattern for Setu. forms (review actions, learner
 * onboarding, assessment submissions). Typed with zod + react-hook-form, inline
 * per-field errors, disabled-while-submitting. Phase 4 swaps the toast stub for
 * the real Convex mutation (e.g. learners.confirmEvidence).
 */

const schema = z.object({
  decision: z.enum(["accept", "reject"]),
  note: z.string().max(280).optional(),
});

type FormValues = z.infer<typeof schema>;

export function ReviewDecisionForm({ learnerSkill }: { learnerSkill?: string }) {
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { note: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    toast.success(
      `Recorded: ${values.decision}${values.note ? ` · ${values.note}` : ""}`,
    );
    reset();
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="decision">
          Review decision{learnerSkill ? ` · ${learnerSkill}` : ""}
        </Label>
        <Controller
          control={control}
          name="decision"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="decision" className="w-56">
                <SelectValue placeholder="Accept or reject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="accept">Accept extraction</SelectItem>
                <SelectItem value="reject">Reject / needs review</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {errors.decision && (
          <p className="text-xs text-destructive">Choose a decision.</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="note">Note (optional)</Label>
        <Input id="note" placeholder="Reason for the reviewer log" {...register("note")} />
        {errors.note && (
          <p className="text-xs text-destructive">Keep the note under 280 characters.</p>
        )}
      </div>

      <div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save decision"}
        </Button>
      </div>
    </form>
  );
}
