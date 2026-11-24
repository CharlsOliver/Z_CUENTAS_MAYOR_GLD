
sap.ui.define([], function () {
    "use strict";

    let oUserPromise = null;

    async function getCurrentUser() {
        if (!oUserPromise) {
            oUserPromise = fetch("/sap/bc/ui2/start_up", {
                method: "GET",
                credentials: "same-origin",
                headers: {
                    Accept: "application/json"
                }
            })
                .then(async function (oResponse) {
                    if (!oResponse.ok) {
                        throw new Error(
                            `Error HTTP ${oResponse.status} al recuperar el usuario SAP`
                        );
                    }

                    const oData = await oResponse.json();

                    if (!oData.id) {
                        throw new Error(
                            "SAP Gateway no devolvió un identificador de usuario válido."
                        );
                    }

                    return oData;
                })
                .catch(function (oError) {
                    oUserPromise = null;
                    throw oError;
                });
        }

        return oUserPromise;
    }

    return {
        getCurrentUser: getCurrentUser,

        getUserId: async function () {
            const oUser = await getCurrentUser();
            return oUser.id;
        },

        clearCache: function () {
            oUserPromise = null;
        }
    };
});