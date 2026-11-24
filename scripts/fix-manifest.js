const fs = require("fs");
const path = require("path");

const sManifestPath = path.join(__dirname, "../dist/manifest.json");

const oManifest = JSON.parse(
    fs.readFileSync(sManifestPath, "utf8")
);

// Compatibilidad con SAPUI5 1.71
oManifest["sap.app"].i18n = "i18n/i18n.properties";

if (oManifest["sap.ui5"]?.models?.i18n?.settings) {
    delete oManifest["sap.ui5"].models.i18n.settings.supportedLocales;
}

fs.writeFileSync(
    sManifestPath,
    JSON.stringify(oManifest, null, 4),
    "utf8"
);

console.log("Manifest ajustado para SAPUI5 1.71");