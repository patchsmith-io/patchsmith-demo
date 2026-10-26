import { defineView } from "patchsmith/client";
import { useState } from "preact/hooks";
import { Alert, Button, Empty, Flex, tools } from "#patchsmith";

const view = defineView({ view: "/", component: DoomPanel });

function DoomPanel() {
  const [error, setError] = useState("");

  async function openGame() {
    setError("");
    try {
      await tools.ui.navigate({ href: "/apps/doom/doom" });
    } catch {
      setError("Couldn't open Doom. Please try again.");
    }
  }

  return (
    <Flex direction="column" gap="4" height="full" justify="center">
      <Empty
        icon="gamepad"
        title="Yep, it runs DOOM."
        description="Play Doom right here in the app."
      >
        <Button label="Play Doom" size="sm" onClick={openGame} />
      </Empty>
      {error ? <Alert title="Could not open Doom" description={error} variant="error" /> : null}
    </Flex>
  );
}

export default view;
