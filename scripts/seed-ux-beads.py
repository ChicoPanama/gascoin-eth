#!/usr/bin/env python3
"""Seed the canonical GAS UX Phase 0–11 plan into Beads (`bd`).

Run after `bd init` from the repository root.
The script reuses issues by exact title so it can be rerun safely.
"""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class TaskSpec:
    title: str
    description: str
    acceptance: str
    priority: int = 2


@dataclass(frozen=True)
class PhaseSpec:
    number: int
    name: str
    objective: str
    gate: str
    tasks: tuple[TaskSpec, ...]


PHASES: tuple[PhaseSpec, ...] = (
    PhaseSpec(
        0,
        "GAS feature freeze for UX",
        "Normalize GAS features, economics, terminology, protocol firewalls and UX non-negotiables before redesign.",
        "A new agent can determine what GAS must support and must never misrepresent without reading chat history.",
        (
            TaskSpec("P0.1 Canonical feature inventory", "Normalize all current GAS capabilities into one repository artifact with decision states.", "Feature inventory covers identity, Home, Play, Social, Trade, Monetary, Account and future Bracket capabilities."),
            TaskSpec("P0.2 Economic constraint matrix", "Record user-visible implications of trading fees, game economics, presale direction, reserve rules and principal-exit requirements.", "No UX requirement conflates GAS trading volume with game handle or misstates protocol/team economics."),
            TaskSpec("P0.3 Terminology and product-language freeze", "Lock current GAS-native terminology and identify deprecated names.", "GAS/wGAS/GSD status and CRUISE/BOOST/REDLINE/IGNITION/GAS GAUGE terminology are explicit."),
            TaskSpec("P0.4 Solvency and trust firewall map", "Translate monetary reserve, game bankroll and future Bracket collateral separation into UX constraints.", "Every money domain has explicit user-facing semantics and forbidden misleading combinations."),
            TaskSpec("P0.5 UX non-negotiables", "Freeze core interaction, trust, mobile, recovery and accessibility requirements.", "Non-negotiables are testable and linked to canonical journeys."),
        ),
    ),
    PhaseSpec(
        1,
        "Existing repo inventory",
        "Catalog reusable routes, components, styles, state primitives, APIs and tests in gascoin-eth.",
        "Every planned GAS surface maps to reuse/refactor/extend/build/reject with dependencies and constraints.",
        (
            TaskSpec("P1.1 Route and navigation inventory", "Inventory app routes, layouts, deep links and navigation primitives.", "Route map identifies reusable and obsolete old GasCoin surfaces."),
            TaskSpec("P1.2 Component inventory", "Inventory React components relevant to identity, wallet, dashboard, social, leaderboard, navigation and activity.", "Component map records path, responsibility and proposed action."),
            TaskSpec("P1.3 Design-system inventory", "Inventory tokens, typography, spacing, responsive rules, motion and accessibility primitives.", "GAS visual bones are documented without redesigning them yet."),
            TaskSpec("P1.4 Data/state/API inventory", "Inventory Privy, wagmi, viem, React Query, API routes and state/error patterns.", "Core UX state dependencies and missing abstractions are explicit."),
            TaskSpec("P1.5 Test and resilience inventory", "Inventory Playwright/Vitest coverage, error boundaries and recovery surfaces.", "Existing coverage is mapped to canonical GAS journeys and gaps are recorded."),
            TaskSpec("P1.6 Compatibility matrix", "Map GAS patterns/capabilities to current repository implementation surfaces.", "Machine-readable reuse/refactor/extend/build/reject matrix exists."),
        ),
    ),
    PhaseSpec(
        2,
        "Fomo molecular teardown",
        "Perform the deepest single-product teardown on Fomo as the primary SocialFi/application-shell benchmark.",
        "Useful Fomo UX laws are evidence-backed, measured where practical and translated into GAS-native requirements.",
        (
            TaskSpec("P2.1 Fomo route/state map", "Capture public information architecture, routes and major logged-out/logged-in states available for research.", "Route/state artifact identifies the journeys that can be measured."),
            TaskSpec("P2.2 Fomo feed molecular capture", "Measure feed hierarchy, density, social context, updates and adjacent actions across standard viewports.", "Structured observations and captures exist for relevant feed states."),
            TaskSpec("P2.3 Fomo profile/follow/leaderboard capture", "Measure identity, profile, follow and leaderboard flows.", "J06-style social discovery metrics are recorded."),
            TaskSpec("P2.4 Fomo social-to-action journey capture", "Measure how social objects lead to economic actions and how context is preserved.", "Action counts, screens, modals and state transitions are recorded."),
            TaskSpec("P2.5 Fomo cross-device/account continuity", "Document balance/identity/position continuity and mobile-desktop behavior.", "Relevant continuity patterns and constraints are translated for GAS."),
            TaskSpec("P2.6 Fomo pattern extraction", "Convert findings into candidate GAS patterns with weaknesses and improvements.", "No output depends on copying Fomo assets or proprietary implementation."),
        ),
    ),
    PhaseSpec(
        3,
        "Specialized cross-category teardowns",
        "Search broadly for the strongest solution to each GAS UX problem; named products are starting references, not limits.",
        "Every canonical GAS journey has a credible reference benchmark or an explicit GAS-first benchmark requirement.",
        (
            TaskSpec("P3.1 High-frequency game UX research", "Study Stake Originals and any superior game interfaces for risk selection, wagering, result, replay, fairness and recovery.", "Best-known game-loop benchmarks are recorded for J02/J03/J04/J12/J13."),
            TaskSpec("P3.2 Discovery and conversion research", "Study Pump and superior launch/trading products for discovery-to-action efficiency.", "Best-known conversion patterns are linked to GAS Buy/Play journeys."),
            TaskSpec("P3.3 Prediction-market research", "Study Polymarket, Kalshi, Robinhood and other strong market UIs for probability, order, portfolio and settlement semantics.", "Patterns support future Bracket compatibility without contaminating current GAS simplicity."),
            TaskSpec("P3.4 Social-finance expansion research", "Compare Fomo against Robinhood Social, OKX Orbit and emerging SocialFi products.", "Fomo is retained only where it remains the strongest benchmark for the relevant behavior."),
            TaskSpec("P3.5 High-speed trading and execution research", "Study Hyperliquid, Axiom and other execution-dense products.", "Useful execution/feedback patterns are captured without importing terminal complexity by default."),
            TaskSpec("P3.6 Consumer-finance abstraction research", "Study Robinhood, Coinbase, Cash App, Revolut and others for funding, identity, balances and recovery.", "Best account/funding abstraction patterns are mapped to GAS constraints."),
            TaskSpec("P3.7 Monetary/rebase/reserve UX research", "Study ORE, AMPL and stronger transparency interfaces.", "Rebase, reserve, backing and live-network communication benchmarks are established."),
            TaskSpec("P3.8 Open-ended reference discovery", "Continuously admit any product that materially outperforms current references on a GAS journey.", "Each added reference has a specific benchmark purpose, evidence level and GAS applicability."),
        ),
    ),
    PhaseSpec(
        4,
        "Reference Matrix",
        "Normalize cross-product evidence and extract UX laws rather than product-specific imitation instructions.",
        "Important behaviors are represented as evidence-backed principles with strongest-known benchmarks and GAS applicability.",
        (
            TaskSpec("P4.1 Normalize observations", "Convert captures/findings into the canonical observation schema.", "Comparable observations exist across references and viewports."),
            TaskSpec("P4.2 Score reference journeys", "Measure action count, screens, modals, latency, scroll, cognition, recovery and accessibility where possible.", "Reference-best values are populated for supported journeys."),
            TaskSpec("P4.3 Extract cross-product laws", "Identify convergent design principles and meaningful outliers.", "Each law cites evidence and states tradeoffs."),
            TaskSpec("P4.4 Identify reference weaknesses", "Record friction, misleading states and patterns GAS should explicitly avoid.", "Matrix includes take/reject/improve decisions."),
            TaskSpec("P4.5 GAS opportunity ranking", "Rank patterns by expected effect on trust, comprehension, conversion, retention and replay.", "Prioritized matrix can drive Phase 5."),
        ),
    ),
    PhaseSpec(
        5,
        "GAS Pattern Library",
        "Translate reference laws into GAS-native reusable UX patterns.",
        "Every important GAS interaction references a GAS pattern, not an external product name.",
        (
            TaskSpec("P5.1 Account and financial patterns", "Define unified account, balance, funding, trade and settlement presentation patterns.", "Patterns preserve correct economic distinctions and progressive disclosure."),
            TaskSpec("P5.2 Game interaction patterns", "Define wager, risk, IGNITION, result, replay, Instant/Cinematic and fairness patterns.", "Game patterns include mobile geometry and state behavior."),
            TaskSpec("P5.3 Social patterns", "Define result objects, profiles, follows, feeds, Crews, reactions and social-to-action patterns.", "Social patterns attach canonical GAS activity where possible."),
            TaskSpec("P5.4 Monetary patterns", "Define RebaseClock, RebaseEvent, ReserveGauge, backing and live-network patterns.", "Patterns communicate trust without requiring protocol expertise."),
            TaskSpec("P5.5 Recovery and interruption patterns", "Define pending, reconnect, retry, expired permission, delayed RNG/settlement and offline patterns.", "Every critical money-moving state has one safe recovery path."),
            TaskSpec("P5.6 Pattern acceptance targets", "Attach numerical UX targets to reusable patterns.", "Targets are measurable by Phase 10 tooling."),
        ),
    ),
    PhaseSpec(
        6,
        "GAS information architecture",
        "Lock product structure, route/state model and information hierarchy before final screens are implemented.",
        "Every canonical journey has a deterministic route/state path and each screen has a defined primary action.",
        (
            TaskSpec("P6.1 Primary navigation architecture", "Lock Home/Play/Trade/Crews/Reserve/Wallet hierarchy and secondary protocol surfaces.", "Mobile and desktop navigation models are explicit."),
            TaskSpec("P6.2 Account and balance semantics", "Define how GAS, USDC, game authorization, reserve data and future positions appear without misleading aggregation.", "One clean account model preserves real economic distinctions."),
            TaskSpec("P6.3 Social graph and feed architecture", "Define identity, follows, profiles, Crews, global/following feeds and notifications.", "Social is a cross-product layer, not an isolated community page."),
            TaskSpec("P6.4 Play state architecture", "Define CRUISE/BOOST/REDLINE, wager, IGNITION, result, replay, history and fairness state machine.", "State model covers success, pending, failure and reconnect."),
            TaskSpec("P6.5 Monetary information hierarchy", "Define rebase/reserve/backing surfaces and disclosure depth.", "At-a-glance trust state and deep verification paths are both defined."),
            TaskSpec("P6.6 Future Bracket compatibility architecture", "Define extension points for event markets/positions without redesigning the GAS account/social shell.", "Future position semantics remain separate from spendable cash and game bankroll."),
        ),
    ),
    PhaseSpec(
        7,
        "Mobile GAS prototype",
        "Build the first coherent mobile-first GAS prototype from sign-in through replay.",
        "Core mobile experience is usable end-to-end, no-scroll on primary Play flow and ready for benchmark measurement.",
        (
            TaskSpec("P7.1 Mobile app shell", "Implement/refactor mobile navigation, account header and primary layout using GAS design tokens.", "Target viewports render without layout overflow and core destinations are reachable."),
            TaskSpec("P7.2 Unified account prototype", "Implement consumer-facing account/balance shell with correct underlying distinctions.", "User can understand total and components without chain/RPC knowledge."),
            TaskSpec("P7.3 GAS Original Play prototype", "Implement CRUISE/BOOST/REDLINE, wager controls, IGNITION and GAS Gauge shell.", "Primary controls fit target mobile viewport without required scroll."),
            TaskSpec("P7.4 Result and replay prototype", "Implement result hierarchy, balance delta, replay/share/verify actions.", "Result → replay requires one action."),
            TaskSpec("P7.5 Mobile interruption/recovery prototype", "Implement refresh/reconnect/pending/error states in the prototype.", "Critical round state remains recoverable and understandable."),
        ),
    ),
    PhaseSpec(
        8,
        "Desktop adaptation",
        "Adapt the proven mobile model to desktop without defaulting to terminal-style complexity.",
        "Desktop and mobile share product semantics, identity, balances and state logic.",
        (
            TaskSpec("P8.1 Desktop shell", "Adapt navigation and primary layout for laptop/desktop viewports.", "Desktop hierarchy improves space use without changing core journeys."),
            TaskSpec("P8.2 Desktop Play adaptation", "Adapt Play/Gauge/social context for larger screens.", "Keyboard/hotkey and repeat-play ergonomics are defined and tested."),
            TaskSpec("P8.3 Desktop social/activity density", "Increase useful feed/activity context without cluttering the primary action.", "Information density stays within approved cognitive-load targets."),
            TaskSpec("P8.4 Responsive parity review", "Verify state/behavior parity across standard viewports.", "No core feature becomes mobile-only or desktop-only unintentionally."),
        ),
    ),
    PhaseSpec(
        9,
        "Vertical-loop implementation",
        "Implement complete end-to-end user loops against real application state rather than isolated pages.",
        "Required loops work end-to-end with explicit recovery behavior and automated tests.",
        (
            TaskSpec("P9.1 Core game loop", "Implement sign in → balance → Play → IGNITION → result → replay.", "Loop passes functional, money-state and recovery tests."),
            TaskSpec("P9.2 Social acquisition loop", "Implement result → feed → profile → try configuration → explicit wager confirmation.", "Social action never auto-wagers and preserves context."),
            TaskSpec("P9.3 Buy-to-play loop", "Implement supported funding/buy GAS → account → Play transition.", "Fees/minimum received/status are clear and chain complexity is minimized."),
            TaskSpec("P9.4 Rebase communication loop", "Implement rebase → balance change → rebase event → feed/activity state.", "User can understand what changed and why."),
            TaskSpec("P9.5 Crew loop", "Implement Crew discovery/membership/activity/ranking loop.", "Identity and verified activity remain coherent."),
            TaskSpec("P9.6 Exit/withdraw loop", "Implement sell/withdraw → settlement → history and failure recovery.", "Exit is as discoverable and understandable as entry."),
            TaskSpec("P9.7 Resilience loop", "Implement refresh, reconnect, permission expiry, delayed settlement and duplicate-submit protection.", "J12/J13/J14 behavior meets trust requirements."),
        ),
    ),
    PhaseSpec(
        10,
        "Automated comparison and benchmarking",
        "Turn UX quality into repeatable measurements and release gates.",
        "Designated core journeys score >=90/100 with no critical trust/recovery failure.",
        (
            TaskSpec("P10.1 Wire canonical journeys to Playwright", "Implement automated journeys using benchmark instrumentation.", "Core journeys emit action/screen/modal/scroll/timing metrics."),
            TaskSpec("P10.2 Populate reference-best benchmarks", "Load credible reference measurements into comparison artifacts.", "Supported journeys contain source/evidence and reference_best values."),
            TaskSpec("P10.3 GAS score computation", "Compute weighted journey scores and GAS_current versus GAS_target.", "Scores are reproducible and stored as CI artifacts."),
            TaskSpec("P10.4 Resilience benchmark suite", "Automate refresh/offline/reconnect/permission/delayed-result scenarios.", "Critical failures fail the release gate independent of aggregate score."),
            TaskSpec("P10.5 Accessibility/mobile ergonomics gates", "Automate touch-target, keyboard, no-scroll and key accessibility checks.", "Core flows meet approved ergonomic/accessibility thresholds."),
            TaskSpec("P10.6 CI regression gate", "Fail CI when implemented core journey metrics regress below approved thresholds.", "Regression behavior is deterministic and actionable."),
        ),
    ),
    PhaseSpec(
        11,
        "Destroy friction",
        "Iteratively remove unnecessary taps, delays, modals, ambiguity, scrolling and wallet interruption until GAS meets/exceeds credible benchmarks.",
        "No known benchmarkable friction remains above target without an explicit protocol/security justification.",
        (
            TaskSpec("P11.1 Rank friction by impact", "Use benchmark/user evidence to rank friction in core journeys.", "Backlog is ordered by measurable impact on trust, speed, comprehension, conversion or retention."),
            TaskSpec("P11.2 Optimize action count", "Remove unnecessary interactions while preserving explicit financial intent.", "Core journeys meet or beat approved action-count targets."),
            TaskSpec("P11.3 Optimize perceived latency", "Improve acknowledgement, loading, optimistic state and ready-for-next-action timing.", "Users receive immediate honest feedback and no unexplained dead time."),
            TaskSpec("P11.4 Optimize cognitive load", "Remove/restructure competing information and disclosures.", "Primary actions remain obvious and advanced detail stays accessible."),
            TaskSpec("P11.5 Optimize recovery", "Reduce recovery steps and ambiguity in failed/interrupted money states.", "Recovery meets or beats approved reference targets."),
            TaskSpec("P11.6 Rebenchmark and loop", "Rerun Phase 9–11 benchmarks after each material optimization wave.", "GAS_current is updated and new gaps become linked beads."),
        ),
    ),
)


def run_bd(args: list[str], check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(["bd", *args], text=True, capture_output=True, check=check)


def parse_json(text: str) -> Any:
    text = text.strip()
    if not text:
        return None
    return json.loads(text)


def collect_issue_objects(value: Any) -> list[dict[str, Any]]:
    found: list[dict[str, Any]] = []
    if isinstance(value, dict):
        if isinstance(value.get("id"), str) and isinstance(value.get("title"), str):
            found.append(value)
        for child in value.values():
            found.extend(collect_issue_objects(child))
    elif isinstance(value, list):
        for child in value:
            found.extend(collect_issue_objects(child))
    return found


def first_issue_id(value: Any) -> str:
    issues = collect_issue_objects(value)
    if not issues:
        raise RuntimeError(f"Could not find issue id in bd response: {value!r}")
    return issues[0]["id"]


def existing_by_title() -> dict[str, str]:
    result = run_bd(["list", "--json"])
    data = parse_json(result.stdout)
    return {issue["title"]: issue["id"] for issue in collect_issue_objects(data)}


def ensure_issue(
    existing: dict[str, str],
    *,
    title: str,
    issue_type: str,
    priority: int,
    description: str,
    acceptance: str,
    parent: str | None = None,
) -> str:
    if title in existing:
        return existing[title]

    args = [
        "create",
        title,
        "-t",
        issue_type,
        "-p",
        str(priority),
        "--description",
        description,
        "--acceptance",
        acceptance,
    ]
    if parent:
        args.extend(["--parent", parent])
    args.append("--json")

    result = run_bd(args)
    issue_id = first_issue_id(parse_json(result.stdout))
    existing[title] = issue_id
    print(f"created {issue_id}: {title}")
    return issue_id


def ensure_dep(issue_id: str, depends_on_id: str) -> None:
    result = run_bd(["dep", "add", issue_id, depends_on_id, "--json"], check=False)
    if result.returncode == 0:
        return
    message = (result.stderr + result.stdout).lower()
    duplicate_markers = ("already", "exists", "duplicate")
    if any(marker in message for marker in duplicate_markers):
        return
    raise RuntimeError(
        f"Failed to add dependency {issue_id} -> {depends_on_id}:\n{result.stderr or result.stdout}"
    )


def main() -> int:
    if not shutil.which("bd"):
        print("ERROR: `bd` is not installed. Install Beads, run `bd init`, then rerun this script.", file=sys.stderr)
        return 2

    try:
        existing = existing_by_title()
    except Exception as exc:
        print(
            "ERROR: Beads is not initialized or `bd list --json` failed. Run `bd init` first.\n"
            f"Details: {exc}",
            file=sys.stderr,
        )
        return 2

    root_id = ensure_issue(
        existing,
        title="GAS UX PROGRAM — canonical Phase 0–11 roadmap",
        issue_type="epic",
        priority=1,
        description=(
            "Root execution graph for Project GAS UX. `ux-research/ROADMAP.md` is the canonical plan; "
            "this Beads graph is the canonical agent work state. Do not create alternate phase numbering."
        ),
        acceptance="All Phase 0–11 epics exist, are dependency-linked, and execution follows phase gates.",
    )

    phase_ids: list[str] = []

    for phase in PHASES:
        phase_title = f"UX PHASE {phase.number} — {phase.name}"
        phase_id = ensure_issue(
            existing,
            title=phase_title,
            issue_type="epic",
            priority=1,
            description=f"Objective: {phase.objective}\n\nCanonical details: ux-research/ROADMAP.md",
            acceptance=phase.gate,
            parent=root_id,
        )
        phase_ids.append(phase_id)

        mandatory_task_ids: list[str] = []
        for task in phase.tasks:
            task_id = ensure_issue(
                existing,
                title=task.title,
                issue_type="task",
                priority=task.priority,
                description=task.description,
                acceptance=task.acceptance,
                parent=phase_id,
            )
            mandatory_task_ids.append(task_id)

        gate_title = f"P{phase.number}.GATE Phase {phase.number} exit review"
        gate_id = ensure_issue(
            existing,
            title=gate_title,
            issue_type="task",
            priority=1,
            description=(
                f"Verify Phase {phase.number} outcome against the canonical roadmap. "
                "Do not close based only on task count; attach/record evidence that the exit gate is true."
            ),
            acceptance=phase.gate,
            parent=phase_id,
        )
        for task_id in mandatory_task_ids:
            ensure_dep(gate_id, task_id)

    # Sequential phase gates: later phase epics require the prior phase epic to be explicitly closed.
    for current, previous in zip(phase_ids[1:], phase_ids[:-1]):
        ensure_dep(current, previous)

    print("\nGAS UX Beads graph seeded.")
    print(f"Root epic: {root_id}")
    print("Next command: bd ready --json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
