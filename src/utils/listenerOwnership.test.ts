import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

test("a lista de chats tem um único listener, no provider", () => {
  const hook = fs.readFileSync("src/hooks/useUserChats.ts", "utf8");
  const provider = fs.readFileSync("src/contexts/ChatsContext.tsx", "utf8");
  assert.equal(hook.includes("listenToUserChats"), false);
  assert.equal(provider.includes("listenToUserChats"), true);
  assert.equal(provider.includes('listenToChat("global"'), true);
});
