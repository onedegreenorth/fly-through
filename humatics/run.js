require([
  "esri/views/SceneView",
  "esri/WebScene",
  "esri/geometry/Point",
  "esri/Camera",
  "esri/identity/IdentityManager",
  "esri/layers/Layer",
  
  "humatics/anchors",
  "humatics/position"
], function(
  SceneView, WebScene, Point, Camera, id, Layer, 
  anchors, position
) {

  var idKey = 'odn-fly-through'
  loadIdManager()

  var defaults = {
    timeDelay: 6000,
    tilt: 80, // unused
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
    console.log('slider change', e)
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
  
  window.layerCount = 0
  window.status = 'play'

  var uwbLayerId = '16317695ba1-layer-1'
  
  window.scene = new WebScene({
    portalItem: { // autocasts as new PortalItem()
      id: "df846a8389ea40a3a449d81e9e7b77d5"
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

          // GPS signal quality raster
          Layer.fromPortalItem({
            portalItem: {
              id: "3764f8d08ddb4ec38f17c7e4864a7df0"
            }
          }).then(function addLayer(layer) {
            window.satLayer = layer
            console.log('layer', layer)
            layer.opacity = 0.3
            // layer.elevationInfo = { 
            //   mode: 'relative-to-ground',
            //   offset: 10
            // }
            scene.add(layer);
          })
          .catch(function rejection(err) {
            console.log("Layer failed to load: ", err);
          });

          // Add the uwb points (invisible)
          // http://onedegreenorth.maps.arcgis.com/home/item.html?id=3a9c31b3c0e24c74a42277554edc5473
          Layer.fromPortalItem({
            portalItem: {
              id: "af8a02b5f0bc45049e692f7363c52c57"
            }
          }).then(function addLayer(layer) {
            window.uwbLayer = layer
            console.log('uwb layer', layer)
            layer.opacity = 0
            // layer.elevationInfo = { 
            //   mode: 'relative-to-ground',
            //   offset: 10
            // }
            scene.add(layer);
          })
          .catch(function rejection(err) {
            console.log("Layer failed to load: ", err);
          });

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
          console.log('sorted', uwbFeatures)
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
      window.satLayer.visible = false
      var uwbStep = 20
      function uwbFly() {
        if ( uwbPosition < uwbFeatures.length - 11 ) {
          console.log('flying...', uwbPosition)
          var uwbCamera = lastSlideCamera.clone()
          var anchors = uwbFeatures[uwbPosition].attributes.anchor_list
          // console.log('uwb anchors', anchors)
          anchors = anchors.split(',').map(function(name) {
            return "'" + name + "'"
          }).join(',')
          // console.log('uwb anchors def exp', anchors)
          var definition = 'name IN (' + anchors  + ')'
          // console.log('uwb def exp', definition)
          // Build a def exp for anchors
          csvLayer.definitionExpression = definition
          var uwbGeometry = uwbFeatures[uwbPosition].geometry
          uwbCamera.position.longitude = uwbGeometry.longitude
          uwbCamera.position.latitude = uwbGeometry.latitude
          // console.log('next lat lon', uwbCamera.position.latitude, uwbCamera.position.longitude)
          position.moveTo(uwbGeometry)

          var uwbCurrent = uwbFeatures[uwbPosition].attributes.uwb_timestamp
          var uwbNext = uwbFeatures[uwbPosition + uwbStep].attributes.uwb_timestamp
          var uwbDuration = uwbNext - uwbCurrent
          // view.goTo(uwbCamera, { duration: uwbDuration })
          view.goTo(uwbGeometry, { 
            duration: 20,
            easing: 'linear'
          })
            .then(function() {
              if ( window.status !== 'stop' ) {
                uwbPosition += uwbStep
                uwbFly()
              }
            })
        } else {
          console.log('back to slides...', uwbPosition)
          uwbPosition = 0
          slideIndex = slides.length - 1
          navigate(window.view, slides)
        }
      }
      console.log('calling uwb fly...')
      uwbFly()
      return
    }
    if ( (slideIndex + 1 === 1 || slideIndex + 1 === 17) && window.satLayer ) {
      position.hide()
      window.satLayer.visible = true
      csvLayer.definitionExpression = null
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

});
