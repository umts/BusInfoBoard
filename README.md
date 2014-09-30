This application uses [Avail Technologies'][avail] InfoPoint API
endpoints to show departures for specified stops. It was written by
[UMass Transit][umts] IT for use by the [Pioneer Valley Transit
Authority][pvta]. The application is intended for use on monitors
and koisks located at bus stops.

![Screenshot](screenshot.png)

Deployment
==========
This application is entirely client-side, which means that all you need
to deploy it is a web browser capable of being full-screen.  We maintain
the `gh-pages` branch of this repository, which means that you can use
it by simply pointing a browser at http://umts.github.io/BusInfoBoard/.
Alternatively, you can host a copy of the code on any web server capable
of serving static files, or even keep a copy of the code as a local file
on your kiosk device.

If you are looking for data from a transit agency other than PVTA, you
will need to edit the `url` in `main.js` to point to your installation
of InfoPoint.

Configuration
=============
Configuration is done using query stings in the request url.

- `?stops=1+2+3` specifies the list of stops by stop id that you would
  like to see information for. The list is plus ("+") separated.
- `?routes=B43+30` specifies a subset of routes that you would like to
  see information for. This list is also plus ("+") separated.
- `?sort=time` changes the order that departures are displayed to be by
  departure time. The default is by route-order as returned by the API
  server.

Examples
--------
All 7 Holyoke Transportation Center Gates:

http://umts.github.io/BusInfoBoard/?stops=9098+9097+9096+9089+9088+9087+9086

UMass campus shuttle at ILC and Morrill:

http://umts.github.io/BusInfoBoard/?stops=64+63&routes=34+35

All buses at the Academy of Music, ordered by departure time:

http://umts.github.io/BusInfoBoard/?stops=261&sort=time

[avail]: http://www.availtec.com/
[umts]: http://www.umass.edu/transit/
[pvta]: http://www.pvta.com/

