import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router";
import { MapViewport } from "../components/MapViewport";
import {
  DATE_OPTIONS,
  fetchHeatmap,
  fetchMatches,
  fetchStats,
  fetchStormDeaths,
  getMapBySlug,
  getMapMeta,
  shortId,
  type GlobalStats,
  type HeatmapPoint,
  type MatchSummary,
} from "../lib/data";
import { useAppData } from "../context/AppDataContext";

type ActiveLayer = "loot" | "kills" | "storm" | "deaths" | null;
type KillType = "hh" | "hb" | "bh" | "bb";
type DeathFilter = "all" | "human" | "bot";

const killTypeLabels: Record<KillType, string> = {
  hh: "Human kills Human",
  hb: "Human kills Bot",
  bh: "Bot kills Human",
  bb: "Bot kills Bot",
};

export function MapAnalysisPage() {
  const location = useLocation();
  const map = useMemo(() => getMapBySlug(location.pathname.split("/").pop() || ""), [location.pathname]);
  const { mapConfigs, mapConfigStatus } = useAppData();

  const [date, setDate] = useState("All");
  const [matchId, setMatchId] = useState("All");
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [lootPoints, setLootPoints] = useState<HeatmapPoint[]>([]);
  const [killPoints, setKillPoints] = useState<HeatmapPoint[]>([]);
  const [deathPoints, setDeathPoints] = useState<HeatmapPoint[]>([]);
  const [stormPoints, setStormPoints] = useState<HeatmapPoint[]>([]);
  const [activeLayer, setActiveLayer] = useState<ActiveLayer>("loot");
  const [killTypes, setKillTypes] = useState<KillType[]>(["hh", "hb", "bh", "bb"]);
  const [deathFilter, setDeathFilter] = useState<DeathFilter>("all");
  const [showGrid, setShowGrid] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [heatmapOpacity, setHeatmapOpacity] = useState(70);
  const [measureMode, setMeasureMode] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<{ x: number; y: number }[]>([]);
  const [hoveredPoint, setHoveredPoint] = useState<{ point: HeatmapPoint; label: string } | null>(null);

  useEffect(() => {
    if (!map) {
      return;
    }

    setDate("All");
    setMatchId("All");
    setMeasureMode(false);
    setMeasurePoints([]);
    setZoom(1);
    fetchMatches(map.id).then(setMatches);
  }, [map]);

  useEffect(() => {
    if (!map) {
      return;
    }

    fetchStats(map.id, date, matchId).then(setStats);
    fetchHeatmap(map.id, "loot", date, matchId).then(setLootPoints);
    fetchHeatmap(map.id, "kills", date, matchId).then(setKillPoints);
    fetchHeatmap(map.id, "deaths", date, matchId).then(setDeathPoints);
    fetchStormDeaths(map.id, date, matchId).then(setStormPoints);
  }, [date, map, matchId]);

  const visibleMatches = useMemo(
    () => matches.filter((entry) => date === "All" || entry.date === date),
    [date, matches],
  );

  useEffect(() => {
    if (matchId !== "All" && !visibleMatches.some((entry) => entry.match_id === matchId)) {
      setMatchId("All");
    }
  }, [matchId, visibleMatches]);

  if (!map) {
    return <div className="flex h-full items-center justify-center text-white">Unknown map.</div>;
  }

  const killCounts = useMemo(() => {
    const counts = { hh: 0, hb: 0, bh: 0, bb: 0 };
    killPoints.forEach((point) => {
      const kind = point.kind as KillType | undefined;
      if (kind) {
        counts[kind] += 1;
      }
    });
    return counts;
  }, [killPoints]);

  const deathCounts = useMemo(
    () => ({
      all: deathPoints.length,
      human: deathPoints.filter((point) => point.player_type === "Human").length,
      bot: deathPoints.filter((point) => point.player_type === "Bot").length,
    }),
    [deathPoints],
  );

  const stormCounts = useMemo(
    () => ({
      all: stormPoints.length,
      human: stormPoints.filter((point) => point.player_type === "Human").length,
      bot: stormPoints.filter((point) => point.player_type === "Bot").length,
    }),
    [stormPoints],
  );

  const visibleKillPoints = killPoints.filter((point) => {
    const kind = point.kind as KillType | undefined;
    return kind ? killTypes.includes(kind) : true;
  });

  const visibleDeathPoints = deathPoints.filter((point) => {
    if (deathFilter === "all") {
      return true;
    }
    return deathFilter === "human" ? point.player_type === "Human" : point.player_type === "Bot";
  });

  const activePoints =
    activeLayer === "loot"
      ? lootPoints
      : activeLayer === "kills"
        ? visibleKillPoints
        : activeLayer === "deaths"
          ? visibleDeathPoints
          : activeLayer === "storm"
            ? stormPoints
            : [];

  const lootHotspots = useMemo(() => {
    if (lootPoints.length === 0) {
      return [];
    }

    const gridSize = 28;
    const bucketSize = 1024 / gridSize;
    const buckets = new Map<string, { xTotal: number; yTotal: number; count: number }>();

    lootPoints.forEach((point) => {
      const column = Math.min(gridSize - 1, Math.max(0, Math.floor(point.x / bucketSize)));
      const row = Math.min(gridSize - 1, Math.max(0, Math.floor(point.y / bucketSize)));
      const key = `${column}-${row}`;
      const current = buckets.get(key) ?? { xTotal: 0, yTotal: 0, count: 0 };
      current.xTotal += point.x;
      current.yTotal += point.y;
      current.count += 1;
      buckets.set(key, current);
    });

    const maxCount = Math.max(...Array.from(buckets.values(), (bucket) => bucket.count));
    return Array.from(buckets.entries()).map(([key, bucket]) => ({
      key,
      x: bucket.xTotal / bucket.count,
      y: bucket.yTotal / bucket.count,
      intensity: bucket.count / maxCount,
      count: bucket.count,
    }));
  }, [lootPoints]);

  const measurement =
    measurePoints.length === 2
      ? (() => {
          const [a, b] = measurePoints;
          const pixelDistance = Math.hypot(b.x - a.x, b.y - a.y);
          const imageSize = mapConfigs?.[map.id]?.image_size ?? 1024;
          const scale = mapConfigs?.[map.id]?.scale ?? 0;
          const meters = scale ? (pixelDistance / imageSize) * scale : 0;
          const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
          return {
            pixelDistance,
            meters,
            angle,
            midpoint: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
          };
        })()
      : null;

  const activeBadge = [date !== "All" ? date : null, matchId !== "All" ? shortId(matchId) : null]
    .filter(Boolean)
    .join(" · ");

  const statRows = [
    { label: "Unique Matches", value: stats?.matches ?? 0 },
    { label: "Unique Players", value: stats?.total_players ?? 0 },
    { label: "Humans", value: stats?.humans ?? 0, valueClass: "text-[var(--storm-blue)]" },
    { label: "Bots", value: stats?.bots ?? 0, valueClass: "text-[var(--kill-red)]" },
    {
      label: "Avg Match Duration",
      value: formatDuration(stats?.avg_match_duration_seconds ?? 0),
    },
    { divider: true },
    { label: "Total Kills", value: stats?.total_kills ?? 0, valueClass: "text-[var(--kill-red)]", active: activeLayer === "kills" },
    { label: "Total Deaths", value: stats?.total_deaths ?? 0, valueClass: "text-[var(--death-orange)]", active: activeLayer === "deaths" },
    { label: "Storm Deaths", value: stats?.storm_deaths ?? 0, valueClass: "text-[var(--storm-blue)]", active: activeLayer === "storm" },
    { label: "Total Loot Events", value: stats?.total_loot_events ?? 0, valueClass: "text-[var(--loot-yellow)]", active: activeLayer === "loot" },
  ];

  const toggleMeasureMode = () => {
    setMeasurePoints([]);
    setMeasureMode(true);
  };

  return (
    <div className="h-full overflow-hidden bg-[var(--bg-base)] p-4">
      <div className="flex h-full gap-4">
        <aside className="flex w-[220px] flex-shrink-0 flex-col overflow-y-auto rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3">
          <SectionTitle>Filters</SectionTitle>
          <LabeledSelect label="Date" value={date} onChange={setDate} options={DATE_OPTIONS} />
          <LabeledSelect
            label="Match ID"
            value={matchId}
            onChange={setMatchId}
            options={["All", ...visibleMatches.map((entry) => entry.match_id)]}
            formatOption={(value) => {
              if (value === "All") {
                return value;
              }
              const currentMatch = visibleMatches.find((entry) => entry.match_id === value);
              return currentMatch ? `${shortId(value)} · ${currentMatch.date}` : shortId(value);
            }}
          />

          <SectionTitle className="mt-5">Heatmaps</SectionTitle>
          <RadioOption label="Loot" count={lootPoints.length} active={activeLayer === "loot"} color="var(--loot-yellow)" onClick={() => setActiveLayer("loot")} />
          <RadioOption label="Kills" count={killPoints.length} active={activeLayer === "kills"} color="var(--kill-red)" onClick={() => setActiveLayer("kills")} />
          {activeLayer === "kills" ? (
            <div className="mb-3 ml-5 space-y-2">
              {(Object.keys(killTypeLabels) as KillType[]).map((type) => (
                <label
                  key={type}
                  className="flex min-w-0 items-center gap-2 rounded-md border border-transparent px-2 py-1 text-[11px] text-white/72 transition hover:border-white/8 hover:bg-white/4"
                >
                  <input
                    type="checkbox"
                    className="shrink-0 accent-[var(--purple)]"
                    checked={killTypes.includes(type)}
                    onChange={() =>
                      setKillTypes((current) =>
                        current.includes(type) ? current.filter((entry) => entry !== type) : [...current, type],
                      )
                    }
                  />
                  <span className="min-w-0 flex-1 truncate">{killTypeLabels[type]}</span>
                  <CountBadge count={killCounts[type]} />
                </label>
              ))}
            </div>
          ) : null}
          <RadioOption
            label="Storm Deaths"
            count={stormCounts.all}
            active={activeLayer === "storm"}
            color="var(--storm-blue)"
            onClick={() => setActiveLayer("storm")}
          />
          <RadioOption label="Deaths" count={deathCounts.all} active={activeLayer === "deaths"} color="var(--death-orange)" onClick={() => setActiveLayer("deaths")} />
          {activeLayer === "deaths" ? (
            <div className="mb-3 ml-5 space-y-2">
              {[
                { value: "all", label: "All Deaths", count: deathCounts.all },
                { value: "human", label: "Human Deaths only", count: deathCounts.human },
                { value: "bot", label: "Bot Deaths only", count: deathCounts.bot },
              ].map((option) => (
                <label
                  key={option.value}
                  className="flex min-w-0 items-center gap-2 rounded-md border border-transparent px-2 py-1 text-[11px] text-white/72 transition hover:border-white/8 hover:bg-white/4"
                >
                  <input
                    type="radio"
                    name="death-filter"
                    className="shrink-0 accent-[var(--purple)]"
                    checked={deathFilter === option.value}
                    onChange={() => setDeathFilter(option.value as DeathFilter)}
                  />
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  <CountBadge count={option.count} />
                </label>
              ))}
            </div>
          ) : null}

          <SectionTitle className="mt-2">Map Tools</SectionTitle>
          <ToolButton active={measureMode} disabled={mapConfigStatus !== "ready"} onClick={toggleMeasureMode}>
            Measure Mode
          </ToolButton>
          <ToolButton active={showGrid} onClick={() => setShowGrid((current) => !current)}>
            {showGrid ? "Hide Grid" : "Show Grid"}
          </ToolButton>
          <div className="mb-3 rounded-md border border-[var(--border-subtle)] bg-black/20 px-3 py-2">
            <div className="mb-2 flex items-center justify-between font-display text-[10px] uppercase tracking-[0.18em] text-white/68">
              <span>Heatmap Opacity</span>
              <span className="font-mono text-[11px] normal-case tracking-normal text-white/82">{heatmapOpacity}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={heatmapOpacity}
              onChange={(event) => setHeatmapOpacity(Number(event.target.value))}
              className="w-full accent-[var(--purple)]"
            />
          </div>
          <ToolButton
            onClick={() => {
              setActiveLayer(null);
              setMeasureMode(false);
              setMeasurePoints([]);
            }}
          >
            Hide All
          </ToolButton>
          <ToolButton
            onClick={() => {
              setDate("All");
              setMatchId("All");
              setActiveLayer("loot");
              setShowGrid(false);
              setHeatmapOpacity(70);
              setMeasureMode(false);
              setMeasurePoints([]);
            }}
          >
            Reset
          </ToolButton>

          <div className="mt-auto rounded-md border border-[var(--border-subtle)] bg-black/20 px-3 py-2 text-[10px] text-white/56">
            {mapConfigStatus === "ready"
              ? "Measure mode uses the backend map scale and coordinate conversion."
              : "Measure mode is disabled until /map-configs is available."}
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <div className="h-full">
            <MapViewport
              imageUrl={getMapMeta(map.id).imageUrl}
              zoom={zoom}
              onZoomChange={setZoom}
              onWheel={(delta) => setZoom((current) => Math.min(2.5, Math.max(0.75, current + (delta > 0 ? -0.1 : 0.1))))}
              cursor={measureMode ? "crosshair" : "default"}
              imageOpacity={0.85}
              overlayOpacity={0.06}
            >
              {measureMode ? (
                <button
                  type="button"
                  className="absolute inset-0 z-10 h-full w-full"
                  onClick={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    const x = ((event.clientX - rect.left) / rect.width) * 1024;
                    const y = ((event.clientY - rect.top) / rect.height) * 1024;
                    setMeasurePoints((current) => {
                      if (current.length === 2) {
                        return [{ x, y }];
                      }
                      const next = [...current, { x, y }];
                      if (next.length === 2) {
                        setMeasureMode(false);
                      }
                      return next;
                    });
                  }}
                />
              ) : null}

              {showGrid ? <GridOverlay /> : null}

              {activeLayer === "storm" || activeLayer === "deaths"
                ? activePoints.map((point) => (
                    <button
                      key={point.id}
                      type="button"
                      className="absolute z-20 text-center"
                      style={{
                        left: `${(point.x / 1024) * 100}%`,
                        top: `${(point.y / 1024) * 100}%`,
                        transform: "translate(-50%, -50%)",
                        color: activeLayer === "storm" ? "var(--storm-blue)" : "var(--death-orange)",
                        fontSize: activeLayer === "storm" ? 18 : 16,
                        lineHeight: 1,
                        opacity: heatmapOpacity / 100,
                        textShadow:
                          activeLayer === "storm"
                            ? "0 0 10px rgba(96, 165, 250, 0.35)"
                            : "0 0 10px rgba(251, 146, 60, 0.28)",
                      }}
                      onMouseEnter={() => setHoveredPoint({ point, label: activeLayer === "storm" ? "Storm Death" : "Death" })}
                      onMouseLeave={() => setHoveredPoint(null)}
                    >
                      ☠
                    </button>
                  ))
                : activeLayer === "kills"
                  ? activePoints.map((point) => (
                    <div
                      key={point.id}
                      className="absolute rounded-full blur-xl"
                      style={{
                        left: `${(point.x / 1024) * 100}%`,
                        top: `${(point.y / 1024) * 100}%`,
                        width: 80 * (point.intensity ?? 0.5),
                        height: 80 * (point.intensity ?? 0.5),
                        transform: "translate(-50%, -50%)",
                        background: `rgba(248, 81, 73, ${0.16 + (heatmapOpacity / 100) * 0.42})`,
                      }}
                    />
                    ))
                  : activeLayer === "loot"
                    ? lootHotspots.map((spot) => (
                      <div
                        key={spot.key}
                        className="absolute rounded-full blur-2xl"
                        style={{
                          left: `${(spot.x / 1024) * 100}%`,
                          top: `${(spot.y / 1024) * 100}%`,
                          width: 36 + spot.intensity * 86,
                          height: 36 + spot.intensity * 86,
                          transform: "translate(-50%, -50%)",
                          background: `rgba(210, 153, 34, ${(0.08 + spot.intensity * 0.28) * (heatmapOpacity / 100)})`,
                        }}
                      />
                    ))
                  : null}

              {measurePoints.map((point, index) => (
                <div
                  key={`${point.x}-${point.y}`}
                  className="absolute z-30"
                  style={{
                    left: `${(point.x / 1024) * 100}%`,
                    top: `${(point.y / 1024) * 100}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <div className="h-3 w-3 rounded-full border border-black bg-white" />
                  <div className="mt-1 text-center font-display text-xs font-semibold text-white">{index === 0 ? "A" : "B"}</div>
                </div>
              ))}

              {measurement ? (
                <>
                  <div
                    className="absolute z-20 bg-white"
                    style={{
                      left: `${(measurement.midpoint.x / 1024) * 100}%`,
                      top: `${(measurement.midpoint.y / 1024) * 100}%`,
                      width: `${(measurement.pixelDistance / 1024) * 100}%`,
                      height: 2,
                      transform: `translate(-50%, -50%) rotate(${measurement.angle}deg)`,
                      transformOrigin: "center",
                    }}
                  />
                  <div
                    className="absolute z-30 rounded bg-black/70 px-2 py-1 font-mono text-[11px] text-white"
                    style={{
                      left: `${(measurement.midpoint.x / 1024) * 100}%`,
                      top: `${(measurement.midpoint.y / 1024) * 100}%`,
                      transform: "translate(-50%, -140%)",
                    }}
                  >
                    {`${measurement.meters.toFixed(1)}m (${measurement.pixelDistance.toFixed(0)}px)`}
                  </div>
                </>
              ) : null}

              {hoveredPoint ? (
                <div className="absolute bottom-4 left-4 z-40 rounded-md border border-[var(--border-subtle)] bg-[#161919] px-3 py-2 text-[11px] text-white shadow-xl">
                  <div className="font-display text-xs uppercase tracking-[0.2em] text-white/72">{hoveredPoint.label}</div>
                  <div>
                    {hoveredPoint.point.player_type} · {shortId(hoveredPoint.point.match_id ?? "")}
                  </div>
                  <div className="font-mono text-white/64">
                    X {hoveredPoint.point.world_x?.toFixed(2) ?? "0.00"} / Z {hoveredPoint.point.world_z?.toFixed(2) ?? "0.00"}
                  </div>
                  <div className="text-white/64">Survived {Math.round(hoveredPoint.point.survived_time ?? 0)}s</div>
                </div>
              ) : null}
            </MapViewport>
          </div>
        </section>

        <aside className="flex min-h-0 w-[280px] flex-col overflow-hidden rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3">
          <div className="flex items-center justify-between">
            <SectionTitle className="mt-0">Stats Overview</SectionTitle>
          </div>
          {activeBadge ? (
            <button
              type="button"
              className="mb-4 flex items-center justify-between rounded-md border border-[var(--border-subtle)] bg-black/20 px-3 py-2 text-left text-[11px] text-white/80"
              onClick={() => {
                setDate("All");
                setMatchId("All");
              }}
            >
              <span>Filtered: {activeBadge}</span>
              <span className="font-display text-sm">×</span>
            </button>
          ) : null}

          <div className="panel-scroll min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {statRows.map((row, index) =>
              "divider" in row ? (
                <div key={`divider-${index}`} className="my-3 h-px bg-[var(--border-subtle)]" />
              ) : (
                <div
                  key={row.label}
                  className={`rounded-r-md px-3 py-2 ${
                    row.active ? "border-l-[3px] border-[var(--purple)] bg-white/4" : "border-l-[3px] border-transparent"
                  }`}
                >
                  <div className="font-display text-[9px] uppercase tracking-[0.28em] text-white/42">{row.label}</div>
                  <div className={`mt-1 text-lg font-bold text-white ${row.valueClass ?? ""}`}>{row.value}</div>
                </div>
              ),
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function formatDuration(totalSeconds: number) {
  const wholeSeconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(wholeSeconds / 3600);
  const minutes = Math.floor((wholeSeconds % 3600) / 60);
  const seconds = wholeSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
}

function CountBadge({ count }: { count: number }) {
  return (
    <span className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-md border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none text-[var(--text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      {count.toLocaleString()}
    </span>
  );
}

function GridOverlay() {
  return (
    <>
      <svg className="absolute inset-0 z-10 h-full w-full">
        {Array.from({ length: 11 }, (_, index) => (
          <g key={index}>
            <line x1={`${index * 10}%`} y1="0%" x2={`${index * 10}%`} y2="100%" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
            <line x1="0%" y1={`${index * 10}%`} x2="100%" y2={`${index * 10}%`} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
          </g>
        ))}
      </svg>
      {Array.from({ length: 10 }, (_, y) =>
        Array.from({ length: 10 }, (_, x) => (
          <div
            key={`${x}-${y}`}
            className="absolute z-20 font-mono text-[10px] text-white/56"
            style={{ left: `${x * 10 + 1}%`, top: `${y * 10 + 1}%` }}
          >
            {String.fromCharCode(65 + x)}
            {y + 1}
          </div>
        )),
      )}
    </>
  );
}

function SectionTitle({ children, className = "" }: { children: string; className?: string }) {
  return (
    <div className={`mb-3 font-display text-[11px] font-semibold uppercase tracking-[0.28em] text-white/54 ${className}`}>
      {children}
    </div>
  );
}

function LabeledSelect({
  label,
  value,
  onChange,
  options,
  formatOption,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  formatOption?: (value: string) => string;
}) {
  return (
    <label className="mb-3 block">
      <div className="mb-1 font-display text-[9px] uppercase tracking-[0.28em] text-white/42">{label}</div>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-[var(--border-subtle)] bg-black/20 px-3 py-2 text-sm text-white outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {formatOption ? formatOption(option) : option}
          </option>
        ))}
      </select>
    </label>
  );
}

function RadioOption({
  label,
  count,
  active,
  color,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  color: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="mb-3 flex w-full min-w-0 items-center gap-3 text-left">
      <span
        className={`h-3.5 w-3.5 rounded-full border ${active ? "border-transparent" : "border-white/24"}`}
        style={{ background: active ? color : "transparent" }}
      />
      <span className={`min-w-0 flex-1 truncate font-display text-[12px] uppercase tracking-[0.18em] ${active ? "text-white" : "text-white/68"}`}>{label}</span>
      <CountBadge count={count} />
    </button>
  );
}

function ToolButton({
  children,
  active = false,
  disabled = false,
  onClick,
}: {
  children: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`mb-2 rounded-md border px-3 py-2 font-display text-[11px] uppercase tracking-[0.18em] transition ${
        active
          ? "border-[var(--purple)] bg-[var(--purple)] text-white"
          : "border-[var(--border-subtle)] bg-black/20 text-white/72 hover:border-white/20"
      } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
    >
      {children}
    </button>
  );
}
