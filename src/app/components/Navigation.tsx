import { Link, useLocation } from "react-router";
import { MAPS } from "../lib/data";

export function Navigation() {
  const location = useLocation();

  const navItems = [
    ...MAPS.map((map) => ({ label: map.label.toUpperCase(), path: `/map/${map.slug}` })),
    { label: "TELEMETRY", path: "/telemetry" },
    { label: "MATCH REPLAY", path: "/match-replay" },
    { label: "PLAYER PROFILES", path: "/player-profiles" },
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="fixed inset-x-0 top-0 z-50 h-[52px] border-b border-[var(--bg-tertiary)] bg-[var(--bg-primary)]">
      <div className="flex h-full items-center justify-between px-5">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold tracking-[0.14em] text-[var(--text-primary)]">
          <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
          LILA BLACK
        </Link>
        
        <div className="flex h-full items-center gap-6">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`relative flex h-full items-center font-display text-[14px] font-semibold uppercase tracking-[0.08em] transition-colors ${
                isActive(item.path)
                  ? "text-[var(--text-primary)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              {item.label}
              {isActive(item.path) && (
                <div className="absolute inset-x-0 bottom-0 h-0.5 bg-[var(--accent)]" />
              )}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
