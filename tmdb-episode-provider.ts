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

        console.log("[TMDb Provider] Title: " + titleToSearch)

        if (!titleToSearch) {
            e.next()
            return
        }

        try {
            var config = $shared.use("tmdbConfig")

            var searchUrl = config.API_BASE + "/search/tv?api_key=" + config.API_KEY + "&query=" + encodeURIComponent(titleToSearch)
            console.log("[TMDb Provider] Fetching: " + searchUrl)

            // FETCH AS TEXT, NOT JSON
            var searchRes = fetch(searchUrl)
            console.log("[TMDb Provider] Got response")

            // Parse the text response as JSON manually
            var searchDataText = searchRes
            console.log("[TMDb Provider] Response type: " + typeof searchDataText)
            console.log("[TMDb Provider] Response length: " + searchDataText.length)

            // Try to parse it
            var searchData = JSON.parse(searchDataText)
            console.log("[TMDb Provider] Parsed JSON, results: " + (searchData.results ? searchData.results.length : 0))

            if (!searchData.results || searchData.results.length === 0) {
                console.log("[TMDb Provider] No results")
                e.next()
                return
            }

            var tmdbId = searchData.results[0].id
            var tmdbName = searchData.results[0].name
            console.log("[TMDb Provider] Found: " + tmdbName + " (ID: " + tmdbId + ")")

            // Get show details
            var showUrl = config.API_BASE + "/tv/" + tmdbId + "?api_key=" + config.API_KEY
            var showRes = fetch(showUrl)
            var show = JSON.parse(showRes)
            var seasonCount = show.number_of_seasons || 0
            console.log("[TMDb Provider] Seasons: " + seasonCount)

            var totalReplaced = 0

            // Fetch all seasons
            for (var season = 1; season <= seasonCount; season++) {
                var seasonUrl = config.API_BASE + "/tv/" + tmdbId + "/season/" + season + "?api_key=" + config.API_KEY
                var seasonRes = fetch(seasonUrl)
                var seasonData = JSON.parse(seasonRes)
                var episodes = seasonData.episodes || []

                for (var i = 0; i < episodes.length; i++) {
                    var ep = episodes[i]
                    var epNum = ep.episode_number

                    if (ep.still_path && e.animeMetadata.episodes && e.animeMetadata.episodes[epNum]) {
                        var imageUrl = "https://image.tmdb.org/t/p/original" + ep.still_path
                        e.animeMetadata.episodes[epNum].image = imageUrl
                        e.animeMetadata.episodes[epNum].hasImage = true
                        console.log("[TMDb Provider] ✅ Episode " + epNum)
                        totalReplaced++
                    }
                }
            }

            console.log("[TMDb Provider] ✅✅✅ Replaced " + totalReplaced + " images")

        } catch (err) {
            console.error("[TMDb Provider] Error: " + err)
        }

        e.next()
    })

    $ui.register(function(ctx) {
        console.log("[TMDb Provider] ✅ UI loaded")

        var tray = ctx.newTray({
            tooltipText: "TMDb Episode Provider",
            withContent: true
        })

        var status = ctx.state("Ready")

        tray.render(function() {
            return tray.stack([
                tray.text("TMDb Episode Provider", { className: "font-bold" }),
                tray.text("Status: " + status.get(), { className: "text-sm" })
            ])
        })
    })
}
