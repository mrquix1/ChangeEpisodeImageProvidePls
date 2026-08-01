/// <reference path="./core.d.ts" />
/// <reference path="./app.d.ts" />
/// <reference path="./plugin.d.ts" />

function init() {
    console.log("[TMDb Provider] ✅ Plugin init started")

    var API_KEY = "eaf9b42d6945bfe9a7d81e97174b04af"
    var API_BASE = "https://api.themoviedb.org/3"

    // Run on app startup
    async function processAllAnime() {
        console.log("[TMDb Provider] ⏳ Starting batch processing on app startup...")
        
        try {
            // Get all anime from AniList collection
            var anilistRes = await fetch("https://graphql.anilist.co", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query: `{
                        Page(page: 1, perPage: 50) {
                            media(type: ANIME) {
                                id
                                title { english romaji }
                                episodes
                            }
                        }
                    }`
                })
            })
            
            var anilistData = await anilistRes.json()
            console.log("[TMDb Provider] Found " + (anilistData.data?.Page?.media?.length || 0) + " anime")
            
        } catch (err) {
            console.log("[TMDb Provider] Startup processing skipped: " + err)
        }
    }

    // Trigger on startup
    if (typeof $app.onAppStart === "function") {
        $app.onAppStart(function() {
            console.log("[TMDb Provider] App started, processing anime...")
            processAllAnime()
        })
    }

    // Also keep the normal hook for when user navigates
    $app.onAnimeMetadata(async function(e) {
        if (!e.animeMetadata || !e.animeMetadata.episodes) {
            e.next()
            return
        }

        console.log("[TMDb Provider] Processing media " + e.mediaId)

        try {
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
                e.next()
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
                    
                    if (e.animeMetadata.episodes[episodeIndex]) {
                        matchedKey = episodeIndex
                    } else {
                        for (var k = 0; k < episodeKeys.length; k++) {
                            var key = episodeKeys[k]
                            var ep = e.animeMetadata.episodes[key]
                            if (ep.airDate === tmdbEp.air_date) {
                                matchedKey = key
                                break
                            }
                        }
                    }

                    if (matchedKey && tmdbEp.still_path) {
                        var imageUrl = "https://image.tmdb.org/t/p/original" + tmdbEp.still_path
                        e.animeMetadata.episodes[matchedKey].image = imageUrl
                        e.animeMetadata.episodes[matchedKey].hasImage = true
                        console.log("[TMDb Provider] ✅ Episode " + matchedKey)
                        totalReplaced++
                    }

                    episodeIndex++
                }
            }

            console.log("[TMDb Provider] ✅ Replaced " + totalReplaced + " episodes!")

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
