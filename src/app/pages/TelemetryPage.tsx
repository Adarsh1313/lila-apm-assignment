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
import { MapViewport } from "../components/MapViewport";
import {
  DATE_OPTIONS,
  MAPS,
  fetchPctAliveSeries,
  fetchPlayerCountSeries,
  fetchSpawnZones,
  fetchTelemetryOverview,
  getMapMeta,
  type MapId,
  type OverviewTotals,
} from "../lib/data";

type Tab = "overview" | "player-counts" | "pct-alive" | "spawn-zones";

const PIE_COLORS = ["#7b2fff", "#00e5ff", "#3fb950", "#f85149", "#d29922", "#60a5fa"];

export function TelemetryPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [date, setDate] = useState("All");
  const [spawnMap, setSpawnMap] = useState<MapId>("AmbroseValley");
  const [zoom, setZoom] = useState(1);
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
  const [spawnPoints, setSpawnPoints] = useState<{ id: string; x: number; y: number; player_type: "Human" | "Bot" }[]>([]);

  useEffect(() => {
    fetchTelemetryOverview().then(setOverview);
  }, []);

  useEffect(() => {
    Promise.all(MAPS.map((map) => fetchPlayerCountSeries(map.id, date))).then((results) => {
      setCountSeries({
        AmbroseValley: results[0],
        GrandRift: results[1],
        Lockdown: results[2],
      });
    });

    Promise.all(MAPS.map((map) => fetchPctAliveSeries(map.id, date))).then((results) => {
      setAliveSeries({
        AmbroseValley: results[0],
        GrandRift: results[1],
        Lockdown: results[2],
      });
    });
  }, [date]);

  useEffect(() => {
    fetchSpawnZones(spawnMap, date).then(setSpawnPoints);
  }, [date, spawnMap]);

  const combinedCounts = useMemo(
    () =>
      countSeries.AmbroseValley.map((entry, index) => ({
        elapsed_seconds: entry.elapsed_seconds,
        AmbroseValley: entry.count,
        GrandRift: countSeries.GrandRift[index]?.count ?? 0,
        Lockdown: countSeries.Lockdown[index]?.count ?? 0,
      })),
    [countSeries],
  );

  const combinedAlive = useMemo(
    () =>
      aliveSeries.AmbroseValley.map((entry, index) => ({
        elapsed_seconds: entry.elapsed_seconds,
        AmbroseValley: entry.pct_alive,
        GrandRift: aliveSeries.GrandRift[index]?.pct_alive ?? 0,
        Lockdown: aliveSeries.Lockdown[index]?.pct_alive ?? 0,
      })),
    [aliveSeries],
  );

  const spawnHumans = spawnPoints.filter((point) => point.player_type === "Human");
  const spawnBots = spawnPoints.filter((point) => point.player_type === "Bot");

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
            ["spawn-zones", "Spawn Zones"],
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
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={overview.mapDistribution} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={2}>
                      {overview.mapDistribution.map((entry, index) => (
                        <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Player Distribution">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={overview.playerDistribution} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={2}>
                      {overview.playerDistribution.map((entry, index) => (
                        <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
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

        {activeTab === "spawn-zones" ? (
          <div className="grid h-full grid-rows-[auto,1fr,auto] gap-3 overflow-hidden">
            <div className="flex items-center justify-between rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2">
              <div className="flex flex-wrap gap-2">
                {MAPS.map((map) => (
                  <button
                    key={map.id}
                    type="button"
                    onClick={() => setSpawnMap(map.id)}
                    className={`rounded-full border px-3 py-1 font-display text-[10px] uppercase tracking-[0.22em] ${
                      spawnMap === map.id
                        ? "border-[var(--purple)] bg-[var(--purple)] text-white"
                        : "border-[var(--border-subtle)] text-white/64"
                    }`}
                  >
                    {map.label}
                  </button>
                ))}
              </div>

              <select
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="rounded-md border border-[var(--border-subtle)] bg-black/20 px-3 py-2 text-sm text-white"
              >
                {DATE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <MapViewport
              imageUrl={getMapMeta(spawnMap).imageUrl}
              zoom={zoom}
              onZoomChange={setZoom}
              onWheel={(delta) => setZoom((current) => Math.min(2.5, Math.max(0.75, current + (delta > 0 ? -0.1 : 0.1))))}
            >
              {spawnHumans.map((point) => (
                <div
                  key={point.id}
                  className="absolute rounded-full blur-lg"
                  style={{
                    left: `${(point.x / 1024) * 100}%`,
                    top: `${(point.y / 1024) * 100}%`,
                    width: 28,
                    height: 28,
                    transform: "translate(-50%, -50%)",
                    background: "rgba(210, 153, 34, 0.58)",
                  }}
                />
              ))}
              {spawnBots.map((point) => (
                <div
                  key={point.id}
                  className="absolute rounded-full blur-lg"
                  style={{
                    left: `${(point.x / 1024) * 100}%`,
                    top: `${(point.y / 1024) * 100}%`,
                    width: 18,
                    height: 18,
                    transform: "translate(-50%, -50%)",
                    background: "rgba(96, 165, 250, 0.64)",
                  }}
                />
              ))}
            </MapViewport>

            <div className="flex items-center justify-between font-mono text-[12px] text-white/64">
              <span>Humans: {spawnHumans.length}</span>
              <span>Bots: {spawnBots.length}</span>
              <span>Total: {spawnPoints.length}</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
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
  backgroundColor: "#12121a",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "8px",
  color: "#ffffff",
};
