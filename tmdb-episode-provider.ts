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

        var titleToSearch = ""
        if (e.animeMetadata.getTitle && typeof e.animeMetadata.getTitle === "function") {
            titleToSearch = e.animeMetadata.getTitle()
        } else if (e.animeMetadata.titles) {
            titleToSearch = e.animeMetadata.titles.english || e.animeMetadata.titles.romaji
        }

        titleToSearch = titleToSearch.replace(/\s+Season\s+\d+/i, "").trim()
        console.log("[TMDb Provider] Searching: " + titleToSearch)

        var API_KEY = "eaf9b42d6945bfe9a7d81e97174b04af"
        var API_BASE = "https://api.themoviedb.org/3"
        
        var searchUrl = API_BASE + "/search/tv?api_key=" + API_KEY + "&query=" + encodeURIComponent(titleToSearch)
        
        try {
            var searchRes = fetch(searchUrl)
            console.log("[TMDb Provider] Got search response")
            
            if (!searchRes || !searchRes.results || searchRes.results.length === 0) {
                console.log("[TMDb Provider] No results")
                e.next()
                return
            }

            var tmdbId = searchRes.results[0].id
            var tmdbName = searchRes.results[0].name
            console.log("[TMDb Provider] ✅ Found: " + tmdbName)

            var showRes = fetch(API_BASE + "/tv/" + tmdbId + "?api_key=" + API_KEY)
            var seasonCount = showRes.number_of_seasons || 0
            console.log("[TMDb Provider] Seasons: " + seasonCount)

            var totalReplaced = 0
            
            for (var season = 1; season <= seasonCount; season++) {
                var seasonRes = fetch(API_BASE + "/tv/" + tmdbId + "/season/" + season + "?api_key=" + API_KEY)
                var episodes = seasonRes.episodes || []

                for (var i = 0; i < episodes.length; i++) {
                    var ep = episodes[i]
                    var epNum = ep.episode_number

                    if (ep.still_path && e.animeMetadata.episodes[epNum]) {
                        var imageUrl = "https://image.tmdb.org/t/p/original" + ep.still_path
                        e.animeMetadata.episodes[epNum].image = imageUrl
                        e.animeMetadata.episodes[epNum].hasImage = true
                        console.log("[TMDb Provider] ✅ Episode " + epNum)
                        totalReplaced++
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
