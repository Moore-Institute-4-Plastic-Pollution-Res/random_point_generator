// Initialize the map
var map = L.map('map').setView([0, 0], 2);

// Base layers
var baseLayers = {
  "OpenStreetMap": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }),
  "Satellite": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri'
  })
};

// Add default base layer
baseLayers["OpenStreetMap"].addTo(map);

// Layer control for basemaps
L.control.layers(baseLayers).addTo(map);

// Feature Group to store editable layers
var drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

// Layer Group to store point markers
var pointMarkers = L.layerGroup().addTo(map);

// Initialize the draw control
var drawControl = new L.Control.Draw({
  draw: {
    polyline: false,
    rectangle: false,
    circle: false,
    marker: false,
    circlemarker: false
  },
  edit: {
    featureGroup: drawnItems
  }
});
map.addControl(drawControl);

var userPolygon;

map.on(L.Draw.Event.CREATED, function (e) {
  drawnItems.clearLayers();
  userPolygon = e.layer;
  drawnItems.addLayer(userPolygon);
  document.getElementById('downloadBtn').disabled = false;

  // Clear existing point markers
  pointMarkers.clearLayers();
});

function generateRandomPoints(polygon, numPoints) {
  var points = [];
  var maxIterations = 10; // Adjust as necessary
  var iterations = 0;

  var bbox = turf.bbox(polygon);

  var minX = bbox[0];
  var minY = bbox[1];
  var maxX = bbox[2];
  var maxY = bbox[3];

  var longitudesCrossAntimeridian = minX > maxX;

  if (longitudesCrossAntimeridian) {
    // Adjust maxX to be in the correct range
    maxX += 360;
  }

  while (points.length < numPoints && iterations < maxIterations) {
    var pointsToGenerate = (numPoints - points.length) * 5; // Generate more points than needed
    var randomPoints = {
      "type": "FeatureCollection",
      "features": []
    };

    for (var i = 0; i < pointsToGenerate; i++) {
      var randX = minX + Math.random() * (maxX - minX);

      // Wrap longitude back to -180 to 180 range
      if (randX > 180) {
        randX -= 360;
      }

      var randY = minY + Math.random() * (maxY - minY);

      var point = turf.point([randX, randY]);
      randomPoints.features.push(point);
    }

    // Filter points within the main polygon
    var ptsWithin = turf.pointsWithinPolygon(randomPoints, polygon);

    ptsWithin.features.forEach(function(feature) {
      if (points.length < numPoints) {
        points.push(feature.geometry.coordinates);
      }
    });

    iterations++;
  }

  if (points.length < numPoints) {
    alert('Could not generate the desired number of points within the polygon. Please try drawing a larger polygon or reducing the number of points.');
  }

  return points;
}

// Download the points as a CSV file
function downloadCSV(points) {
  var csvContent = "point_number,latitude,longitude\n";
  points.forEach(function(point, index) {
    csvContent += (index + 1) + "," + point[1] + "," + point[0] + "\n";
  });
  var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, 'random_points.csv');
}

// Plot points on the map
function plotPointsOnMap(points) {
  // Clear existing markers
  pointMarkers.clearLayers();

  var latLngs = [];

  // Add new markers
  points.forEach(function(coord) {
    var marker = L.circleMarker([coord[1], coord[0]], {
      radius: 5,
      fillColor: '#ff7800',
      color: '#000',
      weight: 1,
      opacity: 1,
      fillOpacity: 0.8
    });
    pointMarkers.addLayer(marker);
    latLngs.push([coord[1], coord[0]]);
  });

  // Adjust map view to fit the points
  if (latLngs.length > 0) {
    var bounds = L.latLngBounds(latLngs);
    map.fitBounds(bounds);
  }
}

// Instructions Modal Functionality
var instructionsModal = new bootstrap.Modal(document.getElementById('instructionsModal'), {});
var instructionsBtn = document.getElementById('instructionsBtn');

instructionsBtn.addEventListener('click', function() {
  instructionsModal.show();
});

// Report Issue Button Functionality
document.getElementById('reportIssueBtn').addEventListener('click', function() {
  window.open('https://github.com/wincowgerDEV/mapRPG/issues', '_blank');
});

// Handle the Download CSV button click
document.getElementById('downloadBtn').addEventListener('click', function() {
  if (!userPolygon) {
    alert('Please draw a polygon first.');
    return;
  }

  var geojson = userPolygon.toGeoJSON();
  var numPointsInput = document.getElementById('numPoints').value;
  var numPoints = parseInt(numPointsInput, 10);

  if (isNaN(numPoints) || numPoints < 1) {
    alert('Please enter a valid number of points (minimum 1).');
    return;
  }

  // Generate random points
  var points = generateRandomPoints(geojson.geometry, numPoints);

  // Download CSV
  downloadCSV(points);

  // Plot points on the map
  plotPointsOnMap(points);
});
