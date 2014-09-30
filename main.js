// Javascript for parsing and displaying departure information
var routes = {};
var url = "http://bustracker.pvta.com/InfoPoint/rest/";
var body;
var refresh_id;
var error_check_id;
var stops;
var sort_function;
var allowed_routes = [];
var start_animation_type = 'fadeInDown'; // default animate CSS for each row to be added with
var end_animation_type = 'fadeOutDown'; // default animate CSS for everything to be removed with at once
var stop_index = 0;
var REFRESH_TIME = 30000; // default time in ms between refreshes
var MINIMUM_REFRESH_TIME = 5; // minimum number of seconds allowed for user input
var CASCADE_SPEED = 75; // time in ms which each row will take to cascade
var END_ANIMATION_TIME = 1500; // the amount of time we give the ending animate CSS to work

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
  parseQueryString();
  initBoard();
});

function startErrorRoutine() {
  stopRefreshing();
  body.append('<div class="connectivity_note hidden">No Bus Information Available</div>');
  $('.connectivity_note').removeClass('hidden');
  error_check_id = setInterval(function(){
    console.log("Checking");
    $.ajax({
      url: url + "PublicMessages/GetCurrentMessages",
      success: function(route_data) {
        body.empty();
        console.log("It lives!");
        clearInterval(error_check_id);
        initBoard();
      }
    });
  }, 5000);
  
}

function parseQueryString() {
  var stop_query_string = $.QueryString["stops"];
  // Check if a query string has been specified
  if (typeof stop_query_string !== "undefined") {
    stops = [];
    var query_parts = stop_query_string.split(" ");
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

  var route_query_string = $.QueryString["routes"];

  if (typeof route_query_string !== "undefined") {
    routes = [];
    var query_parts = route_query_string.split(" ");
    for (var i = 0; i < query_parts.length; i++) {
      if (query_parts[i]) {
        allowed_routes.push(query_parts[i]);
      }
    }
  }

  var sort_query_string = $.QueryString["sort"];
  
  if (typeof sort_query_string !== "undefined") {
    if (sort_query_string == "time") {
      sort_function = function(a, b) {
        return a.Departure.EDT < b.Departure.EDT ? -1 : 1;
      }
    }
  }

  var start_animation_query_string = $.QueryString['start_animation'];
  if (typeof start_animation_query_string !== 'undefined'){
    start_animation_type = start_animation_query_string
  }
  var end_animation_query_string = $.QueryString['end_animation'];
  if (typeof end_animation_query_string !== 'undefined'){
    end_animation_type = end_animation_query_string
  }

  //expected value is in seconds, we convert to ms
  //minimum allowed is MINIMUM_REFRESH_TIME seconds
  var interval_query_string = $.QueryString['interval'];
  if (typeof interval_query_string !== 'undefined'){
    user_value = parseInt(interval_query_string)
    REFRESH_TIME = Math.max(MINIMUM_REFRESH_TIME, user_value) * 1000;
  }
}

function initBoard() {
  // Let's start by preloading all of the route info, because when we query
  // departures, we'll only have the route ID
  $.ajax({
    url: url + "routes/getvisibleroutes",
    success: function(route_data) {
    for (var i = 0; i < route_data.length; i++) {
      routes[route_data[i].RouteId] = route_data[i];
    }
    addTables();
    startRefreshing();
  },
  dataType: 'json',
  error: startErrorRoutine});
}

function startRefreshing() {
  // Refresh the board every REFRESH_TIME ms
  refresh_id = setInterval(function() {
    removeTables();
    //since we wait END_ANIMATION_TIME before emptying the page,
    //we wait this long before adding in the new tables.
    setTimeout(function(){
      addTables();
    }, END_ANIMATION_TIME)
  }, REFRESH_TIME);
}

function stopRefreshing() {
  clearInterval(refresh_id);
}

function addTables() {
  // There are two separate calls here, 
  $.ajax({
    url: url + "stops/get/"+stops[stop_index],
    success: function(stop_info) {
      $.ajax({
        url: url + "stopdepartures/get/" + stops[stop_index],
        success: function(departure_data) {
          // Draw the header for each stop
          body.append('<h1 class="animated ' + start_animation_type + '">' + stop_info.Name + "</h1>");
          var infos = getDepartureInfo(departure_data[0].RouteDirections);
          if (infos.length == 0){
            body.append('<h2 class="animated ' + start_animation_type + '">No remaining scheduled departures.</h2>');
          }
          var i = 0;
          // For that soothing cascading effect
          var id = setInterval(function() {
              // If we still have rows to render
              if (i < infos.length) {
                renderRow(infos[i]);
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
      },
      dataType: 'json',
      error: startErrorRoutine});
    },
    dataType: 'json',
    error: startErrorRoutine});
}

//removes the tables in preparation to load in the new ones. fancy CSS magic.
function removeTables(){
  //fade out stops and their departures
  $('h1').addClass(end_animation_type);
  $('.route').addClass(end_animation_type);
  //once we've given that END_ANIMATION_TIME to work, remove everything.
  window.setTimeout(function(){
    body.empty()
  }, END_ANIMATION_TIME);
}

// A bit of a misnomer, we will occassionally render more than one row in here,
// since there may be multiple departures on the same route that we're interested in:
// the most common example being campus shuttle (e.g. leaving ILC going towards
// Butterfield and going towards Southwest).
// This will also include things like opportunity trips. (e.g. Garage via Mass Ave)
function renderRow(info) {
  body.append(
      '<div class="route animated ' + start_animation_type + '" style="background-color: #' + info.Route.Color + '">' +
      '<div class="route_name" style="color: #' + info.Route.TextColor + '">' +
      info.Route.ShortName + " " + info.Departure.Trip.InternetServiceDesc + 
      '</div>' + 
      '<div class="route_arrival" style="color: #' + info.Route.TextColor + '">' +
      moment(info.Departure.EDT).fromNow(true) +
      '</div>' + 
      '<div class="clearfloat"></div>' +
      '</div>'
      );
}

function getDepartureInfo(directions) {
  // This is a little tricky. There's a sort of edge case where we want to
  // display information for multiple buses on the same route, that are doing
  // different things. We differentiate them by using their
  // InternetServiceDesc, which will be different. Since the departures are
  // ordered from soonest to furthest away, we care about the first one with
  // a unique InternetServiceDesc, and that's what we're checking here.
  var unique_ISDs = [];
  departures = [];
  for (var i = 0; i < directions.length; i++) {
    var direction = directions[i];
    var route = routes[direction.RouteId];
    for (var j = 0; j < direction.Departures.length; j++) {
      var departure = direction.Departures[j];
      //If the departure has a unique InternetServiceDesc,
      if ($.inArray(departure.Trip.InternetServiceDesc, unique_ISDs) == -1
          //and if it's in the allowed routes,
          && (allowed_routes.length == 0 || $.inArray(route.ShortName, allowed_routes) != -1)
          //and if it's in the future,
          && moment(departure.EDT).isAfter(Date.now())) {
        // then we push it to the list, and push its ISD to the unique ISDs list.
        unique_ISDs.push(departure.Trip.InternetServiceDesc);
        departures.push({Departure: departure, Route: route});
      }
    }
  }
  if (typeof sort_function !== "undefined") {
    return departures.sort(sort_function);
  } else {
    return departures;
  }
}
