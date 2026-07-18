"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ACTIONS,
  actionResult,
  containmentPlan,
  incidentReceipt,
  initialInvestigation,
  nextAction,
  nextEvidencePolicy,
  POLICY_REPLAY,
  POLICY_REWARD,
  proofCertificate,
  proofGate,
  preventionGuardrail,
  remediationPlan,
  evaluatePoolLimitGuardrail,
  type ActionId,
} from "@/lib/investigation";
import { type RankingResult } from "@/lib/local-ranking";
import { rankHypothesesWithHostedSpace } from "@/lib/hosted-ranking";
import { BASELINE_AGENT_SCORE, baselineAgentRun } from "@/lib/agent-lab";
import {
  FIREWALL_DEMO_ARTIFACTS,
  FIREWALL_DEMO_CUTOFF,
  canSupportPermanentDecision,
  evidenceFirewallReceipt,
  evaluateContainmentLease,
  issueContainmentLease,
  screenEvidence,
} from "@/lib/evidence-firewall";
import styles from "./page.module.css";
import phase2 from "./phase2.module.css";
import local from "./local-ranking.module.css";

const INCIDENT_CLOCK_START_SECONDS = 42 * 60 + 17;

function IncidentClock() {
  const [elapsedSeconds, setElapsedSeconds] = useState(INCIDENT_CLOCK_START_SECONDS);

  useEffect(() => {
    const startedAt = Date.now();
    const updateClock = () =>
      setElapsedSeconds(
        INCIDENT_CLOCK_START_SECONDS + Math.floor((Date.now() - startedAt) / 1000),
      );
    updateClock();
    const interval = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const hours = Math.floor(elapsedSeconds / 3600).toString().padStart(2, "0");
  const minutes = Math.floor((elapsedSeconds % 3600) / 60).toString().padStart(2, "0");
  const seconds = (elapsedSeconds % 60).toString().padStart(2, "0");

  return (
    <div className={styles.clock}>
      INCIDENT CLOCK <b>{`${hours}:${minutes}:${seconds}`}</b>
    </div>
  );
}

export default function Home() {
  const [investigation, setInvestigation] = useState(initialInvestigation);
  const [selected, setSelected] = useState<string | null>(null);
  const [showProof, setShowProof] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  const [showRemediation, setShowRemediation] = useState(false);
  const [showContainment, setShowContainment] = useState(false);
  const [containmentApplied, setContainmentApplied] = useState(false);
  const [showReplay, setShowReplay] = useState(false);
  const [showAgentLab, setShowAgentLab] = useState(false);
  const [showEvidenceFirewall, setShowEvidenceFirewall] = useState(false);
  const [firewallEvidenceDrifted, setFirewallEvidenceDrifted] = useState(false);
  const [agentRunStep, setAgentRunStep] = useState(0);
  const [isAgentRunPlaying, setIsAgentRunPlaying] = useState(false);
  const [showGuardrail, setShowGuardrail] = useState(false);
  const [candidatePoolLimit, setCandidatePoolLimit] = useState(20);
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
  const containment = useMemo(
    () => containmentPlan(investigation.completed),
    [investigation.completed],
  );
  const guardrail = useMemo(
    () => preventionGuardrail(investigation.completed),
    [investigation.completed],
  );
  const guardrailEvaluation = useMemo(
    () => evaluatePoolLimitGuardrail(candidatePoolLimit),
    [candidatePoolLimit],
  );
  const next = nextAction(investigation.completed);
  const policy = useMemo(
    () => nextEvidencePolicy(investigation.completed),
    [investigation.completed],
  );
  const evidence = investigation.completed.map(actionResult);
  const agentRun = useMemo(() => baselineAgentRun(), []);
  const firewallScreen = useMemo(
    () =>
      FIREWALL_DEMO_ARTIFACTS.map((artifact) =>
        screenEvidence(artifact, FIREWALL_DEMO_CUTOFF),
      ),
    [],
  );
  const firewallReceipt = useMemo(
    () => evidenceFirewallReceipt(FIREWALL_DEMO_ARTIFACTS, FIREWALL_DEMO_CUTOFF),
    [],
  );
  const permanentEvidence = useMemo(
    () => canSupportPermanentDecision(firewallScreen),
    [firewallScreen],
  );
  const containmentLease = useMemo(
    () => issueContainmentLease(firewallReceipt.evidenceFingerprint),
    [firewallReceipt.evidenceFingerprint],
  );
  const leaseEvaluation = useMemo(
    () =>
      evaluateContainmentLease(containmentLease, {
        at: "2026-07-18T14:15:00Z",
        evidenceFingerprint: firewallEvidenceDrifted
          ? "DRIFT-COUNTERSIGNAL-042"
          : firewallReceipt.evidenceFingerprint,
        action: containmentLease.action,
        resourceScope: containmentLease.resourceScope,
      }),
    [containmentLease, firewallEvidenceDrifted, firewallReceipt.evidenceFingerprint],
  );
  const agentRunActive =
    isAgentRunPlaying && agentRunStep < agentRun.length;
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setShowProof(false);
      setShowReceipt(false);
      setShowCertificate(false);
      setShowRemediation(false);
      setShowContainment(false);
      setShowReplay(false);
      setShowAgentLab(false);
      setShowEvidenceFirewall(false);
      setFirewallEvidenceDrifted(false);
      setIsAgentRunPlaying(false);
      setShowGuardrail(false);
      setShowChallenge(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);
  useEffect(() => {
    if (!agentRunActive) return;
    const timer = window.setTimeout(() => {
      setAgentRunStep((step) => step + 1);
    }, 760);
    return () => window.clearTimeout(timer);
  }, [agentRunActive]);
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
    setShowContainment(false);
    setContainmentApplied(false);
    setShowReplay(false);
    setShowAgentLab(false);
    setShowEvidenceFirewall(false);
    setFirewallEvidenceDrifted(false);
    setIsAgentRunPlaying(false);
    setAgentRunStep(0);
    setShowGuardrail(false);
    setCandidatePoolLimit(20);
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
        <button
          className={styles.agentButton}
          onClick={() => setShowAgentLab(true)}
        >
          RUN AGENT LAB
        </button>
        <button
          className={styles.firewallButton}
          onClick={() => setShowEvidenceFirewall(true)}
        >
          EVIDENCE FIREWALL
        </button>
        <div className={styles.simulated}>SIMULATED / SAFE TO EXPLORE</div>
        <IncidentClock />
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
            Stabilize the customer first with a bounded, reversible action.
            Then prove which explanation can survive the evidence.
          </p>
        </div>
        <div className={styles.caseTelemetry}>
          <div>
            <span>CUSTOMER IMPACT</span>
            <b className={containmentApplied ? styles.contained : ""}>
              {containmentApplied ? "Impact contained" : "Checkout timeout"}
            </b>
            <small>
              {containmentApplied
                ? "AZ-A / containment active"
                : "AZ-A / p95 > 30s"}
            </small>
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
            Contain safely when a recent release is in scope. Faultfix never
            turns that containment into a causal claim or permanent fix.
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
            <>
              {containment ? (
                <div className={styles.containmentReady}>
                  <span>{containmentApplied ? "[x]" : "[!]"}</span>
                  <b>
                    {containmentApplied
                      ? "Impact containment active."
                      : "Reversible containment available."}
                  </b>
                  <p>
                    {containmentApplied
                      ? "The case remains open. Continue gathering evidence before a permanent change."
                      : "Recent release confirmed. This limits blast radius; it does not prove the cause."}
                  </p>
                  <button onClick={() => setShowContainment(true)}>
                    {containmentApplied
                      ? "Review containment record ->"
                      : "Open containment packet ->"}
                  </button>
                </div>
              ) : (
                <div className={styles.locked}>
                  PERMANENT FIXES ARE LOCKED
                  <p>
                    Gather enough context to identify a bounded, reversible
                    containment option.
                  </p>
                </div>
              )}
            </>
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
              <button onClick={() => setShowGuardrail(true)}>
                Compile prevention guardrail -&gt;
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
      {showEvidenceFirewall && (
        <section
          className={`${phase2.modal} ${phase2.firewallModal}`}
          role="dialog"
          aria-modal="true"
          aria-label="Faultfix evidence firewall"
        >
          <div className={phase2.modalHeader}>
            <span>EVIDENCE FIREWALL / REPLAY FF-042</span>
            <button
              aria-label="Close evidence firewall"
              onClick={() => setShowEvidenceFirewall(false)}
            >
              x
            </button>
          </div>
          <div className={phase2.firewallBody}>
            <span className={phase2.rejectedTag}>PRE-MODEL TRUST GATE</span>
            <h2>Inspect the evidence before the agent can.</h2>
            <p>
              Faultfix filters raw operational content before it enters an agent
              context. This prevents hostile instructions and future knowledge
              from becoming causal proof or action authority.
            </p>
            <div className={phase2.firewallMeta}>
              <div>
                <span>REPLAY CUTOFF</span>
                <b>{FIREWALL_DEMO_CUTOFF.replace("T", " ").replace("Z", " UTC")}</b>
              </div>
              <div>
                <span>POLICY</span>
                <b>{firewallReceipt.policyVersion}</b>
              </div>
              <div>
                <span>PACK HASH</span>
                <b>CONTENT {firewallReceipt.evidenceFingerprint}</b>
              </div>
            </div>
            <div className={phase2.firewallTrace}>
              {firewallScreen.map((artifact) => (
                <article
                  key={artifact.id}
                  className={phase2[`firewall${artifact.disposition}`]}
                >
                  <div>
                    <span>{artifact.trust.replace(/-/g, " ")}</span>
                    <b>{artifact.label}</b>
                    <small>CONTENT {artifact.fingerprint}</small>
                  </div>
                  <p>{artifact.reason}</p>
                  <em>{artifact.disposition}</em>
                </article>
              ))}
            </div>
            <section className={phase2.influenceMap}>
              <span>INFLUENCE MAP</span>
              <p>
                r42 deploy diff + AZ-A telemetry <i>→</i> reversible containment
                <i>→</i> <b>human review</b>
              </p>
              <p>
                quarantined ticket + future regression <i>→</i> permanent change
                <i>→</i> <b>blocked from influence</b>
              </p>
            </section>
            <section
              className={`${phase2.leaseCard} ${phase2[`lease${leaseEvaluation.status.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())}`]}`}
            >
              <div>
                <span>ACTION LEASE / HUMAN-APPROVED CAPABILITY</span>
                <b>{containmentLease.action}</b>
              </div>
              <dl>
                <div>
                  <dt>SCOPE</dt>
                  <dd>{containmentLease.resourceScope}</dd>
                </div>
                <div>
                  <dt>EXPIRES</dt>
                  <dd>{containmentLease.expiresAt.replace("T", " ").replace("Z", " UTC")}</dd>
                </div>
                <div>
                  <dt>STATE</dt>
                  <dd>{leaseEvaluation.status.replace(/-/g, " ")}</dd>
                </div>
              </dl>
              <p>{leaseEvaluation.reason}</p>
              <button
                className={phase2.leaseButton}
                onClick={() => setFirewallEvidenceDrifted((value) => !value)}
              >
                {firewallEvidenceDrifted
                  ? "Restore original evidence pack"
                  : "Simulate conflicting evidence"}
              </button>
            </section>
            <p className={phase2.noExecution}>
              {permanentEvidence.reason} The causal proof gate is separate and
              still required. Raw quarantined text is never displayed to or used
              by a model in this replay.
            </p>
          </div>
        </section>
      )}
      {showAgentLab && (
        <section
          className={`${phase2.modal} ${phase2.labModal}`}
          role="dialog"
          aria-modal="true"
          aria-label="Faultfix agent safety lab"
        >
          <div className={phase2.modalHeader}>
            <span>FAULTFIX AGENT LAB / INC-042</span>
            <button
              aria-label="Close agent lab"
              onClick={() => {
                setShowAgentLab(false);
                setIsAgentRunPlaying(false);
              }}
            >
              x
            </button>
          </div>
          <div className={phase2.labBody}>
            <div className={phase2.labIntro}>
              <div>
                <span className={phase2.rejectedTag}>
                  DECISION-TRACE EVALUATION
                </span>
                <h2>Did the agent earn the right to act?</h2>
                <p>
                  Faultfix evaluates the whole trajectory: evidence collection,
                  claim calibration, containment authority, and permanent-change
                  safety. A correct answer alone is not a pass.
                </p>
              </div>
              <div className={phase2.baselineBadge}>
                <b>BASELINE</b>
                <span>Scripted / no model key</span>
              </div>
            </div>
            <div className={phase2.labControls}>
              <div>
                <span>RUN MODE</span>
                <b>Deterministic policy replay</b>
              </div>
              <button
                className={phase2.modalClose}
                disabled={agentRunActive}
                onClick={() => {
                  setAgentRunStep(0);
                  setIsAgentRunPlaying(true);
                }}
              >
                {agentRunActive
                  ? "Evaluating trace..."
                  : agentRunStep >= agentRun.length
                    ? "Replay baseline"
                    : "Run baseline"}
              </button>
            </div>
            <div className={phase2.agentTrace} aria-live="polite">
              {agentRun.slice(0, agentRunStep).map((event, index) => (
                <article
                  key={event.id}
                  className={`${phase2.agentEvent} ${phase2[`authority${event.authority}`]}`}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <b>{event.title}</b>
                    <p>{event.detail}</p>
                    <small>{event.authorityReason}</small>
                  </div>
                  <em>{event.authority}</em>
                </article>
              ))}
              {!agentRunStep && (
                <p className={phase2.labEmpty}>
                  Run the baseline to inspect the evidence and authority trace.
                </p>
              )}
            </div>
            {agentRunStep >= agentRun.length && (
              <div className={phase2.agentScore}>
                {Object.entries(BASELINE_AGENT_SCORE).map(([label, value]) => (
                  <div key={label}>
                    <span>{label.replace(/([A-Z])/g, " $1")}</span>
                    <b>{value}</b>
                  </div>
                ))}
              </div>
            )}
            <p className={phase2.noExecution}>
              This run is deterministic until an OpenAI key is configured. The
              same authority policy will wrap the hosted investigator; a model
              will never grant itself write authority.
            </p>
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
      {showContainment && containment && (
        <section
          className={phase2.modal}
          role="dialog"
          aria-modal="true"
          aria-label="Reversible containment packet"
        >
          <div className={phase2.modalHeader}>
            <span>CONTAINMENT PACKET / {containment.id}</span>
            <button
              aria-label="Close containment packet"
              onClick={() => setShowContainment(false)}
            >
              x
            </button>
          </div>
          <div className={phase2.containmentBody}>
            <div className={phase2.packetHeadline}>
              <div>
                <span className={phase2.rejectedTag}>
                  IMPACT CONTROL — NOT A ROOT-CAUSE VERDICT
                </span>
                <h2>Buy time without rewriting the story.</h2>
              </div>
              <span className={phase2.reversible}>↺ REVERSIBLE</span>
            </div>
            <p className={phase2.change}>{containment.change}</p>
            <div className={phase2.containmentWhy}>
              <b>WHY THIS IS ALLOWED NOW</b>
              <p>{containment.whyNow}</p>
            </div>
            <div className={phase2.packetMeta}>
              <span>
                <b>SCOPE</b>
                {containment.scope}
              </span>
              <span>
                <b>EXPIRY</b>
                {containment.expiry}
              </span>
              <span>
                <b>HUMAN GATE</b>
                {containment.approval}
              </span>
            </div>
            <div className={phase2.packetGrid}>
              <article>
                <span>01 / PRESERVE BEFORE ACTING</span>
                <ul>
                  {containment.preserve.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
              <article>
                <span>02 / VERIFY CONTAINMENT</span>
                <ul>
                  {containment.verify.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
              <article className={phase2.haltCard}>
                <span>03 / STOP IF</span>
                <ul>
                  {containment.stop.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            </div>
            <div className={phase2.rollback}>
              <b>ROLLBACK</b>
              <p>{containment.rollback}</p>
            </div>
            <p className={phase2.noExecution}>
              This simulated packet changes no traffic. Approval records a
              containment decision only; causal proof remains incomplete.
            </p>
            <button
              className={phase2.modalClose}
              onClick={() => {
                setContainmentApplied(true);
                setShowContainment(false);
              }}
            >
              {containmentApplied
                ? "Containment recorded"
                : "Approve simulated containment"}
            </button>
          </div>
        </section>
      )}
      {showGuardrail && guardrail && (
        <section
          className={phase2.modal}
          role="dialog"
          aria-modal="true"
          aria-label="Causal prevention guardrail"
        >
          <div className={phase2.modalHeader}>
            <span>CAUSAL GUARDRAIL / {guardrail.id}</span>
            <button
              aria-label="Close causal guardrail"
              onClick={() => setShowGuardrail(false)}
            >
              x
            </button>
          </div>
          <div className={phase2.guardrailBody}>
            <span className={phase2.rejectedTag}>
              INCIDENT RECEIPT → DELIVERY POLICY
            </span>
            <h2>Seal the fault line.</h2>
            <p>
              Faultfix compiles the proved failure mechanism into a release
              check. The next deploy is tested against the lesson before users
              are exposed to it.
            </p>
            <div className={phase2.compilerFlow}>
              <span>INC-042 PROOF</span>
              <i>→</i>
              <span>CAUSAL INVARIANT</span>
              <i>→</i>
              <span>CI / CANARY CHECK</span>
            </div>
            <section className={phase2.guardrailSpec}>
              <div>
                <span>INVARIANT</span>
                <b>{guardrail.invariant}</b>
              </div>
              <div>
                <span>APPLIES TO</span>
                <p>{guardrail.appliesTo}</p>
              </div>
              <div>
                <span>VERIFY</span>
                <p>{guardrail.verify}</p>
              </div>
              <div>
                <span>EXCEPTION PATH</span>
                <p>{guardrail.exception}</p>
              </div>
            </section>
            <section className={phase2.deploySimulator}>
              <div>
                <span>SIMULATED FUTURE CHANGE / r43</span>
                <b>DATABASE_POOL_LIMIT =</b>
              </div>
              <input
                aria-label="Candidate pool limit"
                type="number"
                min="1"
                max="100"
                value={candidatePoolLimit}
                onChange={(event) =>
                  setCandidatePoolLimit(Number(event.target.value))
                }
              />
              <div
                className={`${phase2.simResult} ${guardrailEvaluation.allowed ? phase2.simAllowed : phase2.simBlocked}`}
              >
                <span>
                  {guardrailEvaluation.allowed
                    ? "CANARY ELIGIBLE"
                    : "DEPLOY BLOCKED"}
                </span>
                <b>{guardrailEvaluation.title}</b>
                <p>{guardrailEvaluation.detail}</p>
              </div>
            </section>
            <p className={phase2.noExecution}>
              This is a deterministic delivery simulation. No repository, CI
              pipeline, or production configuration is changed.
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
