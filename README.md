# MARTA Live Train Tracker

A live demo is usually running at [marta.adamcaskey.com](https://marta.adamcaskey.com).

I origionally built this app as a Python app but reconfigured as a React app to track MARTA train arrivals in Atlanta because the official data feed can be pretty unreliable and lacked the same load time and UI that I felt the experience needed. The main goal was to make something that loads instantly and doesn't just show a blank screen when the API drops a connection and mirrored the UI experienced to the in-station signage. 

## How it works

The app focuses on speed and handling bad data gracefully. 

* **Instant loads:** It saves the last known train schedule to your browser's local storage. When you open the app, it renders that old data instantly while it fetches fresh info in the background. 
* **Connection handling:** The MARTA API is known for occasionally returning empty arrays or timing out. If that happens, this app ignores the bad response, keeps your current board on the screen, and just ticks down the local timer instead.
* **Location aware:** It calculates your distance from all 38 stations and automatically pulls up the nearest one when you open the app.
* **Saved preferences:** If you manually select a station, it overrides the GPS and saves that choice permanently for your next visit.
* **Filtering:** You can filter incoming trains by destination to clean up the board at busy transfer stations.
* **Dark mode:** Includes a simple light/dark toggle that remembers your preference.

## Tech Stack

This is a fairly straightforward frontend project. It uses React and Vite, and all the styling is done with plain CSS to keep things light. It is currently configured to deploy directly to Cloudflare Pages.

## Running it locally

To get this running on your own machine:

1. Clone the repository:
   ```bash
   git clone [https://github.com/radioacc/marta-web-sign.git](https://github.com/radioacc/marta-web-sign.git)
   cd marta-web-sign
