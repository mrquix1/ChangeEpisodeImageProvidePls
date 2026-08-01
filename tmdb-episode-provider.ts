/// <reference path="./core.d.ts" />
/// <reference path="./app.d.ts" />
/// <reference path="./plugin.d.ts" />

function init() {
    console.log("[TMDb Provider] ✅ Plugin init started")

    $app.onAnimeMetadata(async function(e) {
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
        console.log("[TMDb Provider] Searching: " + titleToSearch)

        try {
            var API_KEY = "eaf9b42d6945bfe9a7d81e97174b04af"
            var API_BASE = "https://api.themoviedb.org/3"

            var searchRes = await fetch(API_BASE + "/search/tv?api_key=" + API_KEY + "&query=" + encodeURIComponent(titleToSearch))
            var searchData = await searchRes.json()

            if (!searchData.results || searchData.results.length === 0) {
                console.log("[TMDb Provider] No match")
                e.next()
                return
            }

            var tmdbId = searchData.results[0].id
            var tmdbName = searchData.results[0].name
            console.log("[TMDb Provider] Found: " + tmdbName)

            var showRes = await fetch(API_BASE + "/tv/" + tmdbId + "?api_key=" + API_KEY)
            var show = await showRes.json()
            var seasonCount = show.number_of_seasons || 0
            console.log("[TMDb Provider] TMDb has " + seasonCount + " seasons")

            // Get all episode air dates from metadata to match by date
            var episodesByAirDate = {}
            var episodeKeys = Object.keys(e.animeMetadata.episodes)
            for (var k = 0; k < episodeKeys.length; k++) {
                var key = episodeKeys[k]
                var ep = e.animeMetadata.episodes[key]
                if (ep.airDate) {
                    episodesByAirDate[ep.airDate] = key
                }
            }

            var totalReplaced = 0
            
            // Fetch all seasons and match by air date (more reliable than episode number)
            for (var season = 1; season <= seasonCount; season++) {
                var seasonRes = await fetch(API_BASE + "/tv/" + tmdbId + "/season/" + season + "?api_key=" + API_KEY)
                var seasonData = await seasonRes.json()
                var episodes = seasonData.episodes || []
                console.log("[TMDb Provider] Season " + season + ": " + episodes.length + " episodes")

                for (var i = 0; i < episodes.length; i++) {
                    var tmdbEp = episodes[i]
                    var airDate = tmdbEp.air_date

                    // Try to match by air date first
                    if (airDate && episodesByAirDate[airDate]) {
                        var epKey = episodesByAirDate[airDate]
                        if (tmdbEp.still_path) {
                            var imageUrl = "https://image.tmdb.org/t/p/original" + tmdbEp.still_path
                            e.animeMetadata.episodes[epKey].image = imageUrl
                            e.animeMetadata.episodes[epKey].hasImage = true
                            console.log("[TMDb Provider] ✅ Matched by date: Episode " + epKey)
                            totalReplaced++
                        }
                    } else {
                        // Fallback: try direct episode number match
                        var epNum = tmdbEp.episode_number
                        if (tmdbEp.still_path && e.animeMetadata.episodes[epNum]) {
                            var imageUrl = "https://image.tmdb.org/t/p/original" + tmdbEp.still_path
                            e.animeMetadata.episodes[epNum].image = imageUrl
                            e.animeMetadata.episodes[epNum].hasImage = true
                            console.log("[TMDb Provider] ✅ Matched by number: Episode " + epNum)
                            totalReplaced++
                        }
                    }
                }
            }

            console.log("[TMDb Provider] ✅✅✅ Replaced " + totalReplaced + " episodes!")

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
