export async function onRequest(context) {
    const { request, env } = context;
    const { searchParams } = new URL(request.url);
    const station = searchParams.get('station') || 'MIDTOWN';
    const apiKey = env.MARTA_API_KEY;

    if (!apiKey) return new Response(JSON.stringify({ error: "API Key missing." }), { status: 500 });

    // 1. Setup Cloudflare's Native Edge Cache
    const cacheUrl = new URL(request.url);
    const cacheKey = new Request(cacheUrl.toString(), request);
    const cache = caches.default;
    
    // 2. Check if we already have fresh data saved from the last 15 seconds
    let response = await cache.match(cacheKey);
    if (response) {
        return response; // RETURN INSTANTLY!
    }

    const url = `https://developerservices.itsmarta.com:18096/itsmarta/railrealtimearrivals/developerservices/traindata?apiKey=${apiKey}`;

    try {
        // 3. If no cache, suffer the wait and fetch from MARTA
        const martaResp = await fetch(url);
        let data = await martaResp.json();

        if (data && data.Trains) data = data.Trains;
        if (!Array.isArray(data)) data = [data];

        const target = station.toUpperCase().replace(" STATION", "");
        const results = [];

        const cleanDest = (text) => {
            if (!text) return "";
            let d = String(text).toUpperCase().replace(" STATION", "");
            const prefixes = ["RED NORTHBOUND TO ", "RED SOUTHBOUND TO ", "GOLD NORTHBOUND TO ", "GOLD SOUTHBOUND TO ", "BLUE EASTBOUND TO ", "BLUE WESTBOUND TO ", "GREEN EASTBOUND TO ", "GREEN WESTBOUND TO "];
            prefixes.forEach(p => d = d.replace(p, ""));
            return d.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        };

        data.forEach(t => {
            if (!t) return;
            const tStation = (t.STATION || t.Station || "").toUpperCase();
            if (tStation.includes(target)) {
                results.push({
                    station: tStation,
                    destination: cleanDest(t.DESTINATION || t.Destination),
                    line: t.LINE || t.Line,
                    direction: t.DIRECTION || t.Direction,
                    waiting_time: t.WAITING_TIME || t.WaitingTime,
                    waiting_seconds: t.WAITING_SECONDS || t.WaitingSeconds || "9999",
                    status: 'Realtime'
                });
            }
        });

        results.sort((a, b) => parseInt(a.waiting_seconds) - parseInt(b.waiting_seconds));

        // 4. Create the response and tell Cloudflare to cache it for 15 seconds
        response = new Response(JSON.stringify(results), {
            headers: { 
                "Content-Type": "application/json",
                "Cache-Control": "s-maxage=15" // Magic line that saves it on Cloudflare's servers
            }
        });

        // 5. Store it in the cache in the background
        context.waitUntil(cache.put(cacheKey, response.clone()));
        
        return response;

    } catch (err) {
        return new Response(JSON.stringify([]), { headers: { "Content-Type": "application/json" } });
    }
}