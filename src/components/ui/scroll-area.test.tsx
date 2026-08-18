// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ScrollArea } from "./scroll-area.tsx";

/**
 * Regression guard for the "tombol Tambah Pengeluaran hilang" bug.
 *
 * Every admin page lays out as a flex column: a ScrollArea that fills the
 * remaining space, followed by a fixed-height action button:
 *
 *   <div className="flex flex-col h-full overflow-hidden">
 *     <ScrollArea className="h-full" />   <- flex item
 *     <Button>Tambah Pengeluaran</Button> <- must stay on screen
 *   </div>
 *
 * Per CSS Flexbox §4.5, a flex item's automatic minimum size is *content
 * based* — it refuses to shrink below its content — UNLESS its `overflow` is
 * something other than `visible`, which makes that minimum 0.
 *
 * So once the table inside the ScrollArea grows taller than the space it was
 * given, a ScrollArea root without `overflow-hidden` stops shrinking, grows to
 * fit its content, and shoves the sibling button down past the bottom of the
 * screen — where the `overflow-hidden` AppShell and the fixed MenuBar hide it.
 * The button is still rendered and still in the DOM; it is simply pushed out
 * of view, which is why it reads as "the feature was deleted".
 *
 * jsdom performs no layout (getBoundingClientRect is all zeroes), so we cannot
 * assert the geometry here. We assert the class contract that produces the
 * correct geometry instead. Layout itself was verified in headless Chrome.
 */
describe("ScrollArea", () => {
  it("gives the root a non-visible overflow so it can shrink as a flex item", () => {
    const { container } = render(<ScrollArea className="h-full w-full" />);
    const root = container.querySelector('[data-slot="scroll-area"]');

    expect(root).not.toBeNull();
    expect(root?.className).toContain("overflow-hidden");
  });

  it("keeps caller-supplied classes on the root", () => {
    const { container } = render(<ScrollArea className="h-full rounded-xl" />);
    const root = container.querySelector('[data-slot="scroll-area"]');

    expect(root?.className).toContain("h-full");
    expect(root?.className).toContain("rounded-xl");
  });

  it("renders children inside the scrollable viewport", () => {
    const { container, getByText } = render(
      <ScrollArea>
        <p>Beli gas elpiji</p>
      </ScrollArea>,
    );

    const viewport = container.querySelector(
      '[data-slot="scroll-area-viewport"]',
    );
    expect(viewport).not.toBeNull();
    expect(viewport?.contains(getByText("Beli gas elpiji"))).toBe(true);
  });
});
