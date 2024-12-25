// Define a dictionary which will be used to make legend and visualize image on map
var dict = {
    "names": [
      "Water",
      "Trees",
      "Flooded Vegetation",
      "Crops",
      "Built Area",
      "Bare Ground",
      "Snow/Ice",
      "Clouds",
      "Rangeland"
    ],
    "colors": [
      "#1A5BAB",
      "#358221",
      "#87D19E",
      "#FFDB5C",
      "#ED022A",
      "#EDE9E4",
      "#F2FAFF",
      "#C8C8C8",
      "#C6AD8D"
    ]};
    
    function remapper(image){
      var remapped = image.remap([1,2,4,5,7,8,9,10,11],[1,2,3,4,5,6,7,8,9])
      return remapped
    }
  
  // This is palette has '#000000' for value 3 and 6.
  var palette = [
      "#1A5BAB",
      "#358221",
      "#000000",
      "#87D19E",
      "#FFDB5C",
      "#000000",
      "#ED022A",
      "#EDE9E4",
      "#F2FAFF",
      "#C8C8C8",
      "#C6AD8D",
    ];
  
  // Create a panel to hold the legend widget
  var legend = ui.Panel({
    style: {
      position: 'bottom-left',
      padding: '8px 15px'
    }
  });
  
  // Function to generate the legend
  function addCategoricalLegend(panel, dict, title) {
    
    // Create and add the legend title.
    var legendTitle = ui.Label({
      value: title,
      style: {
        fontWeight: 'bold',
        fontSize: '18px',
        margin: '0 0 4px 0',
        padding: '0'
      }
    });
    panel.add(legendTitle);
    
    var loading = ui.Label('Loading legend...', {margin: '2px 0 4px 0'});
    panel.add(loading);
    
    // Creates and styles 1 row of the legend.
    var makeRow = function(color, name) {
      // Create the label that is actually the colored box.
      var colorBox = ui.Label({
        style: {
          backgroundColor: color,
          // Use padding to give the box height and width.
          padding: '8px',
          margin: '0 0 4px 0'
        }
      });
    
      // Create the label filled with the description text.
      var description = ui.Label({
        value: name,
        style: {margin: '0 0 4px 6px'}
      });
    
      return ui.Panel({
        widgets: [colorBox, description],
        layout: ui.Panel.Layout.Flow('horizontal')
      });
    };
    
    // Get the list of palette colors and class names from the image.
    var palette = dict['colors'];
    var names = dict['names'];
    loading.style().set('shown', false);
    
    for (var i = 0; i < names.length; i++) {
      panel.add(makeRow(palette[i], names[i]));
    }
    
    return panel;  // Return the panel instead of adding it to map
  }
  
  
  /*
    // Display map and legend ///////////////////////////////////////////////////////////////////////////////
  */
  
  // Center coordinates
  var centerPoint = ee.Geometry.Point([73.3675, 18.5941667]);
  
  // Create a 5km buffer around the center point (5000 meters)
  var boundingBox = centerPoint.buffer(5000).bounds();
  
  // Center the map at the specified location with adjusted zoom level
  Map.setCenter(73.3675, 18.5941667, 12);  // Changed zoom from 13 to 12 to better fit the 5km area
  
  // Add the legend to the map
  Map.add(addCategoricalLegend(legend, dict, 'Land Cover Class'));
  
  // Add only 2023 image to the map, clipped to the bounding box
  var lulc2023 = ee.ImageCollection(esri_lulc10
      .filterDate('2023-01-01','2023-12-31')
      .mosaic())
      .map(remapper)
      .first()  // Get the first (and only) image from the collection
      .clip(boundingBox);
  
  Map.addLayer(lulc2023, 
      {min:1, max:9, palette:dict['colors']}, 
      '2023 LULC 10m');
  
  // Optionally display the bounding box
  Map.addLayer(boundingBox, {color: 'red'}, 'Study Area');
  
  // Add a more visible marker at the center point
  Map.addLayer(centerPoint, 
      {
          color: '#FF0000',     // Bright red color
          pointSize: 15,        // Increased size
          pointShape: 'circle', // Changed to circle
          width: 3             // Thicker outline
      }, 
      'Site Location');
  
  // Calculate areas for each class
  var areas = ee.Image.pixelArea().addBands(lulc2023)
      .reduceRegion({
        reducer: ee.Reducer.sum().group({
          groupField: 1,
          groupName: 'class',
        }),
        geometry: boundingBox,
        scale: 10,
        maxPixels: 1e9
      });
  
  // Process the area calculation results
  areas.evaluate(function(result) {
    // Convert the result to a format suitable for the chart
    var areaStats = result.groups.map(function(group) {
      var classNumber = group.class;
      var classIndex = classNumber - 1;  // Convert class number to array index
      return {
        name: dict.names[classIndex],
        area: group.sum / 10000  // Convert to hectares
      };
    });
    
    // Create the pie chart with modified labels including area values
    var chart = ui.Chart.array.values({
      array: areaStats.map(function(stat) { return stat.area; }),
      axis: 0,
      xLabels: areaStats.map(function(stat) { 
        return stat.name + ' (' + stat.area.toFixed(2) + ' ha)';  // Add area to labels
      })
    }).setChartType('PieChart')
      .setOptions({
        title: 'Land Cover Distribution',
        slices: dict.colors.map(function(color) {
          return {color: color};
        }),
        pieHole: 0.4,  // Makes it a donut chart (optional)
        legend: {position: 'right'},  // Move legend to right for better readability
        chartArea: {left: 20, top: 20, width: '50%', height: '75%'}  // Adjust chart area to accommodate labels
      });
    
    // Print the chart and area statistics
    print('Land Cover Areas (hectares):', areaStats);
    print(chart);
  });
