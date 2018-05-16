define([
  'esri/layers/GraphicsLayer',
  'esri/Graphic',
  'esri/geometry/geometryEngine',
  'humatics/uwb-points'
], function(
  GraphicsLayer,
  Graphic,
  geometryEngine,
  uwbPoints
) {
  var graphicsLayer = new GraphicsLayer({
    elevationInfo: { 
      mode: 'relative-to-ground',
      offset: 10
    }
  });
  var markerSymbol = {
    type: "simple-marker",
    color: [226, 119, 40],
    outline: {
      color: [255, 255, 255],
      width: 2
    }
  };

  var lineGeom = null

  return {
    addTo: function(scene, start) {
      scene.add(graphicsLayer)
      var point = {
        type: "point",
        x: start.longitude,
        y: start.latitude
      };
      
      var pointGraphic = new Graphic({
        geometry: point,
        symbol: markerSymbol
      });
      graphicsLayer.add(pointGraphic);
    },
    moveTo: function(extent, slide) {
      // console.log('moveTo::graphicsLayer', graphicsLayer)
      // console.log('moveTo::extent', extent)
      graphicsLayer.removeAll()
      if ( lineGeom ) {
        var nearest
        if ( slide === 3 ) {
          // Use southeast corner to pick up the first part of th track
          nearest = geometryEngine.nearestVertex(lineGeom, {
            type: 'point',
            x: extent.center.x,
            y: extent.ymin
          })
        } else {
          nearest = geometryEngine.nearestVertex(lineGeom, extent.center)
        }
        // console.log('nearest', nearest)
        var nextGeom = {
          type: 'point',
          x: nearest.coordinate.longitude,
          y: nearest.coordinate.latitude
        }
        // graphic.geometry = nextGeom
        graphicsLayer.add(new Graphic({
          geometry: nextGeom,
          symbol: markerSymbol
        }))

        // Find UWB anchors.
        console.log('querying point...', nearest)
        uwbPoints.findPoint(nearest.coordinate)
          .then(function(results) {
            console.log('results', result)
          })
          .catch(function(error) {
            console.log('uwb error', error)
          })
      }
    },
    setLineGeom: function(geom) {
      lineGeom = geom
    },
    show: function() {
      graphicsLayer.visible = true
    },
    hide: function() {
      graphicsLayer.visible = false
    }
  }
})
