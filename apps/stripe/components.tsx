import {
  Alert,
  Badge,
  Button,
  Flex,
  Grid,
  Heading,
  Separator,
  Skeleton,
  Text,
  type BadgeProps,
} from "#patchsmith";
import { statusLabel, type Billing } from "./billing";

export function BillingStatus({ status }: { status: Billing["status"] }) {
  const variants: Record<Billing["status"], BadgeProps["variant"]> = {
    active: "success",
    trialing: "info",
    past_due: "warning",
    canceled: "secondary",
  };
  return <Badge text={statusLabel(status)} variant={variants[status]} />;
}

export function LoadState({
  loading,
  error,
  reload,
  layout = "panel",
}: {
  loading: boolean;
  error: unknown;
  reload: () => void;
  layout?: "panel" | "page";
}) {
  if (error)
    return (
      <Flex direction="column" gap="3">
        <Alert
          title="Couldn't load billing"
          description="Please try loading billing again."
          variant="error"
        />
        <Button label="Try again" variant="outline" onClick={reload} />
      </Flex>
    );
  if (loading) return layout === "page" ? <AnalyticsSkeleton /> : <ContactBillingSkeleton />;
  return null;
}

function StatSkeleton({ description = false }: { description?: boolean }) {
  return (
    <Flex
      direction="column"
      gap="2"
      padding="4"
      border="solid"
      radius="xl"
      background="card"
      minWidth="0"
    >
      <Skeleton width="3/4" height="4" />
      <Skeleton width="2/3" height="8" />
      {description ? <Skeleton width="full" height="3" /> : null}
    </Flex>
  );
}

function ContactBillingSkeleton() {
  return (
    <Flex direction="column" gap="5" height="full" overflow="auto">
      <Flex direction="column" gap="2">
        <Skeleton width="20" height="6" />
        <Skeleton width="40" height="6" />
        <Skeleton width="48" height="4" />
      </Flex>
      <Grid columns={2} gap="3">
        <StatSkeleton />
        <StatSkeleton />
      </Grid>
      <Flex direction="column" gap="5" padding="6" border="solid" radius="xl" background="card">
        <Skeleton width="32" height="5" />
        <Flex direction="column" gap="3">
          <Flex justify="between" align="center" gap="3">
            <Skeleton width="24" height="5" />
            <Skeleton width="16" height="5" radius="full" />
          </Flex>
          <Skeleton width="40" height="8" />
          <Skeleton width="3/4" height="4" />
          <Separator />
          <Skeleton width="40" height="4" />
          <Skeleton width="full" height="3" />
        </Flex>
      </Flex>
      <Skeleton width="32" height="5" />
      <Flex direction="column" gap="3">
        {[0, 1, 2].map((row) => (
          <Flex
            key={row}
            justify="between"
            align="center"
            gap="3"
            border="solid"
            padding="3"
            radius="lg"
          >
            <Flex direction="column" gap="1">
              <Skeleton width="20" height="4" />
              <Skeleton width="24" height="3" />
            </Flex>
            <Skeleton width="12" height="5" radius="full" />
          </Flex>
        ))}
      </Flex>
      <Skeleton height="10" radius="lg" />
    </Flex>
  );
}

function ReportSkeleton({ rows = 5, chart = false }: { rows?: number; chart?: boolean }) {
  return (
    <Flex
      direction="column"
      gap="5"
      padding="6"
      border="solid"
      radius="xl"
      background="card"
      minWidth="0"
    >
      <Flex direction="column" gap="2">
        <Skeleton width="40" height="5" />
        <Skeleton width="2/3" height="4" />
      </Flex>
      {chart ? (
        <Flex direction="column" height="64" justify="end" gap="4">
          <Skeleton height="40" radius="lg" />
          <Flex justify="between" gap="3">
            {[0, 1, 2].map((tick) => (
              <Skeleton key={tick} width="12" height="3" />
            ))}
          </Flex>
        </Flex>
      ) : (
        <Flex direction="column" gap="4">
          {Array.from({ length: rows }, (_, row) => (
            <Grid key={row} columns={4} gap="4">
              <Flex direction="column" gap="2">
                <Skeleton width={row % 2 ? "3/4" : "full"} height="4" />
                <Skeleton width="2/3" height="3" />
              </Flex>
              <Skeleton width="3/4" height="4" />
              <Skeleton width="16" height="5" radius="full" />
              <Skeleton width="3/4" height="4" />
            </Grid>
          ))}
        </Flex>
      )}
    </Flex>
  );
}

function AnalyticsSkeleton() {
  return (
    <Flex direction="column" gap="6" height="full" overflow="auto">
      <Flex direction="column" gap="2">
        <Skeleton width="48" height="6" />
        <Skeleton width="48" height="4" />
      </Flex>
      <Grid columns={{ default: 1, md: 2 }} gap="4">
        <ReportSkeleton chart />
        <ReportSkeleton chart />
      </Grid>
      <Grid
        columns={{ default: 2, lg: 4 }}
        gap="5"
        padding="5"
        border="solid"
        radius="xl"
        background="card"
      >
        {[0, 1, 2, 3].map((stat) => (
          <Flex key={stat} direction="column" gap="2" minWidth="0">
            <Skeleton width="3/4" height="4" />
            <Skeleton width="2/3" height="6" />
            <Skeleton width="full" height="3" />
          </Flex>
        ))}
      </Grid>
      <ReportSkeleton rows={3} />
    </Flex>
  );
}

export function Stat({
  label,
  value,
  description,
  framed = true,
}: {
  label: string;
  value: string;
  description?: string;
  framed?: boolean;
}) {
  return (
    <Flex
      direction="column"
      gap="2"
      padding={framed ? "4" : undefined}
      border={framed ? "solid" : undefined}
      radius={framed ? "xl" : undefined}
      background={framed ? "card" : undefined}
      minWidth="0"
    >
      <Text text={label} tone="muted" size="sm" />
      <Heading text={value} level="h3" />
      {description ? <Text text={description} tone="muted" size="xs" /> : null}
    </Flex>
  );
}
