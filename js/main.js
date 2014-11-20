// Javascript for parsing and displaying departure information
var routes = {};

// Specify a URL here to load settings first from a configuration file
var config_url;

var options =
{
  url: "http://bustracker.pvta.com/InfoPoint/rest/",
  stops: [],
  routes: [],
  excluded_trips: [],
  start_animation: 'fadeInDown',  // default animate CSS for each row to be added with
  end_animation: 'fadeOut',       // default animate CSS for everything to be removed with at once
  work_day_start: 4,              // default time a new transit day starts
  interval: 30000,                // default time in ms between refreshes
  title: "",                      // title to display at top of page
  sort: "route"                   // default way to sort departures
}

var container;
var sort_function;
var refresh_id;
var stop_index = 0;

var MINIMUM_REFRESH_TIME = 5; // minimum number of seconds allowed for user input
var CASCADE_SPEED = 75; // time in ms which each row will take to cascade
var END_ANIMATION_TIME = 500; // the amount of time we give the ending animate CSS to work

// The timezone at the beginning of the current day, used for making sure ETAs don't become
// incorrect when switching between DST and...not DST.
var dst_at_start;

function QueryStringAsObject() {
  var pairs = location.search.slice(1).split('&');
  
  var result = {};
  for(var i = 0; i < pairs.length; i++) {
      var pair = pairs[i].split('=');
      result[pair[0]] = decodeURIComponent(pair[1] || '');
  }

  return result;
}

$(function(){
  container = $('.main-content');
  updateOptions();
  initTitle();
  initBoard();
});

function startErrorRoutine() {
  stopRefreshing();
  // We don't have a connectivity notice into the DOM at the moment
  if (container.find('.connectivity_note').length == 0){
    container.append('<div class="connectivity_note">No Bus Information Available</div>');
  }
  $.ajax({
    url: options.url + "PublicMessages/GetCurrentMessages",
    success: function(route_data) {
      container.empty();
      initBoard();
    },
    timeout: 1000,
    error: function(){
      setTimeout(function(){startErrorRoutine()}, 5000)
    }
  });
}

function updateOptions() {
  // First load from a config_url if one is specified
  if (typeof config_url !== "undefined") {
    $.ajax({
      url: config_url,
      dataType: 'json',
      success: function(new_options) {
        // Copy all attributes from new_options to options, replacing existing
        // parameters with the new ones
        $.extend(options, new_options);
      },
      async: false,
      timeout: 1000
    });
  }

  var query = QueryStringAsObject();

  var stop_query_string = query.stops;
  // Check if a query string has been specified
  if (typeof stop_query_string !== "undefined") {
    var query_parts = stop_query_string.split("+");
    for (var i = 0; i < query_parts.length; i++) {
      if (query_parts[i]) {
        options.stops.push(query_parts[i]);
      }
    }
  }
  // If they didn't enter any stops, or they screwed up, default to stop ID 64, the Integrative Learning Center
  if (options.stops.length == 0) {
    options.stops = [64];
  }

  var route_query_string = query.routes;

  if (typeof route_query_string !== "undefined") {
    var query_parts = route_query_string.split("+");
    for (var i = 0; i < query_parts.length; i++) {
      if (query_parts[i]) {
        options.routes.push(query_parts[i]);
      }
    }
  }

  var sort_query_string = query.sort;
  
  if (typeof sort_query_string !== "undefined") {
    options.sort = sort_query_string;
  }

  if (options.sort == "time") {
    sort_function = function(a, b) {
      return a.Departure.EDT < b.Departure.EDT ? -1 : 1;
    }
  } else {
    sort_function = function(a, b) {
      return a.Route.ShortName > b.Route.ShortName;
    }
  }

  var start_animation_query_string = query.start_animation;
  if (typeof start_animation_query_string !== 'undefined'){
    options.start_animation = start_animation_query_string
  }

  var end_animation_query_string = query.end_animation;
  if (typeof end_animation_query_string !== 'undefined'){
    options.end_animation = end_animation_query_string
  }

  //if there are no animations specified, don't allow time for them to execute
  if (options.start_animation == 'none' && options.end_animation == 'none'){
    END_ANIMATION_TIME = 0
  }

  //expected value is in seconds, we convert to ms
  //minimum allowed is MINIMUM_REFRESH_TIME seconds
  var interval_query_string = query.interval;
  if (typeof interval_query_string !== 'undefined'){
    options.interval = Math.max(MINIMUM_REFRESH_TIME, parseInt(interval_query_string)) * 1000;
  }

  var excluded_query_string = query.excluded_trips;
  // Check if a query string has been specified
  if (typeof excluded_query_string !== "undefined") {
    var query_parts = excluded_query_string.split("+");
    for (var i = 0; i < query_parts.length; i++) {
      if (query_parts[i]) {
        options.excluded_trips.push(query_parts[i]);
      }
    }
  }

  var work_day_start_string = query.work_day_start;
  if (typeof work_day_start_string !== "undefined") {
    options.work_day_start = parseInt(work_day_start_string) % 24;
  }

  var title_string = query.title;
  if (typeof title_string !== "undefined") {
    options.title = title_string;
  }
}

function initTitle() {
  if (typeof options.title !== "undefined" && options.title != "") {
    $('body').prepend('<h1 class="title">' + options.title + '</h1>');
  }
}

function initBoard() {
  // Let's start by preloading all of the route info, because when we query
  // departures, we'll only have the route ID
  $.ajax({
    url: options.url + "routes/getvisibleroutes",
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
  }, options.interval);
}

function stopRefreshing() {
  clearInterval(refresh_id);
}

function addTables() {
  var current = moment();
  // Is it still "yesterday" as far as the transit agency is concerned
  if (current.hour() <= options.work_day_start) {
    dst_at_start = moment([current.year(), current.month(), current.date(), options.work_day_start]).subtract(1, "days").isDST();
  } else {
    dst_at_start = moment([current.year(), current.month(), current.date(), options.work_day_start]).isDST();
  }

  var row, section;
  var size_class = "";
  if (options.stops.length > 1) {
    size_class = "col-lg-12";
  }
  // There are two separate calls here, 
  $.ajax({
    url: options.url + "stops/get/" + options.stops[stop_index],
    success: function(stop_info) {
      if (stop_index % 2 == 0) {
        row = $('<div class="row route-holder"></div>');
      } else {
        row = $('.route-holder:last');
      }
      section = $('<div class="col-xs-24 ' + size_class + '"></div>"');
      row.append(section);
      if (stop_index % 2 == 0) {
        container.append(row);
      }
      $.ajax({
        url: options.url + "stopdepartures/get/" + options.stops[stop_index],
        success: function(departure_data) {
          
          // Draw the header for each stop
          section.append('<h1 class="animated ' + options.start_animation + '">' + stop_info.Name + "</h1>");
          var infos = getDepartureInfo(departure_data[0].RouteDirections);
          if (infos.length == 0){
            section.append('<h2 class="animated ' + options.start_animation + '">No remaining scheduled departures.</h2>');
          }
          var i = 0; // For that soothing cascading effect
          var id = setInterval(function() {
              // If we still have rows to render
              if (i < infos.length) {
                renderRow(infos[i], section);
                i++;
              } else { // If not, clear out the timer and move onto the next route
                clearTimeout(id);
                stop_index++;
                // If we run out of stops, reset our index and don't do anything
                if (stop_index < options.stops.length) {
                  addTables(options.stops);
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
  $('h1').addClass(options.end_animation);
  $('.route').addClass(options.end_animation);
  //once we've given that END_ANIMATION_TIME to work, remove everything.
  setTimeout(function(){
    container.empty()
  }, END_ANIMATION_TIME);
}

// A bit of a misnomer, we will occassionally render more than one row in here,
// since there may be multiple departures on the same route that we're interested in:
// the most common example being opportunity trips (e.g. Garage via Mass Ave
// at the end of 30-3 EVE, which is on route 30 and northbound, just like North Amherst,
// but has a different trip description).
function renderRow(info, section) {
  var short_proportions = "col-xs-24 col-sm-2 col-md-2 col-lg-1";
  var long_proportions = "col-xs-24 col-sm-15 col-md-15 col-lg-16";
  var arrival_proportions = "col-xs-24 col-sm-7 col-md-7 col-lg-7";
  if (options.stops.length > 1) {
    short_proportions = "col-xs-24 col-sm-2 col-md-1 col-lg-2";
    long_proportions = "col-xs-24 col-sm-15 col-md-16 col-lg-15";
    arrival_proportions = "col-xs-24 col-sm-7 col-md-7 col-lg-7";
  }
  var offset = 0;
  // If we aren't in the same timezone as we were this morning
  if (dst_at_start != moment().isDST()) {
    // If the day started in DST and isn't any more, that means that the clock
    // has moved back an hour from where we want it to be, and we need to up it
    // an hour to display the correct relative times. 
    if (dst_at_start) {
      offset = 1;
    } else {
      offset = -1;
    }
  }
  section.append(
      '<div class="route animated ' + options.start_animation + '" style="background-color: #' + info.Route.Color + '">' +
      '<div class="row">' + 
      '<div class="route_short_name ' + short_proportions + ' text-center-xs" style="color: #' + info.Route.TextColor + '">' +
      info.Route.ShortName + " " + 
      '</div>' + 
      '<div class="route_long_name ' + long_proportions + ' text-center-xs" style="color: #' + info.Route.TextColor + '">' +
      info.Departure.Trip.InternetServiceDesc + 
      '</div>' + 
      '<div class="route_arrival ' + arrival_proportions + ' text-center-xs" style="color: #' + info.Route.TextColor + '">' +
        moment(info.Departure.EDT).from(moment().add(offset, 'hours'), true) +
      '</div>'+ 
      '</div>'+ 
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
          && (options.routes.length == 0 || $.inArray(route.ShortName, options.routes) != -1)
          //and if it's not in the excluded trips
          && (options.excluded_trips.length == 0 || $.inArray(departure.Trip.InternetServiceDesc, options.excluded_trips) == -1)
          //and if it's in the future,
          && moment(departure.EDT).isAfter(Date.now())) {
        // then we push it to the list, and push its ISD to the unique ISDs list.
        unique_ISDs.push(departure.Trip.InternetServiceDesc);
        departures.push({Departure: departure, Route: route});
      }
    }
  }
  return departures.sort(sort_function);
}
