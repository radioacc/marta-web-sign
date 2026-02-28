# MARTA Live Train Tracker

A live demo is usually running at [marta.adamcaskey.com](https://marta.adamcaskey.com).

I originally built this as a Python app but rewrote it in React to track MARTA train arrivals in Atlanta. The official data feed can be pretty unreliable, and the existing tools lacked the speed and UI I wanted. My intent was to build something lightweight and mobile-responsive that mirrors the actual in-station signage, complete with dark and light mode compatibility. The main goal was to make an app that loads instantly and doesn't just show a blank screen when the API drops a connection. It also tries to grab your location right on load to automatically display the nearest station, though you can easily override it manually as needed.

## How it works

The app focuses on speed and handling bad data gracefully. 

* **Instant loads:** It saves the last known train schedule to your browser's local storage. When you open the app, it renders that old data instantly while it fetches fresh info in the background. 
* **Connection handling:** The MARTA API is known for occasionally returning empty arrays or timing out. If that happens, this app ignores the bad response, keeps your current board on the screen, and just ticks down the local timer instead.
* **Location aware:** It calculates your distance from all 38 stations and automatically pulls up the nearest one when you open the app.
* **Saved preferences:** If you manually select a station, it overrides the GPS and saves that choice permanently for your next visit.
* **Filtering:** You can filter incoming trains by destination to clean up the board at busy transfer stations.
* **Dark mode:** Includes a simple light/dark toggle that remembers your preference.

## Tech Stack

This is a fairly straightforward frontend project. It uses React and Vite, and all the styling is done with plain CSS to keep things light. It is currently configured to deploy directly to Cloudflare Pages and the Cloudflare CDN.

## Running it locally

Before you can run this app yourself, you need to acquire a free API key and comply with the [MARTA developer requirements](https://itsmarta.com/app-developer-resources.aspx). 

Once you have your key:

1. Clone the repository:
   ```bash
   git clone [https://github.com/radioacc/marta-web-sign.git](https://github.com/radioacc/marta-web-sign.git)
   cd marta-web-sign
