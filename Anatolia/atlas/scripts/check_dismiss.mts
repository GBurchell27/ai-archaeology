import { closeTopDismissLayer, dismissLayerCount, pushDismissLayer, resetDismissStack, topDismissLayer } from "../lib/chrome/dismissStack.ts";

let failed = 0;

function check(label: string, condition: boolean): void {
  if (condition) return;
  failed += 1;
  console.error("FAIL", label);
}

resetDismissStack();
check("an empty stack has nothing to close", closeTopDismissLayer() === false);

const order: string[] = [];
let releaseLegend: () => void = () => undefined;
let releasePanel: () => void = () => undefined;
let releaseSheet: () => void = () => undefined;
releaseLegend = pushDismissLayer(40, () => { order.push("legend"); releaseLegend(); });
releasePanel = pushDismissLayer(60, () => { order.push("panel"); releasePanel(); });
releaseSheet = pushDismissLayer(40, () => { order.push("sheet"); releaseSheet(); });
check("the panel is in front of an older sheet", topDismissLayer()?.priority === 60);
check("closing takes the panel and leaves the rest", closeTopDismissLayer() && order.join(",") === "panel" && dismissLayerCount() === 2);
check("the same priority keeps the one opened latest", closeTopDismissLayer() && order.at(-1) === "sheet");
check("the legend is last", closeTopDismissLayer() && order.join(",") === "panel,sheet,legend" && dismissLayerCount() === 0);

resetDismissStack();
if (failed > 0) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log(JSON.stringify({ ok: true }));
