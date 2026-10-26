import { createDoomInput } from "./input";

// Use the browser build published by doomgeneric's author. Its data package
// includes Doom shareware and the SDL/Timidity sound assets.
const upstream = "https://ozkl.github.io/doomgeneric/";
const integrity = {
  "doomgeneric.js": "sha256-c7VuvTVUEdHAXtKRkbevMejk6NTPd1aRgMDq8YwyLq0=",
  "doomgeneric.wasm": "sha256-JmjO9B7/FN/MMIkhpdYlGT9bVcsn/2oLFdmsQbjnjbM=",
  "doomgeneric.data": "sha256-baQC2FHDIOiEnaDkZGNZQiVig85NNLIHYZ8xwx9Eij0=",
};

interface DoomModule {
  canvas: HTMLCanvasElement;
  arguments: string[];
  noInitialRun: boolean;
  onRuntimeInitialized: () => void;
  wasmBinary: ArrayBuffer;
  getPreloadedPackage: () => ArrayBuffer;
  locateFile: (file: string) => string;
  preMainLoop: () => boolean;
  onAbort: (reason: unknown) => void;
  print: (text: string) => void;
  printErr: (text: string) => void;
  SDL2?: { audioContext?: AudioContext };
}

export interface DoomEngine {
  draw: () => void;
  key: (code: string, down: boolean) => void;
  pause: (paused: boolean) => void;
  dispose: () => void;
}

async function download(file: keyof typeof integrity, signal: AbortSignal) {
  const response = await fetch(new URL(file, upstream), {
    signal,
    credentials: "omit",
    integrity: integrity[file],
  });
  if (!response.ok) throw new Error(`Could not download ${file} (${response.status}).`);
  return response;
}

export async function createDoom(
  canvas: OffscreenCanvas,
  signal: AbortSignal,
): Promise<DoomEngine> {
  const [script, wasm, data] = await Promise.all([
    download("doomgeneric.js", signal).then((response) => response.text()),
    download("doomgeneric.wasm", signal).then((response) => response.arrayBuffer()),
    download("doomgeneric.data", signal).then((response) => response.arrayBuffer()),
  ]);
  signal.throwIfAborted();
  const context = canvas.getContext("2d");
  if (!context) throw new Error("A 2D canvas is required to play Doom.");
  context.imageSmoothingEnabled = false;

  // SDL owns a canvas inside the opaque sandbox iframe. Only pixels and the
  // allowlisted canvas input cross the SDK bridge to the CRM document.
  const source = document.createElement("canvas");
  source.id = "canvas";
  source.width = 640;
  source.height = 400;
  document.body.append(source);
  let paused = false;
  let disposed = false;
  let stop: (() => void) | undefined;
  let tick: (() => void) | undefined;

  const input = createDoomInput((keyCode, down) => {
    // SDL's Emscripten build uses legacy keyCode, which the SDK deliberately
    // does not forward. Reconstruct it solely from the approved physical code.
    const event = new KeyboardEvent(down ? "keydown" : "keyup", { bubbles: true });
    Object.defineProperties(event, {
      keyCode: { value: keyCode },
      which: { value: keyCode },
    });
    document.dispatchEvent(event);
  });

  function key(code: string, down: boolean) {
    if (disposed || (paused && down)) return;
    input.key(code, down);
  }

  function dispose() {
    if (disposed) return;
    input.release();
    disposed = true;
    stop?.();
    source.remove();
  }
  signal.addEventListener("abort", dispose, { once: true });

  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("Doom took too long to start. Please retry.")),
        30_000,
      );
      const fail = (reason: unknown) => {
        clearTimeout(timer);
        reject(reason instanceof Error ? reason : new Error(String(reason)));
      };
      signal.addEventListener("abort", () => fail(signal.reason), { once: true });
      const module: DoomModule = {
        canvas: source,
        // Start a playable first level instead of Doom's automatic demo playback.
        arguments: ["-iwad", "doom1.wad", "-nosound", "-warp", "1", "1"],
        noInitialRun: true,
        onRuntimeInitialized: () => {
          if (signal.aborted || disposed) {
            stop?.();
            fail(signal.reason);
          } else {
            try {
              runtime.start();
              clearTimeout(timer);
              resolve();
            } catch (error) {
              fail(error);
            }
          }
        },
        wasmBinary: wasm,
        getPreloadedPackage: () => data,
        locateFile: (file) => new URL(file, upstream).href,
        preMainLoop: () => !paused && !disposed,
        onAbort: fail,
        print: () => {},
        printErr: (message) => console.warn(message),
      };
      // The upstream non-modular Emscripten script expects a local Module.
      // A function scope keeps each game's memory, SDL state and loop private.
      // Chrome throttles timers and rAF in hidden sandbox iframes. Let the
      // host-paced canvas draw callback advance SDL before presenting its pixels.
      // oxlint-disable-next-line typescript/no-implied-eval -- The upstream Emscripten browser build is a classic script requiring an isolated Module scope.
      const boot = new Function(
        "Module",
        `${script}\n
        var nextFrame;
        Browser.requestAnimationFrame = function(callback) { nextFrame = callback; };
        return { start: function() { callMain(Module.arguments); }, tick: function() {
          var callback = nextFrame;
          nextFrame = undefined;
          if (callback) callback(performance.now());
        }, stop: function() {
          nextFrame = undefined;
          Browser.mainLoop.pause();
          JSEvents.removeAllEventListeners();
          if (Module.SDL2 && Module.SDL2.audioContext) Module.SDL2.audioContext.close();
          if (GL.currentContext) GL.currentContext.GLctx.getExtension('WEBGL_lose_context')?.loseContext();
        }};
      `,
      ) as (module: DoomModule) => { start: () => void; tick: () => void; stop: () => void };
      const runtime = boot(module);
      stop = runtime.stop;
      tick = runtime.tick;
      if (signal.aborted) dispose();

      const audio = () => {
        void module.SDL2?.audioContext?.resume().catch(() => {});
      };
      canvas.addEventListener("keydown", audio, { signal });
      canvas.addEventListener("pointerdown", audio, { signal });
      canvas.addEventListener("blur", input.release, { signal });
      canvas.addEventListener(
        "keydown",
        (event) => {
          if (event instanceof KeyboardEvent) key(event.code, true);
        },
        { signal },
      );
      canvas.addEventListener(
        "keyup",
        (event) => {
          if (event instanceof KeyboardEvent) key(event.code, false);
        },
        { signal },
      );
    });
    signal.throwIfAborted();
    return {
      draw: () => {
        if (disposed) return;
        tick?.();
        context.drawImage(source, 0, 0, canvas.width, canvas.height);
      },
      key,
      pause: (value) => {
        input.release();
        paused = value;
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
