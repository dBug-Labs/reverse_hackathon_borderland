/**
 * The HACKBACK prompt pack (stages 0–9), shown on /playbook.
 * Generated from event-plan/sessions-plan.md §4; edit there and regenerate, or edit here.
 */

export interface PlaybookStage {
  n: number;
  title: string;
  prompt: string;
  good: string;
  watch: string;
}

export const STAGES: PlaybookStage[] = [
  {
    "n": 0,
    "title": "Recon",
    "prompt": "You are helping me reverse-engineer this codebase. Do not create, change or delete any files, and do not run install or build commands.\n\nRead the repository and tell me:\n1. Tech stack: languages, frameworks, database, and major libraries, with versions taken from the dependency files.\n2. How to run it locally: the exact commands, and the environment variables it needs (names only, never values).\n3. Folder map: each top-level folder, and the 10 most important files, one line each on what they do.\n4. Odd files: anything that doesn't seem to belong (one-off scripts, old tests, design mockups, compiled build output, dead code). Say why each looks odd.\n\nCite every fact as path/to/file:line. If you are not sure about something, say \"not sure\" instead of guessing.",
    "good": "versions come from the dependency file, with its path. Run steps match the scripts in that file. The folder map covers every top-level folder. 2–5 odd files are flagged with a reason. Every line has a path.",
    "watch": "versions \"from memory\" with no file; build or vendor folders described as source code."
  },
  {
    "n": 1,
    "title": "Big picture",
    "prompt": "Using only what you have read in this repo (not the project name, not your general knowledge), explain this product to a first-year student:\n1. In 3 sentences: what it does, who it is for, and why they would use it.\n2. Every type of user (role) and what each one can do.\n3. The 3–5 main features, each with the file or folder that implements it.\n4. Anything the README or docs claim that you could not find in the code.\n\nCite path/to/file:line for each point.",
    "good": "a 3-sentence summary a non-coder understands; 2–4 roles, each tied to a page or route; features mapped to folders; at least one \"README says X, code not found\" line, or an honest \"none found\".",
    "watch": "marketing words (\"seamless\", \"robust\"); roles invented from the app's name."
  },
  {
    "n": 2,
    "title": "Architecture + Mermaid",
    "prompt": "Draw the architecture of this system as a Mermaid flowchart (graph LR).\n- Show every component: frontend, backend or API, database, background jobs or workers, and every external service (email, payments, AI, storage, auth providers, code runners).\n- Label each arrow with what flows along it (for example: REST JSON, SQL, SMTP, webhook).\n- Under the diagram, add a table: Box | What it is | File(s) that prove it (path:line).\n- Then answer: where does state live? List every place: database, cache, browser storage, files on disk, server memory.\n\nOnly draw boxes you can point to in the code. Put anything you are unsure of in a separate \"Not sure\" list.",
    "good": "a diagram that renders (paste into mermaid.live if the IDE doesn't render it); every box has a file in the table; external services found from env variable names and client libraries; a \"where state lives\" list that includes browser storage when it is used.",
    "watch": "boxes with no file (\"Redis cache\" in an app that has none); arrows straight from the browser to the database."
  },
  {
    "n": 3,
    "title": "Routes and screens",
    "prompt": "List every entry point of this app in two tables.\n\nTable 1, API / backend: Method | Path | What it does | Input | Output | Who may call it (anyone / logged-in user / owner only / admin) | Auth check at path:line, or \"none found\".\n\nTable 2, screens / pages: URL or screen name | What the user does there | API calls it makes | File.\n\nFind routes by reading the router or framework files, not the README. At the end, give the total number of route files and handlers, and say exactly how you counted.",
    "good": "the count matches what a checker finds in the explorer; the \"Who may call it\" column is filled for every row, with \"none found\" where there is no check; pages link to the API calls they make.",
    "watch": "a \"…and more\" row; routes copied from the README; \"admin only\" with no file:line."
  },
  {
    "n": 4,
    "title": "Data model / ER",
    "prompt": "Document the data model.\n1. A Mermaid erDiagram with every entity (table, collection or model), its main fields and their types.\n2. For each relationship, say HOW it is stored: foreign key, ORM reference, embedded document, or just an ID string. Cite path:line.\n3. A table: Entity | Purpose | Key fields | Indexes and unique constraints | Used by (files).\n4. Flag entities or fields that look unused or left over, and say why.\n\nDo not draw a relationship unless the schema or a query proves it.",
    "good": "every model file appears once; each arrow says how it is stored, with a line; unique constraints listed (they matter for Killer Tests); a \"looks unused\" flag with a reason.",
    "watch": "relations guessed from field names; entities that exist in no schema file."
  },
  {
    "n": 5,
    "title": "Trace a feature (sequence diagram)",
    "prompt": "Trace one feature end to end: [the feature, e.g. \"a user signs up and verifies their email\"].\n1. A Mermaid sequenceDiagram with every actor: user, page or screen, API route, service or library function, database, external service.\n2. Under it, a numbered list of steps. For each step: what happens, the path:line where it happens, and what data is read or written.\n3. Every check along the way (login, permission, validation, limits, state such as \"already submitted\") and where it is.\n4. What happens when a step fails: the error the user sees and what is left in the database.\n\nFollow the real function calls. Do not assume a step exists because it usually does in apps like this.",
    "good": "the diagram matches the numbered steps one to one; every step has a line; checks are listed, including missing ones (\"no permission check found\"); a failure path for at least one step.",
    "watch": "a \"happy path only\" story; steps taken from the README order rather than the code."
  },
  {
    "n": 6,
    "title": "Screenshots → journey",
    "prompt": "[Attach 1–3 screenshots of the running app.]\n\nFor each screenshot:\n1. Which screen is this, and which file renders it? (path:line)\n2. Who is the user here, and what are they trying to do?\n3. What happens when they press the main button: which API call, and which data changes?\n\nThen write the full journey of the main user type as numbered steps, from first visit to reaching their goal, each step linked to its screen file.\nOnly count pages that are really routed in the app. Design mockups, prototypes, Storybook stories and test files are not screens: list them separately if you find them.",
    "good": "each screenshot matched to a real routed file; the journey has 5–10 steps and no step without a file; mockups listed apart.",
    "watch": "a screen matched to a mockup or design file; a journey step with no page behind it."
  },
  {
    "n": 7,
    "title": "Gaps",
    "prompt": "Review this codebase like a senior code reviewer. List gaps in a table:\n# | Type (security / correctness / data / UX / missing feature / docs drift) | What is wrong | Evidence path:line | Who it hurts | Suggested fix | Severity (high / medium / low)\n\nCheck: the permission check on every route; input validation; race conditions and duplicates; error handling; empty and error states in the UI; places where the server trusts the client; README claims that don't match the code.\n\nDescribe each issue and its fix only. Do not write exploit steps, attack payloads or proof-of-concept code.\nGive at least 8 gaps, highest severity first.",
    "good": "8+ rows, each with a real line and a one-line fix; a mix of types, not only security; \"who it hurts\" names a real user type from Stage 1.",
    "watch": "generic advice with no line (\"add more tests\", \"use HTTPS\"); severity \"high\" on everything."
  },
  {
    "n": 8,
    "title": "Verify every claim",
    "prompt": "Now verify everything you have told me in this conversation: every claim, every diagram arrow, every gap.\nFor each one:\n1. Open the file you cited and check that the line really says it.\n2. Tag it:\n   Confirmed = you re-read the exact line and it proves the claim.\n   Likely = strong signs, but no single line proves it.\n   Guess = no direct evidence.\n3. If the path or line was wrong, give the right one, or drop the claim.\n\nOutput every claim in exactly this format:\n- <claim>\n  Evidence: path/to/file:line [Confirmed]\n\nThen a list called \"Corrections\": every claim you changed or dropped, and why. Be strict: a file:line that doesn't exist counts as zero.",
    "good": "the exact 2-line format; a real \"Corrections\" list (an agent that corrects nothing has not checked); Guess used honestly.",
    "watch": "everything tagged Confirmed; line numbers that point at blank lines or imports. The checkers still open at least 3 lines by hand. Stage 8 makes the agent check itself; it does not replace you."
  },
  {
    "n": 9,
    "title": "Write the docs in the overnight format",
    "prompt": "Using only the verified claims from this conversation (Confirmed and Likely, never Guess), write our team's documentation as Markdown files in [path to our own repo]/docs/. Do not copy any code from the original. Describe it in words; route, field and file names are fine.\n\nOur card's Rebuild Brief: [paste the Brief and the Killer Tests from the card].\n\n- OBSERVATIONS.md: every verified claim about the original, grouped by topic, each in the format\n  - <claim>\n    Evidence: path/to/file:line [Confirmed]\n- PRD.md: problem; target user (from the Brief); one-line problem statement (\"For [user] who [struggle], [product] does [X], unlike [alternative]\"); core flow as numbered steps; features ranked with MoSCoW; out of scope; acceptance criteria as Given / When / Then, including one for each Killer Test.\n- ARCHITECTURE.md: the components of OUR rebuild and how they talk; a Mermaid diagram; external services; where state lives; key decisions and why.\n- DATA_MODEL.md: every entity of our rebuild with fields, types, relations and constraints (unique keys, indexes), plus a Mermaid erDiagram.\n- API.md: every route or action: method, path, input, output, who may call it, error cases.\n- GAPS.md: what the original gets wrong or misses, with evidence; then the 2 improvements we will build, and why each one matters to the user in the Brief.\n- AGENT_LOG.md: the key prompts from this conversation and what we corrected.\n\nWrite for a stranger's AI agent: it must be able to build the core flow from these files alone. Write \"Unknown\" instead of inventing anything.",
    "good": "7 files at the paths in the participant guide; OBSERVATIONS in the exact format; the PRD has acceptance criteria that match the Killer Tests; DATA_MODEL has the constraints the Killer Tests depend on; GAPS ends with exactly 2 improvements.",
    "watch": "code pasted from the original (clean-room break); a PRD with no \"out of scope\"; an API.md that skips error cases. Push docs/ before your first code commit."
  }
];

export const SOLO_LAB = "Repo: accountill (an invoicing app for freelancers). Time: 20 minutes. No speaker help.\nRead it, don't run it. Its client uses react-scripts 4.0.3, which most likely won't start on Node 22. You don't need it running.\n1. Stage 0 Recon (3 min)\n2. Stage 3 Routes, server only (4 min)\n3. Stage 4 Data model (4 min)\n4. Stage 7 Gaps (4 min)\n5. Stage 8 Verify (5 min)\nDeliver: 5 claims in OBSERVATIONS.md format in a file accountill-notes.md. At least 1 must be a claim the agent got wrong that you corrected.\nTip: tell the agent to ignore client/build/. It is compiled output.";

export const EVIDENCE_FORMAT = `- <claim>
  Evidence: path/to/file:line [Confirmed]`;

/** Plain-language guide for each stage, so a team can follow /playbook without a speaker. */
export interface StageGuide {
  question: string; // the one question this stage answers
  why: string;
  time: string;
  driver: string;
  checkers: string;
  feeds: string; // which overnight doc it feeds
}

export const STAGE_GUIDE: Record<number, StageGuide> = {
  0: {
    question: 'What is this made of, and how is it laid out?',
    why: 'You cannot read 10,000 lines at once. Recon gives you a map, so every later answer has a place to go. It also flags files that will mislead you later (old scripts, mockups, compiled output).',
    time: '~8 min',
    driver: 'Paste the prompt. Do not let the agent install or run anything.',
    checkers: 'Open the dependency file (package.json, requirements.txt, go.mod…) and compare 3 versions with the agent’s. Open 2 of the “odd files” and decide if they are really odd.',
    feeds: 'OBSERVATIONS.md (stack, how to run)',
  },
  1: {
    question: 'What does this product do, and for whom?',
    why: 'If you cannot say it in three sentences, you cannot write a spec for it. The roles you find here become the “who may call it” column in Stage 3.',
    time: '~7 min',
    driver: 'Paste the prompt in the same chat.',
    checkers: 'Before reading the answer, each write your own one-line summary. Then compare. Pick one role and open the page or route the agent cited: can that role really reach it?',
    feeds: 'PRD.md (problem, users), OBSERVATIONS.md',
  },
  2: {
    question: 'What talks to what, and where is the data kept?',
    why: 'The diagram is the skeleton of your ARCHITECTURE.md tonight. “Where state lives” is where most bugs and security gaps hide: anything kept only in the browser can be changed by the user.',
    time: '~12 min',
    driver: 'Paste the prompt. If the diagram does not render, copy the Mermaid code into mermaid.live.',
    checkers: 'For 2 boxes, open the file in the table. For external services, look for their env variable names or client libraries. Any box with no file goes to “Not sure”.',
    feeds: 'ARCHITECTURE.md',
  },
  3: {
    question: 'What are all the doors into this app, and who may open each one?',
    why: 'Routes are the real feature list, whatever the README says. The “who may call it” column is where real gaps are found: a door with no lock.',
    time: '~8 min',
    driver: 'Paste the prompt.',
    checkers: 'Count the route files yourself in the explorer (for example every route.ts under app/api, or every router.get/post) and compare with the agent’s count. Open 2 rows marked admin or owner only and find the line that checks it.',
    feeds: 'API.md, GAPS.md',
  },
  4: {
    question: 'What does it store, and how are things linked?',
    why: 'Your rebuild must store the same things correctly. Unique constraints and indexes are what stop duplicates and double bookings, and Killer Tests check exactly that.',
    time: '~6 min',
    driver: 'Paste the prompt.',
    checkers: 'Open every model or schema file. For one arrow in the diagram, find the line that proves it (a foreign key, a ref, or just an ID field). An arrow with no line is a guess.',
    feeds: 'DATA_MODEL.md',
  },
  5: {
    question: 'What really happens, step by step, when a user does the main thing?',
    why: 'Docs describe, code does. A trace shows the real order of checks and writes, and what is left behind when a step fails. This becomes the core flow of your PRD.',
    time: '~10 min',
    driver: 'Replace [the feature] with the main flow from Stage 1, then paste.',
    checkers: 'Open the functions for 3 steps. Does step N really call step N+1? Is every listed check really there, in that order?',
    feeds: 'PRD.md (core flow), ARCHITECTURE.md, OBSERVATIONS.md',
  },
  6: {
    question: 'What does the user see, and which code is behind each screen?',
    why: 'It ties the UI to the code, so the user journey in your PRD is real and not imagined. It also catches mockups and design files that look like screens but are never served.',
    time: '~8 min',
    driver: 'Attach 1–3 screenshots with the image button, then paste. No running app? Use images from the README or the product’s website.',
    checkers: 'Open the file the agent matched to each screen. Is it really routed (does its URL exist in the router), or is it a mockup?',
    feeds: 'PRD.md (user journey)',
  },
  7: {
    question: 'What is wrong or missing, and who does it hurt?',
    why: 'Your 2 improvements tonight come from this list. A gap with evidence and a fix is worth points; a vague worry is not.',
    time: '~9 min',
    driver: 'Paste the prompt.',
    checkers: 'Open 3 gaps at their lines. Is the problem really there, or is it handled somewhere else (a middleware, a wrapper, the database)?',
    feeds: 'GAPS.md',
  },
  8: {
    question: 'Which of the agent’s claims are actually true?',
    why: 'Agents invent line numbers and over-claim. Stage 8 makes the agent check itself, and then you check the agent. A made-up claim caught by a Game Master costs a Visa.',
    time: '~8 min',
    driver: 'Paste the prompt in the same chat.',
    checkers: 'Open at least 3 claims tagged Confirmed by hand. Find one the agent got wrong or could not prove, and fix its tag.',
    feeds: 'OBSERVATIONS.md',
  },
  9: {
    question: 'Can a stranger’s AI build our product from our docs alone?',
    why: 'Tomorrow a fresh AI agent gets only your docs/ folder (the Doc Test). Anything missing from the docs is missing from that build.',
    time: 'Tonight, ~1–2 hours',
    driver: 'Run it on your card’s product, not Espionage. Fill in the path to your own repo and paste your card’s Brief and Killer Tests.',
    checkers: 'Read the PRD: is there an acceptance criterion for each Killer Test? Read DATA_MODEL: are the unique keys there? Is there any “Unknown” you can fill in?',
    feeds: 'All 7 files in docs/',
  },
};
