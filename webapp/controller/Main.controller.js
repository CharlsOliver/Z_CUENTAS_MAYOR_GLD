sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel",
    "sap/base/Log"
], (Controller, Fragment, Filter, FilterOperator, JSONModel, Log) => {
    "use strict";

    const aCamposCatalogo = [
        "KTOKS", "VBUND", "BILKT", "WAERS", "MWSKZ", "MITKZ", "ZUAWA",
        "FSTAG", "FDLEV", "FIPOS", "HBKID", "HKTID"
    ];
    const aCamposBooleanos = ["XSALH", "XOPVW", "XKRES", "XINTB", "XMWNO"];

    return Controller.extend("zcuentasmayorgld.controller.Main", {
        onInit: function () {
            this._oCuentaModeloResult = new JSONModel(null);
            this.getView().setModel(this._oCuentaModeloResult, "cuentaModeloResultado");
            this._oCuentaMayorAlta = new JSONModel(this._mapCuentaModeloResponse());
            this._oCuentaMayorEdicion = new JSONModel(this._mapCuentaModeloResponse());
            this._oDescripcionesCatalogo = new JSONModel({});
            this._oConsultasCatalogoPendientes = new Set();
            this.getView().setModel(this._oDescripcionesCatalogo, "descripcionesCatalogo");
            this._aInputsCatalogo = this.getView().findAggregatedObjects(true,
                (oControl) => oControl.isA("sap.m.Input") && oControl.data("campoSAP"));
            this._loadSections();
        },

        onExit: function () {
            this._cancelCuentaModeloRead();
            this._oConsultasCatalogoPendientes.clear();
            this._oDescripcionesCatalogo.destroy();
            this._oCuentaModeloResult.destroy();
            this._oCuentaMayorAlta.destroy();
            this._oCuentaMayorEdicion.destroy();
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

        onSavePress: function () {
            this._exitEditMode();
        },

        onCancelPress: function () {
            this._exitEditMode();
        },

        _exitEditMode: function () {
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
                    oDialog.setSearchPlaceholder?.("Buscar");
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

            this._oCatalogoInput.setValue(oRegistro.Descripcion);
            this._oCatalogoInput.data("valorSeleccionado", oRegistro.Valor);

            if (this._oCatalogoInput === this.byId("inputCuentaMayorModelo") ||
                this._oCatalogoInput === this.byId("inputSociedadModelo")) {
                this._oCatalogoInput.data("descripcionSeleccionada", this._oCatalogoInput.getValue());
                this._updateCuentaModelo();
            }
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
            if (!sCodigo || Object.hasOwn(this._oDescripcionesCatalogo.getProperty(sPath) ?? {}, "#" + sCodigo) ||
                this._oConsultasCatalogoPendientes.has(sClave)) {
                return;
            }

            this._oConsultasCatalogoPendientes.add(sClave);
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
                    } else if (!Object.hasOwn(this._oDescripcionesCatalogo.getProperty(sPath) ?? {}, "#" + sCodigo)) {
                        this._cacheDescripcionesCatalogo([{ Campo: sCatalogo, Valor: sCodigo }]);
                    }
                },
                error: () => this._oConsultasCatalogoPendientes.delete(sClave)
            });
        },

        onCuentaModeloChange: function (oEvent) {
            const oInput = oEvent.getSource();
            if (oInput.getValue() !== oInput.data("descripcionSeleccionada")) {
                oInput.data("valorSeleccionado", "");
                oInput.data("descripcionSeleccionada", null);
            }
            this._updateCuentaModelo();
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

        _cancelCuentaModeloRead: function () {
            const oPreviousRead = this._oCuentaModeloRead;
            this._oCuentaModeloRead = null;
            if (oPreviousRead?.request) {
                oPreviousRead.request.abort();
            }
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

        _updateCuentaModelo: function () {
            const sCuenta = this._getCuentaModeloInputValue("inputCuentaMayorModelo");
            const sSociedad = this._getCuentaModeloInputValue("inputSociedadModelo");
            const oPreviousRead = this._oCuentaModeloRead;

            if (oPreviousRead?.cuenta === sCuenta && oPreviousRead.sociedad === sSociedad) {
                return;
            }

            this._cancelCuentaModeloRead();
            this._oCuentaModeloResult.setData(null);
            this._oCuentaMayorAlta.setData(this._mapCuentaModeloResponse());
            if (!sCuenta || !sSociedad) {
                return;
            }

            const oRead = { cuenta: sCuenta, sociedad: sSociedad };
            this._oCuentaModeloRead = oRead;
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
                    if (this._oCuentaModeloRead === oRead) {
                        oRead.request = null;
                        this._oCuentaModeloResult.setData(oData);
                        const oCampos = this._mapCuentaModeloResponse(oData);
                        this._oCuentaMayorAlta.setData(oCampos);
                        this._aInputsCatalogo.forEach((oInput) => {
                            this._buscarDescripcionCatalogo(oInput.data("catalogo"), oCampos[oInput.data("campoSAP")]);
                        });
                    }
                },
                error: (oError) => {
                    if (this._oCuentaModeloRead === oRead) {
                        this._oCuentaModeloRead = null;
                        Log.error("Error al consultar la cuenta de mayor modelo",
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

            this.getView().setModel(
                aSections.includes("modeloCuenta") ? this._oCuentaMayorAlta : this._oCuentaMayorEdicion,
                "CuentaMayorData"
            );

            aSections.forEach(function (sSection) {
                this._mSections[sSection].setVisible(true);
            }, this);

            const bDisplayMode = !bEditMode;

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
