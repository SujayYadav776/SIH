"use client";

import { useQuery } from "convex/react";

import { api } from "@/lib/api";

/**
 * Shared bootstrap for the coordinator screens: current user -> institution -> its
 * first cohort and the cohort's target occupation. Returns raw useQuery values so
 * callers can show their own loading / empty states.
 */
export function useCohortContext() {
  const user = useQuery(api.users.me);
  const institutionId = user?.institutionId;
  const cohorts = useQuery(
    api.cohorts.listForInstitution,
    institutionId ? { institutionId } : "skip",
  );
  const cohort = cohorts?.[0];
  return {
    user,
    institutionId,
    cohorts,
    cohort,
    cohortId: cohort?._id,
    occupationId: cohort?.targetRoleId,
  };
}
