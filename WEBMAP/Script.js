var mapMain,taskLocator;
var TablaPuntos;
// Comienza el require, aqui añadimos todos los modulos tanto de esri como dijit y dojo que posterior mente utilizamos en la app
require([
        "esri/map",
        "esri/layers/FeatureLayer",
        "esri/graphic",
        "esri/tasks/locator",
        "esri/tasks/query",
        
        "esri/toolbars/draw",
        "esri/dijit/Popup", 
        "esri/dijit/PopupTemplate",
        "dojo/dom-class", 
        "dojo/dom-construct",

        "esri/symbols/FillSymbol",
        "esri/symbols/SimpleLineSymbol",
        "esri/symbols/SimpleFillSymbol",

        "esri/symbols/SimpleMarkerSymbol",
        "esri/symbols/TextSymbol",
        "esri/symbols/Font",

        "dojo/_base/Color",
        "dojo/_base/array",

        "dgrid/OnDemandGrid",
        "dgrid/Selection",
        "dijit/form/Button",

        "dojo/dom",
        "dojo/on",
        "dojo/parser",
        "dojo/ready",
        "dojo/_base/declare",

        "dijit/layout/BorderContainer",
        "dijit/layout/ContentPane",
    
        "dojo/store/Memory",
        "esri/dijit/Measurement",
        
        "esri/tasks/GeometryService",
        "esri/tasks/BufferParameters",
        
    
    ],
    function (Map, FeatureLayer,Graphic, Locator,Query,
              Draw,Popup,PopupTemplate,domClass, domConstruct,
              FillSymbol,SimpleLineSymbol,SimpleFillSymbol,
              SimpleMarkerSymbol, TextSymbol, Font,
              Color, array,
              Grid,Selection,Button,
              dom, on, parser, ready,declare,
              BorderContainer, ContentPane,
              Memory,Measurement,
              GeometryService,BufferParameters,
              ) {
// @formatter:on

        // Wait until DOM is ready *and* all outstanding require() calls have been resolved
        ready(function () {

            var taskLocator, TablaPuntos;
            var symbol, tbDraw;

            // Parse DOM nodes decorated with the data-dojo-type attribute
            parser.parse();

            // Crear el mapa con su pop up asociado
            mapMain = new Map("cpCenter", {
                basemap: "dark-gray",
                center: [2.19, 41.55],
                zoom: 9,
                infoWindow: popup
            });

            //selecion de los campos utiles de la feature layer que cargamos despues
            var CamposEV = ["OBJECTID", "Disponible", "TipoConector", "OperadorPromotor","EnFuncionamiento",];


            //Creacion de simbologias para el proyecto
            var fillSymbol = new FillSymbol(new SimpleLineSymbol(
                SimpleLineSymbol.STYLE_SOLID,));
                fillSymbol.setColor(new Color([255,255,0,0.5]))
            ///// CONFIGURACION DEL POP UP ANTES DE AÑADIR LA CAPA AL MAPA/////
            
            
            var symbolSelected = new SimpleMarkerSymbol({
                "type": "esriSMS",
                "style": "esriSMSSquare",
                "color": [100, 0, 100, 128],
                "size": 6,
                "outline": {
                    "color": [255, 0, 200, 214],
                    "width": 1
                }
            }); 
            var popup = new Popup({
                fillSymbol: symbolSelected,
                titleInBody: false
            }, domConstruct.create("div"));
            //Add the dark theme which is customized further in the <style> tag at the top of this page
            domClass.add(popup.domNode, "dark");

           // aqui viene el template lo que sera la base del popup, tanto el formato como el contenido

            var template = new PopupTemplate({
                title: "Punto de Recarga para VE",
                description: "Conector de tipo:  {TipoConector}, {EnFuncionamiento} se encuentra actualmente en funcionamiento y {Disponible} está disponible. Su promotor actual es {OperadorPromotor}",
                fieldInfos: [{ //define field infos so we can specify an alias
                fieldName: "PotenciaConector",
                label: "Potencia"
                },
                {
                fieldName: "NumeroPuestos",
                label: "Enchufes por cargador"
                }],
                mediaInfos:[{ //define the bar chart
                caption: "",
                type:"barchart",
                value:{
                    theme: "Dollar",
                    fields:["PotenciaConector","TipoVelocidad","NumeroPuestos"]
                }
                }]
            });

            // se añade la capa de residencias de catalunya sin visibilidad para posibles estudios
            var featureLayerResidencias = new FeatureLayer ("https://services1.arcgis.com/nCKYwcSONQTkPA4K/ArcGIS/rest/services/ResidenciasCatalu%c3%b1a/FeatureServer/0",)
            featureLayerResidencias.setVisibility(false)
            mapMain.addLayer(featureLayerResidencias)
            /* añadimos capa de cargadores de vehiculos electricos*/
            var featureLayerPV = new FeatureLayer("https://services8.arcgis.com/BtkRLT3YBKaVGV3g/ArcGIS/rest/services/Puntos_recarga/FeatureServer/0", {
                outFields: CamposEV,
                mode: FeatureLayer.MODE_ONDEMAND,
                outFields: ["*"],
                infoTemplate: template
                }); 
            mapMain.addLayer(featureLayerPV)

            /// aqui el grid del resultado de la seleccion
            var TablaPuntos = new (declare([Grid, Selection]))({
                bufferRows: Infinity,
                columns: {
                    OBJECTID: "ID",
                    Disponible:"Disponible",
                    TipoConector: "Conector",
                    EnFuncionamiento: "Funcionamiento",
                    OperadorPromotor:"Operador/Promotor",
                }
            }, "divGrid");
            // /// widget de Medir distancias
            // var measurement = new Measurement({
            //     map: mapMain
            //   }, dom.byId("measurementDiv"));
            //   measurement.startup();
            
            
            
            // INICAR LA FUNCION PARA DIBUJAR 

            mapMain.on("load", function () {
                var BOTON = new Button({
                    label: "Seleccionar con Poligono",
                    onClick: initDrawTool,
                    
                }, "progButtonNode");});
                
            mapMain.on("load", function () {
                    var BOTON = new Button({
                        label: "Selecionar con Buffer",
                        onClick: initDrawTool2
                        
                    }, "progButtonNode2");});

             mapMain.on("load", function () {
                    var BOTON = new Button({
                        label: "Borrar Selección",
                        onClick: limpiar
                        
                    }, "progButtonNode3");});

            // funcion para hacer un bufer/////
            var tbDraw2;
            // funcion para diubjar
            function initDrawTool2() {
                /*
                 * Step: Implement the Draw toolbar
                 */
                tbDraw2 = new Draw(mapMain);
                tbDraw2.on("draw-complete", doBuffer); 
                
                tbDraw2.activate(Draw.POINT);
                featureLayerPV.clearSelection();
                mapMain.graphics.clear();
                console.log("draw")
                
            }
           
            // funcion doBuffer
            function doBuffer(evtObj) {
            //las variables son
            tbDraw2.deactivate();
            console.log("doBuffer")
            var geometry = evtObj.geometry
            var geomService = new GeometryService("https://utility.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer");
            var bufferParams = new BufferParameters(); 
            bufferParams.distances = [5];
            bufferParams.unit = GeometryService.UNIT_KILOMETER;
            bufferParams.geometries = [geometry]
            bufferParams.outSpatialReference = mapMain.spatialReference
            // La funcion es 
            var buffer = geomService.buffer(bufferParams);
            geomService.on('buffer-complete', showBuffer );
            console.log(buffer)

            // las geomterias que cogera el buffer para pintarlo bufferedGeometries
            }
            // La funcion showBuffer:
            function showBuffer(bufferedGeometries) {
                console.log("showBuffer")
                console.log(bufferedGeometries)
                
      
                array.forEach(bufferedGeometries.geometries, function(geometry) {
                  var graphic = new Graphic(geometry, fillSymbol);
                  mapMain.graphics.add(graphic);
                  var geometria = bufferedGeometries.geometries[0]
                  console.log(geometria)
                  selectEV(geometria);
                
                });
                
                
                
              }
              


            /// funcion limpriar
            function limpiar() {
                mapMain.graphics.clear();
                featureLayerPV.clearSelection();

            }
        

            var tbDraw;
            // funcion para diubjar
            function initDrawTool() {
                /*
                 * Step: Implement the Draw toolbar
                 */
                tbDraw = new Draw(mapMain);
                tbDraw.on("draw-complete", addGraphic);
                tbDraw.activate(Draw.POLYGON);
                featureLayerPV.clearSelection();
                mapMain.graphics.clear();
                
            }
            // funcion para añadir los graficos
            function addGraphic(evt) {
               mapMain.graphics.clear();
               var nuevoGraphic = new Graphic(evt.geometry,fillSymbol);
               var geometria = evt.geometry
               tbDraw.deactivate();
               
               mapMain.graphics.add(nuevoGraphic);
               selectEV(geometria);
                
              }
              //funcion para seleccionar los elementos de featureLayer
              function selectEV(geometria) {

                // Define symbol for selected features (using JSON syntax for improved readability!) este formato json es compatible con
                var symbolSelected = new SimpleMarkerSymbol({
                    "type": "esriSMS",
                    "style": "esriSMSSquare",
                    "color": [100, 0, 100, 128],
                    "size": 6,
                    "outline": {
                        "color": [255, 0, 200, 214],
                        "width": 1
                    }
                }); 
                // ESTABLECER SIMBOLOGIA
                featureLayerPV.setSelectionSymbol(symbolSelected);
                // INICIAR LA QUERY
                var queryQuakes = new Query();
                queryQuakes.geometry = geometria;

                ///ahora cuando se realice la seleccion la siguiente formula se inicia 

                featureLayerPV.on("selection-complete", GenerarTabla);

                //Realizar seleccion
                

                featureLayerPV.selectFeatures(queryQuakes, FeatureLayer.SELECTION_NEW);
            }
            // Funcion para definir los parametros en una tabla, 
            function GenerarTabla(results) {
                
                
                

                DataEV = array.map(results.features, function (feature) {
                    return {
                            ///aqui se referencian los campos
                        "OBJECTID": feature.attributes[CamposEV[0]],
                        "Disponible": feature.attributes[CamposEV[1]],
                        "TipoConector": feature.attributes[CamposEV[2]],
                        "OperadorPromotor": feature.attributes[CamposEV[3]],
                        "EnFuncionamiento":feature.attributes[CamposEV[4]]
                    }
                });

                // Pass the data to the grid a traves de Memory con lo que almacena los datos
                var memStore = new Memory({
                    data: DataEV
                });
                TablaPuntos.set("store", memStore);
            }
            
                
            
            ///// AQUI EMPIEZA EL LOCATOR/////

            //construir el locator
            taskLocator = new Locator("http://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer");

            
            on(dom.byId("btnLocate"),"click", doAddressToLocations);

            taskLocator.on("address-to-locations-complete",showResults);// evento de la api.

            // funcion address to location definida con los parametros
            function doAddressToLocations() {
                mapMain.graphics.clear();
                

                var objAddress = {
                    "SingleLine" : dom.byId("taAddress").value
                  };
                var params = {
                    address: objAddress,
                    outFields:['Loc_name']
                };

                taskLocator.addressToLocations(params);

            }
            

            function showResults(candidates) {// pinta un punto
                // Define the symbology used to display the results
                
                var symbolMarker = new SimpleMarkerSymbol();
                symbolMarker.setStyle(SimpleMarkerSymbol.STYLE_CROSS);
                
                symbolMarker.setSize(30)
                symbolMarker.setColor(new Color([0, 0,0, 0.75]));
                var font = new Font("14pt", Font.STYLE_BOLD, Font.VARIANT_NORMAL, "Arial");

                // loop through the array of AddressCandidate objects
                var geometryLocation;
                array.every(candidates.addresses, function (candidate) {
                    
                    // if the candidate was a good match
                    if (candidate.score > 80) {
                        

                        // retrieve attribute info from the candidate
                        var attributesCandidate = {
                            address: candidate.address,
                            score: candidate.score,
                            locatorName: candidate.attributes.Loc_name
                        };

                        /*Step: Retrieve the result's geometry*/
                            geometryLocation = candidate.location;


                          
                        /* Step: Display the geocoded location on the map
                        */
                        var graphicResult = new Graphic(geometryLocation, symbolMarker, attributesCandidate);
                        mapMain.graphics.add(graphicResult);


                        // display the candidate's address as text
                        var sAddress = candidate.address;
                        var textSymbol = new TextSymbol(sAddress, font, new Color("#000000 "));
                        textSymbol.setOffset(0, -40);
                        mapMain.graphics.add(new Graphic(geometryLocation, textSymbol));

                        // exit the loop after displaying the first good match
                        return false;
                    }
                });

                // Center and zoom the map on the result
                if (geometryLocation !== undefined) {
                    mapMain.centerAndZoom(geometryLocation, 15);
                }
            }

        });
        
    
    });