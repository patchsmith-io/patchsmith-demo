import { useEffect, useState } from "preact/hooks";
import { tools } from "#patchsmith";
import { readMessages, type Contact, type Message } from "./messages";

export function useMessages(workspaceId: string, contactId?: string) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    void Promise.all([
      tools.contacts.list({}),
      tools.activities.list(contactId ? { contactId } : {}),
    ]).then(
      ([contactResult, activityResult]) => {
        if (cancelled) return;
        setContacts(contactResult.contacts);
        setMessages(readMessages(activityResult.activities));
        setLoading(false);
      },
      () => {
        if (cancelled) return;
        setError("Couldn't load your messages. Please try again.");
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt, workspaceId, contactId]);

  return {
    contacts,
    messages,
    setMessages,
    loading,
    error,
    setError,
    reload: () => setAttempt((value) => value + 1),
  };
}
