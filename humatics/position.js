define([
  'esri/layers/GraphicsLayer',
  'esri/Graphic',
  'esri/geometry/geometryEngine'
], function(
  GraphicsLayer,
  Graphic,
  geometryEngine
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
    moveTo: function(extent) {
      // console.log('moveTo::graphicsLayer', graphicsLayer)
      // console.log('moveTo::extent', extent)
      graphicsLayer.removeAll()
      if ( lineGeom ) {
        var nearest = geometryEngine.nearestVertex(lineGeom, extent.center)
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
      }
    },
    setLineGeom: function(geom) {
      lineGeom = geom
    }
  }
})
