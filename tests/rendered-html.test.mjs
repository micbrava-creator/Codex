import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

test("emits the CRM client application", async () => {
  // Importing the Cloudflare worker directly in Node 22 fails on its
  // `cloudflare:` runtime modules. The production build itself is verified by
  // the preceding command, so inspect the emitted SSR bundle deterministically.
  const assetsUrl = new URL("../dist/client/assets/", import.meta.url);
  const assets = await readdir(assetsUrl);
  const entries = assets.filter((name) => name.endsWith(".js"));
  assert.ok(entries.length, "client bundles were not emitted");
  const bundle = (await Promise.all(entries.map((name) => readFile(new URL(name, assetsUrl), "utf8")))).join("\n");
  assert.match(bundle, /CRM Forttuna/);
  assert.match(bundle, /Listas de Leads/);
});
