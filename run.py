"""Start the Anatolia atlas and open it in a browser.

From the repository root:

    python run.py

Atlas: http://127.0.0.1:43127/
"""

from __future__ import annotations

import shutil
import socket
import subprocess
import sys
import time
import webbrowser
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parent
HOST = "127.0.0.1"
READY_TIMEOUT_SECONDS = 300.0
POLL_SECONDS = 0.5


@dataclass(frozen=True)
class DevServer:
    title: str
    directory: Path
    port: int

    @property
    def url(self) -> str:
        return f"http://{HOST}:{self.port}/"

    def command(self) -> str:
        if (self.directory / "node_modules").is_dir():
            return "npm run dev"
        return "npm install && npm run dev"


ATLAS = DevServer(
    title="Anatolia atlas",
    directory=ROOT / "Anatolia" / "atlas",
    port=43127,
)


def main() -> int:
    require_npm()
    ensure_project(ATLAS)
    prepare_regional_terrain()
    start_server(ATLAS)
    if not wait_until_ready(ATLAS):
        print(readiness_failure(ATLAS), file=sys.stderr)
        return 1
    webbrowser.open(ATLAS.url)
    print(f"Opened {ATLAS.url}")
    return 0


def prepare_regional_terrain() -> None:
    source = ROOT / "Anatolia" / "explorer" / "public" / "terrain"
    script = ATLAS.directory / "scripts" / "build_sanliurfa_region.py"
    output = ATLAS.directory / "public" / "terrain" / "regions" / "sanliurfa"
    metadata = output / "metadata.json"
    if not (source / "metadata.json").is_file() or not (source / "region" / "height.u16").is_file():
        return
    inputs = [script, source / "metadata.json", *(source / "region").iterdir()]
    if metadata.is_file() and (output / "height.u16").is_file():
        if metadata.stat().st_mtime >= max(path.stat().st_mtime for path in inputs):
            return
    result = subprocess.run([sys.executable, str(script)], cwd=ROOT, check=False)
    if result.returncode:
        print("Şanlıurfa terrain could not be prepared. The atlas can still open.", file=sys.stderr)


def require_npm() -> None:
    if shutil.which("npm") is None:
        raise SystemExit("npm was not found on PATH. Install Node.js, then run this again.")


def ensure_project(server: DevServer) -> None:
    package_json = server.directory / "package.json"
    if not package_json.is_file():
        raise SystemExit(f"Missing {package_json}")


def start_server(server: DevServer) -> None:
    if port_is_open(server.port):
        print(f"{server.title} is already running at {server.url}")
        return
    launch_in_new_terminal(server)
    print(f"Started {server.title} in a new terminal ({server.url})")


def port_is_open(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.4)
        return sock.connect_ex((HOST, port)) == 0


def launch_in_new_terminal(server: DevServer) -> None:
    if sys.platform == "win32":
        launch_windows_terminal(server)
        return
    if sys.platform == "darwin":
        launch_macos_terminal(server)
        return
    launch_posix_terminal(server)


def launch_windows_terminal(server: DevServer) -> None:
    title = server.title.replace('"', "")
    command = server.command().replace('"', "")
    subprocess.Popen(
        f'start "{title}" cmd /k "{command}"',
        cwd=server.directory,
        shell=True,
    )


def launch_macos_terminal(server: DevServer) -> None:
    shell_command = f"cd {sh_quote(server.directory)} && {server.command()}"
    subprocess.Popen(
        [
            "osascript",
            "-e",
            f'tell application "Terminal" to do script {sh_quote(shell_command)}',
        ]
    )


def launch_posix_terminal(server: DevServer) -> None:
    shell_command = f"cd {sh_quote(server.directory)} && {server.command()}; exec bash"
    terminal = posix_terminal()
    if Path(terminal).name == "gnome-terminal":
        subprocess.Popen(
            [terminal, "--title", server.title, "--", "bash", "-lc", shell_command]
        )
        return
    subprocess.Popen([terminal, "-e", "bash", "-lc", shell_command])


def posix_terminal() -> str:
    for name in ("gnome-terminal", "x-terminal-emulator", "xterm"):
        found = shutil.which(name)
        if found is not None:
            return found
    raise SystemExit("No terminal emulator found. Start the dev servers manually.")


def sh_quote(value: Path | str) -> str:
    text = str(value)
    return "'" + text.replace("'", "'\\''") + "'"


def wait_until_ready(server: DevServer) -> bool:
    deadline = time.monotonic() + READY_TIMEOUT_SECONDS
    print(f"Waiting for {server.title} at {server.url}")
    while time.monotonic() < deadline:
        if port_is_open(server.port):
            return True
        time.sleep(POLL_SECONDS)
    return False


def readiness_failure(server: DevServer) -> str:
    return (
        f"{server.title} did not accept connections at {server.url} "
        f"within {READY_TIMEOUT_SECONDS:.0f}s. Check its terminal window."
    )


if __name__ == "__main__":
    raise SystemExit(main())
