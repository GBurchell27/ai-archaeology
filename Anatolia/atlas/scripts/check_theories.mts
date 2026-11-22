import { register } from "node:module";
import { safeExternalHref } from "../lib/externalHref.ts";
import type { EvidenceEntry, Fact, OpenQuestion, Theory, TheorySource } from "../lib/theories/theoryTypes.ts";

// The library files import each other without an extension; teach Node to add it. Files that do so load below.
register(`data:text/javascript,${encodeURIComponent(`
  export function resolve(specifier, context, next) {
    const bare = specifier.startsWith(".") && !specifier.slice(specifier.lastIndexOf("/")).includes(".");
    return next(bare ? specifier + ".ts" : specifier, context);
  }
`)}`);
const registry = await import("../lib/theories/theoryRegistry.ts");
const { STATUS_LADDER, STATUS_LABELS, STATUS_MEANINGS, THEORY_ID_PATTERN, currentStatus, firstStatus, statusLabel } = await import("../lib/theories/theoryStatus.ts");
const { GOBEKLI_TEPE_LANDMARKS } = await import("../lib/walk/gobekliTepeLandmarks.ts");
const { GIZA_LANDMARKS } = await import("../lib/walk/gizaLandmarks.ts");
const { ALL_EVIDENCE, ALL_FACTS, ALL_QUESTIONS, ALL_THEORIES, findEvidence, findFact, findQuestion, findTheory } = registry;

let failed = 0;

function check(label: string, condition: boolean): void {
  if (condition) return;
  failed += 1;
  console.error("FAIL", label);
}

const FACT_KINDS = ["measurement", "excavation", "experiment", "text"];
const EVIDENCE_KINDS = [...FACT_KINDS, "argument"];
const SOURCE_KINDS = ["excavation-report", "peer-reviewed-paper", "popular-book", "project-page", "other"];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const SEEDED_ON = "2026-11-19";
/** Words docs/philosophy.md rules out: the atlas does not conclude for the reader. */
const LOADED_WORDS = /\b(debunk\w*|proves?|proven|mystery solved|fringe|mainstream|pseudo\w*)\b/i;

function isSourced(source: TheorySource | undefined): boolean {
  if (!source || source.citation.trim().length < 20 || !SOURCE_KINDS.includes(source.kind)) return false;
  // A link must be one the app will actually render.
  return source.url === undefined || safeExternalHref(source.url) !== null;
}

function checkUniqueIds(label: string, records: readonly { id: string }[]): void {
  const ids = records.map((record) => record.id);
  check(`${label} ids are unique`, new Set(ids).size === ids.length);
  check(`${label} ids are slugs`, ids.every((id) => THEORY_ID_PATTERN.test(id)));
}

function checkFact(fact: Fact): void {
  check(`${fact.id} has a statement, a kind and site ids`, fact.statement.length > 20 && FACT_KINDS.includes(fact.kind) && fact.siteIds.length > 0);
  check(`${fact.id} is sourced`, isSourced(fact.source));
}

function checkEvidence(entry: EvidenceEntry): void {
  check(`${entry.id} has a summary and a kind`, entry.summary.length > 20 && EVIDENCE_KINDS.includes(entry.kind));
  check(`${entry.id} is sourced`, isSourced(entry.source));
  check(`${entry.id} rests on a fact that exists`, entry.factId === undefined || findFact(entry.factId) !== null);
  check(`${entry.id} says who makes the argument`, entry.kind !== "argument" || Boolean(entry.madeBy?.trim()));
}

function checkStatusLog(theory: Theory): void {
  const log = theory.statusLog;
  check(`${theory.id} has a status log`, log.length > 0);
  check(`${theory.id} log entries are dated, on the ladder and reasoned`, log.every((entry) => ISO_DATE.test(entry.date) && STATUS_LADDER.includes(entry.status) && entry.reason.length > 20));
  check(`${theory.id} log runs forward in time`, log.every((entry, index) => index === 0 || log[index - 1].date <= entry.date));
  check(`${theory.id} status is the last log entry`, log.at(-1)?.status === theory.status && currentStatus(theory).status === theory.status);
  check(`${theory.id} was first recorded on ${SEEDED_ON}`, log[0]?.date >= SEEDED_ON);
}

function checkTheory(theory: Theory): void {
  check(`${theory.id} has a title, a claim and what would settle it`, theory.title.length > 5 && theory.claim.length > 20 && theory.wouldSettle.length > 20);
  check(`${theory.id} has a proponent`, theory.proponents.length > 0 && theory.proponents.every((name) => name.trim().length > 2));
  check(`${theory.id} has a source for the claim`, theory.claimSources.length > 0 && theory.claimSources.every(isSourced));
  check(`${theory.id} names its sites`, theory.siteIds.length > 0);
  const listed = [...theory.evidenceFor, ...theory.evidenceAgainst];
  check(`${theory.id} lists evidence that exists`, listed.every((id) => findEvidence(id) !== null));
  check(`${theory.id} lists no entry on both sides`, new Set(listed).size === listed.length);
  check(`${theory.id} lists evidence on each side`, theory.evidenceFor.length > 0 && theory.evidenceAgainst.length > 0);
  checkStatusLog(theory);
}

/** `walkLandmarkIds` holds the landmark ids of each walk, by the id of its walk site. */
function checkQuestion(question: OpenQuestion, walkLandmarkIds: Readonly<Record<string, ReadonlySet<string>>>): void {
  check(`${question.id} asks a question about a site`, question.question.trim().endsWith("?") && question.siteIds.length > 0);
  check(`${question.id} rests on facts that exist`, question.factIds.every((id) => findFact(id) !== null));
  check(`${question.id} lists theories that exist`, question.theoryIds.every((id) => findTheory(id) !== null));
  check(`${question.id} names landmarks of the walk`, (question.landmarkIds ?? []).every((id) => question.siteIds.some((siteId) => walkLandmarkIds[siteId]?.has(id))));
}

// Integrity of the records
checkUniqueIds("fact", ALL_FACTS);
checkUniqueIds("evidence", ALL_EVIDENCE);
checkUniqueIds("theory", ALL_THEORIES);
checkUniqueIds("question", ALL_QUESTIONS);
const everyId = [ALL_FACTS, ALL_EVIDENCE, ALL_THEORIES, ALL_QUESTIONS].flat().map((record) => record.id);
check("no id is shared between kinds of record", new Set(everyId).size === everyId.length);
ALL_FACTS.forEach(checkFact);
ALL_EVIDENCE.forEach(checkEvidence);
ALL_THEORIES.forEach(checkTheory);
const idsOf = (site: { landmarks: readonly { id: string }[] }) => new Set(site.landmarks.map((landmark) => landmark.id));
const walkLandmarkIds = { "gobekli-tepe": idsOf(GOBEKLI_TEPE_LANDMARKS), Q12508: idsOf(GIZA_LANDMARKS) };
ALL_QUESTIONS.forEach((question) => checkQuestion(question, walkLandmarkIds));

const usedEvidence = new Set(ALL_THEORIES.flatMap((theory) => [...theory.evidenceFor, ...theory.evidenceAgainst]));
check("every evidence entry is listed by a theory", ALL_EVIDENCE.every((entry) => usedEvidence.has(entry.id)));
const askedTheories = new Set(ALL_QUESTIONS.flatMap((question) => question.theoryIds));
check("every theory answers a question", ALL_THEORIES.every((theory) => askedTheories.has(theory.id)));
check("experiments are recorded as evidence", ALL_EVIDENCE.some((entry) => entry.kind === "experiment"));

const prose = [
  ...ALL_FACTS.map((fact) => fact.statement),
  ...ALL_EVIDENCE.map((entry) => entry.summary),
  ...ALL_THEORIES.flatMap((theory) => [theory.title, theory.claim, theory.wouldSettle, ...theory.statusLog.map((entry) => entry.reason)]),
  ...ALL_QUESTIONS.map((question) => question.question),
];
const loaded = prose.filter((text) => LOADED_WORDS.test(text));
check(`wording stays level: ${loaded.join(" | ")}`, loaded.length === 0);

// The ladder
check("the ladder has five rungs, each with a label and a meaning", STATUS_LADDER.length === 5 && STATUS_LADDER.every((status) => STATUS_LABELS[status] && STATUS_MEANINGS[status]));
check("a status has a human label", statusLabel("unsupported-so-far") === "Unsupported so far");
const downgraded: Theory = { ...ALL_THEORIES[0], status: "shelved", statusLog: [...ALL_THEORIES[0].statusLog, { date: "2027-01-01", status: "shelved", reason: "A reason." }] };
check("the current status is the last log entry, with its label", currentStatus(downgraded).label === "Shelved" && currentStatus(downgraded).date === "2027-01-01");
const started = firstStatus("2026-11-19", "contested", "A first reason.");
check("a new theory starts with one log entry equal to its status", started.statusLog.length === 1 && started.statusLog[0].status === started.status);

// Lookups
const comet = findTheory("gobekli-tepe-pillar-43-comet-record");
check("a theory is found by id, and an unknown id is not", comet?.proponents[0] === "Martin Sweatman" && findTheory("no-such-theory") === null && findTheory(undefined) === null);
check("the walk id and the catalogue id of Göbekli Tepe give the same theories", registry.theoriesForSite("gobekli-tepe").length === 8 && registry.theoriesForSite("Q214944").length === 8);
const notThisSite = ["961911", "Q134611641"];
check("Pleiades 961911 and the Sefer Tepe pin on Göbekli get no theories or questions",
  notThisSite.every((id) => registry.theoriesForSite(id).length === 0 && registry.questionsForSite(id).length === 0));
check("no fact, theory or question names either of those ids",
  [...ALL_FACTS, ...ALL_THEORIES, ...ALL_QUESTIONS].every((record) => notThisSite.every((id) => !record.siteIds.includes(id))));
const theorySourceUrls = [
  ...ALL_FACTS.map((fact) => fact.source.url),
  ...ALL_EVIDENCE.map((entry) => entry.source.url),
  ...ALL_THEORIES.flatMap((theory) => theory.claimSources.map((source) => source.url)),
];
check("no theory source cites Pleiades 961911", theorySourceUrls.every((url) => url === undefined || !url.includes("961911")));
check("Giza is found by the complex and by the Great Pyramid", registry.theoriesForSite("Q12508").length === 6 && registry.theoriesForSite("Q37200").length === 6);
check("a theory touches each id it lists and no other", comet !== null && registry.theoryTouchesSite(comet, "Q214944") && registry.theoryTouchesSite(comet, "gobekli-tepe") && !registry.theoryTouchesSite(comet, "Q12508"));
check("a site with no records has none", registry.theoriesForSite("karahan-tepe").length === 0 && registry.questionsForSite("karahan-tepe").length === 0);
check("questions are found by site", registry.questionsForSite("gobekli-tepe").length === 5 && registry.questionsForSite("Q12508").length === 4);
const atPillar43 = registry.questionsForLandmark("gobekli-tepe", "pillar-43");
check("Pillar 43 has its question", atPillar43.length === 1 && atPillar43[0].id === "gobekli-tepe-what-does-pillar-43-show");
check("Enclosure D has the roof and burial questions", registry.questionsForLandmark("gobekli-tepe", "enclosure-d").length === 2);
const atKhufu = registry.questionsForLandmark("Q12508", "khufu");
check("the Great Pyramid's card in the Giza walk has all four questions, and the other two pyramids the one about the layout",
  atKhufu.length === 4 && ["khafre", "menkaure"].every((id) => registry.questionsForLandmark("Q12508", id).map((question) => question.id).join() === "giza-why-this-layout-and-alignment"));
check("a landmark belongs to its site only", registry.questionsForLandmark("Q12508", "pillar-43").length === 0 && registry.questionsForLandmark("gobekli-tepe", "pillar-2").length === 0);
check("a question gives its theories in order", registry.theoriesForQuestion(atPillar43[0]).map((theory) => theory.id).join() === atPillar43[0].theoryIds.join());
check("evidence and facts are found by id", findEvidence("giza-evidence-wet-sand-sledge")?.kind === "experiment" && findFact("giza-fact-base-sides")?.kind === "measurement" && findQuestion("giza-what-was-it-for") !== null);
check("evidence entries come back in the order asked, without unknown ids", registry.evidenceEntries(["giza-evidence-belt-pattern", "nothing", "giza-evidence-hatnub-ramp"]).map((entry) => entry.id).join() === "giza-evidence-belt-pattern,giza-evidence-hatnub-ramp");

// The puzzles index
const { experimentsBearingOn, puzzleFor, puzzlesBySite } = await import("../lib/theories/puzzlesIndex.ts");
const sitePuzzles = puzzlesBySite();
check("the puzzles index groups every question under a named site", sitePuzzles.map((site) => `${site.siteName}:${site.puzzles.length}`).join() === "Göbekli Tepe:5,Giza:4" && sitePuzzles.every((site) => site.siteName !== site.siteId));
const raising = puzzleFor(findQuestion("giza-how-were-the-blocks-raised")!);
check("a puzzle carries its facts and theories in the order recorded", raising.facts.map((fact) => fact.id).join() === raising.question.factIds.join() && raising.theories.map((theory) => theory.id).join() === raising.question.theoryIds.join());
check("a puzzle lists the experiments its theories list, with the theory each supports", raising.experiments.map((experiment) => `${experiment.entry.id}:${experiment.bearings.map((bearing) => `${bearing.side}:${bearing.theory.id}`).join("+")}`).join() === "giza-evidence-nova-block-trials:supports:giza-external-ramps,giza-evidence-wet-sand-sledge:supports:giza-external-ramps");
const purpose = puzzleFor(findQuestion("giza-what-was-it-for")!);
check("an experiment a theory lists against itself goes against it", purpose.experiments.length === 4 && purpose.experiments.every((experiment) => experiment.entry.kind === "experiment" && experiment.bearings.length === 1 && experiment.bearings[0].side === "goes-against" && experiment.bearings[0].theory.id === "giza-power-plant"));
const sledgeFor: Theory = { ...ALL_THEORIES[0], id: "sledge-for", evidenceFor: ["giza-evidence-wet-sand-sledge", "giza-evidence-hatnub-ramp"], evidenceAgainst: [] };
const sledgeAgainst: Theory = { ...sledgeFor, id: "sledge-against", evidenceFor: [], evidenceAgainst: ["giza-evidence-wet-sand-sledge"] };
const sharedExperiments = experimentsBearingOn([sledgeFor, sledgeAgainst]);
check("one experiment listed by two theories appears once with both bearings, and other kinds are left out", sharedExperiments.length === 1 && sharedExperiments[0].bearings.map((bearing) => `${bearing.side}:${bearing.theory.id}`).join() === "supports:sledge-for,goes-against:sledge-against");
const unanswered = puzzlesBySite([{ id: "unanswered", question: "Not known?", siteIds: ["no-such-site"], factIds: ["nothing"], theoryIds: [] }]);
check("a question with no theory stands with empty lists, under its id when the site has no name", unanswered.length === 1 && unanswered[0].siteName === "no-such-site" && unanswered[0].puzzles[0].theories.length === 0 && unanswered[0].puzzles[0].experiments.length === 0 && unanswered[0].puzzles[0].facts.length === 0);

console.log(JSON.stringify({ ok: failed === 0, failed, facts: ALL_FACTS.length, evidence: ALL_EVIDENCE.length, theories: ALL_THEORIES.length, questions: ALL_QUESTIONS.length }));
process.exit(failed === 0 ? 0 : 1);
