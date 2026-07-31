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

        // DEBUG: Log the episode structure
        console.log("[TMDb Provider] Episodes object keys: " + Object.keys(e.animeMetadata.episodes).slice(0, 10).join(", "))
        console.log("[TMDb Provider] First episode key type test:")
        var firstKey = Object.keys(e.animeMetadata.episodes)[0]
        console.log("[TMDb Provider] First key: " + firstKey)
        console.log("[TMDb Provider] First episode object: " + JSON.stringify(e.animeMetadata.episodes[firstKey]))

        var titleToSearch = ""
        if (e.animeMetadata.getTitle && typeof e.animeMetadata.getTitle === "function") {
            titleToSearch = e.animeMetadata.getTitle()
        } else if (e.animeMetadata.titles) {
            titleToSearch = e.animeMetadata.titles.english || e.animeMetadata.titles.romaji
        }

        titleToSearch = titleToSearch.replace(/\s+Season\s+\d+/i, "").trim()

        console.log("[TMDb Provider] Title: " + titleToSearch)

        if (!titleToSearch) {
            e.next()
            return
        }

        try {
            var config = $shared.use("tmdbConfig")
            var searchUrl = config.API_BASE + "/search/tv?api_key=" + config.API_KEY + "&query=" + encodeURIComponent(titleToSearch)
            var searchData = fetch(searchUrl)

            if (!searchData || !searchData.results || searchData.results.length === 0) {
                console.log("[TMDb Provider] No results")
                e.next()
                return
            }

            var tmdbId = searchData.results[0].id
            console.log("[TMDb Provider] Found TMDb ID: " + tmdbId)

            var show = fetch(config.API_BASE + "/tv/" + tmdbId + "?api_key=" + config.API_KEY)
            var seasonCount = show.number_of_seasons || 0
            console.log("[TMDb Provider] Seasons: " + seasonCount)

            var totalReplaced = 0

            for (var season = 1; season <= seasonCount; season++) {
                var seasonData = fetch(config.API_BASE + "/tv/" + tmdbId + "/season/" + season + "?api_key=" + config.API_KEY)
                var episodes = seasonData.episodes || []
                console.log("[TMDb Provider] Season " + season + ": " + episodes.length + " episodes")

                for (var i = 0; i < episodes.length; i++) {
                    var ep = episodes[i]
                    var epNum = ep.episode_number
                    
                    console.log("[TMDb Provider] Checking episode " + epNum + ", has still_path: " + (ep.still_path ? "yes" : "no"))
                    console.log("[TMDb Provider] Episode " + epNum + " exists in metadata: " + (e.animeMetadata.episodes[epNum] ? "yes" : "no"))

                    if (ep.still_path && e.animeMetadata.episodes[epNum]) {
                        var imageUrl = "https://image.tmdb.org/t/p/original" + ep.still_path
                        console.log("[TMDb Provider] BEFORE - Episode " + epNum + " image: " + e.animeMetadata.episodes[epNum].image)
                        
                        e.animeMetadata.episodes[epNum].image = imageUrl
                        e.animeMetadata.episodes[epNum].hasImage = true
                        
                        console.log("[TMDb Provider] AFTER - Episode " + epNum + " image: " + e.animeMetadata.episodes[epNum].image)
                        totalReplaced++
                    }
                }
            }

            console.log("[TMDb Provider] ✅ Replaced " + totalReplaced + " episodes")

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
