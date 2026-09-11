import { ConvexReactClient } from "convex/react";

/**
 * Single Convex client for the whole app. Points at NEXT_PUBLIC_CONVEX_URL
 * (set in .env.local); falls back to the local dev backend so the build and
 * SSR never crash on a missing env var. Swap in ConvexProviderWithConvexAuth
 * (in convex-provider.tsx) once auth is wired.
 */
const url = process.env.NEXT_PUBLIC_CONVEX_URL ?? "http://127.0.0.1:3210";

export const convex = new ConvexReactClient(url);
