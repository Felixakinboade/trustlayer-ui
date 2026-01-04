import { useMemo, useState } from "react";
import { Shield, Link as LinkIcon, Search, CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";
import "./App.css";

function Badge({ tone = "neutral", children }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

function ResultBlock({ result }) {
  if (!result) return null;

  const tone =
    result.verdict === "safe" ? "success" :
    result.verdict === "suspicious" ? "warn" :
    result.verdict === "malicious" ? "danger" : "neutral";

  const Icon =
    result.verdict === "safe" ? CheckCircle2 :
    result.verdict === "suspicious" ? AlertTriangle :
    result.verdict === "malicious" ? XCircle : Info;

  return (
    <div className="card">
      <div className="cardHeader">
        <div className="row" style={{ gap: 10 }}>
          <div className={`iconPill iconPill--${tone}`}>
            <Icon size={18} />
          </div>
          <div>
            <div className="cardTitle">Scan result</div>
            <div className="muted">{result.url}</div>
          </div>
        </div>
        <Badge tone={tone}>{result.verdict.toUpperCase()}</Badge>
      </div>

      <div className="grid">
        <div className="panel">
          <div className="panelLabel">Trust score</div>
          <div className="panelValue">{result.score}/100</div>
          <div className="muted">Heuristic demo score (UI-first).</div>
        </div>

        <div className="panel">
          <div className="panelLabel">Signals</div>
          <ul className="list">
            {result.signals.map((s, idx) => (
              <li key={idx} className="listItem">
                <span className={`dot dot--${s.level}`} />
                <span className="listText">{s.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel">
          <div className="panelLabel">Recommendation</div>
          <div className="panelValueSmall">{result.recommendation}</div>
          <div className="muted">Always verify before entering credentials.</div>
        </div>
      </div>

      <details className="details">
        <summary>View raw JSON</summary>
        <pre className="code">{JSON.stringify(result, null, 2)}</pre>
      </details>
    </div>
  );
}

// UI-first: local heuristic so you have something presentable immediately.
// Later we'll replace this with a real API call (POST /scan/url).
function demoScan(url) {
  const u = url.toLowerCase();
  const signals = [];
  let score = 90;

  const add = (level, text, delta) => {
    signals.push({ level, text });
    score += delta;
  };

  // Basic heuristics
  if (!/^https?:\/\//.test(u)) add("warn", "URL is missing http/https scheme.", -20);
  if (u.includes("@")) add("danger", "Contains '@' which can hide the real destination.", -35);
  if (u.includes("login") || u.includes("verify") || u.includes("account")) add("warn", "Contains high-risk keywords (login/verify/account).", -15);
  if (u.includes("bit.ly") || u.includes("tinyurl") || u.includes("t.co")) add("warn", "Shortened URL — destination is obscured.", -15);
  if (u.split("//")[1]?.split("/")[0]?.split(".").length > 3) add("warn", "Subdomain depth is unusually high.", -10);
  if (u.includes("pay") || u.includes("bank")) add("warn", "Financial keyword detected.", -10);

  // Clamp
  score = Math.max(0, Math.min(100, score));

  let verdict = "safe";
  let recommendation = "Proceed with normal caution.";

  if (score < 40) {
    verdict = "malicious";
    recommendation = "Do not proceed. Avoid entering credentials and consider blocking/reporting.";
  } else if (score < 70) {
    verdict = "suspicious";
    recommendation = "Proceed carefully. Verify domain ownership and avoid entering sensitive data.";
  }

  if (signals.length === 0) {
    signals.push({ level: "ok", text: "No obvious high-risk signals detected in this demo check." });
  }

  return {
    url,
    verdict,
    score,
    signals,
    recommendation,
    timestamp: new Date().toISOString(),
    engine: "trustlayer-ui-demo"
  };
}

export default function App() {
  const [url, setUrl] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const canScan = useMemo(() => url.trim().length > 6, [url]);

  const onScan = async () => {
    setError("");
    setIsScanning(true);
    setResult(null);

    try {
      const cleaned = url.trim();
      // UI-first demo scan (replace later with real API call)
      await new Promise((r) => setTimeout(r, 450));
      setResult(demoScan(cleaned));
    } catch (e) {
      setError("Scan failed. Please try again.");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <div className="brandMark">
            <Shield size={18} />
          </div>
          <div>
            <div className="brandName">TrustLayer</div>
            <div className="brandTag">URL risk triage — UI prototype</div>
          </div>
        </div>

        <nav className="nav">
          <a className="navLink" href="#scan">Scan</a>
          <a className="navLink" href="#about">About</a>
        </nav>
      </header>

      <main className="container">
        <section className="hero" id="scan">
          <div className="heroLeft">
            <h1>Check a link before you trust it.</h1>
            <p className="muted">
              This front end is a presentable prototype. It uses a local demo engine for now,
              then we'll connect it to your AWS API when you're ready.
            </p>

            <div className="card">
              <div className="cardTitleRow">
                <div className="row" style={{ gap: 10 }}>
                  <div className="iconPill iconPill--neutral">
                    <LinkIcon size={18} />
                  </div>
                  <div>
                    <div className="cardTitle">Scan a URL</div>
                    <div className="muted">Paste a link and get a risk summary.</div>
                  </div>
                </div>
              </div>

              <div className="formRow">
                <input
                  className="input"
                  placeholder="https://secure-login.example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
                <button className="btn" onClick={onScan} disabled={!canScan || isScanning}>
                  <Search size={16} />
                  {isScanning ? "Scanning…" : "Scan"}
                </button>
              </div>

              {error ? <div className="alert alert--danger">{error}</div> : null}

              <div className="hint">
                Tip: try a URL with <code>/login</code> or a shortened link to see different results.
              </div>
            </div>
          </div>

          <div className="heroRight">
            <div className="stack">
              <div className="miniCard">
                <div className="miniTitle">What you get</div>
                <ul className="miniList">
                  <li>Verdict (safe / suspicious / malicious)</li>
                  <li>Trust score (0–100)</li>
                  <li>Explainable signals</li>
                  <li>Recommendation text</li>
                </ul>
              </div>

              <div className="miniCard">
                <div className="miniTitle">Next step</div>
                <div className="muted">
                  Wire the Scan button to your API Gateway endpoint:
                  <div style={{ marginTop: 8 }}>
                    <Badge>POST</Badge> <code>/scan/url</code>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {result ? (
          <section className="section">
            <ResultBlock result={result} />
          </section>
        ) : null}

        <section className="section" id="about">
          <div className="card">
            <div className="cardTitle">About this prototype</div>
            <p className="muted">
              TrustLayer is designed as an advisory risk-triage layer. This UI is intentionally factual
              and explainable. No marketing claims.
            </p>
          </div>
        </section>

        <footer className="footer">
          <span className="muted">TrustLayer UI Prototype</span>
        </footer>
      </main>
    </div>
  );
}
