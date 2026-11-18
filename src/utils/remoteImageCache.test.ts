import test from "node:test";
import assert from "node:assert/strict";
import { isRemoteHttpUri, stableRemoteCacheKey } from "./remoteImageCache.ts";

test("stableRemoteCacheKey strips Firebase token and keeps object path", () => {
  const uri =
    "https://firebasestorage.googleapis.com/v0/b/visao-cce8f.appspot.com/o/users%2Fabc123%2Favatar.jpg?alt=media&token=change-me";
  assert.equal(stableRemoteCacheKey(uri), "users/abc123/avatar.jpg");
});

test("stableRemoteCacheKey keeps origin+path for generic https", () => {
  assert.equal(
    stableRemoteCacheKey("https://cdn.example.com/photos/a.png?v=2"),
    "https://cdn.example.com/photos/a.png",
  );
});

test("isRemoteHttpUri detects http(s) only", () => {
  assert.equal(isRemoteHttpUri("https://x.com/a.jpg"), true);
  assert.equal(isRemoteHttpUri("data:image/jpeg;base64,aaa"), false);
  assert.equal(isRemoteHttpUri(""), false);
});
