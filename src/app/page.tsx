"use client";

import { useMemo, useState } from "react";
import { ACTIONS, actionResult, initialInvestigation, proofGate, type ActionId } from "@/lib/investigation";
import styles from "./page.module.css";

export default function Home() {
  const [investigation, setInvestigation] = useState(initialInvestigation);
  const [selected, setSelected] = useState<string | null>(null);
  const [showProof, setShowProof] = useState(false);
  const gate = useMemo(() => proofGate(investigation.completed), [investigation.completed]);

  function runAction(actionId: ActionId) {
    if (investigation.completed.includes(actionId)) return;
    const next = { ...investigation, completed: [...investigation.completed, actionId] };
    setInvestigation(next);
    setSelected(actionId);
    if (actionId === "regression") setShowProof(true);
  }

  const evidence = investigation.completed.map(actionResult);

  return (
    <main className={styles.workbench}>
      <header className={styles.header}>
        <div className={styles.wordmark}><span className={styles.mark}>✦</span> FAULTLINE <small>incident investigator</small></div>
        <div className={styles.simulated}>SIMULATED INCIDENT</div>
        <div className={styles.clock}>INCIDENT CLOCK <b>00:42:17</b></div>
      </header>

      <section className={styles.incidentBar}>
        <div><span className={styles.eyebrow}>INC-042 / PAYMENTS</span><h1>Payments failing after <em>r42</em></h1></div>
        <p>Investigate only what the record can support. Fixes remain locked until the causal case is complete.</p>
        <button className={styles.start} onClick={() => runAction("logs")}>{investigation.completed.length ? "Continue investigation" : "Start investigation"} <span>→</span></button>
      </section>

      <div className={styles.grid}>
        <aside className={styles.actions}>
          <div className={styles.panelTitle}>EVIDENCE ACTIONS <span>{investigation.completed.length}/6</span></div>
          {ACTIONS.map((action, index) => {
            const done = investigation.completed.includes(action.id);
            const available = index === 0 || investigation.completed.includes(ACTIONS[index - 1].id);
            return <button key={action.id} disabled={!available} onClick={() => runAction(action.id)} className={`${styles.action} ${done ? styles.done : ""} ${selected === action.id ? styles.selected : ""}`}>
              <span className={styles.actionNo}>{String(index + 1).padStart(2, "0")}</span><span><b>{action.label}</b><small>{done ? "Evidence found" : available ? "Ready to inspect" : "Awaiting prior evidence"}</small></span><i>{done ? "✓" : "→"}</i>
            </button>;
          })}
          <div className={styles.lockNote}>◉ Bounded investigation<br/><span>All evidence is bundled with this demo.</span></div>
        </aside>

        <section className={styles.canvas} aria-label="Causal evidence graph">
          <div className={styles.panelTitle}>CAUSAL RECORD <span>{gate.complete ? "PROOF COMPLETE" : "BUILDING CASE"}</span></div>
          <div className={styles.graph}>
            <div className={`${styles.node} ${investigation.completed.includes("diff") ? styles.active : ""} ${styles.deploy}`}><small>DEPLOY</small><b>r42 released</b><span>14:03 UTC</span></div>
            <div className={styles.connectorOne} />
            <div className={`${styles.node} ${investigation.completed.includes("config") ? styles.active : ""} ${styles.config}`}><small>CONFIG CHANGE</small><b>pool limit: 40 → 20</b><span>payments-api</span></div>
            <div className={styles.connectorTwo} />
            <div className={`${styles.node} ${investigation.completed.includes("logs") ? styles.active : ""} ${styles.service}`}><small>SERVICE STATE</small><b>Connections exhausted</b><span>AZ-A only</span></div>
            <div className={styles.connectorThree} />
            <div className={`${styles.node} ${investigation.completed.includes("trace") ? styles.active : ""} ${styles.impact}`}><small>CUSTOMER IMPACT</small><b>Auth / payment timeouts</b><span>p95 &gt; 30s</span></div>
            {!evidence.length && <div className={styles.emptyGraph}>Select “Start investigation” to begin recording evidence.</div>}
          </div>
          <div className={styles.evidenceStream}>
            {evidence.length ? evidence.map((item) => <article key={item.id} className={styles.evidence}><span>{item.kind}</span><p>{item.fact}</p><small>{item.source}</small></article>) : <div className={styles.streamHint}>Evidence cards will appear here as each source is inspected.</div>}
          </div>
        </section>

        <aside className={styles.proof}>
          <div className={styles.panelTitle}>PROOF GATE <span>{gate.score}/4</span></div>
          <div className={styles.ring} style={{ "--progress": `${gate.score * 25}%` } as React.CSSProperties}><b>{gate.score}<small>/4</small></b></div>
          {gate.requirements.map((item) => <div key={item.label} className={`${styles.requirement} ${item.met ? styles.met : ""}`}><span>{item.met ? "✓" : "○"}</span><div><b>{item.label}</b><small>{item.met ? "Verified" : "Still uncertain"}</small></div></div>)}
          {!gate.complete ? <div className={styles.locked}>FIXES ARE LOCKED<p>The evidence does not yet support a safe recommendation.</p></div> : <div className={styles.unlocked}><span>✓</span><b>Proof complete.</b><p>Cause established with a reproduction test.</p><button onClick={() => setShowProof(true)}>View candidate patch →</button></div>}
          <button className={styles.challenge} onClick={() => setSelected("infra")}>Challenge this conclusion</button>
        </aside>
      </div>

      {showProof && <section className={styles.terminal}><div className={styles.terminalHead}><span>TERMINAL / REGRESSION PROOF</span><button onClick={() => setShowProof(false)}>×</button></div><pre><span className={styles.dim}>$ pnpm test connection-pool.regression</span>{"\n\n"}<span className={styles.red}>FAIL</span>  requests in AZ-A time out after r42{"\n"}<span className={styles.dim}>  expected pool limit ≥ 40, received 20</span>{"\n\n"}<span className={styles.green}>PATCH</span>  restore DATABASE_POOL_LIMIT=40{"\n\n"}<span className={styles.green}>PASS</span>  requests in AZ-A complete within 300ms{"\n"}<span className={styles.dim}>  causal regression protected</span></pre></section>}
    </main>
  );
}
