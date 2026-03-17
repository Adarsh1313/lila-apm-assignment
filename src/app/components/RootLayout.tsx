import { Outlet } from "react-router";
import { Navigation } from "./Navigation";

export function RootLayout() {
  return (
    <div className="h-screen overflow-hidden bg-[var(--bg-base)] dark">
      <Navigation />
      <main className="h-full pt-[52px]">
        <Outlet />
      </main>
    </div>
  );
}
