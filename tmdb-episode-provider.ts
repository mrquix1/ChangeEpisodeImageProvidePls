/// <reference path="./core.d.ts" />
/// <reference path="./app.d.ts" />
/// <reference path="./plugin.d.ts" />

const TMDB_API_KEY = "7b7daf721c0b4b5789d993c24402a9dc"
const TMDB_API_BASE = "https://api.themoviedb.org/3"

function init() {
    console.log("[TMDb Provider] ✅ Plugin init started")

    $app.onAnimeMetadata(function(e) {
        if (!e.animeMetadata || !e.animeMetadata.episodes) {
            e.next()
            return
        }

        console.log("[TMDb Provider] Hook fired for media " + e.mediaId)

        // Get title
        let titleToSearch = ""
        if (e.animeMetadata.getTitle && typeof e.animeMetadata.getTitle === "function") {
            titleToSearch = e.animeMetadata.getTitle()
        } else if (e.animeMetadata.titles) {
            titleToSearch = e.animeMetadata.titles.english || e.animeMetadata.titles.romaji
        }

        // Remove "Season X" from title to search just the base name
        titleToSearch = titleToSearch.replace(/\s+Season\s+\d+/i, "").trim()

        console.log("[TMDb Provider] Searching for: " + titleToSearch)

        if (!titleToSearch) {
            e.next()
            return
        }

        // Simplified direct fetch without complex promise chains
        var searchUrl = TMDB_API_BASE + "/search/tv?api_key=" + TMDB_API_KEY + "&query=" + encodeURIComponent(titleToSearch)
        console.log("[TMDb Provider] Fetching URL: " + searchUrl)

        try {
            var searchRes = fetch(searchUrl)
            console.log("[TMDb Provider] Fetch complete")
            
            if (searchRes && searchRes.ok) {
                var searchData = searchRes.json()
                console.log("[TMDb Provider] JSON parsed, results: " + (searchData.results ? searchData.results.length : 0))
                
                if (searchData.results && searchData.results.length > 0) {
                    var tmdbId = searchData.results[0].id
                    console.log("[TMDb Provider] Found TMDb ID: " + tmdbId)
                    
                    // Fetch show details
                    var showUrl = TMDB_API_BASE + "/tv/" + tmdbId + "?api_key=" + TMDB_API_KEY
                    var showRes = fetch(showUrl)
                    
                    if (showRes && showRes.ok) {
                        var show = showRes.json()
                        var seasonCount = show.number_of_seasons || 1
                        console.log("[TMDb Provider] Found " + seasonCount + " seasons")
                        
                        // Fetch and replace all seasons
                        var totalReplaced = 0
                        for (var season = 1; season <= seasonCount; season++) {
                            var seasonUrl = TMDB_API_BASE + "/tv/" + tmdbId + "/season/" + season + "?api_key=" + TMDB_API_KEY
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
                        
                        console.log("[TMDb Provider] ✅ Done: Replaced " + totalReplaced + " total")
                    }
                } else {
                    console.log("[TMDb Provider] No results found")
                }
            } else {
                console.log("[TMDb Provider] Fetch failed or not ok")
            }
        } catch (err) {
            console.error("[TMDb Provider] Error: " + err)
        }

        e.next()
    })

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
