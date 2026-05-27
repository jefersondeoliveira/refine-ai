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

Adapt the patterns to the stack of the repo. Examples by platform:

**Backend / API:**
- Endpoints: `routes|controller|handler|@GetMapping|@PostMapping`
- Events: `kafka|publish|subscribe|queue|@KafkaListener`
- Database: `@Entity|@Table|repository|migration`
- Auth: `JWT|auth|token|permission|@PreAuthorize`
- Inter-service: `feign|RestTemplate|WebClient|fetch|axios`

**Web frontend:**
- Pages / routes: `router|Route|useNavigate|Link`
- API calls: `fetch|axios|useQuery|useMutation|api\.`
- State: `useState|useReducer|zustand|redux|store`
- Auth / permissions: `useAuth|isAuthenticated|role|permission`

**Android:**
- Screens / navigation: `Fragment|Activity|NavController|navigate(`
- API calls: `Retrofit|OkHttp|suspend fun|CoroutineScope`
- Storage: `Room|@Dao|@Entity|SharedPreferences|DataStore`
- Permissions: `Manifest.permission|requestPermissions|checkSelfPermission`
- Push / background: `WorkManager|BroadcastReceiver|FirebaseMessaging`

**iOS:**
- Screens / navigation: `UIViewController|SwiftUI View|NavigationStack|push(`
- API calls: `URLSession|Alamofire|async throws|await`
- Storage: `CoreData|NSManagedObject|UserDefaults|@AppStorage`
- Permissions: `requestAuthorization|NSCamera|NSLocation|NSMicrophone`
- Push / background: `UNUserNotificationCenter|BGTaskScheduler|APNs`

## Step 5 — Read key files

Read the specific files that own the code most affected by the demand.
Prioritize: entry points, service classes, interfaces, configuration.
Skip test files, lock files, and generated code unless specifically relevant.

## Step 6 — Generate the spec

Produce a markdown document with the following sections. Include only sections relevant to the stack — omit sections that don't apply (e.g. no "Events & Queues" for a mobile-only change, no "Affected Screens" for a pure backend change).

```
# [Demand Title] — Technical Refinement Spec

## Summary
One paragraph describing what this change does and why.

## Affected Services / Repos
List of services, apps, or repos impacted and how.

## Affected Endpoints
(Backend / API) HTTP routes or methods that will change.

## Affected Screens / Navigation
(Mobile / Web) Screens, pages, or navigation flows that change.

## Events & Queues
(Backend) Kafka topics, queues, or async contracts involved.

## Database / Storage Changes
Tables, entities, migrations, Room DAOs, CoreData models, or local storage affected.

## API Contract Changes
(Mobile / Web) New, modified, or removed API fields that affect clients.

## Permissions Required
(Mobile) New OS permissions needed (camera, location, notifications, etc.) and their justification.

## Platform / OS Constraints
(Mobile) Minimum iOS/Android version impact, App Store / Play Store review implications, background execution limits.

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
Unit, integration, contract, E2E, and manual device coverage needed.
```

## Step 7 — Save the artifact

Call `save_artifact` with path `specs/YYYY-MM-DD-<short-title>.md` and the full spec content.
Confirm to the user where the file was saved.

## Tips

- **Backend:** always check for Kafka events and Feign/HTTP clients before assuming a change is contained to one service.
- **Android:** check `AndroidManifest.xml` early — it reveals permissions, activities, and services in one file.
- **iOS:** check `Info.plist` and the main `AppDelegate`/`SceneDelegate` early for permissions and lifecycle hooks.
- **Mobile + API:** if both a mobile app and a backend are in scope, map the API contract changes first — they affect both sides.
- If the transcript is ambiguous, list the ambiguities as Open Questions rather than making assumptions.
- Keep Suggested Stories at the functional level; keep implementation details in Subtasks.
- If a repo is too large to read fully, use `search_in_repo` to navigate — never try to read everything.
