import React, { useEffect, useMemo, useState } from "react";

/* ========== tiny helpers (in-file) ========== */







//It gives a dashboard for all the property data, has a filter based on type(All, House, property),  
//+ based on bedrooms + search. Shows meadian price, average price and an active filter showing what have been 
//applied, and an option to re-fetch. It also provides a table of resulted items. 
const styles = {
  page: { minHeight: "100vh", background: "#0b0d10", color: "#e7edf3", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" },
  container: { maxWidth: 1120, margin: "0 auto", padding: 20 },
  header: { display: "flex", gap: 12, justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap" },
  title: { margin: 0, fontSize: 24, fontWeight: 700 },
  subtitle: { margin: 4, marginLeft: 0, fontSize: 12, color: "#9aa4af" },
  btn: { padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: "#e7edf3", cursor: "pointer" },
  input: { padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: "#e7edf3" },
  card: { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 16, marginTop: 16 },
  grid4: { display: "grid", gap: 16, gridTemplateColumns: "repeat(4, minmax(0,1fr))", marginTop: 16 },
  grid3: { display: "grid", gap: 16, gridTemplateColumns: "repeat(3, minmax(0,1fr))", marginTop: 16 },
  kpiLabel: { fontSize: 12, color: "#9aa4af" },
  kpiValue: { fontSize: 24, fontWeight: 700, lineHeight: 1.1 },
  small: { fontSize: 12, color: "#9aa4af" },
  tableWrap: { maxHeight: 340, overflow: "auto", border: "1px solid #202834", borderRadius: 12 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  thtd: { padding: "8px 10px", borderTop: "1px solid #202834", whiteSpace: "nowrap" },
  thead: { position: "sticky", top: 0, background: "#141a21" },
  row: { display: "flex", gap: 8, flexWrap: "wrap" },
};

const fmtAud0 = (n) =>
  Number.isFinite(n) ? n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }) : "—";

const toNumber = (v) => {
  if (v === null || v === undefined) return NaN;
  if (typeof v === "number") return isFinite(v) ? v : NaN;
  const t = String(v).trim();
  if (/^(nan|none)$/i.test(t)) return NaN;
  const cleaned = t.replace(/[^0-9.\-]/g, "");
  const n = Number(cleaned);
  return isFinite(n) ? n : NaN;
};

const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : NaN);
const median = (arr) => {
  if (!arr.length) return NaN;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// handle non-JSON tokens returned by the API (NaN/Infinity)
const sanitizeParse = (text) => {
  const trimmed = (text || "").trim();
  if (trimmed.startsWith("<")) throw new Error("Server returned HTML");
  const safe = trimmed.replace(/\bNaN\b/g, "null").replace(/\b-Infinity\b/g, "null").replace(/\bInfinity\b/g, "null");
  return JSON.parse(safe);
};

// normalize API shape to flat rows
const normalizeApi = (json) => {
  const list = Array.isArray(json?.results) ? json.results : Array.isArray(json) ? json : [];
  return list.map((r, i) => {
    const at = r.attributes || {};
    const addr = r.address || {};
    return {
      id: i + 1,
      listingDate: r.listing_date ? r.listing_date.slice(0, 10) : "",
      street: addr.street || r.area_name || "",
      suburb: addr.sal || "",
      state: addr.state || "",
      propertyType: r.property_type || "",
      price: toNumber(r.price),
      bedrooms: toNumber(at.bedrooms),
      bathrooms: toNumber(at.bathrooms),
      landSize: toNumber(at.land_size),
      garage: toNumber(at.garage_spaces),
    };
  });
};

/* ========== App (single file) ========== */
export default function App() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("Ready");
  const [suburbQuery, setSuburbQuery] = useState("Belmont North");

  // simple filters to keep the dashboard useful
  const [searchQuery, setSearchQuery] = useState("");
  const [propertyType, setPropertyType] = useState("All");
  const [minBedrooms, setMinBedrooms] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0); // 0 = no cap

  useEffect(() => {
    fetchFromApi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchFromApi() {
    setStatus("Loading…");
    const query = encodeURIComponent(suburbQuery).replace(/%20/g, "+");
    const proxyUrl = `/api/suburb/properties?suburb=${query}`;
    const directUrl = `https://www.microburbs.com.au/report_generator/api/suburb/properties?suburb=${query}`;
    try {
      // Try proxy path first (works when Vite proxy is set; avoids CORS)
      let res = await fetch(proxyUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      let txt = await res.text();
      const json = sanitizeParse(txt);
      const mapped = normalizeApi(json);
      setRows(mapped);
      setStatus(`Loaded ${mapped.length} records ✔`);
    } catch (e1) {
      try {
        // Fallback to direct URL (adds headers); may CORS in browser, but we try.
        let res = await fetch(directUrl, {
          headers: { Authorization: "Bearer test", "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        let txt = await res.text();
        const json = sanitizeParse(txt);
        const mapped = normalizeApi(json);
        setRows(mapped);
        setStatus(`Loaded ${mapped.length} records ✔ (direct)`);
      } catch (e2) {
        setRows([]);
        setStatus(`Fetch failed: ${e2.message}`);
      }
    }
  }

  // derived/filtering
  const propertyTypes = useMemo(
    () => ["All", ...Array.from(new Set(rows.map((r) => r.propertyType).filter(Boolean)))],
    [rows]
  );

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const matchQ = searchQuery
        ? `${r.street} ${r.suburb} ${r.propertyType}`.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      const matchType = propertyType === "All" || r.propertyType === propertyType;
      const matchBeds = !minBedrooms || (Number.isFinite(r.bedrooms) && r.bedrooms >= minBedrooms);
      const matchPrice = !maxPrice || (Number.isFinite(r.price) && r.price <= maxPrice);
      return matchQ && matchType && matchBeds && matchPrice;
    });
  }, [rows, searchQuery, propertyType, minBedrooms, maxPrice]);

  // KPIs
  const prices = filtered.map((r) => r.price).filter(Number.isFinite);
  const beds = filtered.map((r) => r.bedrooms).filter(Number.isFinite);
  const kpis = {
    count: filtered.length,
    medianPrice: median(prices),
    avgPrice: mean(prices),
    medianBedrooms: median(beds),
  };

  // tiny “bar view” of average price by property type (no chart lib)
  const avgByType = useMemo(() => {
    const m = new Map();
    filtered.forEach((r) => {
      const k = r.propertyType || "—";
      if (!m.has(k)) m.set(k, []);
      if (Number.isFinite(r.price)) m.get(k).push(r.price);
    });
    const rows = Array.from(m.entries()).map(([type, arr]) => ({
      type,
      avg: Math.round(mean(arr)),
    }));
    const max = rows.reduce((mx, r) => (Number.isFinite(r.avg) ? Math.max(mx, r.avg) : mx), 0);
    return { rows, max };
  }, [filtered]);

  const maxKnownPrice = useMemo(
    () => Math.max(0, ...rows.map((r) => r.price).filter(Number.isFinite)),
    [rows]
  );

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Belmont North Property Dashboard</h1>
            <p style={styles.subtitle}>
              Live from your API. Simple KPIs • Compact visuals • Table.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button style={styles.btn} onClick={fetchFromApi}>Refetch</button>
            <span style={styles.small}>{status}</span>
          </div>
        </div>

        {/* Controls */}
        <div style={styles.card}>
          <div style={styles.small}>Controls</div>
          <div style={{ ...styles.row, marginTop: 6 }}>
            <input
              style={styles.input}
              placeholder="Suburb (e.g. Belmont North)"
              value={suburbQuery}
              onChange={(e) => setSuburbQuery(e.target.value)}
            />
            <button style={styles.btn} onClick={fetchFromApi}>Fetch</button>
          </div>
          <div style={{ ...styles.row, marginTop: 8 }}>
            <input
              style={styles.input}
              placeholder="Search street/type…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select style={styles.input} value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
              {propertyTypes.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <input
              style={styles.input}
              type="number"
              min={0}
              placeholder="Min beds"
              value={minBedrooms}
              onChange={(e) => setMinBedrooms(Number(e.target.value))}
            />
            <input
              style={styles.input}
              type="number"
              min={0}
              placeholder="Max price (AUD)"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
            />
            <span style={styles.small}>Max known: {maxKnownPrice ? maxKnownPrice.toLocaleString("en-AU") : "—"}</span>
          </div>
        </div>

        {/* KPIs */}
        <div style={styles.grid4}>
          <div style={styles.card}>
            <div style={styles.kpiLabel}>Median Price</div>
            <div style={styles.kpiValue}>{fmtAud0(kpis.medianPrice)}</div>
            <div style={styles.small}>{kpis.count} listings</div>
          </div>
          <div style={styles.card}>
            <div style={styles.kpiLabel}>Average Price</div>
            <div style={styles.kpiValue}>{fmtAud0(kpis.avgPrice)}</div>
          </div>
          <div style={styles.card}>
            <div style={styles.kpiLabel}>Median Bedrooms</div>
            <div style={styles.kpiValue}>{Number.isFinite(kpis.medianBedrooms) ? kpis.medianBedrooms : "—"}</div>
          </div>
          <div style={styles.card}>
            <div style={styles.kpiLabel}>Active Filters</div>
            <div style={{ fontSize: 16 }}>
              {[propertyType !== "All" && propertyType, searchQuery && `“${searchQuery}”`, minBedrooms ? `${minBedrooms}+ beds` : null, maxPrice ? `≤ ${fmtAud0(maxPrice)}` : null]
                .filter(Boolean)
                .join(" • ") || "None"}
            </div>
          </div>
        </div>

        {/* Mini “bar” view by property type */}
        <div style={styles.card}>
          <div style={styles.small}>Average Price by Property Type</div>
          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            {avgByType.rows.length === 0 && <div style={styles.small}>No data</div>}
            {avgByType.rows.map((r) => {
              const pct = avgByType.max ? Math.round((r.avg / avgByType.max) * 100) : 0;
              return (
                <div key={r.type} style={{ display: "grid", gridTemplateColumns: "160px 1fr auto", gap: 8, alignItems: "center" }}>
                  <div style={styles.small}>{r.type || "—"}</div>
                  <div style={{ height: 10, background: "#0f1a26", border: "1px solid #213147", borderRadius: 999 }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: "#2e7dd7", borderRadius: 999 }} />
                  </div>
                  <div style={styles.small}>{fmtAud0(r.avg)}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Table */}
        <div style={styles.card}>
          <div style={styles.small}>Listings ({filtered.length})</div>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead style={styles.thead}>
                <tr>
                  {["date","street","suburb","state","type","price","beds","baths","land m²","garage"].map((h) => (
                    <th key={h} style={styles.thtd}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td style={styles.thtd}>{r.listingDate || "—"}</td>
                    <td style={styles.thtd}>{r.street}</td>
                    <td style={styles.thtd}>{r.suburb}</td>
                    <td style={styles.thtd}>{r.state}</td>
                    <td style={styles.thtd}>{r.propertyType || "—"}</td>
                    <td style={styles.thtd}>{fmtAud0(r.price)}</td>
                    <td style={styles.thtd}>{Number.isFinite(r.bedrooms) ? r.bedrooms : "—"}</td>
                    <td style={styles.thtd}>{Number.isFinite(r.bathrooms) ? r.bathrooms : "—"}</td>
                    <td style={styles.thtd}>{Number.isFinite(r.landSize) ? Math.round(r.landSize) : "—"}</td>
                    <td style={styles.thtd}>{Number.isFinite(r.garage) ? r.garage : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ ...styles.small, marginTop: 8 }}>
            Tip: use the filters above to narrow results. “Refetch” will call the API again.
          </div>
        </div>
      </div>
    </div>
  );
}
