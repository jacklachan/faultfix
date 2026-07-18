"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ACTIONS, actionResult, incidentReceipt, initialInvestigation, nextAction, proofGate, type ActionId } from "@/lib/investigation";
import { rankHypothesesWithOllama, type RankingResult } from "@/lib/local-ranking";
import styles from "./page.module.css";
import phase2 from "./phase2.module.css";
import local from "./local-ranking.module.css";

export default function Home() {
  const [investigation, setInvestigation] = useState(initialInvestigation);
  const [selected, setSelected] = useState<string | null>(null);
  const [showProof, setShowProof] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showChallenge, setShowChallenge] = useState(false);
  const [localRanking, setLocalRanking] = useState<RankingResult | null>(null);
  const [isCheckingLocalRanking, setIsCheckingLocalRanking] = useState(false);
  const rankingAbort = useRef<AbortController | null>(null);
  const rankingRun = useRef(0);
  const gate = useMemo(() => proofGate(investigation.completed), [investigation.completed]);
  const receipt = useMemo(() => incidentReceipt(investigation.completed), [investigation.completed]);
  const next = nextAction(investigation.completed);
  const evidence = investigation.completed.map(actionResult);
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setShowProof(false);
      setShowReceipt(false);
      setShowChallenge(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);
  function runAction(actionId: ActionId) { if (!investigation.completed.includes(actionId)) { setInvestigation({ ...investigation, completed: [...investigation.completed, actionId] }); setSelected(actionId); if (actionId === "regression") setShowProof(true); } }
  async function checkLocalRanking() {
    if (isCheckingLocalRanking) return;
    const controller = new AbortController();
    const run = ++rankingRun.current;
    rankingAbort.current = controller;
    setIsCheckingLocalRanking(true);
    try {
      const result = await rankHypothesesWithOllama([{ id: "pool-limit", claim: "Deploy r42 reduced the pool limit and exhausted connections." }, { id: "dns-event", claim: "The overlapping DNS event caused the outage." }], { signal: controller.signal });
      if (run === rankingRun.current) setLocalRanking(result);
    } finally {
      if (run === rankingRun.current) setIsCheckingLocalRanking(false);
    }
  }
  function cancelLocalRanking() { rankingRun.current += 1; rankingAbort.current?.abort(); rankingAbort.current = null; setIsCheckingLocalRanking(false); }
  function clearLocalRanking() { cancelLocalRanking(); setLocalRanking(null); }
  function resetInvestigation() { clearLocalRanking(); setInvestigation(initialInvestigation); setSelected(null); setShowProof(false); setShowReceipt(false); setShowChallenge(false); }
  function exportReceipt() { if (!receipt) return; const text = `FAULTFIX INCIDENT RECEIPT\n${receipt.id}\n\nROOT CAUSE\n${receipt.rootCause}\n\nCONFIDENCE\n${receipt.confidence}\n\nREJECTED ALTERNATIVE\n${receipt.rejected}\n\nREGRESSION TEST\n${receipt.test}\n\nCANDIDATE PATCH\n${receipt.patch}\n`; const url = URL.createObjectURL(new Blob([text], { type: "text/plain" })); const link = document.createElement("a"); link.href = url; link.download = "faultfix-incident-receipt-FF-INC-042-R42.txt"; link.click(); URL.revokeObjectURL(url); }
  return <main className={styles.workbench}>
    <header className={styles.header}><div className={styles.wordmark}><span className={styles.mark}>*</span> faultfix <small>incident investigator</small></div><div className={styles.simulated}>SIMULATED INCIDENT</div><div className={styles.clock}>INCIDENT CLOCK <b>00:42:17</b></div></header>
    <section className={styles.incidentBar}><div><span className={styles.eyebrow}>INC-042 / PAYMENTS</span><h1>Payments failing after <em>r42</em></h1></div><p>Investigate only what the record can support. Fixes remain locked until the causal case is complete.</p>{next ? <button className={styles.start} onClick={() => runAction(next.id)}>{investigation.completed.length ? `Continue: ${next.label}` : "Start investigation"} <span>-&gt;</span></button> : <button className={styles.start} onClick={resetInvestigation}>Reset investigation</button>}</section>
    <div className={styles.grid}>
      <aside className={styles.actions}><div className={styles.panelTitle}>EVIDENCE ACTIONS <span>{investigation.completed.length}/6</span></div>{ACTIONS.map((action, index) => { const done = investigation.completed.includes(action.id); const available = index === 0 || investigation.completed.includes(ACTIONS[index - 1].id); return <button key={action.id} disabled={!available} onClick={() => runAction(action.id)} className={`${styles.action} ${done ? styles.done : ""} ${selected === action.id ? styles.selected : ""}`}><span className={styles.actionNo}>{String(index + 1).padStart(2, "0")}</span><span><b>{action.label}</b><small>{done ? "Evidence found" : available ? "Ready to inspect" : "Awaiting prior evidence"}</small></span><i>{done ? "[x]" : "->"}</i></button>; })}<div className={styles.lockNote}>[o] Bounded investigation<br/><span>All evidence is bundled with this demo.</span></div></aside>
      <section className={styles.canvas} aria-label="Causal evidence graph"><div className={styles.panelTitle}>CAUSAL RECORD <span>{gate.complete ? "PROOF COMPLETE" : "BUILDING CASE"}</span></div><div className={styles.graph}><div className={`${styles.node} ${investigation.completed.includes("diff") ? styles.active : ""} ${styles.deploy}`}><small>DEPLOY</small><b>r42 released</b><span>14:03 UTC</span></div><div className={styles.connectorOne}/><div className={`${styles.node} ${investigation.completed.includes("config") ? styles.active : ""} ${styles.config}`}><small>CONFIG CHANGE</small><b>pool limit: 40 to 20</b><span>payments-api</span></div><div className={styles.connectorTwo}/><div className={`${styles.node} ${investigation.completed.includes("logs") ? styles.active : ""} ${styles.service}`}><small>SERVICE STATE</small><b>Connections exhausted</b><span>AZ-A only</span></div><div className={styles.connectorThree}/><div className={`${styles.node} ${investigation.completed.includes("trace") ? styles.active : ""} ${styles.impact}`}><small>CUSTOMER IMPACT</small><b>Auth / payment timeouts</b><span>p95 &gt; 30s</span></div>{!evidence.length && <div className={styles.emptyGraph}>Select Start investigation to begin recording evidence.</div>}</div><div className={styles.evidenceStream}>{evidence.length ? evidence.map((item) => <article key={item.id} className={styles.evidence}><span>{item.kind}</span><p>{item.fact}</p><small>{item.source}</small></article>) : <div className={styles.streamHint}>Evidence cards will appear here as each source is inspected.</div>}</div></section>
      <aside className={styles.proof}><div className={styles.panelTitle}>PROOF GATE <span>{gate.score}/4</span></div><div className={styles.ring} style={{ "--progress": `${gate.score * 25}%` } as React.CSSProperties}><b>{gate.score}<small>/4</small></b></div>{gate.requirements.map((item) => <div key={item.label} className={`${styles.requirement} ${item.met ? styles.met : ""}`}><span>{item.met ? "[x]" : "[ ]"}</span><div><b>{item.label}</b><small>{item.met ? "Verified" : "Still uncertain"}</small></div></div>)}<div className={local.status}><b>LOCAL MODEL / OPTIONAL</b><small>{isCheckingLocalRanking ? "Checking local Ollama. Proof remains deterministic." : localRanking ? localRanking.detail : "Hypothesis ranking is off by default. Proof remains deterministic."}</small>{localRanking?.source === "ollama" && localRanking.status === "ranked" && <div className={local.ranking}><b>ADVISORY ORDER / NOT PROOF</b><ol>{localRanking.rankedIds.map((id) => <li key={id}>{id === "pool-limit" ? "Pool-limit change" : "DNS event"}</li>)}</ol></div>}<button onClick={checkLocalRanking} disabled={isCheckingLocalRanking}>{isCheckingLocalRanking ? "Checking Ollama ranking..." : localRanking ? "Recheck Ollama ranking" : "Check Ollama ranking"}</button>{isCheckingLocalRanking && <button onClick={cancelLocalRanking}>Cancel check</button>}{localRanking && <button onClick={clearLocalRanking}>Clear ranking</button>}</div>{!gate.complete ? <div className={styles.locked}>FIXES ARE LOCKED<p>The evidence does not yet support a safe recommendation.</p></div> : <div className={styles.unlocked}><span>[x]</span><b>Proof complete.</b><p>Cause established with a reproduction test.</p><button onClick={() => setShowProof(true)}>View candidate patch -&gt;</button><button onClick={() => setShowReceipt(true)}>Open Incident Receipt -&gt;</button></div>}<button className={styles.challenge} onClick={() => setShowChallenge(true)}>Challenge this conclusion</button></aside>
    </div>
    {showProof && <section className={styles.terminal} role="dialog" aria-modal="true" aria-label="Regression proof"><div className={styles.terminalHead}><span>TERMINAL / REGRESSION PROOF</span><button aria-label="Close regression proof" onClick={() => setShowProof(false)}>x</button></div><pre><span className={styles.dim}>$ pnpm test connection-pool.regression</span>{"\n\n"}<span className={styles.red}>FAIL</span>  requests in AZ-A time out after r42{"\n"}<span className={styles.dim}>  expected pool limit at least 40, received 20</span>{"\n\n"}<span className={styles.green}>PATCH</span>  restore DATABASE_POOL_LIMIT=40{"\n\n"}<span className={styles.green}>PASS</span>  requests in AZ-A complete within 300ms{"\n"}<span className={styles.dim}>  causal regression protected</span></pre></section>}
    {showChallenge && <section className={phase2.modal} role="dialog" aria-modal="true" aria-label="Rejected alternative"><div className={phase2.modalHeader}><span>CHALLENGE / ALTERNATIVE REVIEW</span><button aria-label="Close alternative review" onClick={() => setShowChallenge(false)}>x</button></div><div className={phase2.challengeBody}><span className={phase2.rejectedTag}>ALTERNATIVE REJECTED</span><h2>The DNS event caused the outage.</h2><p>This explanation was investigated because its timing overlapped with the incident. The causal record does not support it.</p><dl><div><dt>WHAT WE FOUND</dt><dd>The DNS event affected a different zone. There was no route change in AZ-A.</dd></div><div><dt>WHY IT FAILS THE CASE</dt><dd>It cannot explain connection exhaustion or why restoring the pool limit resolves the timeout.</dd></div></dl><button className={phase2.modalClose} onClick={() => setShowChallenge(false)}>Return to the evidence</button></div></section>}
    {showReceipt && receipt && <section className={phase2.modal} role="dialog" aria-modal="true" aria-label="Incident Receipt"><div className={phase2.modalHeader}><span>INCIDENT RECEIPT / {receipt.id}</span><button aria-label="Close incident receipt" onClick={() => setShowReceipt(false)}>x</button></div><div className={phase2.receiptBody}><div className={phase2.receiptStamp}>PROOF<br/>COMPLETE</div><span className={phase2.rejectedTag}>CONFIDENCE: HIGH</span><h2>Cause established.</h2><p>{receipt.rootCause}</p><dl><div><dt>REJECTED ALTERNATIVE</dt><dd>{receipt.rejected}</dd></div><div><dt>REGRESSION TEST</dt><dd>{receipt.test}</dd></div><div><dt>CANDIDATE PATCH</dt><dd>{receipt.patch}</dd></div></dl><div className={phase2.receiptActions}><button className={phase2.modalClose} onClick={exportReceipt}>Export receipt (.txt)</button><button className={phase2.textButton} onClick={() => { setShowReceipt(false); setShowProof(true); }}>Review test proof -&gt;</button></div></div></section>}
  </main>;
}
