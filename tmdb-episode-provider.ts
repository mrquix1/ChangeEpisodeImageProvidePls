/// <reference path="./core.d.ts" />
/// <reference path="./app.d.ts" />
/// <reference path="./plugin.d.ts" />

function init() {
    console.log("[TMDb Provider] ✅ Plugin init started")

    // DEFINE CONFIG AS SHARED - THIS WORKS ACROSS ALL RUNTIMES
    $shared.define("tmdbConfig", function() {
        return {
            API_KEY: "7b7daf721c0b4b5789d993c24402a9dc",
            API_BASE: "https://api.themoviedb.org/3"
        }
    })

    console.log("[TMDb Provider] ✅ Config defined in $shared")

    // Hook into anime metadata
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
            // GET CONFIG FROM $shared
            var config = $shared.use("tmdbConfig")
            console.log("[TMDb Provider] Config retrieved from $shared")

            // Synchronous fetch for TMDb API
            var searchUrl = config.API_BASE + "/search/tv?api_key=" + config.API_KEY + "&query=" + encodeURIComponent(titleToSearch)
            console.log("[TMDb Provider] Fetching: " + searchUrl)

            var searchRes = fetch(searchUrl)
            console.log("[TMDb Provider] Fetch completed, status: " + (searchRes ? searchRes.status : "null"))

            if (searchRes && searchRes.ok) {
                var searchData = searchRes.json()
                console.log("[TMDb Provider] Parsed JSON, results: " + (searchData.results ? searchData.results.length : 0))

                if (searchData.results && searchData.results.length > 0) {
                    var tmdbId = searchData.results[0].id
                    var tmdbName = searchData.results[0].name
                    console.log("[TMDb Provider] Found: " + tmdbName + " (ID: " + tmdbId + ")")

                    // Get show info
                    var showUrl = config.API_BASE + "/tv/" + tmdbId + "?api_key=" + config.API_KEY
                    var showRes = fetch(showUrl)

                    if (showRes && showRes.ok) {
                        var show = showRes.json()
                        var seasonCount = show.number_of_seasons || 0
                        console.log("[TMDb Provider] Found " + seasonCount + " seasons")

                        var totalReplaced = 0

                        // Fetch all seasons
                        for (var season = 1; season <= seasonCount; season++) {
                            var seasonUrl = config.API_BASE + "/tv/" + tmdbId + "/season/" + season + "?api_key=" + config.API_KEY
                            var seasonRes = fetch(seasonUrl)

                            if (seasonRes && seasonRes.ok) {
                                var seasonData = seasonRes.json()
                                var episodes = seasonData.episodes || []
                                console.log("[TMDb Provider] Season " + season + ": " + episodes.length + " episodes")

                                for (var i = 0; i < episodes.length; i++) {
                                    var ep = episodes[i]
                                    var epNum = ep.episode_number

                                    if (ep.still_path && e.animeMetadata.episodes[epNum]) {
                                        var imageUrl = "https://image.tmdb.org/t/p/original" + ep.still_path
                                        e.animeMetadata.episodes[epNum].image = imageUrl
                                        e.animeMetadata.episodes[epNum].hasImage = true
                                        console.log("[TMDb Provider] ✅ Replaced episode " + epNum)
                                        totalReplaced++
                                    }
                                }
                            }
                        }

                        console.log("[TMDb Provider] ✅ Done: Replaced " + totalReplaced + " episodes")
                    }
                } else {
                    console.log("[TMDb Provider] No match found")
                }
            } else {
                console.log("[TMDb Provider] Fetch failed or not ok")
            }
        } catch (err) {
            console.error("[TMDb Provider] Error: " + err)
        }

        e.next()
    })

    // UI Context
    $ui.register(function(ctx) {
        console.log("[TMDb Provider] ✅ UI context registered")

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

        console.log("[TMDb Provider] ✅ Loaded!")
    })
}
