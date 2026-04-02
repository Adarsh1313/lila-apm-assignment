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

              <ChartCard title="Event Distribution" className="lg:col-span-2">
                <EventDistributionChart data={overview.eventDistribution} />
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

function DistributionPieChart({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  return <UnifiedDonutChart data={data} />;
}

function EventDistributionChart({ data }: { data: { name: string; value: number }[] }) {
  return <UnifiedDonutChart data={data} />;
}

function UnifiedDonutChart({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const entries = useMemo(
    () =>
      data
        .filter((entry) => Number(entry.value) > 0)
        .map((entry, index) => ({
          ...entry,
          color: PIE_COLORS[index % PIE_COLORS.length],
        })),
    [data],
  );
  const total = entries.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="h-[280px] w-full min-w-0">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={entries}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={110}
              innerRadius={65}
              paddingAngle={2}
              isAnimationActive={true}
              activeIndex={activeIndex}
              activeShape={renderActiveDonutShape}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(-1)}
              labelLine={false}
              label={(props) => renderCompactPieLabel({ ...props, dataLength: entries.length })}
            >
              {entries.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<PieTooltipContent total={total} />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[12px] text-[#a0aec0]">
        {entries.map((entry) => (
          <div key={entry.name} className="flex min-w-0 items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: entry.color }} />
            <span className="truncate">{entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderCompactPieLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  dataLength,
}: {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
  dataLength?: number;
}) {
  if (
    cx === undefined ||
    cy === undefined ||
    midAngle === undefined ||
    innerRadius === undefined ||
    outerRadius === undefined ||
    percent === undefined
  ) {
    return null;
  }

  if (percent < 0.15 || (dataLength ?? 0) > 4) {
    return null;
  }

  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const radian = Math.PI / 180;
  const x = cx + Math.cos(-midAngle * radian) * radius;
  const y = cy + Math.sin(-midAngle * radian) * radius;

  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={13}
      fontWeight={700}
      fill="#f8fafc"
      stroke="rgba(10,10,15,0.88)"
      strokeWidth={3}
      paintOrder="stroke"
    >
      {`${Math.round(percent * 100)}%`}
    </text>
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

function ChartCard({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={`flex min-h-[390px] flex-col rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 ${className}`}>
      <div className="mb-3 font-display text-[14px] font-semibold uppercase tracking-[0.08em] text-[#a0aec0]">{title}</div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

const tooltipStyle = {
  backgroundColor: "#1e2130",
  border: "1px solid #3a3f55",
  borderRadius: "6px",
  color: "#e5e7eb",
  padding: "8px 12px",
  fontSize: "13px",
  boxShadow: "0 18px 40px rgba(0, 0, 0, 0.24)",
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
      <div className="font-display text-[11px] uppercase tracking-[0.18em] text-white/62">{name}</div>
      <div className="mt-1 font-mono text-[13px] font-semibold text-white">{`${value.toLocaleString()} — ${percent.toFixed(1)}%`}</div>
    </div>
  );
}

function renderActiveDonutShape(props: {
  cx?: number;
  cy?: number;
  innerRadius?: number;
  outerRadius?: number;
  startAngle?: number;
  endAngle?: number;
  fill?: string;
}) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  if (
    cx === undefined ||
    cy === undefined ||
    innerRadius === undefined ||
    outerRadius === undefined ||
    startAngle === undefined ||
    endAngle === undefined
  ) {
    return null;
  }

  return (
    <g>
      <path
        d={describeDonutArc(cx, cy, innerRadius, outerRadius + 8, startAngle, endAngle)}
        fill={fill}
        stroke="rgba(255,255,255,0.18)"
        strokeWidth={2}
      />
    </g>
  );
}

function describeDonutArc(cx: number, cy: number, innerRadius: number, outerRadius: number, startAngle: number, endAngle: number) {
  const startOuter = polarToCartesian(cx, cy, outerRadius, endAngle);
  const endOuter = polarToCartesian(cx, cy, outerRadius, startAngle);
  const startInner = polarToCartesian(cx, cy, innerRadius, endAngle);
  const endInner = polarToCartesian(cx, cy, innerRadius, startAngle);
  const largeArcFlag = Math.abs(endAngle - startAngle) <= 180 ? "0" : "1";

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${endOuter.x} ${endOuter.y}`,
    `L ${endInner.x} ${endInner.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${startInner.x} ${startInner.y}`,
    "Z",
  ].join(" ");
}

function polarToCartesian(cx: number, cy: number, radius: number, angle: number) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
}
