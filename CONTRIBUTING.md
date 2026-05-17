# Contributing to SIGNAL/VOID

> *"Stay dark. Read everything. Trust no one's version of the truth."*

First — thank you for being here. SIGNAL/VOID is a solo project built by a 15-year-old developer, and the fact that you're reading this means the game found its way to someone who cares enough to contribute. That matters.

This document covers everything you need to know to contribute well: the codebase architecture, the standards we hold, and the process for getting your work merged.

---

## Table of Contents

- [The Philosophy](#the-philosophy)
- [What We Need Help With](#what-we-need-help-with)
- [What We Are Not Looking For](#what-we-are-not-looking-for)
- [Getting Started](#getting-started)
- [Codebase Architecture](#codebase-architecture)
- [Development Standards](#development-standards)
- [Commit Message Format](#commit-message-format)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Security Issues](#security-issues)
- [Code of Conduct](#code-of-conduct)

---

## The Philosophy

SIGNAL/VOID has three design pillars that every contribution must respect:

**Depth over power.** The game rewards players who read, think, and adapt — not players who grind tools and brute-force every node. Any contribution that makes the game easier by reducing the need to think is wrong for this project.

**Narrative coherence.** Every system is in service of the story. The Gradient isn't just a difficulty mechanic — it's a character. The economy exists to create meaningful choices, not frustration. Before adding anything, ask: does this serve the world of 2047 and Mara Voss's story?

**Browser-native, zero-friction.** No installs. No downloads. No accounts required to try it. Every contribution must respect the constraint that this runs in a browser tab and loads fast.

---

## What We Need Help With

These are the areas where contributions are most welcome right now:

**Story content** — node filesystem files, faction mail chains, BIBLE entries, STRATA_TIPS. The world needs more text that rewards players who read everything. If you can write in the game's voice (cold, precise, layered), this is where you can have the most impact.

**Lazarus shard content** — shards GAMMA, DELTA, and EPSILON need their `Primary_Reconstruction` and `Contradictory_Artifact` text. Each shard must contradict at least one other shard in a specific, meaningful way.

**Bug reports and reproduction steps** — especially around the economy (credits, tool purchasing), trace system edge cases, and the ghost signal inactivity timer.

**Accessibility improvements** — keyboard navigation, screen reader support, reduced-motion alternatives to the CRT/glitch effects.

**Mobile layout** — the game is functional on mobile but not fully optimized. CSS improvements that preserve the aesthetic on narrow viewports.

**Firestore security** — if you have Firebase security expertise, review `firestore.rules` against the threat model in `security_spec.md` and open an issue if you find gaps.

---

## What We Are Not Looking For

To protect the project's coherence, we will not accept:

- **UI redesigns** that change the core CRT/phosphor aesthetic
- **New game mechanics** that haven't been discussed in an issue first
- **Dependency additions** without a compelling reason — the project is intentionally lean
- **AI-generated content** for narrative text (story files, mail, BIBLE entries) — the voice must be human and consistent
- **Gameplay difficulty reductions** — making the Gradient weaker, raising starting credits beyond the designed floor, or adding tool refund rates above 40%
- **Breaking changes** to the Firebase schema without a migration plan

If you're unsure whether your contribution fits, open an issue and ask before writing code.

---

## Getting Started

### Prerequisites

- Node.js 18 or higher
- A Firebase project (for auth/Firestore features)
- A Google Gemini API key (for AI features)

### Local Setup

```bash
# 1. Fork the repository on GitHub
# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/signal-void.git
cd signal-void

# 3. Install dependencies
npm install

# 4. Configure environment
cp .env.example .env.local
# Edit .env.local and add:
#   GEMINI_API_KEY=your_key_here

# 5. Start the dev server
npm run dev
# Opens at http://localhost:3000
```

### Branch Naming

```
feature/short-description     # new functionality
fix/short-description         # bug fixes
content/short-description     # narrative/story content additions
style/short-description       # CSS/visual changes only
docs/short-description        # documentation only
security/short-description    # Firestore rules / security changes
```

---

## Codebase Architecture

Understanding the structure before you touch anything is non-negotiable.

```
signal-void/
├── src/
│   ├── App.tsx          # The entire game — 9,500+ lines
│   │                    # Single-component architecture by design.
│   │                    # Do not split into sub-components without
│   │                    # discussion — the state graph is deeply
│   │                    # interconnected.
│   │
│   ├── index.css        # All visual systems — CRT overlay, scan lines,
│   │                    # phosphor glow, glitch effects, animations.
│   │                    # Tailwind v4 + extensive custom CSS.
│   │
│   ├── firebase.ts      # Auth + Firestore initialization only.
│   │                    # No game logic here.
│   │
│   └── main.tsx         # React root mount. Do not add logic here.
│
├── public/
│   └── audio/           # Ambient soundscapes. MP3 format.
│                        # Filenames must not change — they are
│                        # referenced by string in App.tsx.
│
├── GDD.md               # Game Design Document. Read before any
│                        # gameplay contribution.
│
├── STORY_AND_GAMEPLAY.md # Official canonical storyline. The source
│                        # of truth for all narrative decisions.
│
├── security_spec.md     # Firestore threat model. Read before any
│                        # backend/rules contribution.
│
├── firebase-blueprint.json  # Firestore data schema.
│
└── firestore.rules      # Production security rules.
```

### Key Data Structures in App.tsx

Before editing `App.tsx`, locate and understand these:

| Constant | What it is |
|----------|-----------|
| `TOOL_LIBRARY` | All 28 hacking tools with RAM/disk requirements and `storyUse` tags |
| `INITIAL_NODES` | All network nodes with filesystems, ports, and metadata |
| `TUTORIAL_STEPS` | Onboarding narrative sequence |
| `BIBLE_ENTRIES` | In-game lore codex (`bible [topic]` command) |
| `STRATA_TIPS` | Contextual tip system |
| `COMMANDS_HELP` | Help text for all terminal commands |
| `COMMAND_MANUALS` | Full `man [command]` entries |

Key state variables:

| State | Purpose |
|-------|---------|
| `credits` | Player economy |
| `noiseLevel` / `traceProgress` / `heat` | The Gradient threat system |
| `usedTechniques` | Tracks command repetition for Gradient adaptation |
| `lazarusFragments` | Narrative progress — Lazarus arc |
| `playstyle` | `{ aggro, stealth }` — determines ending availability |
| `factionReps` | `{ vektor, clearinghouse, stillwater }` — faction standing |
| `ghostSignalsFired` | Tutorial system — ensures each lesson fires once |

---

## Development Standards

### TypeScript

- All new code must be fully typed. No `any` unless absolutely unavoidable and commented.
- Interfaces for all new data shapes.
- No `// @ts-ignore` without a detailed comment explaining why.

### State Management

- All game state lives in `App.tsx` via `useState`. Do not introduce external state management (Redux, Zustand, etc.) without prior discussion.
- State updates that affect multiple systems must be batched where possible.
- Never mutate state directly.

### The Terminal Command Handler

The `switch` statement in the command handler is the spine of the game. When adding a new command:

1. Add the case in alphabetical order within its category
2. Add the command to `COMMANDS_HELP` with accurate syntax and description
3. Add a `man` entry to `COMMAND_MANUALS`
4. Consider noise impact — does this command add to `noiseLevel`? Should it?
5. Consider `usedTechniques` tracking — should this command be tracked for Gradient adaptation?

### The Gradient System

Any change that touches `noiseLevel`, `traceProgress`, `heat`, or `usedTechniques` must be reviewed carefully. The Gradient's balance is intentional. If you're changing these values, document your reasoning in the PR.

### Node Filesystems

When adding or editing files on a node:

- Files must feel like they belong to a 2047 digital archaeology site, not a modern OS
- Every file on a story node should reward the player for reading it
- Timestamps in file metadata should be internally consistent with the game's timeline (2031–2047)
- No file should exist without a reason

### CSS / Visual Systems

- The core aesthetic is non-negotiable: OLED black `#000000`, phosphor green `#00ff41`, amber `#ffaa00`
- All new UI elements must have a dark/CRT-appropriate appearance
- No external UI component libraries
- Animations must respect `prefers-reduced-motion`

```css
@media (prefers-reduced-motion: reduce) {
  /* disable your animation here */
}
```

---

## Commit Message Format

Every commit message follows this format precisely. This is the official first commit of a public project — the history should be readable for years.

### Structure

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

| Type | When to use |
|------|-------------|
| `feat` | A new feature or gameplay mechanic |
| `fix` | A bug fix |
| `content` | Narrative text, story files, node filesystem additions |
| `style` | CSS changes, visual adjustments, no logic change |
| `refactor` | Code restructuring with no behavior change |
| `perf` | Performance improvements |
| `docs` | Documentation only |
| `security` | Firestore rules, auth, or security-related changes |
| `chore` | Build system, dependencies, config |

### Scope

The area of the codebase affected:

`terminal` · `gradient` · `economy` · `narrative` · `archive` · `factions` · `nodes` · `ui` · `audio` · `firebase` · `tutorial` · `map` · `help` · `deps` · `config`

### Subject Rules

- Lowercase, no period at the end
- Present tense — "add" not "added", "fix" not "fixed"
- Under 72 characters
- Specific — "add sshcrack noise scaling at heat > 70" not "update command"

### Body

- Wrap at 72 characters
- Explain *what* and *why*, not *how* — the code shows how
- Reference the system or story context where relevant
- If the change has gameplay implications, describe the player-facing effect

### Footer

- `Closes #123` — if this closes an issue
- `Breaks: <what and why>` — if this is a breaking change
- `Narrative: <story context>` — for content/narrative commits

### Examples

**Feature commit:**
```
feat(gradient): scale trace speed by heat amplifier above 70

The Continuity Protocol's trace speed now increases non-linearly
when persistent heat exceeds 70. Below this threshold, trace speed
is determined solely by the node's base traceSpeed value.

Above 70 heat, a multiplier of (heat / 70) is applied, meaning a
player at 90 heat will experience ~28% faster traces across all
nodes. This makes heat meaningful as a persistent consequence
rather than a cosmetic indicator.

The amplifier caps at 2.0x (heat = 140, which is unreachable) to
prevent traces that complete before the player can react.

Narrative: The Gradient gets better at finding you the longer you
operate in the Undertow. Heat is the system's memory of your
presence.
```

**Bug fix commit:**
```
fix(economy): prevent sell command from accepting unowned tools

Players could type `sell [toolname]` for tools not in their
inventory and receive a credit refund for an item they never
purchased. The sell handler now checks inventory membership
before processing any tool sale.

Added a clear error message matching the terminal's voice:
"No record of [tool] in your loadout. Nothing to sell."

Closes #12
```

**Content commit:**
```
content(nodes): add full narrative text to UNDERTOW_CORE filesystem

UNDERTOW_CORE's filesystem contained placeholder content across
all story-critical files. This commit replaces placeholders with
canonical narrative text consistent with STORY_AND_GAMEPLAY.md.

Files updated:
- lazarus_letter.txt: full canonical letter from Elara Voss
- dead_letter_route.cfg: added CONTINUITY_WATCH shadow flag detail
- system_log_2031.txt: November Incident from infrastructure POV
- partition_memo.txt: internal Vektor memo on Accords ratification

Each file is written to reward players who read everything, with
details that contradict or complicate the faction intel received
through the mail system.

Narrative: UNDERTOW_CORE is the oldest surviving pre-Partition
relay. Its files should feel like excavating the actual event.
```

**Style commit:**
```
style(ui): add storyUse badge to market tool cards

Surfaces the storyUse tag (essential/useful/optional/sandbox)
as a color-coded badge on each market card:

  essential → green border + ESSENTIAL label
  useful    → cyan label
  optional  → amber label
  sandbox   → red label + warning copy

No logic changes. Data already existed on ToolMeta; this commit
makes it visible at point of purchase.

Addresses the blind-purchase problem where players spent 12,000c
on sandbox tools while progressing the Lazarus arc.
```

**Security commit:**
```
security(firebase): enforce maximum string length on all user fields

Firestore write rules now validate string field lengths to prevent
storage exhaustion attacks and oversized payload injection.

Limits applied per security_spec.md threat model:
  displayName: 100 chars
  lastNode: 64 chars
  activeMission: 64 chars

Previously, an authenticated user could write arbitrarily large
strings to their save document. No user-facing behavior changes.

Closes #8
```

---

## Pull Request Process

1. **Open an issue first** for anything beyond a trivial fix. Discuss the approach before writing code. This saves everyone time.

2. **One concern per PR.** Don't mix a bug fix with a feature. Don't mix narrative content with logic changes.

3. **Fill out the PR template completely.** A PR with no description will not be reviewed.

4. **Test manually.** There is no automated test suite yet. Before submitting, verify:
   - The terminal boots and accepts commands
   - The specific feature/fix you changed works as described
   - You haven't broken an adjacent system (run through the core loop: connect → crack → ls/cat → disconnect)
   - The Gradient still triggers correctly

5. **One approval required** for merge (from the maintainer).

6. **Squash commits** on merge for a clean history. Individual commits in your branch can be messy — the merge commit should be clean.

### PR Title Format

Same as commit message format:
```
feat(terminal): add funds command with context-aware purchase advice
```

### PR Description Template

```markdown
## What does this PR do?
[One paragraph. What changes, why it changes, what problem it solves.]

## How to test it
[Step-by-step instructions for manually verifying the change.]

## Screenshots / recordings (if UI change)
[Attach or describe what changed visually.]

## Checklist
- [ ] Follows commit message format
- [ ] No new TypeScript errors (`npm run lint`)
- [ ] Manually tested the core terminal loop
- [ ] Narrative content is consistent with STORY_AND_GAMEPLAY.md
- [ ] No hardcoded values that should be constants
- [ ] CSS changes tested in both Chrome and Firefox
```

---

## Reporting Bugs

Open a GitHub issue with the title format: `bug: [short description]`

Include:

- **What you expected to happen**
- **What actually happened**
- **Steps to reproduce** — be specific. "The economy broke" is not enough. "Typing `sell nmap_pro` after purchasing it via `download nmap_pro` returned an error instead of crediting 40% of 800c" is enough.
- **Browser and OS**
- **Your heat level and current node at the time** — these affect many systems

---

## Suggesting Features

Open a GitHub issue with the title format: `feat: [short description]`

Before suggesting, read `GDD.md` and `STORY_AND_GAMEPLAY.md`. Many features that seem missing are intentional design decisions. Your suggestion should explain:

- What problem this solves for the player
- How it fits the three design pillars (depth over power, narrative coherence, browser-native)
- What existing system it touches or extends

---

## Security Issues

**Do not open a public issue for security vulnerabilities.**

If you find a security issue — especially in the Firestore rules, authentication flow, or any area described in `security_spec.md` — contact the maintainer directly via GitHub private message or email before disclosing publicly.

Give 14 days for a response before any public disclosure. We take security seriously and will respond promptly.

---

## Code of Conduct

This is a small project built with care. Treat it accordingly.

- Be direct and specific in code review — vague feedback helps no one
- Disagree with ideas, not people
- If you're frustrated, step away before responding
- Contributions of all sizes are welcome — a well-written BIBLE entry is as valuable as a new feature
- The maintainer is 15 years old and building this in their spare time — calibrate expectations accordingly

We are here to build something worth building. Act like it.

---

*"The Undertow rewards people who read everything."*

**SIGNAL/VOID** | github.com/Architect-Brad/signal-void
