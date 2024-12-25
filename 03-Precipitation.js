// Center coordinates (same as previous analyses)
var centerPoint = ee.Geometry.Point([73.3675, 18.5941667]);
var boundingBox = centerPoint.buffer(5000).bounds();

// Import CHIRPS precipitation data for 2023 instead of 2024
var dataset = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY')
    .filterDate('2023-01-01', '2023-12-31')
    .filterBounds(boundingBox);

// Function to calculate monthly precipitation
var monthlyPrecip = ee.List.sequence(1, 12).map(function(month) {
  var filtered = dataset.filter(ee.Filter.calendarRange(month, month, 'month'));
  var monthly = filtered.sum();
  return monthly.set('month', month)
                .set('system:time_start', ee.Date.fromYMD(2024, month, 1));
});

// Convert the list to an image collection
var monthlyPrecipCollection = ee.ImageCollection.fromImages(monthlyPrecip);

// Calculate monthly precipitation values for the study area
var precipStats = monthlyPrecipCollection.map(function(image) {
  var stats = image.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: boundingBox,
    scale: 5000,
    maxPixels: 1e9
  });
  return ee.Feature(null, {
    'month': image.get('month'),
    'precipitation': stats.get('precipitation')
  });
});

// Create a time series chart
var chart = ui.Chart.feature.byFeature({
  features: precipStats,
  xProperty: 'month',
  yProperties: ['precipitation']
})
.setChartType('ColumnChart')
.setOptions({
  title: 'Monthly Precipitation 2023',
  hAxis: {
    title: 'Month',
    ticks: [
      {v: 1, f: 'Jan'},
      {v: 2, f: 'Feb'},
      {v: 3, f: 'Mar'},
      {v: 4, f: 'Apr'},
      {v: 5, f: 'May'},
      {v: 6, f: 'Jun'},
      {v: 7, f: 'Jul'},
      {v: 8, f: 'Aug'},
      {v: 9, f: 'Sep'},
      {v: 10, f: 'Oct'},
      {v: 11, f: 'Nov'},
      {v: 12, f: 'Dec'}
    ]
  },
  vAxis: {title: 'Precipitation (mm)'},
  colors: ['#0066cc'],
  legend: {position: 'none'}
});

// Create visualization parameters for the map
var precipitationVis = {
  min: 0,
  max: 500,
  palette: ['#FFFFFF', '#D2EFF7', '#96CCE2', '#5BA4D4', '#3E8EC4', '#2E6FAD', '#1C4C96', '#0C2C7E', '#041451']
};

// Calculate annual precipitation
var annualPrecip = dataset.sum().clip(boundingBox);

// Center the map
Map.setCenter(73.3675, 18.5941667, 12);

// Add layers to map
Map.addLayer(annualPrecip, precipitationVis, 'Annual Precipitation 2023');
Map.addLayer(boundingBox, {color: 'red'}, 'Study Area');
Map.addLayer(centerPoint, {
    color: '#FF0000',
    pointSize: 15,
    pointShape: 'circle',
    width: 3
}, 'Site Location');

// Create a legend for precipitation
var legend = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '8px 15px'
  }
});

// Add legend title
legend.add(ui.Label({
  value: 'Annual Precipitation (mm)',
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

// Add legend items
var steps = [0, 100, 200, 300, 400, 500];
for (var i = 0; i < precipitationVis.palette.length - 1; i++) {
  legend.add(makeRow(
    precipitationVis.palette[i],
    steps[i] + ' - ' + steps[i + 1] + ' mm'
  ));
}

// Add the legend to the map
Map.add(legend);

// Print the chart
print(chart);

// Calculate and print annual statistics
var annualStats = annualPrecip.reduceRegion({
  reducer: ee.Reducer.mean(),
  geometry: boundingBox,
  scale: 5000,
  maxPixels: 1e9
});

annualStats.evaluate(function(stats) {
  print('Total Annual Precipitation:', stats.precipitation.toFixed(2), 'mm');
});


///Total Annual Precipitation: 1686.66mm