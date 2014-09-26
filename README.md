A simple GUI for viewing the next arriving buses for each route at a given stop id.

Usage:
- Replace "localhost" as the url with the location of your InfoPoint server (Note: PVTA's API Server isn't currently functioning as an API server)
- Place the query string ?stops=1+2+3 to specify a list of stops you'd like to see information for
- Place the query string ?routes=B43 to specify a subset of routes you'd like to see information for
- Place the query string ?sort=time to sort routes by arrival time instead of route
