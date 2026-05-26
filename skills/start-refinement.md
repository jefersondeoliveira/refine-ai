---
name: start-refinement
description: Use when starting a technical refinement session — guides the AI through collecting context, analyzing repositories, and generating structured artifacts using the RefineAI MCP tools.
---

# RefineAI — Refinement Workflow

Use this skill whenever the user mentions a refinement, a new feature demand, a meeting transcript, or asks to analyze repos for a technical spec.

## Step 1 — Collect context

Ask the user for (if not already provided):
- Meeting transcript or demand description
- Repository URLs involved
- Squad name and system/product being refined

Then call `set_refinement_context` with everything collected.

## Step 2 — Clone repositories

For each repo URL mentioned, call `clone_repository`.
If a clone fails (auth error, wrong URL), report it immediately and ask the user to confirm the URL before continuing.

## Step 3 — Explore structure before reading files

Call `get_repo_structure` on each cloned repo before reading any file.
Use the tree to identify which modules, services, and layers are relevant to the demand.
Only read files that are directly relevant — do not read everything.

## Step 4 — Search for impact signals

Use `search_in_repo` to find:
- Affected endpoints or controllers (e.g. `routes|controller|handler`)
- Events and queues (e.g. `kafka|publish|subscribe|queue`)
- Database entities or tables (e.g. `@Entity|@Table|repository`)
- Auth or security patterns (e.g. `JWT|auth|token|permission`)
- Inter-service calls (e.g. `feign|RestTemplate|WebClient|fetch|axios`)

Adapt the patterns to what the demand is about.

## Step 5 — Read key files

Read the specific files that own the code most affected by the demand.
Prioritize: entry points, service classes, interfaces, configuration.
Skip test files, lock files, and generated code unless specifically relevant.

## Step 6 — Generate the spec

Produce a markdown document with the following sections:

```
# [Demand Title] — Technical Refinement Spec

## Summary
One paragraph describing what this change does and why.

## Affected Services
List of services/repos impacted and how.

## Affected Endpoints
List of HTTP routes or methods that will change.

## Events & Queues
Kafka topics, queues, or async contracts involved.

## Database Changes
Tables, entities, or migrations required.

## Squad Dependencies
Other squads or systems that need to be involved or notified.

## Technical Risks
Potential breakages, race conditions, migration risks, backwards-compatibility concerns.

## Open Questions
Things that need clarification before implementation starts.

## Suggested Stories
Functional stories in "As a... I want... So that..." format.

## Suggested Subtasks
Technical subtasks per story (implementation, tests, migration, documentation).

## Test Strategy
Unit, integration, contract, and E2E coverage needed.
```

## Step 7 — Save the artifact

Call `save_artifact` with path `specs/YYYY-MM-DD-<short-title>.md` and the full spec content.
Confirm to the user where the file was saved.

## Tips

- In distributed systems, always check for Kafka events and Feign clients before assuming a change is contained to one service.
- If the transcript is ambiguous, list the ambiguities as Open Questions rather than making assumptions.
- Keep Suggested Stories at the functional level; keep implementation details in Subtasks.
- If a repo is too large to read fully, use `search_in_repo` to navigate — never try to read everything.
