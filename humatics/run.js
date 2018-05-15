require([
  "esri/views/SceneView",
  "esri/WebScene",
  "esri/geometry/Point",
  "esri/Camera",
  "esri/identity/IdentityManager",
  "humatics/anchors",
  "humatics/position"
], function(
  SceneView, WebScene, Point, Camera, id, anchors, position
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
  
  window.layerCount = 0
  window.status = 'play'

  var uwbLayerId = '16317695ba1-layer-1'
  
  window.scene = new WebScene({
    portalItem: { // autocasts as new PortalItem()
      id: "296ea2b440284575ad67304c68b7ba75"
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
    // console.log('views length and layer count', views.length, layerCount)
    // console.log('e.layerView', e.layer.id, e.layer.fields.map(f => f.name).join(', '))
    layersLoaded.innerHTML = views.length + '/' + layerCount + '   ' 
    if ( e.layer.id === uwbLayerId ) {
      // console.log('uwb layer', e.layer)
      e.layer.queryFeatures().then(function(result) {
        // console.log('uwb result', result)
        var uwb = result.features.filter(function(feature) {
          return feature.attributes.Name === 'UWB'
        })
        // console.log('uwb feature', uwb)
        position.setLineGeom(uwb[0].geometry)
      })
    }
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
          // anchors.addTo(scene)
          position.addTo(scene, {
            latitude: view.camera.latitude,
            longitude: view.camera.longitude
          })

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
            // console.log('clicked pause')
            play.classList.remove('bold')
            this.classList.add('bold')
            window.status = 'stop'
          })
        }
      }, 200)
    }
  })

  var navigate = function(view, slides) {
    if ( window.status === 'stop' ) {
      return
    }
    
    currentSlide.innerHTML = (slideIndex + 1) + '/' + slides.length

    // Move the dot from slides 4 - 10.
    if ( slideIndex + 1 === 4 ) {
      window.extentWatch = view.watch('extent', function(newVal, oldVal, prop, target) {
        position.moveTo(newVal)
      })
    }
    if ( slideIndex + 1 === 10 ) {
      window.extentWatch.remove()
    }
    var camera = slides.getItemAt(slideIndex).viewpoint.camera
    // console.log('next camera', camera)
    var advance = function() {
      slideIndex += 1
      if ( slideIndex === slides.length ) {
        slideIndex = 0
      }
      navigate(window.view, slides)
    }

    view.goTo(camera, {
      duration: defaults.timeDelay,
      easing: 'linear'
    }).then(advance)
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
