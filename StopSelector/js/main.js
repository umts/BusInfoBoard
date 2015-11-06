// Javascript for parsing and displaying departure information

var options =
{
  url: "http://bustracker.pvta.com/InfoPoint/rest/",
  title: "",                      // title to display at top of page
  logo_url: ""                    // logo to display at top of page
}

$(function() {
  updateOptions();
  initTitle();
  loadAllStops();

  setTimeout(removeFade, 500);
  // Load the BusInfoBoard with the selected stops
  $( '.go-button').on('click', function() {
    // Buttons are the row after the stop selector
    var stops = $(this).parents('.row').prev().find('.stops').val();
    document.location.href = busBoardURL(stops);
  });

  // List of all PVTA routes
  var routes = $('.routes');
  var routeStops = $('.route-stops');

  // Use the Chosen jQuery plugin for our multiple select boxes
  routes.chosen();
  routeStops.chosen();
  $('.nearby-stops').chosen();
  
  function loadAllStops(){
    var stops = [];
      $.ajax({
        url: options.url + 'stops/getallstops',  
        success: function(allStops){
          console.log(typeof allStops);
          allStops = uniqueifyAndSort(allStops);
          stopList(routeStops, allStops);
        } //end success callback
    }); //end ajax call
  }

  
  
  // When a route is added or removed from the list, reload the list of stops
  // accessible by those routes
  routes.on("change", function() {
    var routes = $('.routes').val() || [];
    var remainingRoutes = routes.length;
    var stops = [];
    // For each route selected, we get a list of stops
    if(routes.length === 0) loadAllStops();
    else{
      for (var i = 0; i < routes.length; i++) {
        $.ajax({
          url: options.url + "routedetails/get/" + routes[i],
          success: function(route_details) {
            stops.push(route_details.Stops);
            remainingRoutes--;
            if (remainingRoutes == 0) {
              // Put all of the stops into a single array and sort them
              stops = uniqueifyAndSort(stops);
              stopList(routeStops, stops);
            }
          } //end success callback
        }); //end ajax call
      } //end for
    } //end else
  });

  // Ask the user for their location
  getLocation();

  // Load all of the routes from the InfoPoint API
  $.ajax({
    url: options.url + "routes/getvisibleroutes",
    success: function(route_data) {
      // Sort routes by Route name
      route_data.sort(function(a,b) {
        if (a.RouteAbbreviation > b.RouteAbbreviation) {
          return 1;
        }
        if (a.RouteAbbreviation < b.RouteAbbreviation) {
          return -1;
        }
        return 0
      });

      for (var i = 0; i < route_data.length; i++) {
        routes.append('<option value="' + route_data[i].RouteId + '">' +
            route_data[i].RouteAbbreviation + " " + route_data[i].LongName +
            '</option>');
      }
      // Refresh our list
      routes.trigger('chosen:updated');
    }
  });
});

function initTitle() {
  var body = $('.body');

  if (typeof options.logo_url !== "undefined" && options.logo_url != "") {
    body.prepend('<img class="logo" src="' + options.logo_url + '">');
  }

  if (typeof options.title !== "undefined" && options.title != "") {
    body.prepend('<h1 class="title">' + options.title + '</h1>');
  }

}

function getLocation() {
  $('.nearby-holder').hide();
  if (Modernizr.geolocation) {
    return navigator.geolocation.getCurrentPosition(populateListGeo, function(){
      removeFade();
    });
  } else {
    // NoGeo option
  }
}

function stopList(select, stops) {
  fadeBlack(function() {
    select.empty();
    for(var i = 0; i < stops.length; i++) {
      select.append('<option value="' + stops[i].StopId + '">' + stops[i].Name + '</option>');
    }
    select.trigger('chosen:updated');
    removeFade();
  });
}


function uniqueifyAndSort(collection){
  collection = _.uniq(_.union(_.flatten(collection)), _.iteratee('StopId'));
  collection.sort(function(a,b) {
  if (a.Name > b.Name) {
    return 1;
  }
  if (a.Name < b.Name) {
    return -1;
  }
  return 0
  });
  return collection;
}


/*This function will download and display
 * **all** of PVTA's stops, so that users can
 * type in and view a specific stop or
 * number of stops without having to first pick
 * a route.
 * 
 * CALL WITH CAUTION: Loading and displaying a
 * list of every single stop takes ~1/4 of a second.
 * loadAllStops() is called when the page inits
 * and when the user has emptied their route
 * selections.
 */


function populateListGeo(pos) {
  fadeBlack(function() {
    var select = $('.nearby-stops');
    var lat = pos.coords.latitude;
    var lon = pos.coords.longitude;

    $.ajax({
      url: options.url + "stops/getallstops",
      success: function(stop_data) {
        // Sort the stops by distance
        stop_data.sort(function(a,b) {
          return distance(lat, lon, a.Latitude, a.Longitude) - distance(lat, lon, b.Latitude, b.Longitude);
        });
        // Make sure we don't try to find more stops than exist.
        var stop_count = Math.min(10, stop_data.length);
        // Get the nearest few stops, removing duplicates that appear for some reason
        stop_data = _.uniq(stop_data.slice(0, stop_count), _.iteratee('StopId'));
        stopList(select, stop_data);
        $('.nearby-holder').show();
        removeFade();
      }
    });
  });
}

// Distance in miles
function distance(lat1, lon1, lat2, lon2) {
	var radlat1 = Math.PI * lat1/180
	var radlat2 = Math.PI * lat2/180
	var radlon1 = Math.PI * lon1/180
	var radlon2 = Math.PI * lon2/180
	var theta = lon1-lon2
	var radtheta = Math.PI * theta/180
	var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
	dist = Math.acos(dist)
	dist = dist * 180/Math.PI
	dist = dist * 60 * 1.1515
	return dist
}                                                                           

// Show our loader
function fadeBlack(callback) {
  if (typeof callback === "undefined") {
    callback = function(){};
  }

  var holder = $('.load-holder');
  holder.css({'z-index': 10});
  // If it's not black yet
  if (holder.hasClass('fade')) {
    holder.removeClass('fade');
    holder.one('webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend', callback);
  } else {
    callback();
  }
}

// Hide our loader
function removeFade(callback) {
  if (typeof callback === "undefined") {
    callback = function(){};
  }

  var holder = $('.load-holder');
  // If it's already gone
  if (holder.hasClass('fade')) {
    callback();
  } else {
    holder.addClass('fade');
    holder.one('webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend', function(e) {
      $(this).css({'z-index': -1});
      callback();
    });
  }
}

function busBoardURL(stops) {
  var url = window.location.href;

  var query_index = url.indexOf("?");
  var query_string = "?";

  if (query_index != -1) {
    query_string = url.slice(query_index);
    url = url.slice(0, query_index);
  }
  // Remove trailing slash if it exists
  if (url.charAt(url.length-1) == "/") {
    url = url.slice(0,-1);
  }
  
  // Remove the last section of the URL, because the repo is structured with
  // the BusInfoBoard one directory up
  return url.split("/").slice(0,-1).join("/") + query_string + "&mobile=true&stops=" + stops.join("+");
}

function updateOptions() {

  var query = QueryStringAsObject();

  var title_string = query.title;
  if (typeof title_string !== "undefined") {
    // To handle browsers adding a slash after the query string
    if (title_string.slice(-1) == "/") {
      title_string = title_string.slice(0,-1);
    }
    options.title = title_string;
  }

  var logo_url_string = query.logo_url;
  if (typeof logo_url_string !== 'undefined'){
    if (logo_url_string.slice(-1) == "/") {
      logo_url_string = logo_url_string.slice(0,-1);
    }
    options.logo_url = logo_url_string;
  }
}

function QueryStringAsObject() {
  var pairs = location.search.slice(1).split('&');
  
  var result = {};
  for(var i = 0; i < pairs.length; i++) {
      var pair = pairs[i].split('=');
      result[pair[0]] = decodeURIComponent(pair[1] || '');
  }

  return result;
}
