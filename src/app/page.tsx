"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ACTIONS,
  actionResult,
  incidentReceipt,
  initialInvestigation,
  nextAction,
  nextEvidencePolicy,
  POLICY_REPLAY,
  POLICY_REWARD,
  proofCertificate,
  proofGate,
  remediationPlan,
  type ActionId,
} from "@/lib/investigation";
import { type RankingResult } from "@/lib/local-ranking";
import { rankHypothesesWithHostedSpace } from "@/lib/hosted-ranking";
import styles from "./page.module.css";
import phase2 from "./phase2.module.css";
import local from "./local-ranking.module.css";

export default function Home() {
  const [investigation, setInvestigation] = useState(initialInvestigation);
  const [selected, setSelected] = useState<string | null>(null);
  const [showProof, setShowProof] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  const [showRemediation, setShowRemediation] = useState(false);
  const [showReplay, setShowReplay] = useState(false);
  const [showChallenge, setShowChallenge] = useState(false);
  const [localRanking, setLocalRanking] = useState<RankingResult | null>(null);
  const [isCheckingLocalRanking, setIsCheckingLocalRanking] = useState(false);
  const rankingAbort = useRef<AbortController | null>(null);
  const rankingRun = useRef(0);
  const gate = useMemo(
    () => proofGate(investigation.completed),
    [investigation.completed],
  );
  const receipt = useMemo(
    () => incidentReceipt(investigation.completed),
    [investigation.completed],
  );
  const certificate = useMemo(
    () => proofCertificate(investigation.completed),
    [investigation.completed],
  );
  const plan = useMemo(
    () => remediationPlan(investigation.completed),
    [investigation.completed],
  );
  const next = nextAction(investigation.completed);
  const policy = useMemo(
    () => nextEvidencePolicy(investigation.completed),
    [investigation.completed],
  );
  const evidence = investigation.completed.map(actionResult);
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setShowProof(false);
      setShowReceipt(false);
      setShowCertificate(false);
      setShowRemediation(false);
      setShowReplay(false);
      setShowChallenge(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);
  function runAction(actionId: ActionId) {
    if (!investigation.completed.includes(actionId)) {
      setInvestigation({
        ...investigation,
        completed: [...investigation.completed, actionId],
      });
      setSelected(actionId);
      if (actionId === "regression") setShowProof(true);
    }
  }
  async function checkLocalRanking() {
    if (isCheckingLocalRanking) return;
    const controller = new AbortController();
    const run = ++rankingRun.current;
    rankingAbort.current = controller;
    setIsCheckingLocalRanking(true);
    try {
      const result = await rankHypothesesWithHostedSpace(
        [
          {
            id: "pool-limit",
            claim:
              "Deploy r42 reduced the pool limit and exhausted connections.",
          },
          {
            id: "dns-event",
            claim: "The overlapping DNS event caused the outage.",
          },
        ],
        { signal: controller.signal },
      );
      if (run === rankingRun.current) setLocalRanking(result);
    } finally {
      if (run === rankingRun.current) setIsCheckingLocalRanking(false);
    }
  }
  function cancelLocalRanking() {
    rankingRun.current += 1;
    rankingAbort.current?.abort();
    rankingAbort.current = null;
    setIsCheckingLocalRanking(false);
  }
  function clearLocalRanking() {
    cancelLocalRanking();
    setLocalRanking(null);
  }
  function resetInvestigation() {
    clearLocalRanking();
    setInvestigation(initialInvestigation);
    setSelected(null);
    setShowProof(false);
    setShowReceipt(false);
    setShowCertificate(false);
    setShowRemediation(false);
    setShowReplay(false);
    setShowChallenge(false);
  }
  function exportReceipt() {
    if (!receipt) return;
    const text = `FAULTFIX INCIDENT RECEIPT\n${receipt.id}\n\nROOT CAUSE\n${receipt.rootCause}\n\nCONFIDENCE\n${receipt.confidence}\n\nREJECTED ALTERNATIVE\n${receipt.rejected}\n\nREGRESSION TEST\n${receipt.test}\n\nCANDIDATE PATCH\n${receipt.patch}\n`;
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "faultfix-incident-receipt-FF-INC-042-R42.txt";
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <main className={styles.workbench}>
      <header className={styles.header}>
        <div className={styles.wordmark}>
          <span className={styles.mark}>✦</span> faultfix{" "}
          <small>incident investigator</small>
        </div>
        <div className={styles.headerSignal}>
          <i /> PROOF PROTOCOL v1.0
        </div>
        <button
          className={styles.policyButton}
          onClick={() => setShowReplay(true)}
        >
          COMPARE POLICIES ↗
        </button>
        <div className={styles.simulated}>SIMULATED / SAFE TO EXPLORE</div>
        <div className={styles.clock}>
          INCIDENT CLOCK <b>00:42:17</b>
        </div>
      </header>
      <section className={styles.incidentBar}>
        <div className={styles.incidentTitle}>
          <span className={styles.eyebrow}>
            INCIDENT 042 <i /> PAYMENTS / SEV-1
          </span>
          <h1>
            Prove the cause.
            <br />
            <em>Then earn the fix.</em>
          </h1>
          <p className={styles.heroCopy}>
            A release changed one constraint. Two explanations survived the
            timeline. Only one can survive the evidence.
          </p>
        </div>
        <div className={styles.caseTelemetry}>
          <div>
            <span>CUSTOMER IMPACT</span>
            <b>Checkout timeout</b>
            <small>AZ-A / p95 &gt; 30s</small>
          </div>
          <div>
            <span>PRIMARY LEAD</span>
            <b>Release r42</b>
            <small>14:03 UTC</small>
          </div>
          <div>
            <span>PROOF STATE</span>
            <b className={gate.complete ? styles.safe : ""}>
              {gate.complete ? "Established" : "Not established"}
            </b>
            <small>{gate.score} / 4 gates verified</small>
          </div>
        </div>
        <div className={styles.commandDeck}>
          <p>
            Investigate only what the record can support. Faultfix never turns a
            plausible lead into a production fix.
          </p>
          {next ? (
            <button className={styles.start} onClick={() => runAction(next.id)}>
              {investigation.completed.length
                ? `Inspect: ${next.label}`
                : "Begin evidence protocol"}{" "}
              <span>→</span>
            </button>
          ) : (
            <button className={styles.start} onClick={resetInvestigation}>
              Reset investigation <span>↺</span>
            </button>
          )}
        </div>
      </section>
      <div className={styles.grid}>
        <aside className={styles.actions}>
          <div className={styles.panelTitle}>
            EVIDENCE ACTIONS <span>{investigation.completed.length}/6</span>
          </div>
          {ACTIONS.map((action, index) => {
            const done = investigation.completed.includes(action.id);
            const available =
              index === 0 ||
              investigation.completed.includes(ACTIONS[index - 1].id);
            return (
              <button
                key={action.id}
                disabled={!available}
                onClick={() => runAction(action.id)}
                className={`${styles.action} ${done ? styles.done : ""} ${selected === action.id ? styles.selected : ""}`}
              >
                <span className={styles.actionNo}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>
                  <b>{action.label}</b>
                  <small>
                    {done
                      ? "Evidence found"
                      : available
                        ? "Ready to inspect"
                        : "Awaiting prior evidence"}
                  </small>
                </span>
                <i>{done ? "[x]" : "->"}</i>
              </button>
            );
          })}
          <div className={styles.lockNote}>
            [o] Bounded investigation
            <br />
            <span>All evidence is bundled with this demo.</span>
          </div>
        </aside>
        <section className={styles.canvas} aria-label="Causal evidence graph">
          <div className={styles.panelTitle}>
            CAUSAL RECORD{" "}
            <span>{gate.complete ? "PROOF COMPLETE" : "BUILDING CASE"}</span>
          </div>
          {policy ? (
            <section
              className={styles.evidencePolicy}
              aria-label="Next evidence policy"
            >
              <div>
                <span>NEXT BEST CHECK</span>
                <b>{policy.action.label}</b>
              </div>
              <p>{policy.rationale}</p>
              <small>
                <em>{policy.value} VALUE</em> / CAN CHANGE THE CASE:{" "}
                {policy.changesMind}
              </small>
            </section>
          ) : (
            <section className={styles.evidencePolicy}>
              <div>
                <span>INVESTIGATION POLICY</span>
                <b>Evidence budget complete</b>
              </div>
              <p>
                Every planned check was collected. The conclusion is ready for
                independent challenge.
              </p>
            </section>
          )}
          <div className={styles.graph}>
            <div
              className={`${styles.node} ${investigation.completed.includes("diff") ? styles.active : ""} ${styles.deploy}`}
            >
              <small>DEPLOY</small>
              <b>r42 released</b>
              <span>14:03 UTC</span>
            </div>
            <div className={styles.connectorOne} />
            <div
              className={`${styles.node} ${investigation.completed.includes("config") ? styles.active : ""} ${styles.config}`}
            >
              <small>CONFIG CHANGE</small>
              <b>pool limit: 40 to 20</b>
              <span>payments-api</span>
            </div>
            <div className={styles.connectorTwo} />
            <div
              className={`${styles.node} ${investigation.completed.includes("logs") ? styles.active : ""} ${styles.service}`}
            >
              <small>SERVICE STATE</small>
              <b>Connections exhausted</b>
              <span>AZ-A only</span>
            </div>
            <div className={styles.connectorThree} />
            <div
              className={`${styles.node} ${investigation.completed.includes("trace") ? styles.active : ""} ${styles.impact}`}
            >
              <small>CUSTOMER IMPACT</small>
              <b>Auth / payment timeouts</b>
              <span>p95 &gt; 30s</span>
            </div>
            {!evidence.length && (
              <div className={styles.emptyGraph}>
                Select Start investigation to begin recording evidence.
              </div>
            )}
          </div>
          <div className={styles.evidenceStream}>
            {evidence.length ? (
              evidence.map((item) => (
                <article key={item.id} className={styles.evidence}>
                  <span>{item.kind}</span>
                  <p>{item.fact}</p>
                  <small>{item.source}</small>
                </article>
              ))
            ) : (
              <div className={styles.streamHint}>
                Evidence cards will appear here as each source is inspected.
              </div>
            )}
          </div>
        </section>
        <aside className={styles.proof}>
          <div className={styles.panelTitle}>
            PROOF GATE <span>{gate.score}/4</span>
          </div>
          <div
            className={styles.ring}
            style={
              { "--progress": `${gate.score * 25}%` } as React.CSSProperties
            }
          >
            <b>
              {gate.score}
              <small>/4</small>
            </b>
          </div>
          {gate.requirements.map((item) => (
            <div
              key={item.label}
              className={`${styles.requirement} ${item.met ? styles.met : ""}`}
            >
              <span>{item.met ? "[x]" : "[ ]"}</span>
              <div>
                <b>{item.label}</b>
                <small>{item.met ? "Verified" : "Still uncertain"}</small>
              </div>
            </div>
          ))}
          <div className={local.status}>
            <b>HOSTED MODEL / OPTIONAL</b>
            <small>
              {isCheckingLocalRanking
                ? "Checking hosted model. Proof remains deterministic."
                : localRanking
                  ? localRanking.detail
                  : "Model ranking is off by default. Proof remains deterministic."}
            </small>
            {localRanking?.source === "huggingface-space" &&
              localRanking.status === "ranked" && (
                <div className={local.ranking}>
                  <b>ADVISORY ORDER / NOT PROOF</b>
                  <ol>
                    {localRanking.rankedIds.map((id) => (
                      <li key={id}>
                        {id === "pool-limit"
                          ? "Pool-limit change"
                          : "DNS event"}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            <button
              onClick={checkLocalRanking}
              disabled={isCheckingLocalRanking}
            >
              {isCheckingLocalRanking
                ? "Checking hosted model..."
                : localRanking
                  ? "Recheck hosted model"
                  : "Check hosted model"}
            </button>
            {isCheckingLocalRanking && (
              <button onClick={cancelLocalRanking}>Cancel check</button>
            )}
            {localRanking && (
              <button onClick={clearLocalRanking}>Clear ranking</button>
            )}
          </div>
          {!gate.complete ? (
            <div className={styles.locked}>
              FIXES ARE LOCKED
              <p>The evidence does not yet support a safe recommendation.</p>
            </div>
          ) : (
            <div className={styles.unlocked}>
              <span>[x]</span>
              <b>Proof complete.</b>
              <p>Cause established with a reproduction test.</p>
              <button onClick={() => setShowCertificate(true)}>
                Inspect causal certificate -&gt;
              </button>
              <button onClick={() => setShowRemediation(true)}>
                Open safe change packet -&gt;
              </button>
              <button onClick={() => setShowProof(true)}>
                View candidate patch -&gt;
              </button>
              <button onClick={() => setShowReceipt(true)}>
                Open Incident Receipt -&gt;
              </button>
            </div>
          )}
          <button
            className={styles.challenge}
            onClick={() => setShowChallenge(true)}
          >
            Challenge this conclusion
          </button>
        </aside>
      </div>
      {showProof && (
        <section
          className={styles.terminal}
          role="dialog"
          aria-modal="true"
          aria-label="Regression proof"
        >
          <div className={styles.terminalHead}>
            <span>TERMINAL / REGRESSION PROOF</span>
            <button
              aria-label="Close regression proof"
              onClick={() => setShowProof(false)}
            >
              x
            </button>
          </div>
          <pre>
            <span className={styles.dim}>
              $ pnpm test connection-pool.regression
            </span>
            {"\n\n"}
            <span className={styles.red}>FAIL</span> requests in AZ-A time out
            after r42{"\n"}
            <span className={styles.dim}>
              {" "}
              expected pool limit at least 40, received 20
            </span>
            {"\n\n"}
            <span className={styles.green}>PATCH</span> restore
            DATABASE_POOL_LIMIT=40{"\n\n"}
            <span className={styles.green}>PASS</span> requests in AZ-A complete
            within 300ms{"\n"}
            <span className={styles.dim}> causal regression protected</span>
          </pre>
        </section>
      )}
      {showReplay && (
        <section
          className={phase2.modal}
          role="dialog"
          aria-modal="true"
          aria-label="Policy replay"
        >
          <div className={phase2.modalHeader}>
            <span>POLICY REPLAY / SAME INCIDENT, DIFFERENT DECISIONS</span>
            <button
              aria-label="Close policy replay"
              onClick={() => setShowReplay(false)}
            >
              x
            </button>
          </div>
          <div className={phase2.replayBody}>
            <span className={phase2.rejectedTag}>
              FAULTFIX IS NOT A BETTER GUESSER
            </span>
            <h2>
              One policy guesses.
              <br />
              One earns the right to act.
            </h2>
            <p>
              Both agents receive the same incident brief. The difference is
              what their policy rewards: speed to an answer, or evidence that
              can survive challenge.
            </p>
            <div className={phase2.policyVersus}>
              {Object.values(POLICY_REPLAY).map((policy, index) => (
                <article
                  key={policy.name}
                  className={
                    index === 0 ? phase2.guessPolicy : phase2.faultfixPolicy
                  }
                >
                  <div>
                    <span>
                      0{index + 1} / {policy.subtitle.toUpperCase()}
                    </span>
                    <b>{policy.name}</b>
                  </div>
                  <ol>
                    {policy.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                  <div className={phase2.policyResult}>
                    <span>{policy.links}</span>
                    <b>{policy.result}</b>
                    <em>{policy.verdict}</em>
                  </div>
                </article>
              ))}
            </div>
            <div className={phase2.rewardFormula}>
              <b>POLICY REWARD</b>
              <p>{POLICY_REWARD}</p>
            </div>
            <button
              className={phase2.modalClose}
              onClick={() => setShowReplay(false)}
            >
              Investigate with Faultfix
            </button>
          </div>
        </section>
      )}
      {showChallenge && (
        <section
          className={phase2.modal}
          role="dialog"
          aria-modal="true"
          aria-label="Rejected alternative"
        >
          <div className={phase2.modalHeader}>
            <span>CHALLENGE / ALTERNATIVE REVIEW</span>
            <button
              aria-label="Close alternative review"
              onClick={() => setShowChallenge(false)}
            >
              x
            </button>
          </div>
          <div className={phase2.challengeBody}>
            <span className={phase2.rejectedTag}>ALTERNATIVE REJECTED</span>
            <h2>The DNS event caused the outage.</h2>
            <p>
              This explanation was investigated because its timing overlapped
              with the incident. The causal record does not support it.
            </p>
            <dl>
              <div>
                <dt>WHAT WE FOUND</dt>
                <dd>
                  The DNS event affected a different zone. There was no route
                  change in AZ-A.
                </dd>
              </div>
              <div>
                <dt>WHY IT FAILS THE CASE</dt>
                <dd>
                  It cannot explain connection exhaustion or why restoring the
                  pool limit resolves the timeout.
                </dd>
              </div>
            </dl>
            <button
              className={phase2.modalClose}
              onClick={() => setShowChallenge(false)}
            >
              Return to the evidence
            </button>
          </div>
        </section>
      )}
      {showCertificate && (
        <section
          className={phase2.modal}
          role="dialog"
          aria-modal="true"
          aria-label="Causal proof certificate"
        >
          <div className={phase2.modalHeader}>
            <span>CAUSAL CERTIFICATE / {certificate.id}</span>
            <button
              aria-label="Close causal certificate"
              onClick={() => setShowCertificate(false)}
            >
              x
            </button>
          </div>
          <div className={phase2.certificateBody}>
            <span className={phase2.rejectedTag}>
              {certificate.verdict.toUpperCase()}
            </span>
            <h2>A claim the record can replay.</h2>
            <p>
              This certificate does not trust a model verdict. It makes every
              causal link inspectable and binds the recommendation to a
              counterfactual test.
            </p>
            <div className={phase2.certificateLinks}>
              {certificate.links.map((link, index) => (
                <article
                  key={link.id}
                  className={`${phase2.certificateLink} ${link.verified ? phase2.verified : ""}`}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <b>{link.label}</b>
                    <p>{link.statement}</p>
                    <small>
                      {link.verified
                        ? `VERIFIED / ${link.evidence.join(" + ").toUpperCase()}`
                        : `PENDING / NEEDS ${link.evidence
                            .filter(
                              (id) => !investigation.completed.includes(id),
                            )
                            .join(" + ")
                            .toUpperCase()}`}
                    </small>
                  </div>
                </article>
              ))}
            </div>
            <div className={phase2.counterfactual}>
              <b>COUNTERFACTUAL TEST</b>
              <p>{certificate.counterfactual}</p>
            </div>
            <div className={phase2.boundaryLedger}>
              <div className={phase2.ledgerTitle}>
                <b>BOUNDARY LEDGER</b>
                <span>WHAT THIS CLAIM DOES — AND DOES NOT — COVER</span>
              </div>
              {certificate.boundaries.map((boundary) => (
                <article
                  key={`${boundary.id}-${boundary.statement}`}
                  className={
                    boundary.id === "falsifier" ? phase2.falsifier : ""
                  }
                >
                  <span>{boundary.label}</span>
                  <p>{boundary.statement}</p>
                </article>
              ))}
            </div>
            <div className={phase2.certificateFoot}>
              <span>SCENARIO FINGERPRINT / {certificate.fingerprint}</span>
              <button
                className={phase2.textButton}
                onClick={() => {
                  setShowCertificate(false);
                  setShowChallenge(true);
                }}
              >
                Challenge the proof -&gt;
              </button>
            </div>
          </div>
        </section>
      )}
      {showRemediation && plan && (
        <section
          className={phase2.modal}
          role="dialog"
          aria-modal="true"
          aria-label="Safe change packet"
        >
          <div className={phase2.modalHeader}>
            <span>SAFE CHANGE PACKET / {plan.id}</span>
            <button
              aria-label="Close safe change packet"
              onClick={() => setShowRemediation(false)}
            >
              x
            </button>
          </div>
          <div className={phase2.remediationBody}>
            <div className={phase2.packetHeadline}>
              <div>
                <span className={phase2.rejectedTag}>
                  REMEDIATION IS PROPOSED — NOT EXECUTED
                </span>
                <h2>Make the smallest reversible change.</h2>
              </div>
              <span className={phase2.reversible}>↺ REVERSIBLE</span>
            </div>
            <p className={phase2.change}>{plan.change}</p>
            <div className={phase2.packetMeta}>
              <span>
                <b>SCOPE</b>
                {plan.scope}
              </span>
              <span>
                <b>OWNER</b>
                {plan.owner}
              </span>
              <span>
                <b>EXPIRY</b>
                {plan.expiry}
              </span>
            </div>
            <div className={phase2.packetGrid}>
              <article>
                <span>01 / BEFORE YOU START</span>
                <ul>
                  {plan.preconditions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
              <article>
                <span>02 / PROVE RECOVERY</span>
                <ul>
                  {plan.verify.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
              <article className={phase2.haltCard}>
                <span>03 / STOP THE CHANGE IF</span>
                <ul>
                  {plan.halt.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            </div>
            <div className={phase2.rollback}>
              <b>ROLLBACK</b>
              <p>{plan.rollback}</p>
            </div>
            <p className={phase2.noExecution}>
              This is a simulated review packet. Faultfix will never modify
              infrastructure or deploy a change.
            </p>
          </div>
        </section>
      )}
      {showReceipt && receipt && (
        <section
          className={phase2.modal}
          role="dialog"
          aria-modal="true"
          aria-label="Incident Receipt"
        >
          <div className={phase2.modalHeader}>
            <span>INCIDENT RECEIPT / {receipt.id}</span>
            <button
              aria-label="Close incident receipt"
              onClick={() => setShowReceipt(false)}
            >
              x
            </button>
          </div>
          <div className={phase2.receiptBody}>
            <div className={phase2.receiptStamp}>
              PROOF
              <br />
              COMPLETE
            </div>
            <span className={phase2.rejectedTag}>CONFIDENCE: HIGH</span>
            <h2>Cause established.</h2>
            <p>{receipt.rootCause}</p>
            <dl>
              <div>
                <dt>REJECTED ALTERNATIVE</dt>
                <dd>{receipt.rejected}</dd>
              </div>
              <div>
                <dt>REGRESSION TEST</dt>
                <dd>{receipt.test}</dd>
              </div>
              <div>
                <dt>CANDIDATE PATCH</dt>
                <dd>{receipt.patch}</dd>
              </div>
            </dl>
            <div className={phase2.receiptActions}>
              <button className={phase2.modalClose} onClick={exportReceipt}>
                Export receipt (.txt)
              </button>
              <button
                className={phase2.textButton}
                onClick={() => {
                  setShowReceipt(false);
                  setShowCertificate(true);
                }}
              >
                Inspect causal certificate -&gt;
              </button>
              <button
                className={phase2.textButton}
                onClick={() => {
                  setShowReceipt(false);
                  setShowProof(true);
                }}
              >
                Review test proof -&gt;
              </button>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
