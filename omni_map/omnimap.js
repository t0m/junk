var GoogleMap, BingMap, NokiaMap, MapquestMap;
var MapMonitor;

function getMapArray() {
  return [GoogleMap, BingMap, NokiaMap, MapquestMap];
}

//sync the location and zoom of the otherMaps to the sourceMap
function syncMaps(sourceMap, otherMaps) {
  var latlong = getLatLong(sourceMap);
  var zoom = getZoom(sourceMap);
  $.each(otherMaps, function(i, other) {
    centerMap(other, latlong);
    setZoom(other, zoom);
  });
}

//get every other map besides the passed in one
function getMapsBesides(map) {
  return $.grep(getMapArray(), function(value) { return value != map });
}

//two maps are close enough if the latitude and longitude are within 0.01 of each other
function closeEnough(latLong, otherLatLong) {
  return Math.abs(latLong[0] - otherLatLong[0]) < 0.01 && Math.abs(latLong[1] - otherLatLong[1]) < 0.01;
}

var latlongComparator= function(map1, map2) { 
  return closeEnough(getLatLong(map1), getLatLong(map2));
}
var zoomComparator = function(map1, map2) {
  return getZoom(map1) === getZoom(map2);
}

//find a map that has a different center than the others
function findOutOfSyncMap() {
  var zoomedMap = findOddball(getMapArray(), zoomComparator);
  if (zoomedMap !== null) { 
    return zoomedMap;
  }
  return findOddball(getMapArray(), latlongComparator);
}

function startMonitor() {
  MapMonitor = setInterval(function() { 
    var outOfSync = findOutOfSyncMap();
    if (outOfSync != null) {
      var others = getMapsBesides(outOfSync);
      syncMaps(outOfSync, others);
    }}, 20);
}

function stopMonitor() {
  clearInterval(MapMonitor);
}


//generic function to find the oddball in an array given a comparator function
function findOddball(array, comparator) {
  var cur = array[0];
  var candidate = null;
  for (var i = 1; i < array.length; i++) {
    var same = comparator(cur, array[i]);
    if (candidate != null) {
      return same? candidate : cur;
    }
    if (!same) {
      candidate = cur;
    }
    cur = array[i];
  }
  return candidate == null? null : cur;
}


/****************************************************************************
 * wrapper functions to unify common actions across the different map apis 
 ****************************************************************************/


function getLatLong(map) {
  if (map === GoogleMap) {
    var ll = GoogleMap.getCenter();
    return [ll.lat(), ll.lng()];
  }
  if (map === BingMap) {
    var ll = BingMap.getCenter();
    return [ll.latitude, ll.longitude];
  }
  if (map === NokiaMap) {
    var ll = NokiaMap.center;
    return [ll.latitude, ll.longitude];
  }
  if (map == MapquestMap) {
    var ll = MapquestMap.getCenter();
    return[ll.lat, ll.lng];
  }
}

function getZoom(map) {
  var zoom;
  if (map === GoogleMap) {
    zoom = GoogleMap.getZoom();
  } else if (map === BingMap) {
    //the bing zoom returns the current zoom of the map, which changes
    //constantly during animation.... targetZoom is what we're looking for
    zoom = BingMap.getTargetZoom(); 
  } else if (map === NokiaMap) {
    zoom = NokiaMap.zoomLevel;
  } else if (map === MapquestMap) {
    zoom = MapquestMap.zoom;
  }
  return zoom;
}

function centerMap(map, latlng) {
  if (map === GoogleMap) {
    GoogleMap.setCenter(new google.maps.LatLng(latlng[0], latlng[1]));
  } else if (map === BingMap) {
    var viewOptions = { center: new Microsoft.Maps.Location(latlng[0], latlng[1]), animate: false };
    BingMap.setView(viewOptions)
  } else if (map === NokiaMap) {
    var center = new nokia.maps.geo.Coordinate(latlng[0], latlng[1]);
    NokiaMap.setCenter(center);
  } else if (map === MapquestMap) {
    MapquestMap.setCenter(new MQA.LatLng(latlng[0], latlng[1]));
  }
}

function setZoom(map, zoom) {
  if (map === GoogleMap) {
    //google only likes integers for zoom levels
    if (parseInt(zoom) !== getZoom(GoogleMap)) { 
      GoogleMap.setZoom(parseInt(zoom)); 
    }
  } else if (map === BingMap) {
    BingMap.setView({ zoom: zoom })
  } else if (map === NokiaMap) {
    NokiaMap.setZoomLevel(zoom);
  } else if (map === MapquestMap) {
    MapquestMap.setZoomLevel(zoom);
  }
}


/****************************************************************************
 * initialization functions 
 ****************************************************************************/

var START_LAT  = -34.397;
var START_LNG  = 150.644;
var START_ZOOM = 8;

function initGoogle() {
  var mapOptions = {
    center: new google.maps.LatLng(START_LAT, START_LNG),
    zoom: START_ZOOM,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    useInertia: false
  };
  GoogleMap = new google.maps.Map(document.getElementById("googleMap"), mapOptions);
  $('#googleMap').data('map', GoogleMap);
}

function initBing() {
  var options = {
    credentials:"AlTMS3GWuJmJiJQ5EVWM4nn_3ons8mIFQ-u-Z8FH7XxjoYJj5XvWVhAeL57-iRrU",
    center: new Microsoft.Maps.Location(START_LAT, START_LNG),
    zoom: START_ZOOM,

  }
  var container = document.getElementById("bingMap");
  BingMap = new Microsoft.Maps.Map(container, options);
  $('#bingMap').data('map', BingMap);
}

function initNokia() {
  var mapContainer = document.getElementById("nokiaMap");
  nokia.Settings.set( "appId", "lH56kdWYeabBMs-ss9L-"); 
  nokia.Settings.set( "authenticationToken", "Us8hKI5NPfLkFUXdMO2ipQ");

  NokiaMap = new nokia.maps.map.Display(mapContainer, {
    center: [START_LAT, START_LNG],
    zoomLevel: START_ZOOM,
    components: [
      new nokia.maps.map.component.Behavior(),
      new nokia.maps.map.component.ZoomBar(),
      new nokia.maps.map.component.ScaleBar()
    ]
  });
  NokiaMap.set("baseMapType", nokia.maps.map.Display.TRAFFIC);
  $('#nokiaMap').data('map', NokiaMap);
}

function initMapquest() {
  var options={
    elt:document.getElementById('mapquestMap'),
    zoom:START_ZOOM,
    latLng:{lat:START_LAT, lng:START_LNG},
    mtype:'map',
    bestFitMargin:0,
    zoomOnDoubleClick:true
  };

  MapquestMap = new MQA.TileMap(options);
  $('#mapquestMap').data('map', MapquestMap);
}