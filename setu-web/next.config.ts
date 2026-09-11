import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Convex backend lives in the sibling `setu-convex` repo and is
  // imported via the `@convex/*` tsconfig path alias. Widen Turbopack's root to
  // the parent so bundling that outside-the-app module resolves.
  turbopack: {
    root: path.resolve(process.cwd(), ".."),
  },
};

export default nextConfig;
