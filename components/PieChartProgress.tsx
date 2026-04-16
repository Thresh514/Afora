"use client";

import * as React from "react";
import { Label, Pie, PieChart } from "recharts";

import { Card, CardContent } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export function PieChartProgress({
  tasksCompleted,
  totalTasks,
}: {
  tasksCompleted: number;
  totalTasks: number;
}) {
  const chartData = [
    { status: "Completed", counts: tasksCompleted, fill: "#000000" },
    {
      status: "In Progress",
      counts: totalTasks - tasksCompleted,
      fill: "#e5e7eb",
    },
  ];

  const chartConfig = {
    completed: {
      label: "Completed",
      color: "#000000",
    },
    inProgress: {
      label: "In Progress",
      color: "#e5e7eb",
    },
  } satisfies ChartConfig;

  return (
    <Card className="flex flex-col h-full">
      <CardContent className="flex-1 pb-0 max-h-[200px]">
        {totalTasks === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-muted-foreground">No Tasks Currently. Try creating some!</span>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[200px]">
            <PieChart>
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={chartData}
                dataKey="counts"
                nameKey="status"
                innerRadius={55}
                strokeWidth={10}
              >
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="flex flex-col items-center justify-center"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-foreground text-3xl font-bold"
                          >
                            {((tasksCompleted / totalTasks) * 100).toFixed(0) + "%"}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 24}
                            className="fill-muted-foreground"
                          >
                            Completed
                          </tspan>
                        </text>
                      );
                    }
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
export default PieChartProgress;
