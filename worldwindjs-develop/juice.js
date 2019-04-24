requirejs(["./src/WorldWind"],  function(WorldWind) {
    "use strict";

    // Set the Bing API key for Bing Maps
    // Without your own key you will be using a limited WorldWind developer's key.
    // See: https://www.bingmapsportal.com/ to register for your own key and then enter it below:
    const BING_API_KEY = "";
    if (BING_API_KEY) {
        // Initialize WorldWind properties before creating the first WorldWindow
        WorldWind.BingMapsKey = BING_API_KEY;
        console.log("Laurance Peng Rouchen 阿嬤阿嬤");
    } else {
        //console.error("app.js: A Bing API key is required to use the Bing maps in production. Get your API key at https://www.bingmapsportal.com/");
        console.log("Ian Liu 以恆 阿嬤阿嬤")
    }

    /**
     * The Globe encapsulates the WorldWindow object (wwd) and provides application
     * specific logic for interacting with layers.
     * @param {String} canvasId The ID of the canvas element that will host the globe
     * @returns {Globe}
     */
    class Globe {
        constructor(canvasId) {
            // Create a WorldWindow globe on the specified HTML5 canvas
            this.wwd = new WorldWind.WorldWindow(canvasId);

            // Holds the next unique id to be assigned to a layer
            this.nextLayerId = 1;

            // Holds a map of category and observable timestamp pairs
            this.categoryTimestamps = new Map();
            // Add a BMNGOneImageLayer background layer. We're overriding the default
            // minimum altitude of the BMNGOneImageLayer so this layer always available.
            this.addLayer(new WorldWind.BMNGOneImageLayer(), {
                category: "background",
                minActiveAltitude: 0
            });

        }

        /**
         * Returns an observable containing the last update timestamp for the category.
         * @param {String} category
         * @returns {Observable}
         */

        getCategoryTimestamp(category) {
            if (!this.categoryTimestamps.has(category)) {
                this.categoryTimestamps.set(category, ko.observable());
            }
            return this.categoryTimestamps.get(category);
        }

        /**
         * Updates the timestamp for the given category.
         * @param {String} category
         */
        updateCategoryTimestamp(category) {
            let timestamp = this.getCategoryTimestamp(category);
            timestamp(new Date());
        }

        /**
         * Toggles the enabled state of the given layer and updates the layer
         * catetory timestamp. Applies a rule to the 'base' layers the ensures
         * only one base layer is enabled.
         * @param {WorldWind.Layer} layer
         */
        toggleLayer(layer) {

            // Multiplicity Rule: only [0..1] "base" layers can be enabled at a time
            if (layer.category === 'base') {
                this.wwd.layers.forEach(function (item) {
                    if (item.category === 'base' && item !== layer) {
                        item.enabled = false;
                    }
                });
            }
            // Toggle the selected layer's visibility
            layer.enabled = !layer.enabled;
            // Trigger a redraw so the globe shows the new layer state ASAP
            this.wwd.redraw();

            // Signal a change in the category
            this.updateCategoryTimestamp(layer.category);
        }



        /**
         * Returns a new array of layers in the given category.
         * @param {String} category E.g., "base", "overlay" or "setting".
         * @returns {Array}
         */
        getLayers(category) {
            return this.wwd.layers.filter(layer => layer.category === category);
        }

        /**
         * Adds a layer to the globe. Applies the optional options' properties to the
         * layer, and assigns the layer a unique ID and category.
         * @param {WorldWind.Layer} layer
         * @param {Object|null} options E.g., {category: "base", enabled: true}
         */
        addLayer(layer, options) {
            // Copy all properties defined on the options object to the layer
            if (options) {
                for (let prop in options) {
                    if (!options.hasOwnProperty(prop)) {
                        continue; // skip inherited props
                    }
                    layer[prop] = options[prop];
                }
            }
            // Assign a default category property if not already assigned
            if (typeof layer.category === 'undefined') {
                layer.category = 'overlay'; // the default category
            }

            // Assign a unique layer ID to ease layer management
            layer.uniqueId = this.nextLayerId++;

            // Add the layer to the globe
            this.wwd.addLayer(layer);

            // Signal that this layer category has changed
            this.getCategoryTimestamp(layer.category);

        }








    }

    /**
     * View model for the layers panel.
     * @param {Globe} globe - Our globe object
     */
    function LayersViewModel(globe) {
        var self = this;
        self.baseLayers = ko.observableArray(globe.getLayers('base').reverse());
        self.overlayLayers = ko.observableArray(globe.getLayers('overlay').reverse());

        // Update the view model whenever the model changes
        globe.getCategoryTimestamp('base').subscribe(newValue =>
            self.loadLayers(globe.getLayers('base'), self.baseLayers));

        globe.getCategoryTimestamp('overlay').subscribe(newValue =>
            self.loadLayers(globe.getLayers('overlay'), self.overlayLayers));

        // Utility to load the layers in reverse order to show last rendered on top
        self.loadLayers = function(layers, observableArray) {
            observableArray.removeAll();
            layers.reverse().forEach(layer => observableArray.push(layer));
        };

        // Click event handler for the layer panel's buttons
        self.toggleLayer = function(layer) {
            globe.toggleLayer(layer);
        };


    }

    /**
     * View model for the settings.
     * @param {Globe} globe - Our globe object (not a WorldWind.Globe)
     */
    function SettingsViewModel(globe) {
        var self = this;
        self.settingLayers = ko.observableArray(globe.getLayers('setting').reverse());

        // Update the view model whenever the model changes
        globe.getCategoryTimestamp('setting').subscribe(newValue =>
            self.loadLayers(globe.getLayers('setting'), self.settingLayers));

        // Utility to load layers in reverse order
        self.loadLayers = function(layers, observableArray) {
            observableArray.removeAll();
            layers.reverse().forEach(layer => observableArray.push(layer));
        };

        // Click event handler for the setting panel's buttons
        self.toggleLayer = function(layer) {
            globe.toggleLayer(layer);
        };
    }



    // Create a globe
    let globe = new Globe("globe-canvas");
    // Add layers to the globe
    // Add layers ordered by drawing order: first to last
    globe.addLayer(new WorldWind.BMNGLayer(), {
        category: "base",
        enabled: false,
    });
    globe.addLayer(new WorldWind.BMNGLandsatLayer(), {
        category: "base",
        enabled: false
    });
    globe.addLayer(new WorldWind.BingAerialLayer(), {
        category: "base",
        enabled: true
    });
    globe.addLayer(new WorldWind.BingAerialWithLabelsLayer(), {
        category: "base",
        enabled: false,
        detailControl: 1.5
    });
    globe.addLayer(new WorldWind.BingRoadsLayer(), {
        category: "overlay",
        enabled: false,
        detailControl: 1.5,
        opacity: 0.75
    });
    globe.addLayer(new WorldWind.CoordinatesDisplayLayer(globe.wwd), {
        category: "setting",
        enabled: false,
    });
    globe.addLayer(new WorldWind.ViewControlsLayer(globe.wwd), {
        category: "setting",
        enabled: false,
    });
    globe.addLayer(new WorldWind.CompassLayer(), {
        category: "setting",
        enabled: false
    });
    // globe.addLayer(new WorldWind.StarFieldLayer(), {
    //     category: "setting",
    //     enabled: true,
    //     displayName: "Stars"
    // });
    globe.addLayer(new WorldWind.AtmosphereLayer(), {
        category: "setting",
        enabled: true,
        time: null // new Date()
    });





    ////////////////////////
    //                    //
    //                    //
    //                    //
    //                    //
    //                    //
    //                    //
    //                    //
    //                    //
    //                    //
    //                    //
    //                    //
    //                    //
    ////////////////////////

    var highlightedItems = [];

    // //The common pick-handling function.
    // var handlePick = function (o) {
    //     // The input argument is either an Event or a TapRecognizer. Both have the same properties for determining
    //     // the mouse or tap location.
    //     var x = o.clientX,
    //         y = o.clientY;
    //
    //     var redrawRequired = highlightedItems.length > 0; // must redraw if we de-highlight previously picked items
    //
    //     // De-highlight any previously highlighted placemarks.
    //     for (var h = 0; h < highlightedItems.length; h++) {
    //         highlightedItems[h].highlighted = false;
    //     }
    //     highlightedItems = [];
    //
    //
    //     // Perform the pick. Must first convert from window coordinates to canvas coordinates, which are
    //     // relative to the upper left corner of the canvas rather than the upper left corner of the page.
    //     var pickList = globe.wwd.pick(globe.wwd.canvasCoordinates(x, y));
    //     if (pickList.objects.length > 0) {
    //         redrawRequired = true;
    //     }
    //
    //     // Highlight the items picked by simply setting their highlight flag to true.
    //     if (pickList.objects.length > 0) {
    //         for (var p = 0; p < pickList.objects.length; p++) {
    //             pickList.objects[p].userObject.highlighted = true;
    //
    //             // Keep track of highlighted items in order to de-highlight them later.
    //             highlightedItems.push(pickList.objects[p].userObject);
    //             // Detect whether the placemark's label was picked. If so, the "labelPicked" property is true.
    //             // If instead the user picked the placemark's image, the "labelPicked" property is false.
    //             // Applications might use this information to determine whether the user wants to edit the label
    //             // or is merely picking the placemark as a whole.
    //             if (pickList.objects[p].labelPicked) {
    //                 console.log("Label picked");
    //             }
    //         }
    //     }
    //
    //     // Update the window if we changed anything.
    //     if (redrawRequired) {
    //         globe.wwd.redraw(); // redraw to make the highlighting changes take effect on the screen
    //     }
    //
    // };
    //
    // //Listen for mouse moves and highlight the placemarks that the cursor rolls over.
    // globe.wwd.addEventListener("mousemove", handlePick);

    //https://worldwind.arc.nasa.gov/web/get-started/#anchor
    //create layer
    var placemarkCLayer = new WorldWind.RenderableLayer("∞∞∞∞∞∞∞∞∞∞∞");

    // Set up the common placemark attributes.
    var placemarkCAttributes = new WorldWind.PlacemarkAttributes(null);
    placemarkCAttributes.imageScale =0.1;
    placemarkCAttributes.imageOffset = new WorldWind.Offset(
        WorldWind.OFFSET_FRACTION, 0.0,
        WorldWind.OFFSET_FRACTION, 0.0);
    placemarkCAttributes.imageColor = WorldWind.Color.WHITE;//BLUE;
    placemarkCAttributes.labelAttributes.color = WorldWind.Color.WHITE;
    placemarkCAttributes.labelAttributes.offset = new WorldWind.Offset(
        WorldWind.OFFSET_FRACTION, 0.5,
        WorldWind.OFFSET_FRACTION, 1.0);
    placemarkCAttributes.imageSource =  "fat2.png";//"/image/charfat.jpg";// "/images/charfat.png";// "https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Common_lipids_lmaps.png/450px-Common_lipids_lmaps.png";

    //postion of placemark
    var positionC = new WorldWind.Position(23.47, 120.9575, 100.0, true, null);
    //////////////  23.4700° N, 120.9575° E
    //create the placemark
    var placemarkC = new WorldWind.Placemark(positionC, false, placemarkCAttributes);
    //create the label
    placemarkC.label = "∞∞∞∞∞∞∞∞∞∞∞∞∞∞∞∞∞∞∞∞∞∞";
    // "Lat " + placemarkC.position.latitude.toPrecision(4).toString() + "\n" +
    // "Lon " + placemarkC.position.longitude.toPrecision(5).toString();
    placemarkC.alwaysOnTop = true;

    placemarkC.altitudeMode = WorldWind.RELATIVE_TO_GROUND;


    //add the placemark into the layer
    placemarkCLayer.addRenderable(placemarkC);



    // Set up the common placemark attributes.
    var placemarkCCAttributes = new WorldWind.PlacemarkAttributes(null);
    placemarkCCAttributes.imageScale =0.1;
    placemarkCCAttributes.imageOffset = new WorldWind.Offset(
        WorldWind.OFFSET_FRACTION, 0.0,
        WorldWind.OFFSET_FRACTION, 0.0);
    placemarkCCAttributes.imageColor = WorldWind.Color.WHITE;//BLUE;
    placemarkCCAttributes.labelAttributes.color = WorldWind.Color.WHITE;
    placemarkCCAttributes.labelAttributes.offset = new WorldWind.Offset(
        WorldWind.OFFSET_FRACTION, 0.5,
        WorldWind.OFFSET_FRACTION, 1.0);
    placemarkCCAttributes.imageSource =  "fat2.png";//"/image/charfat.jpg";// "/images/charfat.png";// "https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Common_lipids_lmaps.png/450px-Common_lipids_lmaps.png";



    //postion of placemark
    var positionCC = new WorldWind.Position(90, 0, 100.0, true, null);
    //////////////  23.4700° N, 120.9575° E
    //create the placemark
    var placemarkCC = new WorldWind.Placemark(positionCC, false, placemarkCCAttributes);
    //create the label
    placemarkCC.label = "◊◊◊◊◊◊◊◊◊";
    // "Lat " + placemarkC.position.latitude.toPrecision(4).toString() + "\n" +
    // "Lon " + placemarkC.position.longitude.toPrecision(5).toString();
    placemarkCC.alwaysOnTop = true;

    placemarkCC.altitudeMode = WorldWind.RELATIVE_TO_GROUND;


    //add the placemark into the layer
    placemarkCLayer.addRenderable(placemarkCC);

    placemarkCC.altitudeMode = WorldWind.RELATIVE_TO_GROUND;

    // highlightAttributes = new WorldWind.PlacemarkAttributes(placemarkCAttributes);
    // highlightAttributes.imageScale = 0.3;
    // placemarkC.highlightAttributes = highlightAttributes;

    globe.wwd.addLayer(placemarkCLayer);



    ////////////////////////
    //                    //
    //                    //
    //                    //
    //                    //
    //                    //
    //                    //
    //                    //
    //                    //
    //                    //
    //                    //
    //                    //
    //                    //
    ////////////////////////challenge 6.1

    var box = document.createElement("div");
    box.innerHTML = "<button id ='CharFatClose' >close</button><br><h1>CharJustFat🇹🇼🇹🇼🇹🇼🇹🇼</h1><p> JustCharFat!!!🇹🇼🇹🇼🇹🇼🇹🇼</p><br><img alt = 'CharFat' src='https://upload.wikimedia.org/wikipedia/commons/2/20/Common_lipids_lmaps.png' width='300px'>" +
        "<br><h2 style = 'font-size:70%'>source:https://en.wikipedia.org/wiki/Lipid</h2><img alt = 'char' src = 'https://qph.fs.quoracdn.net/main-raw-457280285-ymcqgsdumwxocugzufohaiiqrwoypzxb.jpeg' width = '300px'><br><h2 style = 'font-size:70%'>source:https://www.quora.com/profile/Charlie-Cai-16</h2>" +
        "<img src='http://imgs.ntdtv.com/pic/2016/8-3/p7584822a362701639.jpg' width='100%'>";
    box.id = "CharFat";
    document.body.appendChild(box);
    var CharFatClose = document.getElementById("CharFatClose");
    CharFatClose.onclick = function(){
        box.style.display = "none";
    };

    var popUp = function(o){


        var x = o.clientX,
            y = o.clientY;

        for (var h = 0; h < highlightedItems.length; h++) {
            highlightedItems[h].highlighted = false;
        }

        var pickListCF = globe.wwd.pick(globe.wwd.canvasCoordinates(x, y));

        highlightedItems = [];

        if (pickListCF.objects.length > 0) {
            for (var p = 0; p < pickListCF.objects.length; p++) {
                pickListCF.objects[p].userObject.highlighted = true;

                // Keep track of highlighted items in order to de-highlight them later.
                highlightedItems.push(pickListCF.objects[p].userObject);

                // Detect whether the placemark's label was picked. If so, the "labelPicked" property is true.
                // If instead the user picked the placemark's image, the "labelPicked" property is false.
                // Applications might use this information to determine whether the user wants to edit the label
                // or is merely picking the placemark as a whole.
                if (pickListCF.objects[p].labelPicked) {
                    console.log("Label picked");
                }
                //console.log(pickListCF.objects[p].userObject instanceof  WorldWind.Placemark);// WorldWind.Placemark);


                if(pickListCF.objects[p].userObject instanceof WorldWind.Placemark && pickListCF.objects[p].userObject.label === "∞∞∞∞∞∞∞∞∞∞∞∞∞∞∞∞∞∞∞∞∞∞"  ){
                    box.style.display = "block";
                    console.clear();
                    console.log('fat');
                    console.log(box.style.display)
                }
            }
        }
    };


    globe.wwd.addEventListener("click", popUp);


    //<a href="#" title="Header" data-toggle="popover" data-trigger="hover" data-content="Some content">Hover over me</a>
    var charFatPop = document.createElement("div");
    charFatPop.innerHTML ='<a id ="charFatPop" href="https://www.cdc.gov/healthyschools/obesity/index.htm" title="CharFatFat" data-content="charJustFat🇹🇼🇹🇼🇹🇼" data-toggle="popover" data-trigger="hover" ></a>';
    //var charFatPopPop = document.querySelector("#charFatPopPop");
    document.body.appendChild(charFatPop);

    console.log(charFatPop);


    var popOverNew = function(o) {
        var x = o.clientX,
            y = o.clientY;

        for (var h = 0; h < highlightedItems.length; h++) {
            highlightedItems[h].highlighted = false;

            var pickListCF2 = globe.wwd.pick(globe.wwd.canvasCoordinates(x, y));


            highlightedItems = [];

            if (pickListCF2.objects.length > 0) {
                for (var p = 0; p < pickListCF2.objects.length; p++) {
                    pickListCF2.objects[p].userObject.highlighted = true;

                    // Keep track of highlighted items in order to de-highlight them later.
                    highlightedItems.push(pickListCF2.objects[p].userObject);
                    if (pickListCF2.objects[p].userObject instanceof WorldWind.Placemark && pickListCF2.objects[p].userObject.label === "◊◊◊◊◊◊◊◊◊" ) {
                        console.log("fat");
                        $('[data-toggle="popover"]').popover('show');

                    }else {
                        $('[data-toggle="popover"]').popover('hide');

                    }
                }
            }
        }
    };

    globe.wwd.addEventListener("mousemove", popOverNew);

    var slider2 = document.getElementById("slider2");
    slider2.onclick = function(){
        placemarkCLayer.enabled = !placemarkCLayer.enabled
        globe.wwd.redraw();
    };
        // if(placemarkCLayer.enabled === true){
        //     console.log("enabled");
        //     slider2.onclick=function () {
        //         placemarkCLayer.enabled = !placemarkCLayer.enabled
        //     }
        //     }
        // };
        // if (placemarkCLayer.enabled === false){
        //     console.log("no");
        //     slider2.onclick=function(){
        //         placemarkCLayer.enabled = !placemarkCLayer.enabled
        //     }






    //  http://cs.aworldbridgelabs.com:8080/geoserver/web/
    //  http://aworldbridgelabs.com:8080/geoserver/FatWMS/wms?service=WMS&version=1.1.0&request=GetMap&layers=FatWMS:pointlands&styles=&bbox=-105.370531,39.914352,-105.065309,40.217396&width=768&height=762&srs=EPSG:4269&format=application/openlayers
    var serviceAddress = "http://10.11.90.16:9084/http://10.11.90.16:8080/geoserver/ows?service=wms&version=1.3.0&request=GetCapabilities";
    // Named layer displaying Average Temperature data
    var layerName = "FatWMS:giant_polygon";
    // Called asynchronously to parse and create the WMS layer
    var createLayer = function (xmlDom) {
        // Create a WmsCapabilities object from the XML DOM
        var wms = new WorldWind.WmsCapabilities(xmlDom);
        console.log(wms);
        // Retrieve a WmsLayerCapabilities object by the desired layer name
        var wmsLayerCapabilities = wms.getNamedLayer(layerName);
        // Form a configuration object from the WmsLayerCapability object
        var wmsConfig = WorldWind.WmsLayer.formLayerConfiguration(wmsLayerCapabilities);
        // Modify the configuration objects title property to a more user friendly title
        wmsConfig.title = "øøøøøøøøø";
        // Create the WMS Layer from the configuration object
        var wmsLayer = new WorldWind.WmsLayer(wmsConfig);

        console.log("charllllllllie cai iiisss fffffaaaaatt");

        // Add the layers to WorldWind and update the layer manager
        globe.wwd.addLayer(wmsLayer);

        wmsLayer.enabled = false;
        // globe.addLayer(wmsLayer, {
        //     category: "settings",
        //     enabled: "true"
        // });
        console.log("char");
        var slider3 = document.getElementById("slider3");
        slider3.onclick = function(){
            wmsLayer.enabled = !wmsLayer.enabled
            globe.wwd.redraw();
        }
            // if (wmsLayer.enabled === true) {
            //     slider3.onclick = function () {
            //         wmsLayer.enabled = false
            //
            //     }
            // }
            // if (wmsLayer.enabled === false) {
            //     slider3.onclick = function () {
            //         wmsLayer.enabled = true
            //     }
            // }


        // $(document).ready(function () {
        //     $("#slider4").change(function () {
        //         wmsLayer.enabled = !wmsLayer.enabled;
        //         console.log("Layer toggled");
        //     });
        // });
    };


    // Called if an error occurs during WMS Capabilities document retrieval
    var logError = function (jqXhr, text, exception) {
        console.log("There was a failure retrieving the capabilities document:%%% " + text + " %%%exception:%%% " + exception);
    };

    // var ajax = new XMLHttpRequest();
    // console.log(ajax);
    $.get(serviceAddress).done(createLayer).fail(logError);

    // $.ajax({
    //     type: "GET",
    //     crossOrigin: true,
    //     // crossDomain: true,
    //     // dataType:"ShapeFile",
    //     // headers: {"Access-Control-Allow-Origin":"*"},
    //     url: serviceAddress
    // }).done(createLayer).fail(logError);



    // // Web Map Service information from NASA's Near Earth Observations WMS
    // var serviceAddress2 = "https://neo.sci.gsfc.nasa.gov/wms/wms?SERVICE=WMS&REQUEST=GetCapabilities&VERSION=1.3.0";
    // // Named layer displaying Average Temperature data
    // var layerName2 = "MOD_LSTD_CLIM_M";
    //
    // // Called asynchronously to parse and create the WMS layer
    // var createLayer2 = function (xmlDom) {
    //     // Create a WmsCapabilities object from the XML DOM
    //     var wms = new WorldWind.WmsCapabilities(xmlDom);
    //     // Retrieve a WmsLayerCapabilities object by the desired layer name
    //     var wmsLayerCapabilities = wms.getNamedLayer(layerName2);
    //     // Form a configuration object from the WmsLayerCapability object
    //     var wmsConfig = WorldWind.WmsLayer.formLayerConfiguration(wmsLayerCapabilities);
    //     // Modify the configuration objects title property to a more user friendly title
    //     wmsConfig.title = "Average Surface Temp";
    //     // Create the WMS Layer from the configuration object
    //     var wmsLayer = new WorldWind.WmsLayer(wmsConfig);
    //
    //     // Add the layers to WorldWind and update the layer manager
    //     globe.addLayer(wmsLayer, {
    //         category: "settings",
    //         enabled: "true"
    //     });
    // };
    //
    // // Called if an error occurs during WMS Capabilities document retrieval
    // var logError2 = function (jqXhr, text, exception) {
    //     console.log("There was a failure retrieving the capabilities document: " + text + " exception: " + exception);
    // };
    //
    // $.get(serviceAddress2).done(createLayer2).fail(logError2());


    var locations = [];
    for (var i = 0; i < 800000; i++) {
        locations.push(
            new WorldWind.MeasuredLocation(
                -89 + (179 * Math.random()),
                -179 + (359 * Math.random()),
                Math.ceil(1000 * Math.random())
            )
        );
    }

    // Add new HeatMap Layer with the points as the data source.
    var heatMap = new WorldWind.HeatMapLayer("HeatMap", locations);
    globe.wwd.addLayer(heatMap );

    var slider4 = document.getElementById("slider4");
    slider4.onclick = function(){
        heatMap.enabled = !heatMap.enabled;
        globe.wwd.redraw();
    };




    // Activate the Knockout bindings between our view models and the html
    let layersViewModel = new LayersViewModel(globe);
    let settingsViewModel = new SettingsViewModel(globe);


    ko.applyBindings(layersViewModel, document.getElementById('layers'));
    ko.applyBindings(settingsViewModel, document.getElementById('settings'));

    // Auto-collapse the main menu when its button items are clicked
    $('.navbar-collapse a[role="button"]').click(function() {
        $('.navbar-collapse').collapse('hide');
    });

    // Collapse card ancestors when the close icon is clicked
    $('.collapse .close').on('click', function() {
        $(this).closest('.collapse').collapse('hide');
    });

});

//http://10.11.90.16:8080/geoserver
//http://www.ajax-cross-origin.com/