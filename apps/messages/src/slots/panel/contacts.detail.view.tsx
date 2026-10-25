import { useRef, useState } from "preact/hooks";
import { defineView } from "patchsmith/client";
import {
  Alert,
  Box,
  Button,
  Flex,
  Form,
  Fieldset,
  Heading,
  Select,
  Separator,
  Skeleton,
  Text,
  Textarea,
  tools,
  type ViewProps,
} from "#patchsmith";
import {
  channels,
  encodeMessage,
  examples,
  MAX_MESSAGE_LENGTH,
  type Channel,
} from "../../messages";
import { useMessages } from "../../use-messages";

const view = defineView({ view: "/contacts/detail", component: ContactMessages });
type Contact = ViewProps<"/contacts/detail">["context"]["contact"];

function ContactMessages() {
  const { workspace, contact } = view.useContext();
  return (
    <Conversation
      key={`${workspace.id}:${contact.id}`}
      workspaceId={workspace.id}
      contact={contact}
    />
  );
}

function MessageBubble({
  body,
  outgoing = false,
  time,
}: {
  body: string;
  outgoing?: boolean;
  time?: string;
}) {
  const space = <Box width="10" shrink="0" />;
  return (
    <Flex justify={outgoing ? "end" : "start"} align="start" gap="2">
      {outgoing ? space : null}
      <Flex direction="column" align={outgoing ? "end" : "start"} gap="1" shrink="1">
        <Box
          background={outgoing ? "primary" : "muted"}
          textColor={outgoing ? "onPrimary" : "default"}
          padding="4"
          radius="2xl"
          overflowWrap="anywhere"
        >
          <Text text={body} size="sm" />
        </Box>
        {time ? <Text text={time} size="xs" tone="muted" /> : null}
      </Flex>
      {!outgoing ? space : null}
    </Flex>
  );
}

function ConversationSkeleton() {
  return (
    <Flex direction="column" gap="4">
      {["incoming", "outgoing", "reply"].map((message) => (
        <Flex key={message} gap="2">
          {message === "outgoing" ? <Box width="10" shrink="0" /> : null}
          <Flex direction="column" gap="1" padding="4" radius="2xl" background="muted" grow="1">
            <Skeleton />
            <Flex>
              <Box grow="1">
                <Skeleton />
              </Box>
              <Box width="10" />
            </Flex>
          </Flex>
          {message !== "outgoing" ? <Box width="10" shrink="0" /> : null}
        </Flex>
      ))}
    </Flex>
  );
}

function Conversation({ workspaceId, contact }: { workspaceId: string; contact: Contact }) {
  const { contacts, messages, setMessages, loading, error, setError, reload } = useMessages(
    workspaceId,
    contact.id,
  );
  const [selectedChannel, setChannel] = useState<Channel>();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const sendLock = useRef(false);
  const sample = examples[contacts.findIndex((item) => item.id === contact.id)];
  const channel = selectedChannel ?? messages.at(-1)?.channel ?? sample?.channel ?? "Email";

  async function send() {
    if (sendLock.current || loading || !draft.length || draft.length > MAX_MESSAGE_LENGTH) return;
    sendLock.current = true;
    setSending(true);
    setError("");
    try {
      const body = draft;
      const result = await tools.activities.addNote({
        contactId: contact.id,
        body: encodeMessage(channel, body),
      });
      setMessages((current) => [
        ...current,
        {
          id: result.id,
          contactId: contact.id,
          channel,
          body,
          createdAt: new Date().toISOString(),
        },
      ]);
      setDraft("");
      // A failed host refresh must not turn a successful save into a failed send.
      void tools.ui.refresh().catch(() => {});
      void tools.ui.notify({ title: "Message sent", type: "success" }).catch(() => {});
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't save your message. Your draft is still here.",
      );
    } finally {
      sendLock.current = false;
      setSending(false);
    }
  }

  return (
    <Flex direction="column" gap="4" height="full" minHeight="0" overflow="auto">
      <Heading text="Messages" level="h2" />
      {error ? (
        <Flex direction="column" gap="2" shrink="0">
          <Alert title="Something went wrong" description={error} variant="error" />
          <Button
            label="Reload conversation"
            variant="outline"
            disabled={sending}
            onClick={reload}
          />
        </Flex>
      ) : null}
      <Box shrink="0">
        <Select
          label="Send via"
          value={channel}
          options={channels.map((value) => ({ label: value, value }))}
          disabled={sending}
          onChange={({ value }) => {
            if (channels.some((item) => item === value)) setChannel(value as Channel);
          }}
        />
      </Box>
      <Separator />
      <Flex direction="column" gap="4" grow="1" basis="0" minHeight="0" overflow="auto">
        {loading ? <ConversationSkeleton /> : null}
        {!loading && sample?.channel === channel ? <MessageBubble body={sample.body} /> : null}
        {!loading
          ? messages
              .filter((message) => message.channel === channel)
              .map((message) => (
                <MessageBubble
                  key={message.id}
                  body={message.body}
                  outgoing
                  time={new Date(message.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                />
              ))
          : null}
      </Flex>
      <Separator />
      <Box shrink="0">
        <Form
          disabled={loading || sending || !draft.length || draft.length > MAX_MESSAGE_LENGTH}
          onSubmit={() => void send()}
        >
          <Fieldset>
            <Textarea
              label="Message"
              submitOnEnter
              value={draft}
              placeholder="Write a message…"
              disabled={sending}
              required
              onChange={({ value }) => {
                setChannel(channel);
                setDraft(value);
              }}
            />
            <Flex justify="end">
              <Text
                text={`${draft.length}/${MAX_MESSAGE_LENGTH}`}
                size="xs"
                tone={draft.length > MAX_MESSAGE_LENGTH ? "destructive" : "muted"}
              />
            </Flex>
            <Button
              type="submit"
              label={sending ? "Sending…" : "Send"}
              disabled={loading || sending || !draft.length || draft.length > MAX_MESSAGE_LENGTH}
            />
          </Fieldset>
        </Form>
      </Box>
    </Flex>
  );
}

export default view;
