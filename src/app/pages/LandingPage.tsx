import { useEffect, useState } from "react";
import { Link } from "react-router";
import { MAPS, fetchStats, type MapId } from "../lib/data";

type LandingStats = Record<MapId, { matches: number; players: number }>;

export function LandingPage() {
  const [stats, setStats] = useState<LandingStats>({
    AmbroseValley: { matches: 0, players: 0 },
    GrandRift: { matches: 0, players: 0 },
    Lockdown: { matches: 0, players: 0 },
  });

  useEffect(() => {
    Promise.all(MAPS.map((map) => fetchStats(map.id))).then((results) => {
      setStats({
        AmbroseValley: { matches: results[0].matches, players: results[0].total_players },
        GrandRift: { matches: results[1].matches, players: results[1].total_players },
        Lockdown: { matches: results[2].matches, players: results[2].total_players },
      });
    });
  }, []);

  return (
    <div className="flex h-full items-center justify-center overflow-auto bg-[var(--bg-primary)] px-8 py-16">
      <div className="w-full max-w-[1100px]">
        <div className="mb-14 text-center">
          <h1 className="font-display text-[58px] font-bold uppercase tracking-[0.12em] text-[var(--text-primary)]">LILA BLACK</h1>
          <p className="mt-2 font-display text-[18px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
            Game Telemetry &amp; Player Journey Visualization
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {MAPS.map((map) => (
            <Link
              key={map.id}
              to={`/map/${map.slug}`}
              className="group relative overflow-hidden rounded-[8px] border-2 border-[var(--bg-tertiary)] bg-[var(--bg-secondary)] transition-all duration-200 hover:-translate-y-1.5 hover:border-[var(--accent)] hover:shadow-[0_12px_40px_var(--accent-glow)]"
            >
              <img src={map.imageUrl} alt={map.label} className="h-[280px] w-full object-cover brightness-[0.7] transition duration-300 group-hover:scale-105 group-hover:brightness-100" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/25 to-black/85" />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <div className="mb-1 font-display text-[24px] font-bold uppercase tracking-[0.08em] text-[var(--text-primary)]">
                  {map.label}
                </div>
                <div className="mb-4 h-1.5 w-24 bg-[var(--accent)]" />
                <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 text-[12px] uppercase">
                  <div className="font-body tracking-[0.08em] text-[var(--text-secondary)]">Unique Matches</div>
                  <div className="font-mono text-[var(--text-primary)]">{stats[map.id].matches.toLocaleString()}</div>
                  <div className="font-body tracking-[0.08em] text-[var(--text-secondary)]">Unique Players</div>
                  <div className="font-mono text-[var(--text-primary)]">{stats[map.id].players.toLocaleString()}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
