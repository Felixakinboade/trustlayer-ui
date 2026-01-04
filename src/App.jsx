import { useMemo, useState, useEffect } from "react";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  ScanSearch,
  Link as LinkIcon,
  Radar,
  Fingerprint,
  Lock,
  Globe,
  Network,
  FileWarning,
  Zap,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function scoreToVerdict(score) {
  if (score >= 75) return { label: "Safe", tone: "safe", icon: ShieldCheck };
  if (score >= 45) return { label: "Caution", tone: "warn", icon: ShieldAlert };
  return { label: "High Risk", tone: "risk", icon: ShieldX };
}

function paletteForTone(tone) {
  // Color-friendly, punchy but professional
  // safe: emerald/teal, warn: amber, risk: rose/red
  if (tone === "safe")
    return { bg: "#ECFDF5", fg: "#059669", ring: "#10B981" };
  if (tone === "warn")
    return { bg: "#FFFBEB", fg: "#D97706", ring: "#F59E0B" };
  return { bg: "#FFF1F2", fg: "#E11D48", ring: "#FB7185" };
}

const integrationTiles = [
  { name: "Google Safe Browsing", desc: "Malware / phishing checks", icon: ShieldCheck, status: "Planned" },
  { name: "VirusTotal", desc: "Multi-engine URL reputation", icon: Radar, status: "Planned" },
  { name: "URLScan.io", desc: "Behavioral scan snapshots", icon: ScanSearch, status: "Planned" },
  { name: "WHOIS / RDAP", desc: "Domain age & registrant signals", icon: Globe, status: "Planned" },
  { name: "TLS / Cert checks", desc: "Certificate validity & anomalies", icon: Lock, status: "Planned" },
  { name: "IP Reputation", desc: "ASN / abuse / hosting risk", icon: Network, status: "Planned" },
];

const featureCards = [
  {
    title: "Instant risk verdict",
    desc: "Clear decision output: Safe, Caution, or High Risk. Designed for fast triage.",
    icon: Zap,
  },
  {
    title: "Explainable signals",
    desc: "Every verdict includes a human-readable rationale, not a black box score.",
    icon: Fingerprint,
  },
  {
    title: "Enterprise-ready pipeline",
    desc: "Built to aggregate multiple threat intelligence sources and normalize outputs.",
    icon: Network,
  },
  {
    title: "Security-first handling",
    desc: "Minimal collection. Designed for safe scanning workflows and auditable results.",
    icon: Lock,
  },
];

// Hook for responsive design
function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
}

export default function App() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiResult, setApiResult] = useState(null);
  const [error, setError] = useState("");
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');
  
  const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://odd7yedcn7.execute-api.eu-west-2.amazonaws.com/prod";
  
  // Debug: Log API base URL (remove in production if needed)
  useEffect(() => {
    console.log("API_BASE:", API_BASE);
    console.log("VITE_API_BASE_URL from env:", import.meta.env.VITE_API_BASE_URL);
  }, []);

  // Transform API response to UI format
  const transformApiResponse = (apiData) => {
    // Read all required response fields
    const score = apiData.score || 0;
    const riskLevel = apiData.risk_level || "medium";
    const confidence = apiData.confidence || "low";
    const recommendedAction = apiData.recommended_action || "caution";
    const reasons = apiData.reasons || [];
    
    // Map risk_level to verdict tone
    let verdictTone = "warn";
    if (riskLevel === "low") verdictTone = "safe";
    else if (riskLevel === "high") verdictTone = "risk";
    
    const verdict = scoreToVerdict(score);
    verdict.tone = verdictTone;
    
    // Convert reasons to signals
    const signals = reasons.map((reason, idx) => ({
      label: reason.split(":")[0] || `Signal ${idx + 1}`,
      detail: reason,
      weight: 0,
      severity: riskLevel === "high" ? "high" : riskLevel === "medium" ? "medium" : "low",
    }));
    
    // Risk distribution
    const dist = [
      { name: "Benign Indicators", value: score },
      { name: "Risk Indicators", value: 100 - score },
    ];
    
    // Signal severity breakdown
    const severityBars = [
      { name: "High", value: signals.filter(s => s.severity === "high").length },
      { name: "Medium", value: signals.filter(s => s.severity === "medium").length },
      { name: "Low", value: signals.filter(s => s.severity === "low").length },
    ];
    
    // Recommendation based on recommended_action
    const recommendation = recommendedAction === "caution"
      ? "Proceed with caution. Avoid entering credentials. Validate sender and domain ownership."
      : recommendedAction === "block"
      ? "Do not proceed. Avoid entering any credentials. Verify via an alternate trusted channel."
      : "Proceed normally. If prompted for credentials, verify the domain matches the expected organization.";
    
    return { 
      score, 
      verdict, 
      signals, 
      recommendation, 
      dist, 
      severityBars, 
      confidence,
      riskLevel,
      recommendedAction,
      reasons,
      apiData 
    };
  };

  // Demo results engine (fallback when no API result)
  const demoResult = useMemo(() => {
    if (apiResult) {
      return transformApiResponse(apiResult);
    }
    
    const u = url.toLowerCase();
    let score = 82;

    const signals = [];

    if (u.includes("login")) {
      score -= 25;
      signals.push({
        label: "Credential lure pattern",
        detail: "URL contains login keyword; commonly used in phishing flows.",
        weight: 25,
        severity: "medium",
      });
    }
    if (u.includes("bit.ly") || u.includes("tinyurl") || u.includes("t.co")) {
      score -= 30;
      signals.push({
        label: "Shortened URL",
        detail: "Shorteners obscure final destination; higher social engineering risk.",
        weight: 30,
        severity: "high",
      });
    }
    if (u.includes("secure-") || u.includes("verify") || u.includes("update")) {
      score -= 15;
      signals.push({
        label: "Impersonation language",
        detail: "Security-themed wording may indicate trust manipulation.",
        weight: 15,
        severity: "medium",
      });
    }

    score = clamp(score, 0, 100);
    const verdict = scoreToVerdict(score);

    // Risk distribution (for pie chart)
    const dist = [
      { name: "Benign Indicators", value: score },
      { name: "Risk Indicators", value: 100 - score },
    ];

    // Signal severity breakdown (bar chart)
    const severityBars = [
      { name: "High", value: signals.filter(s => s.severity === "high").length },
      { name: "Medium", value: signals.filter(s => s.severity === "medium").length },
      { name: "Low", value: signals.filter(s => s.severity === "low").length },
    ];

    const recommendation =
      verdict.tone === "safe"
        ? "Proceed normally. If prompted for credentials, verify the domain matches the expected organization."
        : verdict.tone === "warn"
        ? "Proceed with caution. Avoid entering credentials. Validate sender and domain ownership."
        : "Do not proceed. Avoid entering any credentials. Verify via an alternate trusted channel.";

    return { score, verdict, signals, recommendation, dist, severityBars };
  }, [url, apiResult]);

  const toneColors = paletteForTone(demoResult.verdict.tone);
  const VerdictIcon = demoResult.verdict.icon;

  async function onScan() {
    if (!url.trim()) {
      setError("Please enter a URL to scan");
      return;
    }
    
    setLoading(true);
    setError("");
    setApiResult(null);
    
    try {
      const submittedUrl = url.trim();
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || "https://odd7yedcn7.execute-api.eu-west-2.amazonaws.com/prod"}/scan/url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: submittedUrl,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${response.status}`);
      }
      
      const data = await response.json();
      setApiResult(data);
    } catch (err) {
      // Handle network errors specifically
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError("Unable to reach TrustLayer API. Please check your connection and try again.");
      } else if (err.name === 'NetworkError' || err.message.includes('network')) {
        setError("Unable to reach TrustLayer API. Please try again.");
      } else {
        setError(err.message || "Failed to scan URL. Please try again.");
      }
      console.error("Scan error:", err);
      console.error("API_BASE:", API_BASE);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" }}>
      {/* Top Bar */}
      <div
        style={{
          background: "linear-gradient(90deg, #0B1220 0%, #111827 45%, #0B1220 100%)",
          color: "white",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: isMobile ? "12px 16px" : "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: isMobile ? "wrap" : "nowrap" }}>
          <div style={{ display: "flex", gap: isMobile ? 8 : 12, alignItems: "center" }}>
            <div style={{ width: isMobile ? 32 : 36, height: isMobile ? 32 : 36, borderRadius: 12, background: "linear-gradient(135deg, #60A5FA, #A78BFA, #34D399)" }} />
      <div>
              <div style={{ fontWeight: 800, letterSpacing: "-0.02em", fontSize: isMobile ? 14 : 16 }}>TrustLayer</div>
              {!isMobile && <div style={{ fontSize: 12, opacity: 0.75 }}>URL risk triage • explainable signals • API-ready</div>}
            </div>
          </div>

          {!isMobile && (
            <div style={{ display: "flex", gap: 18, fontSize: 13, opacity: 0.9 }}>
              <a href="#scan" style={{ color: "white", textDecoration: "none" }}>Scan</a>
              <a href="#signals" style={{ color: "white", textDecoration: "none" }}>Signals</a>
              <a href="#integrations" style={{ color: "white", textDecoration: "none" }}>Integrations</a>
              <a href="#about" style={{ color: "white", textDecoration: "none" }}>About</a>
            </div>
          )}
          {isMobile && (
            <div style={{ display: "flex", gap: 12, fontSize: 12, opacity: 0.9, flexWrap: "wrap" }}>
              <a href="#scan" style={{ color: "white", textDecoration: "none", padding: "4px 8px" }}>Scan</a>
              <a href="#signals" style={{ color: "white", textDecoration: "none", padding: "4px 8px" }}>Signals</a>
              <a href="#integrations" style={{ color: "white", textDecoration: "none", padding: "4px 8px" }}>Integrations</a>
              <a href="#about" style={{ color: "white", textDecoration: "none", padding: "4px 8px" }}>About</a>
            </div>
          )}
        </div>
      </div>

      {/* Hero */}
      <div style={{ background: "linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 70%)" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: isMobile ? "24px 16px" : "48px 20px 24px" }}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr" : "1.15fr 0.85fr", gap: isMobile ? 20 : 24, alignItems: "start" }}
          >
            <div>
              <div style={{ display: "inline-flex", gap: 8, alignItems: "center", padding: "6px 10px", borderRadius: 999, background: "#EEF2FF", color: "#3730A3", fontSize: 12, fontWeight: 600 }}>
                <ShieldCheck size={16} />
                Market-standard, explainable URL risk assessment
              </div>

              <h1 style={{ marginTop: 14, fontSize: isMobile ? 28 : isTablet ? 36 : 44, lineHeight: 1.05, letterSpacing: "-0.03em", fontWeight: 900, color: "#0F172A" }}>
                Scan links with <span style={{ background: "linear-gradient(90deg, #2563EB, #7C3AED, #10B981)", WebkitBackgroundClip: "text", color: "transparent" }}>clarity</span>, not guesswork.
              </h1>

              <p style={{ marginTop: 12, color: "#475569", fontSize: 16, lineHeight: 1.6, maxWidth: 640 }}>
                TrustLayer provides a verdict, trust score, and explainable signals. Designed as a risk-triage layer for
                security workflows and product surfaces.
              </p>

              {/* Scan Card */}
              <div id="scan" style={{ marginTop: 18, background: "white", border: "1px solid #E2E8F0", borderRadius: 18, boxShadow: "0 10px 30px rgba(2,8,23,0.06)" }}>
                <div style={{ padding: 18 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 14, background: "#F1F5F9", display: "grid", placeItems: "center" }}>
                      <LinkIcon size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, color: "#0F172A" }}>Scan a link before you open it</div>
                      <div style={{ fontSize: 13, color: "#64748B" }}>Instant, explainable risk analysis for suspicious URLs.</div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 160px", gap: 10 }}>
                    <div style={{ position: "relative" }}>
                      <input
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder={isMobile ? "Paste a URL to analyze" : "Paste a URL to analyze (e.g. https://login.identity-check.io)"}
                        style={{
                          width: "100%",
                          padding: isMobile ? "16px 16px 16px 44px" : "14px 14px 14px 44px",
                          borderRadius: 14,
                          border: "1px solid #CBD5E1",
                          outline: "none",
                          fontSize: 14,
                          minHeight: isMobile ? "48px" : "auto",
                        }}
                      />
                      <ScanSearch size={18} style={{ position: "absolute", left: 14, top: 14, color: "#64748B" }} />
                    </div>

                    <button
                      onClick={onScan}
                      disabled={loading}
                      style={{
                        border: "none",
                        borderRadius: 14,
                        cursor: loading ? "not-allowed" : "pointer",
                        fontWeight: 800,
                        color: "white",
                        background: loading ? "#94A3B8" : "linear-gradient(90deg, #2563EB, #7C3AED)",
                        boxShadow: loading ? "none" : "0 10px 18px rgba(37,99,235,0.20)",
                        padding: isMobile ? "16px 20px" : "14px 20px",
                        fontSize: 14,
                        whiteSpace: "nowrap",
                        textAlign: "center",
                        minWidth: isMobile ? "100%" : "160px",
                        minHeight: isMobile ? "48px" : "auto",
                        width: isMobile ? "100%" : "auto",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        touchAction: "manipulation",
                      }}
                    >
                      {loading ? "Scanning..." : "Scan link"}
        </button>
                  </div>

                  {error && (
                    <div style={{ marginTop: 10, padding: "12px", borderRadius: 12, background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B", fontSize: 13 }}>
                      {error}
                    </div>
                  )}
                  <div style={{ marginTop: 10, fontSize: 12, color: "#64748B" }}>
                    Privacy-first analysis. Links are processed ephemerally and never stored.
                  </div>
                </div>
              </div>

              {/* Feature row */}
              <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 12 }}>
                {featureCards.map((f) => (
                  <div key={f.title} style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 16, padding: 14 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <div style={{ width: 34, height: 34, borderRadius: 14, background: "#F8FAFC", display: "grid", placeItems: "center" }}>
                        <f.icon size={18} />
                      </div>
                      <div style={{ fontWeight: 800, color: "#0F172A", fontSize: 13 }}>{f.title}</div>
                    </div>
                    <div style={{ marginTop: 8, fontSize: 12, color: "#64748B", lineHeight: 1.5 }}>{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right panel: Verdict + visuals */}
            <div>
              <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 18, padding: 18, boxShadow: "0 10px 30px rgba(2,8,23,0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, color: "#64748B", fontWeight: 700 }}>Verdict</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 14, background: toneColors.bg, display: "grid", placeItems: "center", color: toneColors.fg }}>
                        <VerdictIcon size={20} />
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: "#0F172A" }}>{demoResult.verdict.label}</div>
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, color: "#64748B", fontWeight: 700 }}>Trust score</div>
                    <div style={{ fontSize: 26, fontWeight: 900, color: "#0F172A" }}>{demoResult.score}</div>
                  </div>
                </div>

                {/* Score Meter */}
                <div style={{ marginTop: 14 }}>
                  <div style={{ height: 10, width: "100%", background: "#E2E8F0", borderRadius: 999, overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${demoResult.score}%`,
                        height: "100%",
                        background: `linear-gradient(90deg, ${toneColors.ring}, ${toneColors.fg})`,
                      }}
                    />
                  </div>
                  <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748B" }}>
                    <span>0 (High risk)</span>
                    <span>50 (Caution)</span>
                    <span>100 (Safe)</span>
                  </div>
                </div>

                {/* Charts */}
                <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
                  <div style={{ border: "1px solid #E2E8F0", borderRadius: 16, padding: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#0F172A" }}>Risk distribution</div>
                    <div style={{ height: 170 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={demoResult.dist} dataKey="value" innerRadius={44} outerRadius={64} paddingAngle={2}>
                            <Cell fill="#10B981" />
                            <Cell fill="#FB7185" />
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ fontSize: 12, color: "#64748B" }}>
                      Visual ratio of benign vs risk indicators.
                    </div>
                  </div>

                  <div style={{ border: "1px solid #E2E8F0", borderRadius: 16, padding: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#0F172A" }}>Signal severity</div>
                    <div style={{ height: 170 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={demoResult.severityBars}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="value" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ fontSize: 12, color: "#64748B" }}>
                      How strong the detected signals are.
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 14, borderRadius: 16, padding: 12, background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                  <div style={{ fontSize: 12, fontWeight: 900, color: "#0F172A" }}>Recommended action</div>
                  <div style={{ marginTop: 6, fontSize: 13, color: "#334155", lineHeight: 1.55 }}>
                    {demoResult.recommendation}
                  </div>
                </div>
              </div>

              {/* Micro "outputs" */}
              <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 18, padding: 14 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <CheckCircle2 size={18} />
                    <div style={{ fontWeight: 900, color: "#0F172A" }}>Outputs</div>
                  </div>
                  <ul style={{ marginTop: 10, color: "#475569", fontSize: 13, lineHeight: 1.7, paddingLeft: 18 }}>
                    <li>Verdict + score</li>
                    <li>Explainable signals</li>
                    <li>Recommendation text</li>
                    <li>API-ready JSON</li>
                  </ul>
                </div>

                <div style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 18, padding: 14 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <FileWarning size={18} />
                    <div style={{ fontWeight: 900, color: "#0F172A" }}>Designed for</div>
                  </div>
                  <ul style={{ marginTop: 10, color: "#475569", fontSize: 13, lineHeight: 1.7, paddingLeft: 18 }}>
                    <li>Security triage</li>
                    <li>Helpdesk workflows</li>
                    <li>Consumer safety UX</li>
                    <li>Compliance evidence</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Signals section */}
      <div id="signals" style={{ maxWidth: 1120, margin: "0 auto", padding: isMobile ? "24px 16px" : "24px 20px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 900, color: "#2563EB" }}>Explainability</div>
            <h2 style={{ marginTop: 6, fontSize: isMobile ? 20 : 26, fontWeight: 950, letterSpacing: "-0.02em", color: "#0F172A" }}>
              Signals detected
            </h2>
            <p style={{ marginTop: 8, color: "#64748B", maxWidth: 820, lineHeight: 1.6 }}>
              A market-standard risk tool must explain "why" in human terms. These signals are designed to be auditable and defensible.
            </p>
          </div>
        </div>

        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
          {(demoResult.signals.length ? demoResult.signals : [{
            label: "No high-risk signals detected",
            detail: "Try a URL with /login or a shortened link to see the explainability panel populate.",
            weight: 0,
            severity: "low"
          }]).map((s) => {
            const Icon = s.severity === "high" ? XCircle : s.severity === "medium" ? AlertTriangle : CheckCircle2;
            const tone = s.severity === "high" ? "risk" : s.severity === "medium" ? "warn" : "safe";
            const c = paletteForTone(tone);
            return (
              <div key={s.label} style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 18, padding: 14 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 14, background: c.bg, color: c.fg, display: "grid", placeItems: "center" }}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 950, color: "#0F172A" }}>{s.label}</div>
                      <div style={{ marginTop: 4, color: "#64748B", fontSize: 13, lineHeight: 1.55 }}>{s.detail}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 900, color: "#0F172A" }}>
                    {s.weight ? `-${s.weight}` : ""}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Integrations */}
      <div id="integrations" style={{ background: "#0B1220" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: isMobile ? "32px 16px" : "42px 20px" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 900, color: "#93C5FD" }}>API roadmap</div>
              <h2 style={{ marginTop: 6, fontSize: isMobile ? 22 : 28, fontWeight: 950, letterSpacing: "-0.02em", color: "white" }}>
                Multi-source risk intelligence
              </h2>
              <p style={{ marginTop: 8, color: "rgba(255,255,255,0.75)", maxWidth: 860, lineHeight: 1.6 }}>
                This product is designed to integrate multiple scanners and reputation services, normalize the output,
                and deliver one explainable verdict.
              </p>
            </div>
          </div>

          <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: 12 }}>
            {integrationTiles.map((it) => (
              <div key={it.name} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 18, padding: 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 14, background: "rgba(255,255,255,0.08)", display: "grid", placeItems: "center", color: "white" }}>
                      <it.icon size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 950, color: "white" }}>{it.name}</div>
                      <div style={{ marginTop: 2, fontSize: 12, color: "rgba(255,255,255,0.70)" }}>{it.desc}</div>
                    </div>
                  </div>

                  <div style={{ fontSize: 11, fontWeight: 900, color: "#0B1220", background: "#A7F3D0", padding: "5px 10px", borderRadius: 999 }}>
                    {it.status}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 18, color: "rgba(255,255,255,0.70)", fontSize: 13, lineHeight: 1.6 }}>
            Integration strategy: normalize external results → generate stable signal schema → compute score → return explainable verdict.
          </div>
        </div>
      </div>

      {/* About */}
      <div id="about" style={{ maxWidth: 1120, margin: "0 auto", padding: isMobile ? "24px 16px 40px" : "34px 20px 60px" }}>
        <h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 950, letterSpacing: "-0.02em", color: "#0F172A" }}>About TrustLayer</h2>
        <p style={{ marginTop: 10, color: "#475569", lineHeight: 1.7, maxWidth: 920 }}>
          TrustLayer is an advisory risk-triage layer for URLs. It is built to produce a defensible verdict using explainable signals, suitable for
          product UX, helpdesk triage, and security workflows. The UI is intentionally professional and evidence-oriented.
        </p>

        <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid #E2E8F0", color: "#64748B", fontSize: 13 }}>
          © {new Date().getFullYear()} TrustLayer • UI Prototype
        </div>
      </div>
    </div>
  );
}
