import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  DATE_OPTIONS,
  MAPS,
  fetchPctAliveSeries,
  fetchPlayerCountSeries,
  fetchTelemetryOverview,
  type MapId,
  type OverviewTotals,
} from "../lib/data";

type Tab = "overview" | "player-counts" | "pct-alive";

const PIE_COLORS = ["#7b2fff", "#00e5ff", "#3fb950", "#f85149", "#d29922", "#60a5fa"];

export function TelemetryPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [date, setDate] = useState("All");
  const [overview, setOverview] = useState<OverviewTotals>({
    totalMatches: 0,
    totalPlayers: 0,
    totalEvents: 0,
    totalHumans: 0,
    totalBots: 0,
    totalMaps: 0,
    totalDays: 0,
    stormDeaths: 0,
    eventsByDay: [],
    eventsByMapDay: [],
    mapDistribution: [],
    playerDistribution: [],
    eventDistribution: [],
  });
  const [countSeries, setCountSeries] = useState<Record<MapId, { elapsed_seconds: number; count: number }[]>>({
    AmbroseValley: [],
    GrandRift: [],
    Lockdown: [],
  });
  const [aliveSeries, setAliveSeries] = useState<Record<MapId, { elapsed_seconds: number; pct_alive: number }[]>>({
    AmbroseValley: [],
    GrandRift: [],
    Lockdown: [],
  });

  useEffect(() => {
    let active = true;

    fetchTelemetryOverview()
      .then((result) => {
        if (active) {
          setOverview(result);
        }
      })
      .catch((error) => {
        console.error("Failed to load telemetry overview", error);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    Promise.allSettled(MAPS.map((map) => fetchPlayerCountSeries(map.id, date))).then((results) => {
      if (!active) {
        return;
      }

      setCountSeries({
        AmbroseValley: results[0].status === "fulfilled" ? results[0].value : [],
        GrandRift: results[1].status === "fulfilled" ? results[1].value : [],
        Lockdown: results[2].status === "fulfilled" ? results[2].value : [],
      });

      results.forEach((result, index) => {
        if (result.status === "rejected") {
          console.error(`Failed to load player counts for ${MAPS[index].id}`, result.reason);
        }
      });
    });

    Promise.allSettled(MAPS.map((map) => fetchPctAliveSeries(map.id, date))).then((results) => {
      if (!active) {
        return;
      }

      setAliveSeries({
        AmbroseValley: results[0].status === "fulfilled" ? results[0].value : [],
        GrandRift: results[1].status === "fulfilled" ? results[1].value : [],
        Lockdown: results[2].status === "fulfilled" ? results[2].value : [],
      });

      results.forEach((result, index) => {
        if (result.status === "rejected") {
          console.error(`Failed to load pct alive series for ${MAPS[index].id}`, result.reason);
        }
      });
    });

    return () => {
      active = false;
    };
  }, [date]);

  const combinedCounts = useMemo(() => mergeSeriesByElapsed(countSeries, "count"), [countSeries]);
  const combinedAlive = useMemo(() => mergeSeriesByElapsed(aliveSeries, "pct_alive"), [aliveSeries]);

  const stats = [
    { label: "Total Matches", value: overview.totalMatches.toLocaleString() },
    { label: "Unique Players", value: overview.totalPlayers.toLocaleString() },
    { label: "Total Events", value: overview.totalEvents.toLocaleString() },
    { label: "Humans", value: overview.totalHumans.toLocaleString() },
    { label: "Bots", value: overview.totalBots.toLocaleString() },
    { label: "Maps", value: overview.totalMaps },
    { label: "Days", value: overview.totalDays },
    { label: "Storm Deaths", value: overview.stormDeaths.toLocaleString() },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--bg-base)] px-4 pb-4 pt-3">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <div className="font-display text-[11px] uppercase tracking-[0.32em] text-white/40">Telemetry</div>
          <h1 className="text-[28px] font-semibold text-white">Telemetry Overview</h1>
        </div>
      </div>

      <div className="mb-4 border-b border-[var(--border-subtle)]">
        <div className="flex gap-6">
          {[
            ["overview", "Overview"],
            ["player-counts", "Player Counts"],
            ["pct-alive", "% Alive Over Time"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id as Tab)}
              className={`relative pb-3 font-display text-[12px] font-semibold uppercase tracking-[0.24em] ${
                activeTab === id ? "text-white" : "text-white/48"
              }`}
            >
              {label}
              {activeTab === id ? <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[var(--purple)]" /> : null}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {activeTab === "overview" ? (
          <div className="grid h-full grid-rows-[auto,1fr] gap-4 overflow-hidden">
            <div className="rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-5 py-5">
              <div className="mb-5 text-center font-display text-[12px] uppercase tracking-[0.38em] text-[var(--loot-yellow)]">Overview</div>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-8">
                {stats.map((stat) => (
                  <div key={stat.label} className="border-l border-white/8 pl-4 first:border-l-0 first:pl-0">
                    <div className="font-mono text-2xl font-semibold text-white">{stat.value}</div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-white/42">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel-scroll grid min-h-0 grid-cols-1 gap-4 overflow-y-auto pr-1 lg:grid-cols-2">
              <ChartCard title="Events by Day">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overview.eventsByDay}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                    <XAxis dataKey="label" stroke="rgba(255,255,255,0.45)" />
                    <YAxis stroke="rgba(255,255,255,0.45)" />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend />
                    {extractSeriesKeys(overview.eventsByDay).map((key, index) => (
                      <Bar key={key} dataKey={key} stackId="events" fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Events by Map per Day">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overview.eventsByMapDay}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                    <XAxis dataKey="label" stroke="rgba(255,255,255,0.45)" />
                    <YAxis stroke="rgba(255,255,255,0.45)" />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend />
                    {extractSeriesKeys(overview.eventsByMapDay).map((key, index) => (
                      <Bar key={key} dataKey={key} stackId="maps" fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Map Distribution">
                <DistributionPieChart data={overview.mapDistribution} />
              </ChartCard>

              <ChartCard title="Player Distribution">
                <DistributionPieChart data={overview.playerDistribution} />
              </ChartCard>

              <ChartCard title="Event Distribution">
                <DistributionPieChart data={overview.eventDistribution} />
              </ChartCard>
            </div>
          </div>
        ) : null}

        {activeTab === "player-counts" ? (
          <TelemetryChartPanel
            title="Player Counts Over Time"
            date={date}
            onDateChange={setDate}
            chart={
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={combinedCounts}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="elapsed_seconds" stroke="rgba(255,255,255,0.4)" tickFormatter={(value) => `${Math.round(value / 60)}m`} />
                  <YAxis stroke="rgba(255,255,255,0.4)" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Line type="monotone" dataKey="AmbroseValley" stroke="#7b2fff" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="GrandRift" stroke="#00e5ff" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="Lockdown" stroke="#3fb950" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            }
          />
        ) : null}

        {activeTab === "pct-alive" ? (
          <TelemetryChartPanel
            title="% Alive Over Time"
            date={date}
            onDateChange={setDate}
            chart={
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={combinedAlive}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="elapsed_seconds" stroke="rgba(255,255,255,0.4)" tickFormatter={(value) => `${Math.round(value / 60)}m`} />
                  <YAxis domain={[0, 100]} stroke="rgba(255,255,255,0.4)" tickFormatter={(value) => `${value}%`} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <ReferenceLine y={50} stroke="rgba(255,255,255,0.25)" strokeDasharray="6 6" />
                  <Line type="monotone" dataKey="AmbroseValley" stroke="#7b2fff" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="GrandRift" stroke="#00e5ff" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="Lockdown" stroke="#3fb950" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            }
          />
        ) : null}
      </div>
    </div>
  );
}

function DistributionPieChart({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart margin={{ top: 10, right: 40, bottom: 10, left: 40 }}>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={58}
          outerRadius={92}
          paddingAngle={2}
          labelLine={false}
          label={(props) => renderPieCallout({ ...props, total })}
        >
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<PieTooltipContent total={total} />} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

function extractSeriesKeys(rows: Array<Record<string, string | number>>) {
  const keys = new Set<string>();
  rows.forEach((row) => {
    Object.keys(row).forEach((key) => {
      if (key !== "label") {
        keys.add(key);
      }
    });
  });
  return Array.from(keys);
}

function mergeSeriesByElapsed(
  seriesByMap: Record<MapId, { elapsed_seconds: number; [key: string]: number }[]>,
  valueKey: "count" | "pct_alive",
) {
  const rows = new Map<number, Record<string, string | number>>();

  MAPS.forEach((map) => {
    seriesByMap[map.id].forEach((entry) => {
      const row = rows.get(entry.elapsed_seconds) ?? { elapsed_seconds: entry.elapsed_seconds };
      row[map.id] = entry[valueKey] ?? 0;
      rows.set(entry.elapsed_seconds, row);
    });
  });

  return Array.from(rows.values())
    .sort((a, b) => Number(a.elapsed_seconds) - Number(b.elapsed_seconds))
    .map((row) => ({
      elapsed_seconds: Number(row.elapsed_seconds),
      AmbroseValley: Number(row.AmbroseValley ?? 0),
      GrandRift: Number(row.GrandRift ?? 0),
      Lockdown: Number(row.Lockdown ?? 0),
    }));
}

function TelemetryChartPanel({
  title,
  date,
  onDateChange,
  chart,
}: {
  title: string;
  date: string;
  onDateChange: (value: string) => void;
  chart: ReactNode;
}) {
  return (
    <div className="grid h-full grid-rows-[auto,1fr] gap-4 rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
      <div className="flex items-center justify-between">
        <div className="font-display text-[15px] font-semibold uppercase tracking-[0.18em] text-white">{title}</div>
        <select value={date} onChange={(event) => onDateChange(event.target.value)} className="rounded-md border border-[var(--border-subtle)] bg-black/20 px-3 py-2 text-sm text-white">
          {DATE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <div className="h-full min-h-0">{chart}</div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="grid h-[320px] grid-rows-[auto,1fr] rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
      <div className="mb-3 font-display text-[12px] uppercase tracking-[0.28em] text-[var(--loot-yellow)]">{title}</div>
      <div className="h-full min-h-0">{children}</div>
    </div>
  );
}

const tooltipStyle = {
  backgroundColor: "#ffffff",
  border: "1px solid rgba(15,23,42,0.12)",
  borderRadius: "8px",
  color: "#111827",
  boxShadow: "0 18px 40px rgba(0, 0, 0, 0.18)",
};

function PieTooltipContent({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; payload?: { name: string; value: number } }>;
  total: number;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const entry = payload[0];
  const value = Number(entry.value ?? entry.payload?.value ?? 0);
  const name = entry.name ?? entry.payload?.name ?? "";
  const percent = total > 0 ? (value / total) * 100 : 0;

  return (
    <div style={tooltipStyle} className="min-w-[140px] px-3 py-2 text-[12px]">
      <div className="font-display text-[11px] uppercase tracking-[0.18em] text-black/65">{name}</div>
      <div className="mt-1 font-mono text-[13px] font-semibold text-black">{value.toLocaleString()}</div>
      <div className="mt-1 text-[12px] text-black/75">{percent.toFixed(1)}%</div>
    </div>
  );
}

function renderPieCallout({
  cx,
  cy,
  midAngle,
  outerRadius,
  percent,
  name,
  fill,
}: {
  cx?: number;
  cy?: number;
  midAngle?: number;
  outerRadius?: number;
  percent?: number;
  name?: string;
  fill?: string;
  total?: number;
}) {
  if (
    cx === undefined ||
    cy === undefined ||
    midAngle === undefined ||
    outerRadius === undefined ||
    percent === undefined
  ) {
    return null;
  }

  const radian = Math.PI / 180;
  const angle = -midAngle * radian;
  const startX = cx + Math.cos(angle) * (outerRadius + 2);
  const startY = cy + Math.sin(angle) * (outerRadius + 2);
  const elbowX = cx + Math.cos(angle) * (outerRadius + 24);
  const elbowY = cy + Math.sin(angle) * (outerRadius + 24);
  const lineEndX = elbowX + (Math.cos(angle) >= 0 ? 30 : -30);
  const textAnchor = Math.cos(angle) >= 0 ? "start" : "end";
  const textX = lineEndX + (textAnchor === "start" ? 6 : -6);
  const percentLabel = `${Math.round(percent * 100)}%`;

  return (
    <g>
      <path
        d={`M${startX},${startY} L${elbowX},${elbowY} L${lineEndX},${elbowY}`}
        fill="none"
        stroke={fill ?? "#ffffff"}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <text
        x={textX}
        y={elbowY - 4}
        textAnchor={textAnchor}
        fontSize={16}
        fontWeight={700}
        fill="#f8fafc"
        stroke="rgba(10,10,15,0.92)"
        strokeWidth={4}
        paintOrder="stroke"
      >
        {percentLabel}
      </text>
      <text
        x={textX}
        y={elbowY + 14}
        textAnchor={textAnchor}
        fontSize={11}
        fill="rgba(248,250,252,0.82)"
        stroke="rgba(10,10,15,0.92)"
        strokeWidth={3}
        paintOrder="stroke"
      >
        {name}
      </text>
    </g>
  );
}
