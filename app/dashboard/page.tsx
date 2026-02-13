"use client";

import { useState, useEffect } from "react";
import type { DashboardRow, EngagementEvent } from "@/app/lib/analytics-types";

interface DashboardData {
  rows: DashboardRow[];
  engagements: EngagementEvent[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-muted">Loading...</p>
      </main>
    );
  }

  if (!data || data.rows.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-muted">No data yet. Make some searches first!</p>
      </main>
    );
  }

  const totalSearches = data.rows.length;
  const totalClicks = data.rows.filter((r) => r.clicked).length;
  const clickRate = totalSearches > 0 ? Math.round((totalClicks / totalSearches) * 100) : 0;
  const avgEngagement =
    data.engagements.length > 0
      ? Math.round(
          data.engagements.reduce((sum, e) => sum + e.duration, 0) /
            data.engagements.length,
        )
      : 0;

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-8 text-xl font-semibold">Dashboard</h1>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold">{totalSearches}</p>
          <p className="text-xs text-muted">Searches</p>
        </div>
        <div className="rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold">{totalClicks}</p>
          <p className="text-xs text-muted">Clicks</p>
        </div>
        <div className="rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold">{clickRate}%</p>
          <p className="text-xs text-muted">Click rate</p>
        </div>
        <div className="rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold">{avgEngagement}s</p>
          <p className="text-xs text-muted">Avg. time on page</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-xs text-muted">
            <tr>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Query</th>
              <th className="px-4 py-3">Result</th>
              <th className="px-4 py-3">Clicked</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-border last:border-0"
              >
                <td className="whitespace-nowrap px-4 py-3 text-muted">
                  {new Date(row.timestamp).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded bg-foreground/10 px-1.5 py-0.5 text-[10px] font-medium uppercase">
                    {row.type}
                  </span>
                </td>
                <td className="px-4 py-3">{row.query}</td>
                <td className="max-w-48 truncate px-4 py-3 text-muted">
                  {row.resultName}
                </td>
                <td className="px-4 py-3">
                  {row.clicked ? (
                    <span className="text-green-500">Yes</span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
