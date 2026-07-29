/// <reference path="./core.d.ts" />
/// <reference path="./app.d.ts" />
/// <reference path="./plugin.d.ts" />

function init() {
    console.log("[TMDb Provider] ✅ Plugin init started")

    var TMDB_API_KEY = "7b7daf721c0b4b5789d993c24402a9dc"
    var TMDB_API_BASE = "https://api.themoviedb.org/3"

    var doReplace = function(e) {
        if (!e.animeMetadata || !e.animeMetadata.episodes) {
            e.next()
            return
        }

        console.log("[TMDb Provider] Hook fired for media " + e.mediaId)

        // Get title
        var titleToSearch = ""
        if (e.animeMetadata.getTitle && typeof e.animeMetadata.getTitle === "function") {
            titleToSearch = e.animeMetadata.getTitle()
        } else if (e.animeMetadata.titles) {
            titleToSearch = e.animeMetadata.titles.english || e.animeMetadata.titles.romaji
        }

        // Remove "Season X" from title
        titleToSearch = titleToSearch.replace(/\s+Season\s+\d+/i, "").trim()

        console.log("[TMDb Provider] Searching for: " + titleToSearch)

        if (!titleToSearch) {
            e.next()
            return
        }

        try {
            var searchUrl = TMDB_API_BASE + "/search/tv?api_key=" + TMDB_API_KEY + "&query=" + encodeURIComponent(titleToSearch)
            console.log("[TMDb Provider] Fetching: " + searchUrl)

            var searchRes = fetch(searchUrl)
            console.log("[TMDb Provider] Fetch complete")
            
            if (searchRes && searchRes.ok) {
                var searchData = searchRes.json()
                console.log("[TMDb Provider] Results: " + (searchData.results ? searchData.results.length : 0))
                
                if (searchData.results && searchData.results.length > 0) {
                    var tmdbId = searchData.results[0].id
                    console.log("[TMDb Provider] Found TMDb ID: " + tmdbId)
                    
                    // Fetch show details
                    var showRes = fetch(TMDB_API_BASE + "/tv/" + tmdbId + "?api_key=" + TMDB_API_KEY)
                    
                    if (showRes && showRes.ok) {
                        var show = showRes.json()
                        var seasonCount = show.number_of_seasons || 1
                        console.log("[TMDb Provider] Seasons: " + seasonCount)
                        
                        // Fetch and replace all seasons
                        var totalReplaced = 0
                        for (var season = 1; season <= seasonCount; season++) {
                            var seasonRes = fetch(TMDB_API_BASE + "/tv/" + tmdbId + "/season/" + season + "?api_key=" + TMDB_API_KEY)
                            
                            if (seasonRes && seasonRes.ok) {
                                var seasonData = seasonRes.json()
                                var episodes = seasonData.episodes || []
                                
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
                        }
                        
                        console.log("[TMDb Provider] ✅ Replaced " + totalReplaced + " episodes")
                    }
                }
            }
        } catch (err) {
            console.error("[TMDb Provider] Error: " + err)
        }

        e.next()
    }

    $app.onAnimeMetadata(doReplace)

    $ui.register(function(ctx) {
        var tray = ctx.newTray({ tooltipText: "TMDb Episode Provider", withContent: true })
        var status = ctx.state("Ready")

        tray.render(function() {
            return tray.stack([
                tray.text("TMDb Episode Provider", { className: "font-bold" }),
                tray.text("Status: " + status.get(), { className: "text-sm" }),
            ])
        })

        console.log("[TMDb Provider] ✅ Loaded!")
    })
}
