# Gestión de Cuentas de Mayor

Aplicación SAPUI5 para alta, modificación, bloqueo y extensión de cuentas de mayor. El namespace es `zcuentasmayorgld` y el repositorio BSP es `ZCUENTAS_GLD`.

## Desarrollo local

Usa una versión de Node.js compatible con UI5 CLI 4 (`^20.11.0 || >=22.0.0`).

```sh
npm ci
npm start
```

El servidor local sirve `/resources` desde `/sap/public/bc/ui5_ui5/resources` del Gateway. El core, `sap.m` y `sap.ui.layout` de ese Gateway son 1.71.16. Su distribución ABAP se identifica como 1.71.19 y contiene `sap.ushell` 1.71.17. El proxy también envía las peticiones de la aplicación al mandante 100. Se requiere conectividad con Gateway. Para comprobar el core en el navegador, consulta `sap.ui.version` después de cargar la aplicación.

El paquete de distribución SAPUI5 1.71.16 no está publicado en npm y el CDN oficial devuelve 404 para ese parche. UI5 CLI compila los recursos propios de la aplicación y el servidor de desarrollo obtiene el runtime de Gateway. El build se puede ejecutar sin acceso a Gateway después de instalar las dependencias.

`npm start` y `npm run start-local` abren la aplicación standalone. El sandbox `test/flpSandbox.html#zcuentasmayorgld-display` requiere los `/test-resources` de un SDK SAPUI5 compatible. Gateway devuelve 404 para el bootstrap de ese sandbox. Si dispones de esos archivos, puedes montarlos en `/test-resources` con `fiori-tools-servestatic` en una configuración local. Las suites usan `npm run unit-tests` y `npm run int-tests`.

## Build y carga manual

```sh
npm run build
```

El build omite `enhanceManifest` para conservar `sap.app.i18n` como cadena antes de generar `Component-preload.js`. Al final verifica que ambos descriptores coincidan y que los bundles base, español e inglés estén en el artefacto.

Desde la raíz del proyecto y con la autenticación de SAP configurada fuera del repositorio, ejecuta `npx nwabap upload` para cargar el `dist` verificado al BSP `ZCUENTAS_GLD`. Después recalcula el Application Index de ese BSP con `/UI5/APP_INDEX_CALCULATE` y abre `#ZAPP_CUENTAS_GLD-display` en el Launchpad del mandante 100. Comprueba que cargue la vista inicial y que puedas abrir la ayuda de valores en una sesión con acceso a los servicios OData.

## Datos de generación
|               |
| ------------- |
|**Generation Date and Time**<br>Tue Aug 04 2026 10:50:48 GMT-0600 (hora estándar central)|
|**App Generator**<br>@sap/generator-fiori-freestyle|
|**App Generator Version**<br>1.16.5|
|**Generation Platform**<br>Visual Studio Code|
|**Template Used**<br>simple|
|**Service Type**<br>None|
|**Service URL**<br>N/A|
|**Module Name**<br>z_cuentas_mayor_gld|
|**Application Title**<br>Gestión de Cuentas de Mayor|
|**Namespace**<br>|
|**Generated UI5 Theme**<br>sap_horizon|
|**Generated UI5 Version**<br>1.150.1|
|**Enable Code Assist Libraries**<br>False|
|**Enable TypeScript**<br>False|
|**Add Eslint configuration**<br>False|
