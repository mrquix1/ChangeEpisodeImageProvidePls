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

        try {
            var API_KEY = "eaf9b42d6945bfe9a7d81e97174b04af"
            var API_BASE = "https://api.themoviedb.org/3"

            // Get title
            var titleToSearch = ""
            if (e.animeMetadata.getTitle && typeof e.animeMetadata.getTitle === "function") {
                titleToSearch = e.animeMetadata.getTitle()
            } else if (e.animeMetadata.titles) {
                titleToSearch = e.animeMetadata.titles.english || e.animeMetadata.titles.romaji
            }

            titleToSearch = titleToSearch.replace(/\s+Season\s+\d+/i, "").trim()
            console.log("[TMDb Provider] Searching TMDb: " + titleToSearch)

            // Search TMDb
            var searchRes = await fetch(API_BASE + "/search/tv?api_key=" + API_KEY + "&query=" + encodeURIComponent(titleToSearch))
            var searchData = await searchRes.json()

            if (!searchData.results || searchData.results.length === 0) {
                console.log("[TMDb Provider] No TMDb match")
                e.next()
                return
            }

            var tmdbId = searchData.results[0].id
            var tmdbName = searchData.results[0].name
            console.log("[TMDb Provider] Found TMDb: " + tmdbName)

            // Get show info
            var showRes = await fetch(API_BASE + "/tv/" + tmdbId + "?api_key=" + API_KEY)
            var show = await showRes.json()
            var seasonCount = show.number_of_seasons || 0
            console.log("[TMDb Provider] TMDb Seasons: " + seasonCount)

            // Create map of episode keys from local metadata
            var episodeKeysMap = {}
            var episodeKeys = Object.keys(e.animeMetadata.episodes)
            for (var k = 0; k < episodeKeys.length; k++) {
                var key = episodeKeys[k]
                episodeKeysMap[key] = true
            }

            console.log("[TMDb Provider] Local episodes: " + episodeKeys.join(", "))

            var totalReplaced = 0
            var episodeIndex = 1
            
            // Fetch all TMDb seasons and map sequentially
            for (var season = 1; season <= seasonCount; season++) {
                var seasonRes = await fetch(API_BASE + "/tv/" + tmdbId + "/season/" + season + "?api_key=" + API_KEY)
                var seasonData = await seasonRes.json()
                var episodes = seasonData.episodes || []
                console.log("[TMDb Provider] Season " + season + ": " + episodes.length + " episodes")

                for (var i = 0; i < episodes.length; i++) {
                    var tmdbEp = episodes[i]

                    // Find matching local episode by searching for similar episode index
                    var matchedKey = null
                    
                    // Try direct number match first
                    if (e.animeMetadata.episodes[episodeIndex]) {
                        matchedKey = episodeIndex
                    } else {
                        // Search through available keys for a match
                        for (var k = 0; k < episodeKeys.length; k++) {
                            var key = episodeKeys[k]
                            var ep = e.animeMetadata.episodes[key]
                            
                            // If this episode hasn't been matched yet and has matching air date
                            if (ep.airDate === tmdbEp.air_date) {
                                matchedKey = key
                                break
                            }
                        }
                    }

                    // If we found a match
                    if (matchedKey && tmdbEp.still_path) {
                        var imageUrl = "https://image.tmdb.org/t/p/original" + tmdbEp.still_path
                        e.animeMetadata.episodes[matchedKey].image = imageUrl
                        e.animeMetadata.episodes[matchedKey].hasImage = true
                        console.log("[TMDb Provider] ✅ ep " + matchedKey + " <- TMDb S" + season + "E" + tmdbEp.episode_number + ": " + tmdbEp.name)
                        totalReplaced++
                    } else if (tmdbEp.still_path) {
                        console.log("[TMDb Provider] ⚠️  No match for TMDb S" + season + "E" + tmdbEp.episode_number)
                    }

                    episodeIndex++
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
