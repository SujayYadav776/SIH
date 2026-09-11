"use client";

import type { ReactNode } from "react";
import { ConvexProvider as ConvexProviderBase } from "convex/react";

import { convex } from "@/lib/convex";

export function ConvexProvider({ children }: { children: ReactNode }) {
  return <ConvexProviderBase client={convex}>{children}</ConvexProviderBase>;
}
