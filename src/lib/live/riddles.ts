/**
 * The Riddle Deck. SERVER ONLY: it holds the answers.
 *
 * One track plays at a time. Every team holds the same hand of cards. A riddle
 * comes out one clue at a time (hardest first); play the matching card. The
 * earlier you play it, the more it pays. Play the wrong card and it burns: it
 * is gone from your hand, even if a later riddle needed it.
 *
 * Every track gets riddles the tracks before it have not seen.
 */

import { CLUE_SECS, type HandCard, type Round } from './types';
import type { GameQ } from './bank';

export const RIDDLE_ROUNDS: Round[] = [{ title: 'The Riddle Deck', subtitle: 'Read the riddle. Play the card. The earlier, the richer', suit: '♦' }];

type Riddle = { id: string; card: HandCard; clues: [string, string, string]; explain: string };

const R = (id: string, name: string, icon: string, suit: HandCard['suit'], clues: [string, string, string], explain: string): Riddle => ({
  id,
  card: { name, icon, suit },
  clues,
  explain,
});

// ♠ files in the repo · ♥ the agent · ♦ code and debugging · ♣ the server
const RIDDLES: Riddle[] = [
  R('readme', 'README.md', '📘', '♠', [
    'Everyone reads me first. Nobody updates me last.',
    'Yesterday the agent believed me over the code, and I was lying.',
    'I sit in the root of the repo, my name in capitals, telling you how to run it.',
  ], 'Docs drift. When the README and the code disagree, the code is the truth.'),
  R('env', '.env', '🔑', '♠', [
    'Never committed, yet nothing starts without me.',
    'Push me to a public repo and a bot finds your keys in minutes.',
    'A dotfile of KEY=value lines: API keys, database URLs, secrets.',
  ], 'Secrets live in .env, and .env never goes into git.'),
  R('pkg', 'package.json', '📦', '♠', [
    'Open me before any code and I tell you what the project is made of.',
    'My "scripts" say how to start it, build it and test it.',
    'Every npm dependency the project needs, in one JSON file.',
  ], 'Recon starts here: the stack, the scripts and the dependencies.'),
  R('lock', 'Lockfile', '🔒', '♠', [
    'Same code, different laptop, different bug? Someone ignored me.',
    'I pin the exact version of every dependency, even the dependencies of your dependencies.',
    'package-lock.json, yarn.lock, pnpm-lock.yaml: I am all of them.',
  ], 'The lockfile makes every install the same.'),
  R('gitignore', '.gitignore', '🙈', '♠', [
    'I decide what history will never see.',
    'node_modules, .env and the build folder: I keep them all out.',
    'A list of patterns that tells git which files to skip.',
  ], '.gitignore keeps junk and secrets out of the repo.'),
  R('obs', 'OBSERVATIONS.md', '🔍', '♠', [
    'Session 1 ended with me: evidence, not opinions.',
    'Every line in me wears a tag: Confirmed, Likely or Guess.',
    'The notes file you filled in while reverse-engineering Espionage.',
  ], 'OBSERVATIONS.md: every claim tagged, every Confirmed claim backed by a file:line.'),
  R('fileline', 'file:line', '📍', '♠', [
    'Without me, a claim is just a rumour.',
    'Session 1 rule: nothing is Confirmed unless it carries me.',
    'A file path, a colon and a line number.',
  ], 'Evidence is a file:line you opened yourself, not “the agent said so”.'),
  R('mockup', 'Mockup', '🖼️', '♠', [
    'I look like a real page, but no route ever serves me.',
    'Yesterday I tricked the agent into inventing an Enrollment screen.',
    'A static design file in stitch_screens/, not a page in src/app.',
  ], 'Trap 1 from Session 1: a design file is not a feature.'),
  R('prd', 'PRD', '📄', '♠', [
    'I say what and why, never how.',
    'Session 2 wrote me before a single line of code: the problem, the users, the goals.',
    'The Product Requirements Document.',
  ], 'The PRD comes first. ARCHITECTURE, DATA_MODEL and API come after it.'),

  R('hallucination', 'Hallucination', '👻', '♥', [
    'I sound sure of myself, I cite files, and none of them exist.',
    'The agent makes me when it guesses instead of reading.',
    'The word for an AI confidently making things up.',
  ], 'That is why every claim needs a file:line you checked.'),
  R('prompt', 'Prompt', '💬', '♥', [
    'Write me badly and the agent builds the wrong thing perfectly.',
    'For a vibecoder, I am the only code they write.',
    'The instruction you type into the AI.',
  ], 'Garbage in, garbage out: the prompt is the spec.'),
  R('context', 'Context window', '🪟', '♥', [
    'Fill me up and the agent forgets how the chat began.',
    'Measured in tokens, never big enough for your monorepo.',
    'How much text the model can see at once.',
  ], 'Long chats overflow the context window. Start fresh and point the agent at the docs.'),
  R('vibe', 'Vibe coding', '🎧', '♥', [
    'Accept all. Don’t read the diff. Ship it.',
    'You describe the feel, the AI writes the code, and you never open the file.',
    'Karpathy named me in 2025: you forget the code even exists.',
  ], 'Fun for a weekend. For your rebuild, read what the agent wrote.'),
  R('mvp', 'MVP', '🧪', '♥', [
    'The smallest thing that still proves the idea.',
    'In the Session 2 spine I come right after the core flow.',
    'Minimum Viable Product.',
  ], 'MVP scope: only what the core flow needs.'),
  R('moscow', 'MoSCoW', '🐄', '♥', [
    'A capital city that helps you say no.',
    'Four buckets, and the last one is Won’t.',
    'Must, Should, Could, Won’t.',
  ], 'MoSCoW decides what makes the MVP.'),

  R('dead', 'Dead code', '🪦', '♦', [
    'I compile, nothing imports me, and I still scare new developers.',
    'Delete me and nothing breaks.',
    'Functions and files nobody calls any more.',
  ], 'A file existing is not a feature existing. Check who imports it.'),
  R('mock', 'Mock data', '🎭', '♦', [
    'My numbers look perfect because no real user ever typed them.',
    'The demo works and the dashboard is full, but I am all fake.',
    'Hard-coded sample records standing in for a real database.',
  ], 'If the data never comes from the database, the feature is not real yet.'),
  R('todo', 'TODO comment', '📝', '♦', [
    'A promise from a developer who left two years ago.',
    'Search the repo for me to find what was never finished.',
    'Four capital letters in a comment: still to be done.',
  ], 'grep TODO: a free list of the gaps.'),
  R('stack', 'Stack trace', '🧵', '♦', [
    'I am the breadcrumb trail of a crash.',
    'Skip the library lines. The first line from your own code is the clue.',
    'The error plus the chain of function calls that led to it.',
  ], 'Read the stack trace from your own code down.'),
  R('log', 'console.log', '🖨️', '♦', [
    'The oldest debugger in the world, still undefeated.',
    'Forgotten copies of me leak data into the browser.',
    'JavaScript’s print statement.',
  ], 'Fine while debugging. Delete it before you ship.'),
  R('spaghetti', 'Spaghetti code', '🍝', '♦', [
    'Pull one strand and the whole plate moves.',
    'Everything calls everything. No layers, no structure.',
    'Tangled code, named after Italian food.',
  ], 'Map the architecture first, or you will get lost in it.'),
  R('flag', 'Feature flag', '🚩', '♦', [
    'The code shipped, but the feature is asleep.',
    'Flip me and a whole screen appears for 10% of the users.',
    'An if-statement with a remote control.',
  ], 'Code behind a flag that is off is not a live feature.'),
  R('blame', 'git blame', '🫵', '♦', [
    'I point at a line and name a culprit.',
    'My name sounds like an accusation, but I only read history.',
    'The git command that shows who last changed each line.',
  ], 'git blame tells you who wrote a line, and the commit tells you why.'),
  R('gitlog', 'git log', '📜', '♦', [
    'Read me backwards and I tell you how the product grew up.',
    'Every message, author and date since the very first commit.',
    'The git command that lists the commit history.',
  ], 'Recon trick: the commit history shows what was built when.'),

  R('webhook', 'Webhook', '🪝', '♣', [
    'I never ask. Someone else’s server calls me.',
    'A payment gateway knocks on me when the money moves.',
    'A URL that receives events pushed from another service.',
  ], 'Payments, GitHub, Stripe: they all call your webhook.'),
  R('cron', 'Cron job', '⏰', '♣', [
    'Nobody clicks me. I wake up on schedule.',
    'Five stars decide when I run.',
    'A task the server runs at fixed times, like every night at 2.',
  ], '* * * * *: minute, hour, day, month, weekday.'),
  R('middleware', 'Middleware', '🚧', '♣', [
    'Every request has to get past me first.',
    'I check your login before you reach the page.',
    'Code that runs between the request and the route handler.',
  ], 'Auth checks usually live in middleware. Trace a request through it.'),
  R('migration', 'Migration', '🚚', '♣', [
    'I move the database from yesterday’s shape to today’s.',
    'Numbered files, run in order, never edited once shipped.',
    'A script that changes the database schema.',
  ], 'Migrations are the history of the data model.'),
  R('ratelimit', 'Rate limit', '🚦', '♣', [
    'Knock too often and I shut the door with a 429.',
    'I protect the API from spammers, and from your for-loop.',
    'A cap on how many requests you can make per minute.',
  ], 'HTTP 429 Too Many Requests.'),
  R('cache', 'Cache', '🧊', '♣', [
    'I make everything fast, and some bugs impossible to reproduce.',
    'Invalidating me is one of the two hard things in computer science.',
    'A saved copy, so you don’t have to fetch it again.',
  ], 'Stale data on screen? Suspect the cache.'),
  R('schema', 'Schema', '🗂️', '♣', [
    'I am the truth about what the app remembers.',
    'Tables, columns, and the arrows between them.',
    'The shape of the database. DATA_MODEL.md draws me.',
  ], 'Read the schema, not the diagram: an arrow without a field is not proven.'),
  R('endpoint', 'API endpoint', '🔌', '♣', [
    'The front end knocks, I answer in JSON.',
    'GET, POST, PUT, DELETE: I take them all.',
    'A URL on the server that does one job, like /api/login.',
  ], 'API.md lists every endpoint: method, path, who may call it.'),
  R('localhost', 'localhost', '🏠', '♣', [
    'It works on me. Only on me.',
    'My real address is 127.0.0.1.',
    'Your own machine, as the browser calls it.',
  ], '“Works on my machine” is not deployed.'),
];

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function shuffle<T>(a: T[], rand: () => number): T[] {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
}

/**
 * Deals one game: `count` riddles nobody has played yet (the least played if the
 * pool runs dry), and a hand of their answers plus as many decoys.
 * `used` counts how often each riddle was played in earlier games.
 */
export function buildRiddles(used: Map<string, number>, seed: number, count = 5, decoys = 5): GameQ[] {
  const rand = rng(seed);
  const pool = shuffle(RIDDLES, rand).sort((a, b) => (used.get(a.id) ?? 0) - (used.get(b.id) ?? 0));
  const picked = pool.slice(0, count);
  const rest = shuffle(pool.slice(count), rand).slice(0, decoys);
  const hand = shuffle([...picked, ...rest], rand).map((r) => r.card);
  const at = (r: Riddle) => hand.findIndex((c) => c.name === r.card.name);
  return picked.map((r, i) => ({
    kind: 'riddle' as const,
    round: 0,
    title: `Riddle ${i + 1}`,
    prompt: 'Which card is it?',
    clues: [...r.clues],
    hand,
    answer: [at(r)],
    explain: r.explain,
    secs: r.clues.length * CLUE_SECS,
    rid: r.id,
  }));
}
