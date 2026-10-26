import { defineView, experimental_useCanvasSurface as useCanvasSurface } from "patchsmith/client";
import { useState } from "preact/hooks";
import { z } from "zod";
import { Alert, Box, Button, Canvas, Flex, Text } from "#patchsmith";
import { createDoom, type DoomEngine } from "../../doom";

const view = defineView({
  view: "/",
  instances: {
    cache: "static",
    dataSchema: z.object({}),
    resolve: () => [{ key: "doom", metadata: { label: "Can it run DOOM?" }, data: {} }],
  },
  component: Doom,
});

function Game({ paused }: { paused: boolean }) {
  const surface = useCanvasSurface<DoomEngine>(
    {
      create: (canvas, { signal }) => createDoom(canvas, signal),
      update: (engine) => engine.pause(paused),
      draw: (engine) => engine.draw(),
      dispose: (engine) => engine.dispose(),
    },
    [paused],
    // Each host acknowledgement paces the next draw. The host's Canvas contract
    // caps presentation at 35 FPS; an iframe-local timer would throttle in Chrome.
    { continuous: true },
  );

  return (
    <Flex direction="column" gap="2" grow="1" minHeight="0">
      <Box shrink="0">
        {surface.error ? (
          <Alert
            title="Doom could not start"
            description={`${surface.error.message} Use Restart to try again.`}
            variant="error"
          />
        ) : surface.status === "pending" ? (
          <Text text="Loading Doom and game data…" tone="muted" />
        ) : null}
      </Box>
      <Flex grow="1" minHeight="0" justify="center" align="center" overflow="hidden">
        <Canvas
          surface={surface.binding}
          width={640}
          height={480}
          ariaLabel="Doom game. Click to focus. W/S or Up/Down to move, A/D to strafe, Left/Right to turn, Space or F to fire, E to use, P for menu, Enter to select."
        />
      </Flex>
    </Flex>
  );
}

function Doom() {
  const [paused, setPaused] = useState(false);
  const [revision, setRevision] = useState(0);
  return (
    <Flex direction="column" gap="4" height="full" minHeight="0">
      <Flex gap="2" align="center" wrap="wrap" shrink="0">
        <Text text="Yep, it runs DOOM." />
        <Box grow="1" />
        <Button
          label={paused ? "Resume" : "Pause"}
          variant="outline"
          size="sm"
          onClick={() => setPaused((value) => !value)}
        />
        <Button
          label="Restart"
          variant="outline"
          size="sm"
          onClick={() => {
            setPaused(false);
            setRevision((value) => value + 1);
          }}
        />
      </Flex>
      <Box shrink="0">
        <Text
          text="The real game runs in its own sandbox. Patchsmith brings it into this page and sends your controls back, live."
          size="sm"
          tone="muted"
        />
      </Box>
      <Game key={revision} paused={paused} />
      <Text
        text={
          paused
            ? "Paused. Press Resume, then click the game to continue."
            : "Click game to focus · W/S or ↑/↓ move · A/D strafe · ←/→ turn (strafe while A/D held) · Space / F fire · E use · Shift run · 1–7 weapons · P menu · Enter select · Tab leaves game."
        }
        size="xs"
        tone="muted"
      />
    </Flex>
  );
}

export default view;
