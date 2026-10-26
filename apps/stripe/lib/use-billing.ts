import { useAction, useQuery } from "patchsmith/client";
import { useEffect } from "preact/hooks";
import { api } from "#patchsmith";

export function useBilling() {
  const sync = useAction(api.billing.sync);
  const { execute } = sync;
  useEffect(() => {
    execute({});
  }, [execute]);
  const query = useQuery(api.billing.list, {}, { enabled: sync.isSuccess });
  return {
    customers: query.data ?? [],
    loading: sync.status === "idle" || sync.isPending || (sync.isSuccess && query.isPending),
    error: sync.error || query.error,
    reload: () => execute({}),
  };
}
