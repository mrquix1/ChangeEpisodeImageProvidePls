/// <reference path="./core.d.ts" />
/// <reference path="./app.d.ts" />
/// <reference path="./plugin.d.ts" />

function init() {
    console.log("[TMDb Provider] ✅ Plugin init started")

    $app.onAnimeMetadata(function(e) {
        if (!e.animeMetadata || !e.animeMetadata.episodes) {
            e.next()
            return
        }

        console.log("[TMDb Provider] Hook: Metadata loaded for media " + e.mediaId)
        
        // Store mediaId in $store for UI context to access
        $store.set("tmdb-pending-media-" + e.mediaId, {
            mediaId: e.mediaId,
            episodes: e.animeMetadata.episodes,
            title: e.animeMetadata.getTitle ? e.animeMetadata.getTitle() : ""
        })

        e.next()
    })

    $ui.register(function(ctx) {
        console.log("[TMDb Provider] ✅ UI context loaded")

        var tray = ctx.newTray({
            tooltipText: "TMDb Episode Provider",
            withContent: true
        })

        var logs = ctx.state([])
        var processing = ctx.state(false)

        function addLog(msg) {
            console.log("[TMDb Provider] " + msg)
            var currentLogs = logs.get()
            currentLogs.push(msg)
            if (currentLogs.length > 50) {
                currentLogs.shift()
            }
            logs.set(currentLogs)
        }

        addLog("UI context initialized")

        // Process pending media
        function processPending() {
            addLog("Checking for pending media...")
            var allStore = $store.getAll() || {}
            var keys = Object.keys(allStore)
            addLog("Found " + keys.length + " keys in store")

            var pendingKeys = []
            for (var i = 0; i < keys.length; i++) {
                if (keys[i].startsWith("tmdb-pending-media-")) {
                    pendingKeys.push(keys[i])
                }
            }

            addLog("Found " + pendingKeys.length + " pending media")

            for (var j = 0; j < pendingKeys.length; j++) {
                var key = pendingKeys[j]
                var pending = $store.get(key)
                addLog("Processing media " + pending.mediaId)
                processTMDbFetch(pending, ctx)
                $store.remove(key)
            }
        }

        function processTMDbFetch(mediaData, ctx) {
            processing.set(true)
            var titleToSearch = mediaData.title.replace(/\s+Season\s+\d+/i, "").trim()
            addLog("Searching TMDb for: " + titleToSearch)

            try {
                var API_KEY = "eaf9b42d6945bfe9a7d81e97174b04af"
                var API_BASE = "https://api.themoviedb.org/3"
                
                var searchUrl = API_BASE + "/search/tv?api_key=" + API_KEY + "&query=" + encodeURIComponent(titleToSearch)
                addLog("URL: " + searchUrl)

                var searchData = fetch(searchUrl)
                addLog("Fetched, response type: " + typeof searchData)
                addLog("Response keys: " + Object.keys(searchData).join(", "))

                if (!searchData || !searchData.results) {
                    addLog("ERROR: No results in response!")
                    processing.set(false)
                    return
                }

                addLog("Results length: " + searchData.results.length)

                if (searchData.results.length === 0) {
                    addLog("No TMDb match for: " + titleToSearch)
                    processing.set(false)
                    return
                }

                var tmdbId = searchData.results[0].id
                var tmdbName = searchData.results[0].name
                addLog("✅ Found: " + tmdbName + " (ID: " + tmdbId + ")")

                var show = fetch(API_BASE + "/tv/" + tmdbId + "?api_key=" + API_KEY)
                var seasonCount = show.number_of_seasons || 0
                addLog("Seasons: " + seasonCount)

                var totalReplaced = 0
                for (var season = 1; season <= seasonCount; season++) {
                    var seasonData = fetch(API_BASE + "/tv/" + tmdbId + "/season/" + season + "?api_key=" + API_KEY)
                    var episodes = seasonData.episodes || []
                    addLog("Season " + season + ": " + episodes.length + " episodes")

                    for (var i = 0; i < episodes.length; i++) {
                        var ep = episodes[i]
                        var epNum = ep.episode_number

                        if (ep.still_path && mediaData.episodes[epNum]) {
                            var imageUrl = "https://image.tmdb.org/t/p/original" + ep.still_path
                            mediaData.episodes[epNum].image = imageUrl
                            mediaData.episodes[epNum].hasImage = true
                            addLog("✅ Episode " + epNum)
                            totalReplaced++
                        }
                    }
                }

                addLog("✅✅✅ Replaced " + totalReplaced + " episodes!")
                processing.set(false)

            } catch (err) {
                addLog("ERROR: " + err)
                processing.set(false)
            }
        }

        // Check for pending media when tray opens
        tray.onOpen(() => {
            processPending()
        })

        // Also check on interval
        ctx.setInterval(() => {
            processPending()
        }, 2000)

        tray.render(function() {
            var logList = logs.get() || []
            return tray.div([
                tray.stack([
                    tray.text("TMDb Episode Provider", { className: "font-bold" }),
                    tray.text("Status: " + (processing.get() ? "Processing..." : "Ready"), { className: "text-sm" }),
                ], { gap: 1, style: { marginBottom: "10px", paddingBottom: "10px", borderBottom: "1px solid #333" } }),
                tray.div([
                    tray.text("Logs:", { className: "text-sm font-bold" }),
                    tray.stack(logList.map(function(log) {
                        return tray.text(log, { className: "text-xs", style: { color: "#999", fontFamily: "monospace" } })
                    }), { gap: 0.5, style: { maxHeight: "300px", overflow: "auto", marginTop: "5px" } })
                ], { style: { fontSize: "11px" } })
            ])
        })
    })
}
