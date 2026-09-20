import assert from "node:assert/strict";
import test from "node:test";
import { getPiFootRegistry, PI_FOOT_REGISTRY } from "../src/registry.ts";

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

test("isolates listener failures", () => {
  const registry = getPiFootRegistry();
  let observed = 0;
  const removeBroken = registry.onChange(() => {
    throw new Error("broken consumer");
  });
  const removeHealthy = registry.onChange(() => observed++);

  const unregister = registry.register({
    id: "listener-isolation",
    render: () => "ok",
  });
  assert.equal(observed, 1);

  unregister();
  removeBroken();
  removeHealthy();
});

test("replaces invalid process-wide registry state", () => {
  const registryHost = globalThis as unknown as Record<PropertyKey, unknown>;
  const previous = registryHost[PI_FOOT_REGISTRY];
  registryHost[PI_FOOT_REGISTRY] = { register: "not-a-function" };
  try {
    const registry = getPiFootRegistry();
    assert.equal(typeof registry.register, "function");
    assert.equal(typeof registry.onChange, "function");
  } finally {
    if (previous === undefined) delete registryHost[PI_FOOT_REGISTRY];
    else registryHost[PI_FOOT_REGISTRY] = previous;
  }
});
