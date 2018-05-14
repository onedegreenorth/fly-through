require([
  "esri/Map",
  "esri/layers/FeatureLayer",
  "esri/layers/CSVLayer",
  "esri/views/MapView",
  "esri/widgets/Fullscreen",
  "esri/identity/IdentityManager"
], function(
  Map,
  FeatureLayer,
  CSVLayer,
  MapView,
  Fullscreen,
  id
) {
  
  var idKey = 'odn-fly-through'
  loadIdManager()

  // Start and end values queried from outStatistics for the layer using:
  // [
  //   {
  //     "statisticType": "min",
  //     "onStatisticField": "uwb_timestamp", 
  //     "outStatisticFieldName": "time_min"
  //   },
  //   {
  //     "statisticType": "max",
  //     "onStatisticField": "uwb_timestamp",
  //     "outStatisticFieldName": "time_max"
  //   }  
  // ]
  // var uwb_start = 1475258057390
  // var uwb_end = 1475258187220
  // var uwb_range = Math.ceil((uwb_end - uwb_start) / 1000)
  var uwb_range = 130
  // console.log('start/end', uwb_start, uwb_end)

  // var startLat = 40.75822

  //--------------------------------------------------------------------------
  //
  //  Setup Map and View
  //
  //--------------------------------------------------------------------------

  // layer = new FeatureLayer({
  //   portalItem: {
  //     id: "6f35bc7e9aab4d5a9f5402125d85cece"
  //   },
  //   // definitionExpression: "uwb_timestamp > 0",
  //   title: "Ultra Wide Band data",
  //   minScale: 72223.819286
  // });

  // var url = "../data/uwb_gps_synced_int_time.csv";
  var url = "../data/uwb_gps_synced_int_time_subset.csv";
  var template = {
    title: "UWB Data",
    content: function(e) {
      // console.log('template content', e.graphic)
      var anchors = Object.keys(e.graphic.attributes).filter(function(name) {
        return name.startsWith('anchor')
      }).map(function(attribute) {
        return e.graphic.attributes[attribute]
      }).filter(function(val) { 
        return val 
      }).join(', ')
      console.log('anchors', anchors)
      return 'Time:  ' + e.graphic.attributes.when + '<br>Anchors:  ' + anchors
    }
  };

  var layer = new CSVLayer({
    url: url,
    latitudeField: 'uwb_latitude',
    longitudeField: 'uwb_longitude',
    copyright: "Humatics",
    popupTemplate: template,
    elevationInfo: {
      // drapes icons on the surface of the globe
      mode: "on-the-ground"
    }
  });

  var map = new Map({
    basemap: {
      portalItem: {
        id: "6ebc862c9f2e47178e3dc033cd896fde"
      }
    },
    layers: [layer]
  });

  window.view = new MapView({
    map: map,
    container: "viewDiv",
    center: [-73.98029, 40.75822],
    zoom: 16,
    constraints: {
      snapToZoom: false,
      minScale: 72223.819286
    },
    // This ensures that when going fullscreen
    // The top left corner of the view extent
    // stays aligned with the top left corner
    // of the view's container
    resizeAlign: "top-left"
  });

  //--------------------------------------------------------------------------
  //
  //  Setup UI
  //
  //--------------------------------------------------------------------------

  var applicationDiv = document.getElementById("applicationDiv");
  var slider = document.getElementById("slider");
  var sliderValue = document.getElementById("sliderValue");
  var playButton = document.getElementById("playButton");
  var titleDiv = document.getElementById("titleDiv");
  var animation = null;

  // When user drags the slider:
  //  - stops the animation
  //  - set the visualized year to the slider one.
  function inputHandler() {
    stopAnimation();
    setTime(parseInt(slider.value));
  }
  slider.addEventListener("input", inputHandler);
  slider.addEventListener("change", inputHandler);

  // Toggle animation on/off when user
  // clicks on the play button
  playButton.addEventListener("click", function() {
    if (playButton.classList.contains("toggled")) {
      stopAnimation();
    } else {
      startAnimation();
    }
  });

  view.ui.empty("top-left");
  view.ui.add(titleDiv, "top-left");
  view.ui.add(new Fullscreen({
    view: view,
    element: applicationDiv
  }), "top-right");

  // When the layerview is available, setup hovering interactivity
  // view.whenLayerView(layer).then(setupHoverTooltip);

  setTime(0);

  //--------------------------------------------------------------------------
  //
  //  Methods
  //
  //--------------------------------------------------------------------------

  /**
    * Sets the current visualized construction year.
    */
  function setTime(value) {
    // console.log('value...', value, new Date(uwb_start + (value * 1000)).getTime())
    sliderValue.innerHTML = Math.floor(value);
    slider.value = Math.floor(value);
    layer.renderer = createRenderer(value);
  }

  /**
    * Returns a renderer with a color visual variable driven by the input
    * year. The selected year will always render buildings built in that year
    * with a light blue color. Buildings built 20+ years before the indicated
    * year are visualized with a pink color. Buildings built within that
    * 20-year time frame are assigned a color interpolated between blue and pink.
    */
  function createRenderer(position) {
    // position = (position * 1000) + uwb_start + 1
    position = (position * 1000)
    var oneSecondBefore = (position - 1000 > 0) ? position - 1000 : 0
    var oneSecondAfter = position + 1000
    console.log('position', position, oneSecondBefore, oneSecondAfter)
    // console.log('createRenderer position', position, oneSecondBefore, oneSecondAfter)
    var opacityStops = [{
      opacity: 0,
      value: oneSecondBefore
    },
    {
      opacity: 1,
      value: position
    },
    {
      opacity: 0,
      value: oneSecondAfter
    }
    ];
    // var opacityStops = [{
    //   opacity: 0,
    //   value: position - 0.0001
    // },
    // {
    //   opacity: 1,
    //   value: position
    // },
    // {
    //   opacity: 0,
    //   value: position + 0.0001
    // }
    // ]

    return {
      type: "simple",
      symbol: {
        type: "simple-marker",
        size: 6,
        color: "rgb(0, 0, 0)",
        outline: { width: 0.5, color: "white" }
      },
      visualVariables: [{
        type: "opacity",
        field: "when",
        // field: "uwb_latitude",
        stops: opacityStops
      // }, {
        // type: "color",
        // field: "uwb_timestamp",
        // stops: [{
        //   value: uwb_start,
        //   color: "#ffeb3b" // yellow
        // }, {
        //   value: position,
        //   color: "#009688" // green
        // }, {
        //   value: uwb_end - 1000,
        //   color: "#ff9800" // orange
        // }]
      }]
    };
  }

  /**
    * Sets up a moving tooltip that displays
    * the construction year of the hovered building.
    */
  function setupHoverTooltip(layerview) {
    var promise;
    var highlight;

    var tooltip = createTooltip();

    view.on("pointer-move", function(event) {
      if (promise) {
        promise.cancel();
      }

      promise = view.hitTest(event.x, event.y)
        .then(function(hit) {
          promise = null;

          // remove current highlighted feature
          if (highlight) {
            highlight.remove();
            highlight = null;
          }

          var results = hit.results.filter(function(result) {
            return result.graphic.layer === layer;
          });

          // highlight the hovered feature
          // or hide the tooltip
          if (results.length) {
            var graphic = results[0].graphic;
            var screenPoint = hit.screenPoint;

            highlight = layerview.highlight(graphic);
            tooltip.show(screenPoint, "Time is " + graphic.getAttribute(
              "uwb_timestamp"));
          } else {
            tooltip.hide();
          }
        });
    });
  }

  /**
    * Starts the animation that cycle
    * through the construction years.
    */
  function startAnimation() {
    stopAnimation();
    animation = animate(parseFloat(slider.value));
    playButton.classList.add("toggled");
  }

  /**
    * Stops the animations
    */
  function stopAnimation() {
    if (!animation) {
      return;
    }

    animation.remove();
    animation = null;
    playButton.classList.remove("toggled");
  }

  /**
    * Animates the color visual variable continously
    */
  function animate(startValue) {
    var animating = true;
    var value = startValue;

    var frame = function(timestamp) {
      if (!animating) {
        return;
      }

      value += 0.5;
      if (value > uwb_range) {
        value = 0;
      }

      setTime(value);

      // Update at 30fps
      setTimeout(function() {
        requestAnimationFrame(frame);
      }, 1000 / 30);
    };

    frame();

    return {
      remove: function() {
        animating = false;
      }
    };
  }

  /**
    * Creates a tooltip to display a the construction year of a building.
    */
  function createTooltip() {
    var tooltip = document.createElement("div");
    var style = tooltip.style;

    tooltip.setAttribute("role", "tooltip");
    tooltip.classList.add("tooltip");

    var textElement = document.createElement("div");
    textElement.classList.add("esri-widget");
    tooltip.appendChild(textElement);

    view.container.appendChild(tooltip);

    var x = 0;
    var y = 0;
    var targetX = 0;
    var targetY = 0;
    var visible = false;

    // move the tooltip progressively
    function move() {
      x += (targetX - x) * 0.1;
      y += (targetY - y) * 0.1;

      if (Math.abs(targetX - x) < 1 && Math.abs(targetY - y) < 1) {
        x = targetX;
        y = targetY;
      } else {
        requestAnimationFrame(move);
      }

      style.transform = "translate3d(" + Math.round(x) + "px," + Math.round(
        y) + "px, 0)";
    }

    return {
      show: function(point, text) {
        if (!visible) {
          x = point.x;
          y = point.y;
        }

        targetX = point.x;
        targetY = point.y;
        style.opacity = 1;
        visible = true;
        textElement.innerHTML = text;

        move();
      },

      hide: function() {
        style.opacity = 0;
        visible = false;
      }
    };
  }

  function loadIdManager() {
    var previousId = localStorage.getItem(idKey)
    localStorage.getItem('odn-fly-through')
    // console.log('load id manager', previousId)
    if ( previousId ) {
      var idInfo = JSON.parse(previousId)
      // console.log('init id mgr', idInfo)
      id.initialize(idInfo)
    }
  }

  window.onunload = function() {
    var idState = JSON.stringify(id.toJSON())
    // console.log('unload...', idState)
    localStorage.setItem(idKey, idState)
  }

});