// Center coordinates (same as previous analyses)
var centerPoint = ee.Geometry.Point([73.3675, 18.5941667]);
var boundingBox = centerPoint.buffer(5000).bounds();

// Import MODIS Land Surface Temperature data
var dataset = ee.ImageCollection('MODIS/061/MOD11A1')
    .filterDate('2023-01-01', '2023-12-31')
    .filterBounds(boundingBox);

// Select day and night temperatures
var dayTemp = dataset.select('LST_Day_1km');
var nightTemp = dataset.select('LST_Night_1km');

// Function to convert temperature from Kelvin to Celsius
function convertToCelsius(image) {
  return image.multiply(0.02).subtract(273.15)
    .copyProperties(image, ['system:time_start']);
}

// Apply conversion to both day and night temperatures
var dayTempC = dayTemp.map(convertToCelsius);
var nightTempC = nightTemp.map(convertToCelsius);

// Calculate monthly temperature statistics
var monthlyStats = ee.List.sequence(1, 12).map(function(month) {
  var monthData = dataset.filter(ee.Filter.calendarRange(month, month, 'month'));
  
  var dayC = monthData.select('LST_Day_1km').mean().multiply(0.02).subtract(273.15);
  var nightC = monthData.select('LST_Night_1km').mean().multiply(0.02).subtract(273.15);
  
  var stats = ee.Dictionary({
    'month': month,
    'month_name': ee.Date.fromYMD(2023, month, 1).format('MMM'),
    'day_temp': dayC.reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: boundingBox,
      scale: 1000,
      maxPixels: 1e9
    }).get('LST_Day_1km'),
    'night_temp': nightC.reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: boundingBox,
      scale: 1000,
      maxPixels: 1e9
    }).get('LST_Night_1km')
  });
  
  return ee.Feature(null, stats);
});

// Create a time series chart with monthly data
var chart = ui.Chart.feature.byFeature({
  features: ee.FeatureCollection(monthlyStats),
  xProperty: 'month_name',
  yProperties: ['day_temp', 'night_temp']
})
.setChartType('LineChart')
.setOptions({
  title: 'Monthly Average Land Surface Temperature 2023',
  hAxis: {
    title: 'Month',
    titleTextStyle: {italic: false, bold: true}
  },
  vAxis: {
    title: 'Temperature (°C)',
    titleTextStyle: {italic: false, bold: true}
  },
  series: {
    0: {color: '#ff4e4e', lineWidth: 2, pointSize: 6, lineDashStyle: [0], name: 'Day Temperature'},
    1: {color: '#4286f4', lineWidth: 2, pointSize: 6, lineDashStyle: [0], name: 'Night Temperature'}
  },
  legend: {position: 'bottom'},
  pointSize: 5,
  curveType: 'function'  // Makes the line smooth
});

// Calculate annual mean temperatures
var annualDayTemp = dayTempC.mean().clip(boundingBox);
var annualNightTemp = nightTempC.mean().clip(boundingBox);

// Visualization parameters
var tempVis = {
  min: 0,
  max: 40,
  palette: [
    '040274', '040281', '0502a3', '0502b8', '0502ce', '0502e6',
    '0602ff', '235cb1', '307ef3', '269db1', '30c8e2', '32d3ef',
    '3be285', '3ff38f', '86e26f', '3ae237', 'b5e22e', 'd6e21f',
    'fff705', 'ffd611', 'ffb613', 'ff8b13', 'ff6e08', 'ff500d',
    'ff0000'
  ]
};

// Center the map
Map.setCenter(73.3675, 18.5941667, 12);

// Add layers to map
Map.addLayer(annualDayTemp, tempVis, 'Mean Day Temperature 2023');
Map.addLayer(annualNightTemp, tempVis, 'Mean Night Temperature 2023');
Map.addLayer(boundingBox, {color: 'red'}, 'Study Area');
Map.addLayer(centerPoint, {
    color: '#FF0000',
    pointSize: 15,
    pointShape: 'circle',
    width: 3
}, 'Site Location');

// Create a legend
var legend = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '8px 15px'
  }
});

// Add legend title
legend.add(ui.Label({
  value: 'Temperature (°C)',
  style: {
    fontWeight: 'bold',
    fontSize: '18px',
    margin: '0 0 4px 0',
    padding: '0'
  }
}));

// Create legend rows
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
var steps = [0, 10, 20, 30, 40];
for (var i = 0; i < steps.length - 1; i++) {
  legend.add(makeRow(
    tempVis.palette[Math.floor(i * tempVis.palette.length / (steps.length - 1))],
    steps[i] + ' - ' + steps[i + 1] + ' °C'
  ));
}

// Add the legend to the map
Map.add(legend);

// Print the chart
print(chart);

// Calculate and print annual statistics
var annualStats = ee.Dictionary({
  'day_temp': annualDayTemp.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: boundingBox,
    scale: 1000,
    maxPixels: 1e9
  }),
  'night_temp': annualNightTemp.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: boundingBox,
    scale: 1000,
    maxPixels: 1e9
  })
});

annualStats.evaluate(function(stats) {
  print('Mean Annual Day Temperature:', stats.day_temp.LST_Day_1km.toFixed(2), '°C');
  print('Mean Annual Night Temperature:', stats.night_temp.LST_Night_1km.toFixed(2), '°C');
  print('Note: Values shown are monthly averages for 2023');
});