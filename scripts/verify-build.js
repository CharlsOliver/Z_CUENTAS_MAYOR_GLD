const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const dist = path.join(__dirname, "../dist");
const read = (file) => fs.readFileSync(path.join(dist, file), "utf8");

const manifest = JSON.parse(read("manifest.json"));
const namespace = manifest["sap.app"].id.replaceAll(".", "/");
assert.equal(manifest._version, "1.17.0");
assert.equal(manifest["sap.app"].i18n, "i18n/i18n.properties");
assert.equal(manifest["sap.ui5"].dependencies.minUI5Version, "1.71.16");
const bundleSettings = manifest["sap.ui5"].models.i18n.settings;
assert.ok(!Object.hasOwn(bundleSettings, "supportedLocales"));
assert.ok(!Object.hasOwn(bundleSettings, "fallbackLocale"));

let preload;
vm.runInNewContext(read("Component-preload.js"), {
    sap: { ui: { predefine: () => {}, require: { preload: (modules) => { preload = modules; } } } }
}, { filename: "Component-preload.js", timeout: 1000 });

assert.deepEqual(JSON.parse(preload[namespace + "/manifest.json"]), manifest);
const resourceIndex = JSON.parse(read(manifest["sap.app"].resources));
for (const bundlePath of ["i18n/i18n.properties", "i18n/i18n_es.properties", "i18n/i18n_en.properties"]) {
    const bundle = read(bundlePath);
    assert.ok(bundle.includes("appTitle="), "Bundle incompleto: " + bundlePath);
    assert.equal(preload[namespace + "/" + bundlePath], bundle);
    assert.ok(resourceIndex.resources.some((resource) => resource.name === bundlePath));
}

console.log("Descriptor, preload y archivos i18n verificados.");
