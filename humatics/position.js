define([
  'esri/layers/GraphicsLayer',
  'esri/Graphic',
  'esri/geometry/Point',
  'esri/geometry/Polyline',
  'humatics/uwb-points'
], function(
  GraphicsLayer,
  Graphic,
  Point,
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

  var pointGraphic;
  var rays = {}

  return {
    addTo: function(scene, start) {
      scene.add(graphicsLayer)
      var point = {
        type: "point",
        x: start.longitude,
        y: start.latitude,
        z: 2
      };
      
      pointGraphic = new Graphic({
        geometry: point,
        symbol: markerSymbol
      });
      graphicsLayer.add(pointGraphic);
    },
    moveTo: function(point) {
      // graphicsLayer.remove(pointGraphic)
      graphicsLayer.removeAll()
      pointGraphic = null
      var nextGeom = {
        type: 'point',
        x: point.longitude,
        y: point.latitude,
        z: 2
      }
      pointGraphic = new Graphic({
        geometry: nextGeom,
        symbol: markerSymbol
      })
      graphicsLayer.add(pointGraphic)

      window.csvLayer.queryFeatures()
        .then(function(result) {
          // console.log('CSV query result', result)

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

          // Trying to update rays in place, can't get it to work.
          // var nextRays = []
          // result.features.forEach(function(feature) {
          //   nextRays.push(feature.attributes.name)
          //   if ( rays.hasOwnProperty(feature.attributes.name) ) {
          //     // Move ray to point to updated UWB position.
          //     var current = rays[feature.attributes.name]
          //     current.geometry.setPoint(0, 0, [point.longitude, point.latitude, 2])
          //     console.log('update a ray', feature.attributes.name) 
          //   } else {
          //     // New ray, add a line and keep track of it.
          //     var lineGeom = {
          //       type: 'polyline',
          //       paths: [
          //         [ 
          //           [point.longitude, point.latitude, 2],
          //           [feature.geometry.longitude, feature.geometry.latitude, 0]
          //         ]
          //       ]
          //     }
          //     // console.log('lineGeom', lineGeom)
          //     rays[feature.attributes.name] = new Graphic({
          //       geometry: lineGeom,
          //       symbol: lineSymbol
          //     })
          //     graphicsLayer.add(rays[feature.attributes.name])
          //   }
          // })
          // // Remove old rays.
          // Object.keys(rays).forEach(function(existing) {
          //   // console.log('looking at existing rays', existing)
          //   if ( nextRays.indexOf(existing) === -1 ) {
          //     graphicsLayer.remove(rays[existing])
          //     delete rays[existing]
          //   }
          // })
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
        return [feature.geometry.longitude, feature.geometry.latitude]
      })
      uwbLineGeom.paths = [ path ]
      uwbLine.add(new Graphic({
        geometry: uwbLineGeom,
        symbol: uwbLineSymbol
      }))
      scene.add(uwbLine)

      return uwbLineGeom
    }
  }
})
