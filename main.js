var routes = {};
// Replace with InfoPoint URL
var url = "localhost:8080";
var body;
var stops = [];
var stop_index = 0;

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
  drawCanvas();
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
  if (typeof stops === "undefined" || (typeof stops !== "undefined" && stops.length == 0)) {
    stops = [64];
  }
}

function drawCanvas() {
  $.get("http://" + url + "/routes/getvisibleroutes", function(route_data) {
    for (var i = 0; i < route_data.length; i++) {
      routes[route_data[i].RouteId] = route_data[i];
    }
    addTables();
  }, 'json');
  setInterval(function() {
    stop_index = 0;
    $('body').empty();
    addTables();
  }, 10000);
}

function addTables() {
  $.get("http://" + url + "/stops/get/"+stops[stop_index], function(stop_info) {
    $.get("http://" + url + "/stopdepartures/get/" + stops[stop_index], function(departure_data) {
      body.append('<h1 class="animated fadeIn">' + stop_info.Name + "</h1>");
      var directions = departure_data[0].RouteDirections;
      var i = 0;
      var id = setInterval(function() {
          if (i < directions.length) {
            renderRow(directions[i]);
            i++;
          } else {
            clearTimeout(id);
            stop_index++;
            if (stop_index < stops.length) {
              addTables(stops);
            }
          }
        }, 250);
    }, 'json');
  }, 'json');
}

function renderRow(direction) {
  if (direction.Departures.length > 0) {
    var unique_ISC = [];
    var route = routes[direction.RouteId];
    for (var i = 0; i < direction.Departures.length; i++) {
      var departure = direction.Departures[i];
      if ($.inArray(departure.Trip.InternetServiceDesc, unique_ISC) == -1) {
        unique_ISC.push(departure.Trip.InternetServiceDesc);
        var date = moment(departure.EDT);
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
