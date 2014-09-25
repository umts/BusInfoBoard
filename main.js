// Javascript for parsing and displaying departure information
var routes = {};
// Replace with InfoPoint URL
var url = "alarmpi.ddns.umass.edu:8080";
var body;
var stops = [];
var stop_index = 0;
var REFRESH_TIME = 30000; // 30 seconds between info reloading
var CASCADE_SPEED = 250; // 250ms between cascading routes

// Parse apart query string, conveniently tagged onto jQuery
(function($) {
    $.QueryString = (function(a) {
        if (a == "") return {};
        var b = {};
        for (var i = 0; i < a.length; ++i)
        {
            var p=a[i].split('=');
            if (p.length != 2) continue;
            b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
        }
        return b;
    })(window.location.search.substr(1).split('&'))
})(jQuery);

$(function(){
  body = $('body');
  getQueryString();
  initBoard();
});

function getQueryString() {
  var query_string = $.QueryString["stops"];
  // Check if a query string has been specified
  if (typeof query_string !== "undefined") {
    stops = [];
    var query_parts = query_string.split(" ");
    for (var i = 0; i < query_parts.length; i++) {
      if (query_parts[i]) {
        stops.push(query_parts[i]);
      }
    }
  }
  // If they didn't enter any stops, or they screwed up, default to stop ID 64, the Integrative Learning Center
  if (typeof stops === "undefined" || (typeof stops !== "undefined" && stops.length == 0)) {
    stops = [64];
  }
}

function initBoard() {
  // Let's start by preloading all of the route info, because when we query
  // departures, we'll only have the route ID
  $.get("http://" + url + "/routes/getvisibleroutes", function(route_data) {
    for (var i = 0; i < route_data.length; i++) {
      routes[route_data[i].RouteId] = route_data[i];
    }
    addTables();
  }, 'json');
  
  // Refresh the board every 30 seconds
  setInterval(function() {
    $('body').empty();
    addTables();
  }, REFRESH_TIME);
}

function addTables() {
  // There are two separate calls here, 
  $.get("http://" + url + "/stops/get/"+stops[stop_index], function(stop_info) {
    $.get("http://" + url + "/stopdepartures/get/" + stops[stop_index], function(departure_data) {
      // Draw the header for each stop
      body.append('<h1 class="animated fadeIn">' + stop_info.Name + "</h1>");
      var directions = departure_data[0].RouteDirections;
      var i = 0;
      // For that soothing cascading effect
      var id = setInterval(function() {
          // If we still have rows to render
          if (i < directions.length) {
            renderRow(directions[i]);
            i++;
          } else { // If not, clear out the timer and move onto the next route
            clearTimeout(id);
            stop_index++;
            // If we run out of stops, reset our index and don't do anything
            if (stop_index < stops.length) {
              addTables(stops);
            } else {
              stop_index = 0;
            }
          }
        }, CASCADE_SPEED);
    }, 'json');
  }, 'json');
}

// A bit of a misnomer, we will occassionally render more that one row in here,
// as explained below
function renderRow(direction) {
  // Provided we have at least one departure we can look at
  if (direction.Departures.length > 0) {
    // This is a little tricky. There's a sort of edge case where we want to
    // display information for multiple buses on the same route, that are doing
    // different things. We differentiate them by using their
    // InternetServiceDesc, which will be different. Since the departures are
    // ordered from soonest to furthest away, we care about the first one with
    // a unique InternetServiceDesc, and that's what we're checking here.
    var unique_ISC = [];
    var route = routes[direction.RouteId];
    for (var i = 0; i < direction.Departures.length; i++) {
      var departure = direction.Departures[i];
      // If we haven't seen this InternetServiceDesc yet, render it
      if ($.inArray(departure.Trip.InternetServiceDesc, unique_ISC) == -1) {
        unique_ISC.push(departure.Trip.InternetServiceDesc);
        var date = moment(departure.EDT);
        // Give that body some divs, bodies love divs
        body.append(
            '<div class="route animated fadeInDown" style="background-color: #' + route.Color + '">' +
            '<div class="route_name" style="color: #' + route.TextColor + '">' +
            route.ShortName + " " + departure.Trip.InternetServiceDesc + 
            '</div>' + 
            '<div class="route_arrival" style="color: #' + route.TextColor + '">' +
            date.fromNow(true) +
            '</div>' + 
            '<div class="clearfloat"></div>' +
            '</div>'
            );
      }
    }
  }
}
