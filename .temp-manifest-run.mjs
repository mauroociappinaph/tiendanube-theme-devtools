// .temp-manifest.mjs
import manifest from "/Users/mauroociappina/Desktop/HiHi/ExtensionWebtlp/src/manifest.ts";
import { writeFileSync } from "fs";
var m = typeof manifest === "function" ? manifest() : manifest;
m.version = "0.1.0";
if (false) {
  delete m.key;
  if (m.permissions) {
    m.permissions = m.permissions.filter((p) => p !== "debugger");
  }
}
writeFileSync("/Users/mauroociappina/Desktop/HiHi/ExtensionWebtlp/dist/manifest.json", JSON.stringify(m, null, 2));
