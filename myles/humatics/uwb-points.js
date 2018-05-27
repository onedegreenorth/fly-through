define([
  'esri/request', 'esri/layers/FeatureLayer'
], function(
  esriRequest, FeatureLayer
) {
  // layer item id:  3a9c31b3c0e24c74a42277554edc5473
  var uwb = new FeatureLayer({
    portalItem: {
      id: '3a9c31b3c0e24c74a42277554edc5473'
    }
  })

  // var pointsUrl = "data/uwb_gps_synced_int_time.csv"
  // var pointData = {}
  // Not working, bail...
  // return
  // esriRequest(pointsUrl, { responseType: 'text' })
  //   .then(function(response) {
  //     // console.log('point data', response.data)
  //     var rows = response.data.split('\n')
  //     var header = rows.shift().split(',')
  //     var uwbLatIndex = header.indexOf('uwb_latitude')
  //     var uwbLonIndex = header.indexOf('uwb_longitude')
  //     var anchorIndexes = []
  //     header.forEach(function(field, index) {
  //       if ( field.indexOf('anchor') > -1 ) {
  //         anchorIndexes.push(index)
  //       }
  //     })
  //     rows.forEach(function(row) {
  //       var data = row.split(',')
  //       var ll = data[uwbLatIndex] + data[uwbLonIndex]
  //       var anchors = anchorIndexes.map(function(anchor) {
  //         return data[anchor]
  //       }).filter(function(val) { return !!val })
  //       pointData[ll] = anchors
  //     })
  //     // console.log('total points', Object.keys(pointData).length)
  //   })
  //   .catch(function(error) {
  //     console.log('error getting point data', error)
  //   })

  return {
    findPoint: function(poi) {
      // var position = '' + poi.latitude + poi.longitude
      console.log('called findPoint', poi)
      return uwb.queryFeatures({
        // geometry: poi,
        // distance: 10,
        // units: 'meters',
        // outSpatialReference: { wkid: 4326 }
        where: '1=1'
      })
    }
  }
})