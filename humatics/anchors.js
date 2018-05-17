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
        elevationInfo: {
          mode: "relative-to-scene"
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
            }],
            verticalOffset: {
              screenLength: 150,
              maxWorldLength: 2000,
              minWorldLength: 30
            },
            callout: {
              type: "line",
              size: 0.5,
              color: [0, 0, 0],
              border: {
                color: [255, 255, 255, 0.7]
              }
            }
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
            material: { color: [255, 85, 0, 0.75] }
          }],
          verticalOffset: {
            screenLength: 10,
            maxWorldLength: 200,
            minWorldLength: 10
          },

          // callout: {
          //   type: "line",
          //   color: "white",
          //   size: 2,
          //   border: {
          //     color: [255, 255, 255]
          //   }
          // }
        }
      };
      scene.add(csvLayer)
    }
  }
})