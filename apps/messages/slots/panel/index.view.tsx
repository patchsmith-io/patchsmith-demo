import { useState } from "preact/hooks";
import { defineView } from "patchsmith/client";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Empty,
  Flex,
  Grid,
  Heading,
  Input,
  Pressable,
  Select,
  Separator,
  Skeleton,
  Text,
  tools,
} from "#patchsmith";
import { channels, examples, type Channel, type Contact } from "../../lib/messages";
import { useMessages } from "../../lib/use-messages";

const view = defineView({ view: "/", component: Inbox });

function SkeletonLine() {
  return (
    <Box height="full" padding="0.5">
      <Box height="full" radius="sm" overflow="hidden">
        <Skeleton />
      </Box>
    </Box>
  );
}

// Both states use the same avatar and two fixed line slots, including on narrow panels.
function InboxRow({
  contact,
  channel,
  preview,
  onPress,
}: {
  contact?: Contact;
  channel?: Channel;
  preview?: string;
  onPress?: () => void;
}) {
  return (
    <Flex direction="column" gap="0" shrink="0">
      <Pressable
        ariaLabel={contact ? `Message ${contact.name}` : "Loading conversation"}
        disabled={!contact}
        layout="flex"
        align="center"
        gap="2"
        padding="4"
        background={{ default: "transparent", ":hover": "muted", ":active": "accent" }}
        width="full"
        onPress={onPress}
      >
        <Box
          width="8"
          height="8"
          radius="full"
          overflow="hidden"
          shrink="0"
          background={contact ? "transparent" : "muted"}
        >
          {contact ? <Avatar name={contact.name} /> : null}
        </Box>
        <Flex direction="column" gap="0" height="10" grow="1" minWidth="0">
          <Flex
            justify="between"
            align="start"
            gap="2"
            grow="1"
            basis="0"
            minHeight="0"
            overflow="hidden"
          >
            <Box grow="1" minWidth="0" height="full" overflow="hidden">
              {contact ? (
                <Text text={contact.name} size="sm" />
              ) : (
                <Flex height="full">
                  <Box grow="1" minWidth="0" height="full">
                    <SkeletonLine />
                  </Box>
                  <Box width="10" shrink="0" />
                </Flex>
              )}
            </Box>
            <Box width="10" height="full" shrink="0">
              {contact ? <Text text={channel ?? ""} size="xs" tone="muted" /> : <SkeletonLine />}
            </Box>
          </Flex>
          <Box grow="1" basis="0" minHeight="0" overflow="hidden">
            {contact ? <Text text={preview ?? ""} size="sm" tone="muted" /> : <SkeletonLine />}
          </Box>
        </Flex>
      </Pressable>
      <Separator />
    </Flex>
  );
}

function InboxSkeleton() {
  return (
    <Flex direction="column" gap="0" shrink="0">
      <Separator />
      {examples.map((_, index) => (
        <InboxRow key={index} />
      ))}
    </Flex>
  );
}

function Inbox() {
  const context = view.useContext();
  const { contacts, messages, loading, error, setError, reload } = useMessages(
    context.workspace.id,
  );
  const [filter, setFilter] = useState("All channels");
  const [query, setQuery] = useState("");
  const threads = contacts
    .flatMap((contact, index) => {
      const sent = messages.filter((message) => message.contactId === contact.id);
      const latest = sent.at(-1) ?? examples[index];
      if (
        !latest ||
        (filter !== "All channels" && latest.channel !== filter) ||
        !`${contact.name} ${contact.company} ${latest.body}`
          .toLowerCase()
          .includes(query.toLowerCase())
      )
        return [];
      return [{ contact, latest, hasSent: sent.length > 0 }];
    })
    .sort((a, b) => Number(b.hasSent) - Number(a.hasSent));

  function navigate(href: string) {
    setError("");
    void tools.ui
      .navigate({ href })
      .catch(() => setError("Couldn't open the contact page. Please try again."));
  }

  return (
    <Flex direction="column" gap="4" height="full" overflow="auto">
      <Flex justify="between" align="center" gap="2" shrink="0">
        <Heading text="Messages" level="h2" />
        <Button label="New message" size="sm" onClick={() => navigate("/contacts")} />
      </Flex>
      {error ? (
        <Flex direction="column" gap="2">
          <Alert title="Something went wrong" description={error} variant="error" />
          <Button label="Reload inbox" variant="outline" onClick={reload} />
        </Flex>
      ) : null}
      <Grid columns={2} gap="2">
        <Input
          label="Search"
          type="search"
          value={query}
          placeholder="Search inbox…"
          onChange={({ value }) => setQuery(value)}
        />
        <Select
          label="Channel"
          value={filter}
          options={["All channels", ...channels].map((value) => ({ label: value, value }))}
          onChange={({ value }) => setFilter(value)}
        />
      </Grid>
      {loading ? <InboxSkeleton /> : null}
      {!loading && !error && threads.length === 0 ? (
        <Empty
          title={contacts.length === 0 ? "Add a contact to get started" : "No conversations found"}
        />
      ) : null}
      {!loading && threads.length > 0 ? (
        <Flex direction="column" gap="0" shrink="0">
          <Separator />
          {threads.map(({ contact, latest, hasSent }) => {
            const preview = `${hasSent ? "You: " : ""}${latest.body}`.replace(/\s+/g, " ");
            return (
              <InboxRow
                key={contact.id}
                contact={contact}
                channel={latest.channel}
                preview={preview.length > 48 ? `${preview.slice(0, 48)}…` : preview}
                onPress={() => navigate(`/contacts/${contact.id}`)}
              />
            );
          })}
        </Flex>
      ) : null}
    </Flex>
  );
}

export default view;
