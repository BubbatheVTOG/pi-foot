import assert from "node:assert/strict";
import test from "node:test";
import { getPiFootRegistry } from "../src/registry.ts";

test("registers, replaces, and unregisters sections", () => {
  const registry = getPiFootRegistry();
  registry.unregister("test-section");

  let changes = 0;
  const unsubscribe = registry.onChange(() => changes++);
  const first = { id: "test-section", render: () => "first" };
  const remove = registry.register(first);
  assert.equal(registry.getSections()[0]?.render({} as never), "first");

  registry.register({ id: "test-section", render: () => "second" });
  assert.equal(registry.getSections()[0]?.render({} as never), "second");

  remove();
  assert.equal(
    registry.getSections().some((section) => section.id === "test-section"),
    true,
  );
  registry.unregister("test-section");
  assert.equal(
    registry.getSections().some((section) => section.id === "test-section"),
    false,
  );
  assert.equal(changes, 3);

  unsubscribe();
});
