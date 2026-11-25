sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/m/Button",
    "sap/m/Dialog",
    "sap/m/Text",
    "sap/m/library",
    "sap/ui/core/Core",
    "sap/ui/core/Fragment",
    "sap/ui/core/BusyIndicator",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel",
    "sap/base/Log"
], (Controller, MessageBox, Button, Dialog, Text, mobileLibrary, Core, Fragment, BusyIndicator, Filter, FilterOperator, JSONModel, Log) => {
    "use strict";

    const aCamposCatalogo = [
        "KTOKS", "VBUND", "BILKT", "WAERS", "MWSKZ", "MITKZ", "ZUAWA",
        "FSTAG", "FDLEV", "FIPOS", "HBKID", "HKTID"
    ];
    const aCamposBooleanos = ["XSALH", "XOPVW", "XKRES", "XINTB", "XMWNO"];

    const mSelectoresCuenta = {
        alta: ["inputCuentaMayorModelo", "inputSociedadModelo"],
        display: ["inputDisplayCuentaMayor", "inputDisplaySociedad"],
        change: ["inputCuentaMayor", "inputSociedad"]
    };

    return Controller.extend("zcuentasmayorgld.controller.Main", {
        onInit: function () {
            this._oCuentaModeloResult = new JSONModel(null);
            this.getView().setModel(this._oCuentaModeloResult, "cuentaModeloResultado");
            this._mCargasCuenta = {
                alta: { model: new JSONModel(this._mapCuentaModeloResponse()) },
                display: { model: new JSONModel(this._mapCuentaModeloResponse()) },
                change: { model: new JSONModel(this._mapCuentaModeloResponse()) }
            };
            this._oCuentaMayorOtrasOperaciones = new JSONModel(this._mapCuentaModeloResponse());
            this._oDescripcionesCatalogo = new JSONModel({});
            this._oConsultasCatalogoPendientes = new Set();
            this.getView().setModel(this._oDescripcionesCatalogo, "descripcionesCatalogo");
            this._aInputsCatalogo = this.getView().findAggregatedObjects(true,
                (oControl) => oControl.isA("sap.m.Input") && oControl.data("campoSAP"));
            this._loadSections();
        },

        onExit: function () {
            Object.values(this._mCargasCuenta).forEach(this._cancelCuentaRead);
            this._oConsultasCatalogoPendientes.clear();
            this._updateGlobalBusy();
            this._oDescripcionesCatalogo.destroy();
            this._oCuentaModeloResult.destroy();
            this._oCuentaMayorOtrasOperaciones.destroy();
            Object.values(this._mCargasCuenta).forEach(({ model }) => model.destroy());
        },

        onOptionSelect: function (oEvent) {
            const oOptions = oEvent.getSource();
            const iNextOperation = oOptions.getSelectedIndex();
            if (iNextOperation === this._iCurrentOperation) {
                return;
            }

            if (this._iCurrentOperation === 0) {
                const aFields = this._getSectionFields(this._mModes[0].display);
                if (aFields.some((oField) => this._hasAltaFieldValue(oField))) {
                    oOptions.setSelectedIndex(this._iCurrentOperation);
                    const oBundle = this.getView().getModel("i18n").getResourceBundle();
                    const oMessage = new Text({
                        text: oBundle.getText("confirmLeaveAccountCreation")
                    }).addStyleClass("sapMMsgBoxText");
                    const oStay = new Button({
                        text: oBundle.getText("stayInAccountCreation"),
                        type: "Emphasized",
                        press: () => oDialog.close()
                    });
                    let bLeave = false;
                    const oLeave = new Button({
                        text: oBundle.getText("leaveAccountCreation"),
                        press: () => {
                            bLeave = true;
                            oDialog.close();
                        }
                    });
                    const oDialog = new Dialog({
                        type: "Message",
                        icon: "sap-icon://question-mark",
                        title: Core.getLibraryResourceBundle("sap.m").getText("MSGBOX_TITLE_CONFIRM"),
                        initialFocus: oStay,
                        content: oMessage,
                        buttons: [oStay, oLeave],
                        afterClose: () => {
                            oDialog.destroy();
                            if (bLeave) {
                                oOptions.setSelectedIndex(iNextOperation);
                                this._selectOperation(iNextOperation);
                            }
                        }
                    }).addStyleClass("sapMMessageBoxQuestion");
                    oDialog.setProperty("role", mobileLibrary.DialogRoleType.AlertDialog);
                    oDialog.addAriaLabelledBy(oMessage);
                    this.getView().addDependent(oDialog);
                    oDialog.open();
                    return;
                }
            }

            this._selectOperation(iNextOperation);
        },

        _selectOperation: function (iOperation) {
            this._finishModificationEdit();
            this._clearOperationData();
            this._iCurrentOperation = iOperation;
            this._bEditMode = false;
            this._showMode(iOperation, false);
        },

        _getSectionFields: function (aSections) {
            return aSections.flatMap((sSection) =>
                this._mSections[sSection].findAggregatedObjects(true, (oControl) =>
                    oControl.isA(["sap.m.InputBase", "sap.m.Select", "sap.m.CheckBox"])));
        },

        _hasAltaFieldValue: function (oField) {
            if (oField.isA("sap.m.CheckBox")) {
                return oField.getSelected();
            }
            if (oField.isA("sap.m.Select")) {
                return Boolean(oField.getSelectedKey().trim());
            }
            return Boolean((oField.getFocusDomRef()?.value ?? oField.getValue()).trim());
        },

        _clearOperationData: function () {
            Object.values(this._mCargasCuenta).forEach((oCarga) => {
                this._cancelCuentaRead(oCarga);
                oCarga.model.setData(this._mapCuentaModeloResponse());
            });
            this._oCuentaModeloResult.setData(null);
            this._oCuentaMayorOtrasOperaciones.setData(this._mapCuentaModeloResponse());
            this._oCatalogoInput = null;

            this._getSectionFields(Object.keys(this._mSections)).forEach((oField) => {
                if (oField.isA("sap.m.CheckBox")) {
                    oField.setSelected(false);
                } else if (oField.isA("sap.m.Select")) {
                    oField.setSelectedKey("");
                } else {
                    oField.setValue("");
                    if (oField.data("catalogo") && !oField.data("campoSAP")) {
                        oField.data("valorSeleccionado", "");
                        oField.data("descripcionSeleccionada", null);
                    }
                }
            });
            this._updateGlobalBusy();
        },

        onEditPress: function () {
            const bHasValidSelection = mSelectoresCuenta.display.every((sId) => {
                const oInput = this.byId(sId);
                const sValue = oInput.getValue();
                return Boolean(sValue.trim()) && sValue === oInput.data("descripcionSeleccionada") &&
                    Boolean(String(oInput.data("valorSeleccionado") ?? "").trim());
            });

            if (!bHasValidSelection) {
                const oBundle = this.getView().getModel("i18n").getResourceBundle();
                MessageBox.warning(oBundle.getText("editSelectionRequired"));
                return;
            }

            this._bEditMode = true;
            if (this._iCurrentOperation === 2) {
                this._startModificationEdit();
            }

            this._showMode(this._iCurrentOperation, this._bEditMode);
        },

        onSavePress: function () {
            this._exitEditMode();
        },

        onCancelPress: function () {
            this._exitEditMode();
        },

        _exitEditMode: function () {
            this._finishModificationEdit();
            this._bEditMode = false;
            this._showMode(this._iCurrentOperation, this._bEditMode);
        },

        getSAPUser: function () {
            const oSAPUserModel = this.getOwnerComponent()
                .getModel("SAPUser");

            if (!oSAPUserModel.getProperty("/loaded")) {
                console.warn("El usuario SAP todavía no está disponible.");
                return null;
            }

            return oSAPUserModel.getData();
        },

        onCatalogoValueHelp: async function (oEvent) {
            this._oCatalogoInput = oEvent.getSource();
            const sCatalogo = this._oCatalogoInput.data("catalogo");

            if (!this._pCatalogoDialog) {
                this._pCatalogoDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "zcuentasmayorgld.view.fragments.CatalogoValueHelp",
                    controller: this
                }).then((oDialog) => {
                    this.getView().addDependent(oDialog);
                    return oDialog;
                });
            }

            const oDialog = await this._pCatalogoDialog;
            this._sBusquedaCatalogo = "";
            oDialog.getBinding("items").filter([new Filter("Campo", FilterOperator.EQ, sCatalogo)]);
            oDialog.open();
        },

        onCatalogoSearch: function (oEvent) {
            const sValue = (oEvent.getParameter("value") ?? "").trim();
            const oBinding = oEvent.getParameter("itemsBinding");

            // Enter puede confirmar un término que liveChange ya aplicó.
            if (!oBinding || !this._oCatalogoInput || sValue === this._sBusquedaCatalogo) {
                return;
            }

            const sCatalogo = this._oCatalogoInput.data("catalogo");
            const oFiltroCatalogo = new Filter("Campo", FilterOperator.EQ, sCatalogo);
            const oFiltro = sValue ? new Filter({
                filters: [
                    oFiltroCatalogo,
                    new Filter({
                        filters: [
                            new Filter("Valor", FilterOperator.Contains, sValue),
                            new Filter("Descripcion", FilterOperator.Contains, sValue)
                        ],
                        and: false
                    })
                ],
                and: true
            }) : oFiltroCatalogo;

            oBinding.filter([oFiltro]);
            this._sBusquedaCatalogo = sValue;
        },

        onCatalogoConfirm: function (oEvent) {
            const oSelectedItem = oEvent.getParameter("selectedItem");

            if (!oSelectedItem) {
                return;
            }

            const oContext = oSelectedItem.getBindingContext("ZSERV_GLD_SHELP_SRV");

            if (!oContext) {
                return;
            }

            const oRegistro = oContext.getObject();
            const oInput = this._oCatalogoInput;
            if (oInput.data("campoSAP")) {
                this._cacheDescripcionesCatalogo([oRegistro]);
                this._setCampoCatalogo(oInput, oRegistro.Valor);
                return;
            }

            oInput.setValue(oRegistro.Descripcion?.trim() ? oRegistro.Descripcion : oRegistro.Valor);
            oInput.data("valorSeleccionado", oRegistro.Valor);
            oInput.data("descripcionSeleccionada", oInput.getValue());

            this._updateAccountForInput(oInput);
        },

        onEditSelectionLiveChange: function (oEvent) {
            const oInput = oEvent.getSource();
            oInput.data("valorSeleccionado", "");
            oInput.data("descripcionSeleccionada", null);
            this._updateAccountForInput(oInput);
        },

        _updateAccountForInput: function (oInput) {
            const sMode = this._bEditMode ? "change" : "display";
            if (mSelectoresCuenta.alta.some((sId) => this.byId(sId) === oInput)) {
                this._updateCuenta("alta");
            } else if (this._iCurrentOperation === 2 &&
                mSelectoresCuenta[sMode].some((sId) => this.byId(sId) === oInput)) {
                this._updateCuenta(sMode);
            }
        },

        _getSelection: function (sId) {
            const oInput = this.byId(sId);
            return {
                value: oInput.getValue(),
                key: oInput.data("valorSeleccionado"),
                description: oInput.data("descripcionSeleccionada")
            };
        },

        _setSelection: function (sId, oSelection) {
            const oInput = this.byId(sId);
            oInput.setValue(oSelection.value);
            oInput.data("valorSeleccionado", oSelection.key);
            oInput.data("descripcionSeleccionada", oSelection.description);
        },

        _startModificationEdit: function () {
            this._aPreviousChangeSelection = mSelectoresCuenta.change.map((sId) => this._getSelection(sId));
            mSelectoresCuenta.change.forEach((sId, iIndex) => {
                this._setSelection(sId, this._getSelection(mSelectoresCuenta.display[iIndex]));
            });

            const { display, change } = this._mCargasCuenta;
            if (display.read && !display.read.pending) {
                change.model.setData(this._mapCuentaModeloResponse(display.read.data));
                change.read = { ...display.read };
            } else {
                this._updateCuenta("change");
            }
        },

        _finishModificationEdit: function () {
            if (!this._aPreviousChangeSelection) {
                return;
            }

            this._cancelCuentaRead(this._mCargasCuenta.change);
            this._updateGlobalBusy();
            this._mCargasCuenta.change.model.setData(this._mapCuentaModeloResponse());
            mSelectoresCuenta.change.forEach((sId, iIndex) => {
                this._setSelection(sId, this._aPreviousChangeSelection[iIndex]);
            });
            this._aPreviousChangeSelection = null;
        },

        formatDescripcionCatalogo: function (sCodigo, mDescripciones) {
            return mDescripciones?.["#" + sCodigo] ?? "";
        },

        formatCatalogo: function (sCodigo, mDescripciones) {
            const sDescripcion = mDescripciones?.["#" + sCodigo];
            return sCodigo ? (sDescripcion || sCodigo) : "";
        },

        onCatalogoDataReceived: function (oEvent) {
            this._cacheDescripcionesCatalogo(oEvent.getParameter("data")?.results ?? []);
        },

        _cacheDescripcionesCatalogo: function (aRegistros) {
            const mCatalogos = this._oDescripcionesCatalogo.getData();
            const mActualizados = {};
            aRegistros.forEach(({ Campo, Valor, Descripcion }) => {
                if (!mActualizados[Campo]) {
                    mActualizados[Campo] = { ...mCatalogos[Campo] };
                }
                mActualizados[Campo]["#" + Valor] = Descripcion ?? "";
            });
            Object.entries(mActualizados).forEach(([sCatalogo, mDescripciones]) => {
                this._oDescripcionesCatalogo.setProperty("/" + sCatalogo, mDescripciones);
            });
        },

        onCampoCatalogoChange: function (oEvent) {
            const oInput = oEvent.getSource();
            const sCodigo = oEvent.getParameter("value");
            this._setCampoCatalogo(oInput, sCodigo);
            this._buscarDescripcionCatalogo(oInput.data("catalogo"), sCodigo);
        },

        _setCampoCatalogo: function (oInput, sCodigo) {
            const oModel = oInput.getModel("CuentaMayorData");
            const sCampo = oInput.data("campoSAP");
            oModel.setProperty("/clavesCatalogo/" + sCampo, sCodigo);
            oModel.setProperty("/" + sCampo, sCodigo);
            oInput.setValue(this.formatCatalogo(sCodigo,
                this._oDescripcionesCatalogo.getProperty("/" + oInput.data("catalogo"))));
        },

        _buscarDescripcionCatalogo: function (sCatalogo, sCodigo) {
            const sPath = "/" + sCatalogo;
            const sClave = sCatalogo + "/" + sCodigo;
            if (!sCodigo || Object.prototype.hasOwnProperty.call(this._oDescripcionesCatalogo.getProperty(sPath) ?? {}, "#" + sCodigo) ||
                this._oConsultasCatalogoPendientes.has(sClave)) {
                return;
            }

            this._oConsultasCatalogoPendientes.add(sClave);
            this._updateGlobalBusy();
            this.getOwnerComponent().getModel("ZSERV_GLD_SHELP_SRV").read("/InputSet", {
                filters: [new Filter({
                    filters: [
                        new Filter("Campo", FilterOperator.EQ, sCatalogo),
                        new Filter("Valor", FilterOperator.EQ, sCodigo)
                    ],
                    and: true
                })],
                success: (oData) => {
                    if (!this._oConsultasCatalogoPendientes.delete(sClave)) {
                        return;
                    }

                    const oRegistro = oData.results.find(({ Campo, Valor }) =>
                        Campo === sCatalogo && Valor === sCodigo);
                    if (oRegistro) {
                        this._cacheDescripcionesCatalogo([oRegistro]);
                    } else if (!Object.prototype.hasOwnProperty.call(this._oDescripcionesCatalogo.getProperty(sPath) ?? {}, "#" + sCodigo)) {
                        this._cacheDescripcionesCatalogo([{ Campo: sCatalogo, Valor: sCodigo }]);
                    }
                    this._updateGlobalBusy();
                },
                error: () => {
                    this._oConsultasCatalogoPendientes.delete(sClave);
                    this._updateGlobalBusy();
                }
            });
        },

        onCuentaModeloChange: function (oEvent) {
            const oInput = oEvent.getSource();
            if (oInput.getValue() !== oInput.data("descripcionSeleccionada")) {
                oInput.data("valorSeleccionado", "");
                oInput.data("descripcionSeleccionada", null);
            }
            this._updateCuenta("alta");
        },

        _getCuentaModeloInputValue: function (sId) {
            const oInput = this.byId(sId);
            const vValue = oInput.getValue();
            const sValue = String(vValue ?? "").trim();
            if (sValue && vValue === oInput.data("descripcionSeleccionada")) {
                return String(oInput.data("valorSeleccionado") ?? "").trim();
            }
            return sValue;
        },

        _updateGlobalBusy: function () {
            const bLoading = this._oConsultasCatalogoPendientes.size > 0 ||
                Object.values(this._mCargasCuenta).some(({ read }) => read?.pending);
            if (bLoading && !this._bGlobalBusy) {
                this._bGlobalBusy = true;
                BusyIndicator.show(0);
            } else if (!bLoading && this._bGlobalBusy) {
                this._bGlobalBusy = false;
                BusyIndicator.hide();
            }
        },

        _cancelCuentaRead: function (oCarga) {
            const oRead = oCarga.read;
            oCarga.read = null;
            oRead?.request?.abort();
        },

        _mapCuentaModeloResponse: function (oData) {
            const oCampos = { GVTYP: "", TXT20: "", TXT50: "", clavesCatalogo: {} };
            aCamposCatalogo.forEach((sCampo) => {
                oCampos[sCampo] = "";
                oCampos.clavesCatalogo[sCampo] = "";
            });
            aCamposBooleanos.forEach((sCampo) => {
                oCampos[sCampo] = false;
            });

            const aResults = oData?.results ?? oData?.d?.results ?? [];
            aResults.forEach(({ Valor: sCampo, Descripcion: vValor }) => {
                if (typeof oCampos[sCampo] === "boolean") {
                    oCampos[sCampo] = vValor === "X";
                } else if (typeof oCampos[sCampo] === "string") {
                    oCampos[sCampo] = String(vValor ?? "");
                    if (aCamposCatalogo.includes(sCampo)) {
                        oCampos.clavesCatalogo[sCampo] = oCampos[sCampo];
                    }
                }
            });
            return oCampos;
        },

        _updateCuenta: function (sMode) {
            const [sCuenta, sSociedad] = mSelectoresCuenta[sMode].map((sId) => {
                if (sMode === "alta") {
                    return this._getCuentaModeloInputValue(sId);
                }
                const { value, key, description } = this._getSelection(sId);
                return value === description ? String(key ?? "").trim() : "";
            });
            const oCarga = this._mCargasCuenta[sMode];
            const oPreviousRead = oCarga.read;

            if (oPreviousRead?.cuenta === sCuenta && oPreviousRead.sociedad === sSociedad) {
                return;
            }

            this._cancelCuentaRead(oCarga);
            if (sMode === "alta") {
                this._oCuentaModeloResult.setData(null);
            }
            oCarga.model.setData(this._mapCuentaModeloResponse());
            if (!sCuenta || !sSociedad) {
                this._updateGlobalBusy();
                return;
            }

            const oRead = { cuenta: sCuenta, sociedad: sSociedad, pending: true };
            oCarga.read = oRead;
            this._updateGlobalBusy();
            const oModel = this.getOwnerComponent().getModel("ZSERV_GLD_CTAGL_SRV");
            oRead.request = oModel.read("/InputSet", {
                filters: [new Filter({
                    filters: [
                        new Filter("Cuenta", FilterOperator.EQ, sCuenta),
                        new Filter("Sociedad", FilterOperator.EQ, sSociedad)
                    ],
                    and: true
                })],
                success: (oData) => {
                    if (oCarga.read !== oRead) {
                        return;
                    }

                    oRead.request = null;
                    oRead.pending = false;
                    oRead.data = oData;
                    if (sMode === "alta") {
                        this._oCuentaModeloResult.setData(oData);
                    }
                    const oCampos = this._mapCuentaModeloResponse(oData);
                    oCarga.model.setData(oCampos);
                    this._aInputsCatalogo.forEach((oInput) => {
                        this._buscarDescripcionCatalogo(oInput.data("catalogo"), oCampos[oInput.data("campoSAP")]);
                    });
                    if (sMode !== "alta") {
                        this._buscarDescripcionCatalogo("12", oCampos.GVTYP);
                    }
                    this._updateGlobalBusy();
                },
                error: (oError) => {
                    if (oCarga.read === oRead) {
                        oCarga.read = null;
                        this._updateGlobalBusy();
                        Log.error("Error al consultar la cuenta de mayor",
                            [oError.statusCode, oError.statusText, oError.message].filter(Boolean).join(" "),
                            "zcuentasmayorgld.controller.Main");
                    }
                }
            });
        },

        onCatalogoCancel: function () {
            this._oCatalogoInput = null;
        },

        _loadSections: function () {
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
                2: {
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
                3: {
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
                4: {
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

        _showMode: function (iOperation, bEditMode) {

            const oMode = this._mModes[iOperation];
            this.byId("inputCuentaMayor").setShowValueHelp(iOperation !== 0);

            Object.values(this._mSections).forEach(function (oSection) {
                oSection.setVisible(false);
            });

            const aSections = bEditMode
                ? (oMode?.edit ?? [])
                : (oMode?.display ?? []);

            const sDataMode = iOperation === 0 ? "alta" : (bEditMode ? "change" : "display");
            const oAccountModel = iOperation === 0 || iOperation === 2
                ? this._mCargasCuenta[sDataMode].model
                : this._oCuentaMayorOtrasOperaciones;
            this.getView().setModel(oAccountModel, "CuentaMayorData");

            aSections.forEach(function (sSection) {
                this._mSections[sSection].setVisible(true);
            }, this);

            const bDisplayMode = !bEditMode;
            this.byId("operationOptions").setEnabled(bDisplayMode);

            this._mButtons.edit.setVisible(Boolean(oMode?.editButton) && bDisplayMode);

            this._mButtons.create.setVisible(Boolean(oMode) && bDisplayMode);
            this._mButtons.save.setVisible(Boolean(oMode) && !bDisplayMode);
            this._mButtons.cancel.setVisible(Boolean(oMode) && !bDisplayMode);

            const bSociedadesEditable = iOperation === 4 && bEditMode;

            this._mButtons.addSociedad.setVisible(bSociedadesEditable);
            this._mButtons.deleteSociedad.setVisible(bSociedadesEditable);

        }
    });
});
