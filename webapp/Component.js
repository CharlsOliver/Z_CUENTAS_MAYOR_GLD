
sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel",
    "zcuentasmayorgld/model/models",
    "zcuentasmayorgld/service/UserService"
], function (UIComponent, JSONModel, models, UserService) {
    "use strict";

    return UIComponent.extend("zcuentasmayorgld.Component", {
        metadata: {
            manifest: "json"
        },

        init: function () {
            UIComponent.prototype.init.apply(this, arguments);

            // Modelo de dispositivo
            this.setModel(models.createDeviceModel(), "device");

            // Modelo global del usuario SAP
            const oSAPUserModel = new JSONModel({
                id: "",
                firstName: "",
                lastName: "",
                fullName: "",
                client: "",
                system: "",
                loaded: false,
                error: ""
            });

            this.setModel(oSAPUserModel, "SAPUser");

            // Inicializar navegación
            this.getRouter().initialize();

            // Recuperar usuario SAP autenticado
            this._loadSAPUser();
        },

        _loadSAPUser: async function () {
            const oSAPUserModel = this.getModel("SAPUser");

            try {
                const oUser = await UserService.getCurrentUser();

                oSAPUserModel.setData({
                    id: oUser.id || "",
                    firstName: oUser.firstName || "",
                    lastName: oUser.lastName || "",
                    fullName: oUser.fullName || "",
                    client: oUser.client || "",
                    system: oUser.system || "",
                    loaded: true,
                    error: ""
                });

                console.log(
                    "Usuario SAP autenticado:",
                    oUser.id
                );

            } catch (oError) {
                console.error(
                    "Error al recuperar usuario SAP:",
                    oError
                );

                oSAPUserModel.setProperty("loaded", false);
                oSAPUserModel.setProperty(
                    "/error",
                    oError.message
                );
            }
        }
    });
});
