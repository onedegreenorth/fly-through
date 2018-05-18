define([
  'esri/layers/GraphicsLayer',
  'esri/Graphic',
  'esri/geometry/Polyline',
  'humatics/uwb-points'
], function(
  GraphicsLayer,
  Graphic,
  Polyline,
  uwbPoints
) {
  var blue = [77, 144, 254]
  var graphicsLayer = new GraphicsLayer({
    elevationInfo: { 
      mode: 'relative-to-ground',
      offset: 10
    }
  });
  var markerSymbol = {
    type: "simple-marker",
    color: blue,
    outline: {
      color: [255, 255, 255],
      width: 2
    }
  };
  var lineSymbol = {
    type: "simple-line",
    color: [0, 255, 255, 0.75],
    width: 2
  };

  var uwbLine = new GraphicsLayer({
    elevationInfo: { 
      mode: 'relative-to-ground',
      offset: 10
    }
  })
  var uwbLineSymbol = {
    type: "simple-line",
    color: blue,
    width: 4
  }

  return {
    addTo: function(scene, start) {
      scene.add(graphicsLayer)
      var point = {
        type: "point",
        x: start.longitude,
        y: start.latitude,
        z: 2
      };
      
      var pointGraphic = new Graphic({
        geometry: point,
        symbol: markerSymbol
      });
      graphicsLayer.add(pointGraphic);
    },
    moveTo: function(point) {
      graphicsLayer.removeAll()
      var nextGeom = {
        type: 'point',
        x: point.longitude,
        y: point.latitude,
        z: 2
      }
      graphicsLayer.add(new Graphic({
        geometry: nextGeom,
        symbol: markerSymbol
      }))

      window.csvLayer.queryFeatures()
        .then(function(result) {
          // console.log('CSV query result', result)
          // console.log('nextGeom', nextGeom, point)
          result.features.forEach(function(feature) {
            var lineGeom = {
              type: 'polyline',
              paths: [
                [ 
                  [point.longitude, point.latitude, 2],
                  [feature.geometry.longitude, feature.geometry.latitude, 0]
                ]
              ]
            }
            // console.log('lineGeom', lineGeom)
            graphicsLayer.add(new Graphic({
              geometry: lineGeom,
              symbol: lineSymbol
            }))
          })
        })
        .catch(function(error) {
          console.log('CSV layer query error', error)
        })
    },
    show: function() {
      graphicsLayer.visible = true
    },
    hide: function() {
      graphicsLayer.visible = false
    },
    addLine: function(scene, features) {
      var uwbLineGeom = { type: 'polyline' }
      var path = features.map(function(feature) {
        return [feature.geometry.x, feature.geometry.y]
      })
      uwbLineGeom.paths = [ path ]
      uwbLine.add(new Graphic({
        geometry: uwbLineGeom,
        symbol: uwbLineSymbol
      }))
      scene.add(uwbLine)
    }
  }
})
