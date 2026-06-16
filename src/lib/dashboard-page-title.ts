export function getDashboardPageTitle(pathname: string): string {
  const pathOnly = pathname.split(/[?#]/, 1)[0] || pathname;
  const segments = pathOnly.split("/").filter(Boolean);
  const dashboardSegments =
    segments[0] === "en" || segments[0] === "zh" ? segments.slice(1) : segments;

  return dashboardSegments.at(-1) || "overview";
}
