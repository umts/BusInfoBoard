This application uses [Avail Technologies'][avail] InfoPoint API
endpoints to allow users to select stops to view departure information for. It
was written by [UMass Transit][umts] IT for use by the [Pioneer Valley Transit
Authority][pvta]. The application is intended for use on desktops and mobile
devices.

Usage
==========
This application will first ask for a user's location. If it is not provided,
the service will then load a list of all stops from PVTA's Avail InfoPoint API.
If they do provide a location, it will load several nearby stops. After
selecting the stops, clicking "View Departures" will load the BusInfoBoard for
that stop.

[avail]: http://www.availtec.com/
[umts]: http://www.umass.edu/transit/
[pvta]: http://www.pvta.com/
