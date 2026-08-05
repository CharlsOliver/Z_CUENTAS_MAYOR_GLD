sap.ui.define([
    "sap/ui/core/mvc/Controller"
], (Controller) => {
    "use strict";

    return Controller.extend("zcuentasmayorgld.controller.Main", {
        onInit: function () {

            this._iCurrentOperation = 0;
            this._bEditMode = false;

            this._mSections = {
                changeCuentaMayor: this.byId("boxChangeCuentaMayor"),
                displayCuentaMayor: this.byId("boxDisplayCuentaMayor"),

                modeloCuenta: this.byId("boxModeloCuenta"),

                changeDescripcion: this.byId("boxChangeDescripcion"),
                displayDescripcion: this.byId("boxDisplayDescripcion"),

                changeDatosControl: this.byId("boxChangeDatosControl"),
                displayDatosControl: this.byId("boxDisplayDatosControl"),

                changeEntradaBanco: this.byId("boxChangeEntradaBanco"),
                displayEntradaBanco: this.byId("boxDisplayEntradaBanco"),

                changeBloqueos: this.byId("boxChangeBloqueos"),
                displayBloqueos: this.byId("boxDisplayBloqueos"),

                sociedades: this.byId("boxSociedades")
            };

            this._mButtons = {
                edit: this.byId("btnEdit"),
                create: this.byId("btnCreate"),
                save: this.byId("btnSave"),
                cancel: this.byId("btnCancel"),
                addSociedad: this.byId("btnAddSociedad"),
                deleteSociedad: this.byId("btnDeleteSociedad")
            };

            this._mModes = {

                // Alta
                0: {
                    editButton: false,

                    display: [
                        "changeCuentaMayor",
                        "modeloCuenta",
                        "changeDescripcion",
                        "changeDatosControl",
                        "changeEntradaBanco"
                    ],

                    edit: []
                },

                // Modificación
                1: {
                    editButton: true,

                    display: [
                        "displayCuentaMayor",
                        "displayDescripcion",
                        "displayDatosControl",
                        "displayEntradaBanco"
                    ],

                    edit: [
                        "changeCuentaMayor",
                        "changeDescripcion",
                        "changeDatosControl",
                        "changeEntradaBanco"
                    ]
                },

                // Bloqueo
                2: {
                    editButton: true,

                    display: [
                        "displayCuentaMayor",
                        "displayBloqueos"
                    ],

                    edit: [
                        "changeCuentaMayor",
                        "changeBloqueos"
                    ]
                },

                // Extensión
                3: {
                    editButton: true,

                    display: [
                        "displayCuentaMayor",
                        "sociedades"
                    ],

                    edit: [
                        "changeCuentaMayor",
                        "sociedades"
                    ]
                }

            };

            this._showMode(0, false);
        },

        onOptionSelect: function (oEvent) {

            this._iCurrentOperation = oEvent.getSource().getSelectedIndex();

            // Cada vez que cambia de operación regresamos al modo Display
            this._bEditMode = false;

            this._showMode(this._iCurrentOperation, this._bEditMode);
        },

        onEditPress: function () {

            this._bEditMode = true;

            this._showMode(this._iCurrentOperation, this._bEditMode);
        },

        _showMode: function (iOperation, bEditMode) {

            const oMode = this._mModes[iOperation];

            Object.values(this._mSections).forEach(function (oSection) {
                oSection.setVisible(false);
            });

            const aSections = bEditMode
                ? oMode.edit
                : oMode.display;

            aSections.forEach(function (sSection) {
                this._mSections[sSection].setVisible(true);
            }, this);

            const bDisplayMode = !bEditMode;

            this._mButtons.edit.setVisible(oMode.editButton && bDisplayMode);

            this._mButtons.create.setVisible(bDisplayMode);
            this._mButtons.save.setVisible(!bDisplayMode);
            this._mButtons.cancel.setVisible(!bDisplayMode);

            const bSociedadesEditable = iOperation === 3 && bEditMode;

            this._mButtons.addSociedad.setVisible(bSociedadesEditable);
            this._mButtons.deleteSociedad.setVisible(bSociedadesEditable);

        }
    });
});