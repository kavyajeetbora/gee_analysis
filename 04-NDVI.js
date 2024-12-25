// Center coordinates (same as previous analyses)
var centerPoint = ee.Geometry.Point([73.3675, 18.5941667]);
var boundingBox = centerPoint.buffer(5000).bounds();

// Import Sentinel-2 Surface Reflectance data
var s2 = ee.ImageCollection('COPERNICUS/S2_SR')
    .filterDate('2023-01-01', '2023-12-31')
    .filterBounds(boundingBox)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)); // Filter cloudy images

// Function to calculate NDVI
function addNDVI(image) {
  var ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
  return image.addBands(ndvi);
}

// Map the NDVI function over the collection
var withNDVI = s2.map(addNDVI);

// Function to calculate monthly NDVI
var monthlyNDVI = ee.List.sequence(1, 12).map(function(month) {
  var filtered = withNDVI
    .filter(ee.Filter.calendarRange(month, month, 'month'))
    .select('NDVI');
  var monthly = filtered.mean();
  return monthly.set('month', month)
                .set('system:time_start', ee.Date.fromYMD(2023, month, 1));
});

// Convert the list to an image collection
var monthlyNDVICollection = ee.ImageCollection.fromImages(monthlyNDVI);

// Calculate monthly NDVI values for the study area
var ndviStats = monthlyNDVICollection.map(function(image) {
  var stats = image.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: boundingBox,
    scale: 10,
    maxPixels: 1e9
  });
  return ee.Feature(null, {
    'month': image.get('month'),
    'NDVI': stats.get('NDVI')
  });
});

// Create a time series chart
var chart = ui.Chart.feature.byFeature({
  features: ndviStats,
  xProperty: 'month',
  yProperties: ['NDVI']
})
.setChartType('LineChart')
.setOptions({
  title: 'Monthly NDVI 2023',
  hAxis: {
    title: 'Month',
    ticks: [
      {v: 1, f: 'Jan'}, {v: 2, f: 'Feb'}, {v: 3, f: 'Mar'},
      {v: 4, f: 'Apr'}, {v: 5, f: 'May'}, {v: 6, f: 'Jun'},
      {v: 7, f: 'Jul'}, {v: 8, f: 'Aug'}, {v: 9, f: 'Sep'},
      {v: 10, f: 'Oct'}, {v: 11, f: 'Nov'}, {v: 12, f: 'Dec'}
    ]
  },
  vAxis: {
    title: 'NDVI',
    minValue: -1,
    maxValue: 1
  },
  colors: ['#0f8755'],
  lineWidth: 2,
  pointSize: 5
});

// Calculate annual mean NDVI
var annualNDVI = withNDVI.select('NDVI').mean().clip(boundingBox);

// Visualization parameters for NDVI
var ndviVis = {
  min: -0.2,
  max: 0.8,
  palette: [
    '#d73027', // red (low vegetation)
    '#f46d43',
    '#fdae61',
    '#fee08b',
    '#ffffbf',
    '#d9ef8b',
    '#a6d96a',
    '#66bd63',
    '#1a9850'  // green (high vegetation)
  ]
};

// Center the map
Map.setCenter(73.3675, 18.5941667, 12);

// Add layers to map
Map.addLayer(annualNDVI, ndviVis, 'Annual Mean NDVI 2023');
Map.addLayer(boundingBox, {color: 'red'}, 'Study Area');
Map.addLayer(centerPoint, {
    color: '#FF0000',
    pointSize: 15,
    pointShape: 'circle',
    width: 3
}, 'Site Location');

// Create a legend for NDVI
var legend = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '8px 15px'
  }
});

// Add legend title
legend.add(ui.Label({
  value: 'NDVI Values\n(Vegetation Index)',
  style: {
    fontWeight: 'bold',
    fontSize: '18px',
    margin: '0 0 4px 0',
    padding: '0'
  }
}));

// Add color bar segments to legend
var makeRow = function(color, name) {
  var colorBox = ui.Label({
    style: {
      backgroundColor: color,
      padding: '8px',
      margin: '0 0 4px 0'
    }
  });
  var description = ui.Label({
    value: name,
    style: {margin: '0 0 4px 6px'}
  });
  return ui.Panel({
    widgets: [colorBox, description],
    layout: ui.Panel.Layout.Flow('horizontal')
  });
};

// Alternative more detailed legend implementation
var legendLabels = [
  {color: '#d73027', label: '-0.2 to 0.0'},
  {color: '#f46d43', label: '0.0 to 0.2'},
  {color: '#fdae61', label: '0.2 to 0.4'},
  {color: '#fee08b', label: '0.4 to 0.5'},
  {color: '#ffffbf', label: '0.5 to 0.6'},
  {color: '#d9ef8b', label: '0.6 to 0.7'},
  {color: '#a6d96a', label: '0.7 to 0.8'},
  {color: '#66bd63', label: '0.8 to 0.9'},
  {color: '#1a9850', label: '0.9 to 1.0'}
];

// Add legend items
legendLabels.forEach(function(item) {
  legend.add(makeRow(item.color, item.label));
});

// Add the legend to the map
Map.add(legend);

// Print the chart
print(chart);

// Calculate and print annual NDVI statistics
var annualNDVIStats = annualNDVI.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: boundingBox,
  scale: 10,
  maxPixels: 1e9
});

annualNDVIStats.evaluate(function(stats) {
  print('Mean Annual NDVI:', stats.NDVI.toFixed(3));
}); 