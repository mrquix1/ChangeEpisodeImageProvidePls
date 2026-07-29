/// <reference path="./core.d.ts" />
/// <reference path="./app.d.ts" />
/// <reference path="./plugin.d.ts" />

const TMDB_API_KEY = "7b7daf721c0b4b5789d993c24402a9dc"
const TMDB_API_BASE = "https://api.themoviedb.org/3"
const imageCache = {}

function searchTmdbAnime(mediaId, animeMetadata) {
    const queries = []
    if (animeMetadata.title) {
        if (typeof animeMetadata.title === "string") queries.push(animeMetadata.title)
        else {
            if (animeMetadata.title.english) queries.push(animeMetadata.title.english)
            if (animeMetadata.title.romaji) queries.push(animeMetadata.title.romaji)
        }
    }
    if (animeMetadata.englishTitle) queries.push(animeMetadata.englishTitle)
    
    return fetch(TMDB_API_BASE + "/search/tv?api_key=" + TMDB_API_KEY + "&query=" + encodeURIComponent(queries[0]))
        .then(function(res) { return res.json() })
        .catch(function() { return { results: [] } })
}

function getEpisodes(tmdbId) {
    return fetch(TMDB_API_BASE + "/tv/" + tmdbId + "?api_key=" + TMDB_API_KEY)
        .then(function(res) { return res.json() })
        .catch(function() { return { number_of_seasons: 0 } })
}

function init() {
    console.log("[TMDb Provider] ✅ Plugin init started")

    $app.onAnimeMetadata(function(e) {
        if (!e.animeMetadata || !e.animeMetadata.episodes) {
            e.next()
            return
        }

        console.log("[TMDb Provider] Hook fired for media " + e.mediaId)

        searchTmdbAnime(e.mediaId, e.animeMetadata).then(function(data) {
            if (!data.results || !data.results[0]) {
                console.log("[TMDb Provider] No match found")
                e.next()
                return
            }

            const tmdbId = data.results[0].id
            console.log("[TMDb Provider] Found TMDb ID: " + tmdbId)

            return getEpisodes(tmdbId).then(function(show) {
                const seasonCount = show.number_of_seasons || 0
                let loaded = 0

                if (seasonCount === 0) {
                    e.next()
                    return
                }

                for (let season = 0; season < seasonCount; season++) {
                    fetch(TMDB_API_BASE + "/tv/" + tmdbId + "/season/" + season + "?api_key=" + TMDB_API_KEY)
                        .then(function(res) { return res.json() })
                        .then(function(seasonData) {
                            const episodes = seasonData.episodes || []
                            
                            for (let i = 0; i < episodes.length; i++) {
                                const ep = episodes[i]
                                const epNum = ep.episode_number
                                
                                if (ep.still_path) {
                                    // Only match regular episode numbers (skip specials like S1, OP1, ED1)
                                    if (e.animeMetadata.episodes[epNum]) {
                                        console.log("[TMDb Provider] Replacing episode " + epNum)
                                        e.animeMetadata.episodes[epNum].image = "https://image.tmdb.org/t/p/original" + ep.still_path
                                        e.animeMetadata.episodes[epNum].hasImage = true
                                    }
                                }
                            }
                            loaded++
                            if (loaded === seasonCount) {
                                console.log("[TMDb Provider] ✅ Done replacing images")
                                e.next()
                            }
                        })
                        .catch(function() { 
                            loaded++
                            if (loaded === seasonCount) e.next()
                        })
                }
            })
        }).catch(function() {
            e.next()
        })
    })

    $ui.register(function(ctx) {
        const tray = ctx.newTray({ tooltipText: "TMDb Episode Provider", withContent: true })
        const status = ctx.state("Ready")

        tray.render(function() {
            return tray.stack([
                tray.text("TMDb Episode Provider", { className: "font-bold" }),
                tray.text("Status: " + status.get(), { className: "text-sm" }),
            ])
        })

        console.log("[TMDb Provider] ✅ Loaded!")
    })
}
