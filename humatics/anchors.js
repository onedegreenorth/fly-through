define(['esri/layers/CSVLayer'], function(CSVLayer) {
  return {
    addTo: function(scene) {
      // console.log('loading csv layer')
      var url = "data/anchors.csv";

      var template = {
        title: "UWB Anchors",
        content: "Anchor:  {name}"
      };

      window.csvLayer = new CSVLayer({
        url: url,
        copyright: "Humatics",
        popupTemplate: template,
        visible: false,
        elevationInfo: {
          mode: "relative-to-ground",
          offset: 10
        },
        labelingInfo: [{
          labelPlacement: "above-center",
          labelExpressionInfo: {
            value: "{name}"
          },
          symbol: {
            type: "label-3d",
            symbolLayers: [{
              type: "text",
              material: {
                color: "black"
              },
              halo: {
                color: [255, 255, 255, 0.7],
                size: 2
              },
              size: 10
            }]
          }
        }],
        labelsVisible: true
      });

      csvLayer.renderer = {
        type: "simple",
        symbol: {
          type: "point-3d",
          symbolLayers: [{
            type: "object",
            width: 2,
            height: 2,
            depth: 2,
            resource: { primitive: "sphere" },
            material: { color: [0, 255, 255, 0.75] }
          }]
        }
      };
      scene.add(csvLayer)
    }
  }
})