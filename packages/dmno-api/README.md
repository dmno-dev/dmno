# DMNO cloud api

A simple api designed to run on Cloudflare Pages.

Currently this just handles a single endpoint to subscribe folks to our mailing list, but this will be where we can start to deal with user logins and persisting settings/state.


### Why not Cloudflare Workers?

Ideally this would be running on Workers, but the Pages CI dev ex is much better. We will migrate over when the [Workers builds](https://developers.cloudflare.com/workers/ci-cd/builds/) catches up to pages.
