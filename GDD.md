# Game Design Document: SIGNAL/VOID
**Version:** 2.0.0
**Genre:** Signal Archaeology / Forensic Hacking / Narrative Thriller
**Platform:** Web (React/TypeScript)

## 1. Executive Summary
**SIGNAL/VOID** is a forensic hacking thriller set in a stratified future. Players take on the role of Mara Voss, a signal archaeologist navigating the "Undertow" to uncover the truth behind a 14-year-old message from a whistleblower. The game emphasizes interpretation of raw data, management of AI-driven environmental pressure, and moral choices over traditional progress bars.

---

## 2. Core Gameplay Pillars
### P1: Forensic Analysis
The game is about reading systems, not just bypassing them. Players must contrast the "Surface" (UI) with the "Stack" (Running Processes) and "History" (Logs) to find flaws.
### P2: The Gradient
An adaptive AI threat (Continuity Protocol) that observes the player's behavior. The more you use a specific technique, the more the environment hardens against it.
### P3: Stratigraphic Exploration
Navigation through historical layers of decommissioned net infrastructure. Following "dead pings" and "echoes" to find forgotten data caches.
### P4: Narrative Agency
Information is the primary currency. Verifying and presenting skewed data to different factions leads to diverging outcomes and systemic changes.

---

## 3. Systems & Mechanics
### 3.1 The Scope
A visual interface for the Undertow. It highlights:
*   **Dead Nodes:** Historical servers that can be "excavated".
*   **Active Domains:** High-security zones that require careful navigation.
*   **Signal Traces:** Faint lines connecting nodes representing old data flow.

### 3.2 Triage Mode (Intrusion)
A multi-pane interface for active hacking:
*   **Pane A (Surface):** Terminal and service banners.
*   **Pane B (Stack):** Live memory and process hooks.
*   **Pane C (History):** Recovering deleted files and log deltas.

### 3.3 The Archive
A dedicated mode for assembling **Artifact Clusters**. Players drag and drop fragments of data to find correlations (e.g., matching a timestamp in a log to an IP in a process dump).

---

## 4. UI/UX Refinement
*   **Aesthetic:** "Dead Light"—deep blacks, flickering amber/green phosphors, low-fidelity analog noise, and high-fidelity forensic data visualization.
*   **Layout:**
    *   **The Undertow (Map):** Main navigation hub.
    *   **The Bridge (Stats/Archive):** Status of the Archive and Faction relationships.
    *   **The Terminal:** Standard tool for direct system interaction.

---

## 5. Technical Specification
*   **Framework:** React 18+ / Vite.
*   **Visuals:** `framer-motion` for complex UI shifting and data "reconstruction" animations.
*   **Audio:** Ambient drone soundscapes that shift in frequency as "The Gradient" increases.
