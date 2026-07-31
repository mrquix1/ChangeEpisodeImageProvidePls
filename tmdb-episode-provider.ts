/// <reference path="./core.d.ts" />
/// <reference path="./app.d.ts" />
/// <reference path="./plugin.d.ts" />

function init() {
    console.log("[TMDb Provider] ✅ Plugin init started")

    $shared.define("tmdbConfig", function() {
        return {
            API_KEY: "7b7daf721c0b4b5789d993c24402a9dc",
            API_BASE: "https://api.themoviedb.org/3"
        }
    })

    $app.onAnimeMetadata(function(e) {
        if (!e.animeMetadata || !e.animeMetadata.episodes) {
            e.next()
            return
        }

        console.log("[TMDb Provider] Hook fired for media " + e.mediaId)

        var titleToSearch = ""
        if (e.animeMetadata.getTitle && typeof e.animeMetadata.getTitle === "function") {
            titleToSearch = e.animeMetadata.getTitle()
        } else if (e.animeMetadata.titles) {
            titleToSearch = e.animeMetadata.titles.english || e.animeMetadata.titles.romaji
        }

        titleToSearch = titleToSearch.replace(/\s+Season\s+\d+/i, "").trim()

        console.log("[TMDb Provider] Searching for: " + titleToSearch)

        if (!titleToSearch) {
            e.next()
            return
        }

        try {
            var config = $shared.use("tmdbConfig")
            var searchUrl = config.API_BASE + "/search/tv?api_key=" + config.API_KEY + "&query=" + encodeURIComponent(titleToSearch)
            
            console.log("[TMDb Provider] URL: " + searchUrl)
            var searchData = fetch(searchUrl)
            
            // DEBUG: Log the entire response
            console.log("[TMDb Provider] Full response: " + JSON.stringify(searchData))
            console.log("[TMDb Provider] Has results key: " + (searchData.results ? "yes" : "no"))
            console.log("[TMDb Provider] Results type: " + typeof searchData.results)
            
            if (!searchData || !searchData.results) {
                console.log("[TMDb Provider] ERROR: No results key in response!")
                e.next()
                return
            }

            console.log("[TMDb Provider] Results length: " + searchData.results.length)
            
            if (searchData.results.length === 0) {
                console.log("[TMDb Provider] No matches found for: " + titleToSearch)
                e.next()
                return
            }

            var tmdbId = searchData.results[0].id
            var tmdbName = searchData.results[0].name
            console.log("[TMDb Provider] ✅ Found: " + tmdbName + " (ID: " + tmdbId + ")")

            // ... rest of the code

        } catch (err) {
            console.error("[TMDb Provider] Error: " + err)
        }

        e.next()
    })

    $ui.register(function(ctx) {
        var tray = ctx.newTray({
            tooltipText: "TMDb Episode Provider",
            withContent: true
        })

        tray.render(function() {
            return tray.stack([
                tray.text("TMDb Episode Provider", { className: "font-bold" }),
                tray.text("Status: Ready", { className: "text-sm" })
            ])
        })
    })
}
