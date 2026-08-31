// Minimal YAML-ish front-matter parser.
// Supports: scalars, "quoted strings", and inline arrays [a, b, c].
export function parseFrontmatter(raw) {
  const s = String(raw || "").replace(/\r\n/g, "\n");
  if (!s.startsWith("---\n")) return { data: {}, body: s };
  const end = s.indexOf("\n---", 4);
  if (end < 0) return { data: {}, body: s };

  const fm = s.slice(4, end);
  const body = s.slice(end + 4).replace(/^\n+/, "");
  const data = {};

  for (const ln of fm.split("\n")) {
    const m = ln.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if (val.startsWith("[") && val.endsWith("]")) {
      data[key] = val.slice(1, -1)
        .split(",")
        .map((x) => x.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else {
      data[key] = val.replace(/^["']|["']$/g, "");
    }
  }
  return { data, body };
}
