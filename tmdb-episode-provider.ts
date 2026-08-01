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

        console.log("[TMDb Provider] Hook fired for media " + e.mediaId)
        
        $store.set("tmdb-pending-" + e.mediaId, {
            mediaId: e.mediaId,
            episodes: e.animeMetadata.episodes,
            title: e.animeMetadata.getTitle ? e.animeMetadata.getTitle() : ""
        })

        e.next()
    })

    $ui.register(async function(ctx) {
        console.log("[TMDb Provider] ✅ UI context loaded")

        var tray = ctx.newTray({
            tooltipText: "TMDb Episode Provider",
            withContent: true
        })

        var logs = ctx.state([])

        function addLog(msg) {
            var currentLogs = logs.get()
            currentLogs.push(msg)
            if (currentLogs.length > 50) currentLogs.shift()
            logs.set(currentLogs)
        }

        addLog("UI context initialized")

        function processPending() {
            var allStore = $store.getAll() || {}
            var keys = Object.keys(allStore)
            
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i]
                if (key.startsWith("tmdb-pending-")) {
                    var data = $store.get(key)
                    processTMDbAsync(data, ctx, addLog)
                    $store.remove(key)
                }
            }
        }

        async function processTMDbAsync(mediaData, ctx, addLog) {
            var API_KEY = "eaf9b42d6945bfe9a7d81e97174b04af"
            var API_BASE = "https://api.themoviedb.org/3"

            var titleToSearch = mediaData.title.replace(/\s+Season\s+\d+/i, "").trim()
            addLog("Searching: " + titleToSearch)

            try {
                // USE ctx.fetch, NOT fetch()!
                var searchRes = await ctx.fetch(API_BASE + "/search/tv?api_key=" + API_KEY + "&query=" + encodeURIComponent(titleToSearch))
                var searchData = await searchRes.json()

                addLog("Results: " + (searchData.results ? searchData.results.length : 0))

                if (!searchData.results || searchData.results.length === 0) {
                    addLog("No match")
                    return
                }

                var tmdbId = searchData.results[0].id
                var tmdbName = searchData.results[0].name
                addLog("✅ Found: " + tmdbName)

                var showRes = await ctx.fetch(API_BASE + "/tv/" + tmdbId + "?api_key=" + API_KEY)
                var show = await showRes.json()
                var seasonCount = show.number_of_seasons || 0
                addLog("Seasons: " + seasonCount)

                var totalReplaced = 0
                for (var season = 1; season <= seasonCount; season++) {
                    var seasonRes = await ctx.fetch(API_BASE + "/tv/" + tmdbId + "/season/" + season + "?api_key=" + API_KEY)
                    var seasonData = await seasonRes.json()
                    var episodes = seasonData.episodes || []

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

            } catch (err) {
                addLog("ERROR: " + err)
            }
        }

        tray.onOpen(() => {
            processPending()
        })

        ctx.setInterval(() => {
            processPending()
        }, 2000)

        tray.render(function() {
            var logList = logs.get() || []
            return tray.div([
                tray.stack([
                    tray.text("TMDb Episode Provider", { className: "font-bold" }),
                    tray.text("Status: Processing...", { className: "text-sm" }),
                ], { gap: 1 }),
                tray.stack(logList.map(function(log) {
                    return tray.text(log, { className: "text-xs", style: { color: "#999", fontFamily: "monospace" } })
                }), { gap: 0.5, style: { maxHeight: "300px", overflow: "auto", marginTop: "5px" } })
            ])
        })
    })
}
