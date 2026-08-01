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

        var autoStartEnabled = ctx.state(true)

        tray.render(function() {
            return tray.stack([
                tray.text("TMDb Episode Provider", { className: "font-bold" }),
                tray.text("Status: Ready", { className: "text-sm" }),
                tray.div({ style: { marginTop: "15px", paddingTop: "15px", borderTop: "1px solid rgba(255,255,255,0.1)" } }),
                tray.text("STARTUP", { className: "text-xs font-bold", style: { color: "rgba(255,255,255,0.4)", textTransform: "uppercase" } }),
                tray.checkbox({
                    label: "Auto-refresh images on launch",
                    checked: autoStartEnabled.get(),
                    onChange: function(checked) {
                        autoStartEnabled.set(checked)
                    }
                })
            ])
        })

        // Background job that runs on startup
        if (ctx.jobs && ctx.jobs.poll) {
            ctx.jobs.poll("tmdb-provider-startup", function() {
                if (autoStartEnabled.get()) {
                    console.log("[TMDb Provider] Auto-refresh enabled - waiting for metadata...")
                }
            }, 5000, { immediate: true })
        }
    })
}
