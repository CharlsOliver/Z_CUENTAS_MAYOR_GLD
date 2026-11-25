/*global QUnit*/

sap.ui.define([
    "sap/ui/core/mvc/XMLView"
], function (XMLView) {
    "use strict";

    QUnit.module("Main Controller");

    QUnit.test("Initializes the account creation view", function (assert) {
        return XMLView.create({ viewName: "zcuentasmayorgld.view.Main" }).then(function (oView) {
            try {
                assert.ok(oView.getController().isA("zcuentasmayorgld.controller.Main"));
                assert.ok(oView.byId("btnCreate").getVisible(), "Create is available");
            } finally {
                oView.destroy();
            }
        });
    });
});
