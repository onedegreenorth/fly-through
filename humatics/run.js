require([
  "esri/views/SceneView",
  "esri/WebScene",
  "esri/geometry/Point",
  "esri/geometry/Polyline",
  "esri/Camera",
  "esri/identity/IdentityManager",
  "esri/layers/Layer",
  "esri/layers/FeatureLayer",
  "esri/geometry/support/webMercatorUtils",
  "esri/geometry/geometryEngine",
  "esri/request",
  "esri/layers/CSVLayer",
  
  "humatics/anchors",
  "humatics/position"
], function(
  SceneView, WebScene, Point, Polyline, Camera, id, Layer, FeatureLayer,
  webMercatorUtils, geometryEngine, esriRequest, CSVLayer,
  anchors, position
) {

  var idKey = 'odn-fly-through'
  loadIdManager()

  var defaults = {
    timeDelay: 6000,
    heading: 22.452496945982112 // unused
  }
  var controls = document.getElementById('controls')
  var currentSlide = document.getElementById('current-slide')
  var layersLoaded = document.getElementById('layers-loaded')
  var layerInfo = document.getElementById('layer-info')

  var controlPlay = document.getElementById('play')
  var controlPause = document.getElementById('pause')

  var slider = document.getElementById('slide-duration')
  slider.value = defaults.timeDelay
  var label = document.getElementById('duration-label')
  label.innerHTML = slider.value
  slider.oninput = function(e) {
    // console.log('slider change', e)
    label.innerHTML = e.target.value
    defaults.timeDelay = +e.target.value
  }
  
  var dotCount = 0
  var dotMax = 10

  var slideIndex = 0

  window.uwbFeatures = null
  window.uwbLayer = null
  var uwbPosition = 0
  var lastSlideCamera = null
  var uwbPointIndexes

  var coordGpsLat = document.getElementById('gps-lat')
  var coordGpsLon = document.getElementById('gps-lon')
  var coordGpsAlt = document.getElementById('gps-alt')
  var coordUwbLat = document.getElementById('uwb-lat')
  var coordUwbLon = document.getElementById('uwb-lon')
  var coordUwbAlt = document.getElementById('uwb-alt')

  window.gpsData = null
  window.gpsIndexMultiplier = null
  esriRequest('data/GPS.csv', {
    responseType: 'text'
  }).then(
    function(response) {
      var rows = response.data.split('\n')
      var header = rows.shift().split(',')
      // console.log('header', header)
      var numericRows = rows.map(function(row) {
        return row.split(',').map(function(val) {
          return parseFloat(val)
        })
      })
      // console.log('numericRows', numericRows)
      numericRows.unshift(header)
      window.gpsData = numericRows
    }
  )
  
  window.layerCount = 0
  window.status = 'play'

  var uwbLayerId = '16317695ba1-layer-1'
  
  window.scene = new WebScene({
    portalItem: { // autocasts as new PortalItem()
      id: "6f32492896a3416cb64490d245d05bbd"
    }
  });
  scene.when(function() {
    // Get a count of all layers in the scene.
    window.layerCount = scene.allLayers.toArray().length
  })

  window.view = new SceneView({
    map: scene,
    container: "viewDiv",
    qualityProfile: "low"
  });

  // Wait for all layer views to finish updating before cycling through slides.
  window.layerViews = {}
  window.timer = null

  view.on('layerview-create', (e) => {
    layerViews[e.layer.id] = e.layerView
    var views = Object.values(layerViews)

    if ( views.length === window.layerCount ) {
      layersLoaded.innerHTML += '<br>Getting data:  .'
      dotCount += 1
      clearInterval(window.timer)
      window.timer = setInterval(() => {
        var stillUpdating = views.some(a => a.updating)
        if ( dotCount < dotMax ) {
          layersLoaded.innerHTML += '.'
          dotCount += 1
        } else {
          layersLoaded.innerHTML = layersLoaded.innerHTML.slice(0, -1)
          dotCount -= 1
        }
        if ( !stillUpdating && !view.updating ) {
          anchors.addTo(scene)
          position.addTo(scene, {
            latitude: view.camera.latitude,
            longitude: view.camera.longitude
          })

          // Add the uwb points (invisible)
          // http://onedegreenorth.maps.arcgis.com/home/item.html?id=3a9c31b3c0e24c74a42277554edc5473
          Layer.fromPortalItem({
            portalItem: {
              // Original data, doesn't run full length of street
              // id: "af8a02b5f0bc45049e692f7363c52c57"
              // Updated data, about 6700 points
              id: "cf659adf45244443854ff540bc41bfb0"
            }
          }).then(function addLayer(layer) {
            window.uwbLayer = layer
            console.log('uwb layer', layer)
            layer.opacity = 0
            scene.add(layer);
          })
          .catch(function rejection(err) {
            console.log("Layer failed to load: ", err);
          });

          // GPS track from KML
          window.gpsTrack = new FeatureLayer({
            portalItem: {
              id: "cc20531fae764b86b966043dac39333c"
            },
            elevationInfo: {
              mode: 'relative-to-ground',
              offset: 10
            }
          })
          scene.add(gpsTrack)

          navigate(window.view, scene.presentation.slides)
          clearInterval(window.timer)
          layersLoaded.innerHTML = 'Finished loading'
          setTimeout(function() {
            layerInfo.style.opacity = 0
            setTimeout(function() {
              layerInfo.style.display = 'none'
            }, 1000)
          }, 1000)
          play.classList.add('bold')
          play.addEventListener('click', function() {
            pause.classList.remove('bold')
            this.classList.add('bold')
            window.status = 'play'
            navigate(window.view, scene.presentation.slides)
          })
          pause.addEventListener('click', function() {
            play.classList.remove('bold')
            this.classList.add('bold')
            window.status = 'stop'
            if ( window.extentWatch ) {
              window.extentWatch.remove()
            }
            window.gotoResult.cancel()
          })
        }
      }, 200)
    }
  })

  var navigate = function(view, slides) {
    if ( window.status === 'stop' ) {
      return
    }

    if ( uwbLayer && !uwbFeatures ) {
      uwbLayer.queryFeatures()
        .then(function(results) {
          // console.log('uwb features', results)
          uwbFeatures = results.features
          uwbFeatures.sort(function(a, b) {
            a = a.attributes.uwb_timestamp
            b = b.attributes.uwb_timestamp
            return a - b
          })
          gpsIndexMultiplier = gpsData.length / uwbFeatures.length
          // console.log('sorted', uwbFeatures)
          // console.log('lengths', gpsData.length, uwbFeatures.length, 'gps multiplier', gpsIndexMultiplier)

          // Make a line out of the points.
          var lineGraphic = position.addLine(scene, uwbFeatures)
          uwbPointIndexes = findPointsOneMeterApart(lineGraphic)
        })
        .catch(function(error) {
          console.log('uwb query error', error)
        })
    }
    
    currentSlide.innerHTML = (slideIndex + 1) + '/' + slides.length

    if ( slideIndex + 1 === 8 ) {
      position.show()
      // window.extentWatch = view.watch('extent', function(newVal, oldVal, prop, target) {
      // window.extentWatch = view.watch('extent', function(newVal) {
      //   position.moveTo(newVal, slideIndex + 1)
      // })
      window.csvLayer.visible = true
      var uwbStep = 1
      var speedUp = 3
      function uwbFly() {
        if ( uwbPosition < uwbPointIndexes.length - 1 ) {
          // console.log('uwbPosition...', uwbPosition)
          // var uwbCamera = lastSlideCamera.clone()
          var anchors = uwbFeatures[uwbPointIndexes[uwbPosition]].attributes.anchor_list
          // console.log('uwb anchors', anchors)
          anchors = anchors.split(',').map(function(name) {
            return "'" + name + "'"
          }).join(',')
          // console.log('uwb anchors def exp', anchors)
          var definition = 'name IN (' + anchors  + ')'
          // console.log('uwb def exp', definition)
          // Build a def exp for anchors
          csvLayer.definitionExpression = definition

          // Highlist anchors for the current position.
          var anchorDef = 'name NOT IN (' + anchors + ')'
          // anchorLayer.definitionExpression = anchorDef

          // Move the blue dot.
          var uwbGeometry = uwbFeatures[uwbPointIndexes[uwbPosition]].geometry
          // uwbCamera.position.longitude = uwbGeometry.longitude
          // uwbCamera.position.latitude = uwbGeometry.latitude
          // console.log('next lat lon', uwbCamera.position.latitude, uwbCamera.position.longitude)
          position.moveTo(uwbGeometry)

          // Update the UWB coordinates.
          coordUwbAlt.innerHTML = uwbGeometry.z.toFixed(2)
          coordUwbLat.innerHTML = uwbGeometry.latitude.toFixed(5)
          coordUwbLon.innerHTML = uwbGeometry.longitude.toFixed(5)

          // Figure out when to next move the blue dot.
          var uwbCurrent = uwbFeatures[uwbPointIndexes[uwbPosition]].attributes.uwb_timestamp
          var uwbNext = uwbFeatures[uwbPointIndexes[uwbPosition + uwbStep]].attributes.uwb_timestamp
          var uwbDuration = (uwbNext - uwbCurrent) / speedUp
          // console.log('uwbDuration', uwbDuration)
          setTimeout(function() {
            if ( window.status !== 'stop' ) {
              uwbPosition += uwbStep
              uwbFly()
            }
          // }, uwbDuration)
          }, 100)

          
          // Move the camera every 1/10th as often as the point.
          // Also update the GPS coordinates.
          if ( uwbPosition % 10 === 0 && (uwbPosition + 10 < uwbPointIndexes.length) ) {
            var viewDestination = uwbFeatures[uwbPointIndexes[uwbPosition + 10]].attributes.uwb_timestamp
            var viewDuration = (viewDestination - uwbCurrent) / speedUp
            var viewGeometry = uwbFeatures[uwbPointIndexes[uwbPosition + 10]]
            // console.log('viewDuration', viewDuration)
            var gpsIndex = Math.floor(uwbPosition * gpsIndexMultiplier)
            coordGpsLat.innerHTML = gpsData[gpsIndex][2].toFixed(5)
            coordGpsLon.innerHTML = gpsData[gpsIndex][3].toFixed(5)
            coordGpsAlt.innerHTML = gpsData[gpsIndex][4].toFixed(2)

            window.gotoResult = view
              .goTo(viewGeometry, { 
                // duration: viewDuration,
                duration: 1000,
                easing: 'linear'
              })
          }
          
        } else {
          console.log('back to slides...', uwbPosition)
          uwbPosition = 0
          slideIndex = slides.length - 1
          navigate(window.view, slides)
        }
      }
      // console.log('calling uwb fly...')
      uwbFly()
      // Show GPS coordinates for first point, which is row index 1
      coordGpsLat.innerHTML = gpsData[1][2].toFixed(2)
      coordGpsLon.innerHTML = gpsData[1][3].toFixed(5)
      coordGpsAlt.innerHTML = gpsData[1][4].toFixed(5)
      return
    }
    if ( slideIndex + 1 === 1 || slideIndex + 1 === 17 ) {
      position.hide()
      window.csvLayer.visible = false
      csvLayer.definitionExpression = null
      anchorLayer.definitionExpression = null
    }
    var camera = slides.getItemAt(slideIndex).viewpoint.camera
    console.log('next camera and slideIndex', camera, slideIndex)
    var advance = function() {
      slideIndex += 1
      if ( slideIndex === slides.length ) {
        slideIndex = 0
      }
      navigate(window.view, slides)
    }

    lastSlideCamera = camera
    window.gotoResult = view.goTo(camera, {
      duration: defaults.timeDelay,
      easing: 'linear'
    }).then(advance)
    // console.log('goto result', gotoResult)
  }
  
  view.ui.add(controls, 'top-right');

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
    console.log('unload...', idState)
    localStorage.setItem(idKey, idState)
  }

  var findPointsOneMeterApart = function(line) {
    // console.log('find points', line)
    var vertexIndexes = [0] // Start at the first vertex
    var runningDistance = 0

    // Project to web mercator to do distances in meters.
    var webMercLine = webMercatorUtils.geographicToWebMercator(new Polyline(line))
    // Messing around...calc length, segments, etc.
    // var geoLen = geometryEngine.geodesicLength(webMercLine, 'meters')
    // var plaLen = geometryEngine.planarLength(webMercLine, 'meters')
    // console.log('lengths', geoLen, plaLen)

    var path = line.paths[0]
    var vertexCount = path.length - 2
    var pos = 0
    while ( pos < vertexCount ) {
      var p1 = webMercatorUtils.geographicToWebMercator(new Point(path[pos]))
      var p2 = webMercatorUtils.geographicToWebMercator(new Point(path[pos+1]))
      var dist = geometryEngine.distance(p1, p2, 'meters')
      runningDistance += dist
      if ( runningDistance > 0.5 ) {
        vertexIndexes.push(pos)
        runningDistance = 0
      }
      pos += 1
      // console.log('distance', pos, dist)
    }
    // console.log('vertex indexes', vertexIndexes)
    return vertexIndexes
  }

});
