var routes = {};
// Replace with InfoPoint URL
var url = "localhost";
var body;

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
  if (typeof paper !== "undefined") {
    paper.clear();
  }

  $.get("http://" + url + "/routes/getvisibleroutes", function(route_data) {
    for (var i = 0; i < route_data.length; i++) {
      routes[route_data[i].RouteId] = route_data[i];
    }

    for(var x = 0; x < stops.length; x++) {
      addTable(stops[x]);
    }
  }, 'json');
}

function addTable(stop) {
  $.get("http://" + url + "/stops/get/"+stop, function(stop_info) {
    $.get("http://" + url + "/stopdepartures/get/" + stop, function(departure_data) {
      body.append("<h1>" + stop_info.Name + "</h1>");
      var directions = departure_data[0].RouteDirections;
      for (var i = 0; i < directions.length; i++) {
        renderRow(directions[i]);
      }
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
            '<div class="route" style="background-color: #' + route.Color + '">' +
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
