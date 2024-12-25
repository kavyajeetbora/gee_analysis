// Import ALOS DEM
var dataset = ee.ImageCollection('JAXA/ALOS/AW3D30/V3_2');

// Center coordinates (same as land cover analysis)
var centerPoint = ee.Geometry.Point([73.3675, 18.5941667]);

// Create a 5km buffer around the center point (5000 meters)
var boundingBox = centerPoint.buffer(5000).bounds();

// Get the DEM data
var dem = dataset.select('DSM').mosaic().clip(boundingBox);

// Calculate elevation statistics for the area
var elevationStats = dem.reduceRegion({
  reducer: ee.Reducer.minMax(),
  geometry: boundingBox,
  scale: 30,
  maxPixels: 1e9
});

// Create visualization parameters using computed min and max
elevationStats.evaluate(function(stats) {
  var min = stats.DSM_min;
  var max = stats.DSM_max;
  
  // Update visualization parameters with actual min/max
  var elevationVis = {
    min: min,
    max: max,
    palette: [
      '#006147', // dark green (low elevation)
      '#107A2F',
      '#4C9A25',
      '#92B91C',
      '#C7D514',
      '#FFED0F',
      '#FFC30B',
      '#FF9B08',
      '#FF6405',
      '#FF0002'  // red (high elevation)
    ]
  };

  // Add layers to map with updated visualization
  Map.addLayer(dem, elevationVis, 'Elevation');
  Map.addLayer(boundingBox, {color: 'red'}, 'Study Area');
  Map.addLayer(centerPoint, {
      color: '#FF0000',
      pointSize: 15,
      pointShape: 'circle',
      width: 3
  }, 'Site Location');

  // Create legend
  var legend = ui.Panel({
    style: {
      position: 'bottom-left',
      padding: '8px 15px'
    }
  });
  
  // Add legend title with actual elevation range
  legend.add(ui.Label({
    value: 'Elevation (m)\n' + Math.round(min) + ' - ' + Math.round(max),
    style: {
      fontWeight: 'bold',
      fontSize: '18px',
      margin: '0 0 4px 0',
      padding: '0'
    }
  }));
  
  // Create legend rows
  var makeRow = function(color, value) {
    var colorBox = ui.Label({
      style: {
        backgroundColor: color,
        padding: '8px',
        margin: '0 0 4px 0'
      }
    });
    var description = ui.Label({
      value: Math.round(value) + ' m',
      style: {margin: '0 0 4px 6px'}
    });
    return ui.Panel({
      widgets: [colorBox, description],
      layout: ui.Panel.Layout.Flow('horizontal')
    });
  };
  
  // Add dynamic legend items
  var range = max - min;
  var step = range / 5;
  for (var i = 0; i < 5; i++) {
    var value = min + (step * i);
    var color = elevationVis.palette[Math.floor(i * elevationVis.palette.length / 5)];
    legend.add(makeRow(color, value));
  }
  // Add the maximum value
  legend.add(makeRow(elevationVis.palette[elevationVis.palette.length - 1], max));
  
  Map.add(legend);
  
  // Print elevation statistics
  print('Minimum Elevation:', min.toFixed(2), 'm');
  print('Maximum Elevation:', max.toFixed(2), 'm');
  
  // Create elevation histogram
  var histogram = ui.Chart.image.histogram({
    image: dem,
    region: boundingBox,
    scale: 30,
    maxPixels: 1e9
  }).setOptions({
    title: 'Elevation Distribution',
    hAxis: {title: 'Elevation (m)'},
    vAxis: {title: 'Count'},
    legend: {position: 'none'}
  });
  
  print(histogram);
});
