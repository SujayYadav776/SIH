"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const config = {
  demand: {
    label: "% of target postings",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function DemandChart({ data }: { data: { skill: string; demand: number }[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
        No demand data yet.
      </div>
    );
  }
  return (
    <figure className="m-0">
      <ChartContainer config={config} className="h-[240px] w-full">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="skill" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis tickLine={false} axisLine={false} width={40} domain={[0, 100]} unit="%" />
          <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel indicator="line" />} />
          <Bar dataKey="demand" fill="var(--color-demand)" radius={[4, 4, 0, 0]} maxBarSize={44} />
        </BarChart>
      </ChartContainer>
      <figcaption className="sr-only">
        Skill demand bar chart, share of target postings requiring each skill.{" "}
        {data.map((d) => `${d.skill} ${d.demand} percent`).join(", ")}.
      </figcaption>
    </figure>
  );
}
