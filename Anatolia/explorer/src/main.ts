import { startExplorer } from "./explorer";

const status = document.querySelector("#status");

startExplorer().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "The explorer failed to start";
  if (status instanceof HTMLElement) {
    status.hidden = false;
    status.textContent = message;
  }
  document.body.dataset.ready = "error";
});
