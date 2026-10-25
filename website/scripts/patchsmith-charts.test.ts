import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { chartFields } from "../lib/patchsmith-charts";
import { contract } from "../lib/patchsmith";
import { loadAppChart } from "../lib/patchsmith-client";

void test("catalog charts accept structured values and reject invalid or excessive input", () => {
  const valid = {
    label: "Revenue",
    data: [{ label: "Oct", value: 149.5 }],
    valueFormat: "currency",
    currency: "USD",
  };
  for (const chart of [contract.components.AreaChart, contract.components.BarChart]) {
    assert.equal(chart.fields.safeParse(valid).success, true);
    assert.equal(chart.fields.safeParse({ label: "Empty", data: [] }).success, true);
    for (const value of [NaN, Infinity, -Infinity, "149.50"]) {
      assert.equal(
        chart.fields.safeParse({ ...valid, data: [{ label: "Oct", value }] }).success,
        false,
      );
    }
    assert.equal(
      chart.fields.safeParse({
        ...valid,
        data: Array.from({ length: 101 }, () => ({ label: "Oct", value: 1 })),
      }).success,
      false,
    );
    assert.equal(
      chart.fields.safeParse({ ...valid, currency: "javascript:alert(1)" }).success,
      false,
    );
  }
});

void test("chart alternatives preserve exact displayed currency and escape supplied labels", async () => {
  const AppChart = await loadAppChart();
  const props = chartFields.parse({
    label: "<script>Revenue</script>",
    data: [{ label: "<b>Oct</b>", value: 149.5 }],
    valueLabel: "Collected revenue",
    valueFormat: "currency",
    currency: "USD",
  });
  for (const type of ["area", "bar"] as const) {
    const html = renderToStaticMarkup(createElement(AppChart, { ...props, type }));
    assert.match(html, /\$149\.50/);
    assert.match(html, /<caption>&lt;script&gt;Revenue&lt;\/script&gt;<\/caption>/);
    assert.match(html, /&lt;b&gt;Oct&lt;\/b&gt;/);
    assert.doesNotMatch(html, /<script>Revenue/);
    assert.match(html, /<div class="sr-only"><table>/);
  }
});

void test("empty charts show a meaningful state and accept zero or negative amounts", async () => {
  const AppChart = await loadAppChart();
  assert.match(
    renderToStaticMarkup(createElement(AppChart, { type: "area", label: "Revenue", data: [] })),
    /No data to display/,
  );
  assert.equal(
    chartFields.safeParse({
      label: "Net revenue",
      data: [
        { label: "Sep", value: 0 },
        { label: "Oct", value: -149.5 },
      ],
    }).success,
    true,
  );
});
