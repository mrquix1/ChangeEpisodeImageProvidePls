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

        // Watch for pending media in UI context (where fetch works!)
        ctx.effect(() => {
            var keys = Object.keys($store.getAll() || {})
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i]
                if (key.startsWith("tmdb-pending-media-")) {
                    var pending = $store.get(key)
                    processTMDbFetch(pending, ctx)
                    $store.remove(key)
                }
            }
        }, [])

        function processTMDbFetch(mediaData, ctx) {
            var titleToSearch = mediaData.title.replace(/\s+Season\s+\d+/i, "").trim()
            console.log("[TMDb Provider] UI: Fetching " + titleToSearch)

            try {
                var API_KEY = "7b7daf721c0b4b5789d993c24402a9dc"
                var API_BASE = "https://api.themoviedb.org/3"
                
                var searchUrl = API_BASE + "/search/tv?api_key=" + API_KEY + "&query=" + encodeURIComponent(titleToSearch)
                var searchData = fetch(searchUrl)

                console.log("[TMDb Provider] Response: " + JSON.stringify(searchData))

                if (!searchData || !searchData.results || searchData.results.length === 0) {
                    console.log("[TMDb Provider] No TMDb match for: " + titleToSearch)
                    return
                }

                var tmdbId = searchData.results[0].id
                console.log("[TMDb Provider] Found TMDb ID: " + tmdbId)

                var show = fetch(API_BASE + "/tv/" + tmdbId + "?api_key=" + API_KEY)
                var seasonCount = show.number_of_seasons || 0

                var totalReplaced = 0
                for (var season = 1; season <= seasonCount; season++) {
                    var seasonData = fetch(API_BASE + "/tv/" + tmdbId + "/season/" + season + "?api_key=" + API_KEY)
                    var episodes = seasonData.episodes || []

                    for (var i = 0; i < episodes.length; i++) {
                        var ep = episodes[i]
                        var epNum = ep.episode_number

                        if (ep.still_path && mediaData.episodes[epNum]) {
                            var imageUrl = "https://image.tmdb.org/t/p/original" + ep.still_path
                            mediaData.episodes[epNum].image = imageUrl
                            console.log("[TMDb Provider] ✅ Episode " + epNum)
                            totalReplaced++
                        }
                    }
                }

                console.log("[TMDb Provider] ✅✅✅ Replaced " + totalReplaced + " episodes!")

            } catch (err) {
                console.error("[TMDb Provider] Error: " + err)
            }
        }

        tray.render(function() {
            return tray.stack([
                tray.text("TMDb Episode Provider", { className: "font-bold" }),
                tray.text("Status: Ready", { className: "text-sm" })
            ])
        })
    })
}
