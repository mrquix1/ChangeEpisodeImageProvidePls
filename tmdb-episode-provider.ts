/// <reference path="./core.d.ts" />
/// <reference path="./app.d.ts" />
/// <reference path="./plugin.d.ts" />

function init() {
    console.log("[TMDb Provider] ✅ Plugin init started")

    // Function to process and replace episode images
    async function processEpisodeImages(e) {
        if (!e.animeMetadata || !e.animeMetadata.episodes) {
            return
        }

        console.log("[TMDb Provider] Processing media " + e.mediaId)

        try {
            var API_KEY = "eaf9b42d6945bfe9a7d81e97174b04af"
            var API_BASE = "https://api.themoviedb.org/3"

            var titleToSearch = ""
            if (e.animeMetadata.getTitle && typeof e.animeMetadata.getTitle === "function") {
                titleToSearch = e.animeMetadata.getTitle()
            } else if (e.animeMetadata.titles) {
                titleToSearch = e.animeMetadata.titles.english || e.animeMetadata.titles.romaji
            }

            titleToSearch = titleToSearch.replace(/\s+Season\s+\d+/i, "").trim()
            console.log("[TMDb Provider] Searching: " + titleToSearch)

            var searchRes = await fetch(API_BASE + "/search/tv?api_key=" + API_KEY + "&query=" + encodeURIComponent(titleToSearch))
            var searchData = await searchRes.json()

            if (!searchData.results || searchData.results.length === 0) {
                console.log("[TMDb Provider] No match")
                return
            }

            var tmdbId = searchData.results[0].id
            console.log("[TMDb Provider] Found: " + searchData.results[0].name)

            var showRes = await fetch(API_BASE + "/tv/" + tmdbId + "?api_key=" + API_KEY)
            var show = await showRes.json()
            var seasonCount = show.number_of_seasons || 0

            var totalReplaced = 0
            var episodeIndex = 1
            
            for (var season = 1; season <= seasonCount; season++) {
                var seasonRes = await fetch(API_BASE + "/tv/" + tmdbId + "/season/" + season + "?api_key=" + API_KEY)
                var seasonData = await seasonRes.json()
                var episodes = seasonData.episodes || []

                for (var i = 0; i < episodes.length; i++) {
                    var tmdbEp = episodes[i]

                    var matchedKey = null
                    var episodeKeys = Object.keys(e.animeMetadata.episodes)
                    
                    // PRIORITY 1: Match by air date (most reliable - fixes duplicate banner problem)
                    for (var k = 0; k < episodeKeys.length; k++) {
                        var key = episodeKeys[k]
                        var ep = e.animeMetadata.episodes[key]
                        if (ep.airDate && tmdbEp.air_date && ep.airDate === tmdbEp.air_date) {
                            matchedKey = key
                            break
                        }
                    }

                    // PRIORITY 2: Fall back to continuous episode index
                    if (!matchedKey && e.animeMetadata.episodes[episodeIndex]) {
                        matchedKey = episodeIndex
                    }

                    if (matchedKey && tmdbEp.still_path && e.animeMetadata.episodes[matchedKey]) {
                        var imageUrl = "https://image.tmdb.org/t/p/original" + tmdbEp.still_path
                        e.animeMetadata.episodes[matchedKey].image = imageUrl
                        e.animeMetadata.episodes[matchedKey].hasImage = true
                        console.log("[TMDb Provider] ✅ Episode " + matchedKey + " (S" + season + "E" + tmdbEp.episode_number + ")")
                        totalReplaced++
                    }

                    episodeIndex++
                }
            }

            console.log("[TMDb Provider] ✅ Replaced " + totalReplaced + " episodes!")

        } catch (err) {
            console.error("[TMDb Provider] Error: " + err)
        }
    }

    // Hook 1: Fires on Seanime startup when loading library data (AUTO-REFRESH)
    $app.onAnimeEntryLibraryDataRequested(function(e) {
        console.log("[TMDb Provider] Auto-refresh: Library data requested for media " + e.mediaId)
        processEpisodeImages(e)
        e.next()
    })

    // Hook 2: Fires when user navigates to anime page (MANUAL REFRESH)
    $app.onAnimeMetadata(async function(e) {
        console.log("[TMDb Provider] Manual refresh: Metadata loaded for media " + e.mediaId)
        await processEpisodeImages(e)
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
                tray.text("Status: ✅ Auto-refresh on startup + Manual refresh", { className: "text-sm" }),
                tray.text("Fixed: Duplicate banner issue + Auto-refresh on boot", { className: "text-xs", style: { color: "rgba(255,255,255,0.6)", marginTop: "10px" } })
            ])
        })
    })
}
