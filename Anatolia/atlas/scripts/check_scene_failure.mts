import { sceneFailureKind, sceneFailureLead, sceneFailureText, viewLoadFailure } from "../lib/scene/sceneFailure.ts";
import { SPLAT_RECORD_BYTES, splatRecordCount } from "../lib/walk/splatFile.ts";

let failed = 0;

function check(label: string, condition: boolean): void {
  if (condition) return;
  failed += 1;
  console.error("FAIL", label);
}

const GOBEKLI_SPLAT_BYTES = 27231680;
const KARAHAN_SPLAT_BYTES = 1684352;

check("a splat record is 32 bytes", SPLAT_RECORD_BYTES === 32);
check("one record counts as one Gaussian", splatRecordCount(SPLAT_RECORD_BYTES) === 1);
check("an empty or short or ragged file is not a splat", splatRecordCount(0) === null && splatRecordCount(SPLAT_RECORD_BYTES - 1) === null && splatRecordCount(SPLAT_RECORD_BYTES + 1) === null);
check("the published splat files are a whole number of records", splatRecordCount(GOBEKLI_SPLAT_BYTES) === GOBEKLI_SPLAT_BYTES / SPLAT_RECORD_BYTES && splatRecordCount(KARAHAN_SPLAT_BYTES) === KARAHAN_SPLAT_BYTES / SPLAT_RECORD_BYTES);

check("a string throw keeps its text", sceneFailureText("Failed to get content length") === "Failed to get content length");
check("an Error keeps its message", sceneFailureText(new Error("Array buffer allocation failed")) === "Array buffer allocation failed");
check("anything else has no text", sceneFailureText(null) === "" && sceneFailureText(undefined) === "");

check("a WebGL failure is named", sceneFailureKind(new Error("Error creating WebGL context.")) === "webgl");
check("a lost context is named", sceneFailureKind("Context Lost") === "webgl" && sceneFailureKind("lost context") === "webgl");
check("an allocation failure is memory", sceneFailureKind(new Error("Array buffer allocation failed")) === "memory" && sceneFailureKind("out of memory") === "memory");
check("a missing content length is a file failure", sceneFailureKind("Failed to get content length") === "file");
check("drei's wrapped splat error is a file failure", sceneFailureKind(new Error("Could not load /splats/gobekli-tepe.splat: undefined")) === "file");
check("a body that is not records is a file failure", sceneFailureKind(new Error("Splat file was not a splat")) === "file");
check("an unfamiliar error stays unknown", sceneFailureKind(new Error("something else")) === "unknown" && sceneFailureKind(null) === "unknown");

check("a 404 is missing, which is the note for a splat that was never built", viewLoadFailure(new Error("Splat file answered 404")) === "missing");
check("any other load error is a failure with its text", JSON.stringify(viewLoadFailure(new Error("Splat file answered 500"))) === JSON.stringify({ kind: "file", reported: "Splat file answered 500" }));
const memoryFailure = viewLoadFailure(new Error("Array buffer allocation failed"));
check("a memory error while reading stays a memory failure", memoryFailure !== "missing" && memoryFailure.kind === "memory");

const leads = (["webgl", "memory", "file", "unknown"] as const).map((kind) => sceneFailureLead(kind));
check("each kind has its own lead", new Set(leads).size === 4 && leads.every((lead) => lead.length > 20));
check("the leads do not promise that the view will recover", leads.every((lead) => !lead.includes("will work")));

console.log(JSON.stringify({ ok: failed === 0, failed }));
process.exit(failed === 0 ? 0 : 1);
