const stopIds = new URL(window.location).searchParams.get('stops')?.split(/\D+/) || []
const newLocation = new URL('https://pvta-departures.admin.umass.edu');
newLocation.searchParams.set('migrateWarning', '1')
newLocation.searchParams.set('stopIds', stopIds.join(','))

window.location = newLocation;
