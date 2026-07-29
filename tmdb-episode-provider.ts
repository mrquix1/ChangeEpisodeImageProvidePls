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
        console.log("[TMDb Provider] Metadata keys: " + Object.keys(e.animeMetadata).join(", "))
        console.log("[TMDb Provider] Title value: " + e.animeMetadata.title)

        // Try to get title from any available property
        let titleToSearch = ""
        if (e.animeMetadata.title) titleToSearch = e.animeMetadata.title
        else if (e.animeMetadata.englishTitle) titleToSearch = e.animeMetadata.englishTitle
        else if (e.animeMetadata.romajiTitle) titleToSearch = e.animeMetadata.romajiTitle
        else if (e.animeMetadata.name) titleToSearch = e.animeMetadata.name

        console.log("[TMDb Provider] Using title: " + titleToSearch)

        if (!titleToSearch) {
            console.log("[TMDb Provider] No title found in metadata")
            e.next()
            return
        }

        console.log("[TMDb Provider] Searching for: " + titleToSearch)

        fetch(TMDB_API_BASE + "/search/tv?api_key=" + TMDB_API_KEY + "&query=" + encodeURIComponent(titleToSearch))
            .then(function(res) {
                console.log("[TMDb Provider] Search response status: " + res.status)
                return res.json()
            })
            .then(function(data) {
                console.log("[TMDb Provider] Search response received, results: " + (data.results ? data.results.length : 0))

                if (!data.results || data.results.length === 0) {
                    console.log("[TMDb Provider] No match found")
                    e.next()
                    return
                }

                const tmdbId = data.results[0].id
                const tmdbName = data.results[0].name
                console.log("[TMDb Provider] Found TMDb ID: " + tmdbId + " (" + tmdbName + ")")

                // Get show info to know total seasons
                return fetch(TMDB_API_BASE + "/tv/" + tmdbId + "?api_key=" + TMDB_API_KEY)
                    .then(function(res) { return res.json() })
                    .then(function(show) {
                        const seasonCount = show.number_of_seasons || 0
                        console.log("[TMDb Provider] Total seasons: " + seasonCount)

                        // Fetch all seasons
                        const seasonPromises = []
                        for (let season = 1; season <= seasonCount; season++) {
                            const promise = fetch(TMDB_API_BASE + "/tv/" + tmdbId + "/season/" + season + "?api_key=" + TMDB_API_KEY)
                                .then(function(res) { return res.json() })
                                .then(function(seasonData) {
                                    console.log("[TMDb Provider] Season " + season + " fetched: " + (seasonData.episodes ? seasonData.episodes.length : 0) + " episodes")
                                    return seasonData
                                })
                            seasonPromises.push(promise)
                        }

                        return Promise.all(seasonPromises).then(function(allSeasons) {
                            let totalReplaced = 0

                            for (let s = 0; s < allSeasons.length; s++) {
                                const seasonData = allSeasons[s]
                                const episodes = seasonData.episodes || []

                                for (let i = 0; i < episodes.length; i++) {
                                    const ep = episodes[i]
                                    const epNum = ep.episode_number

                                    if (ep.still_path && e.animeMetadata.episodes[epNum]) {
                                        const imageUrl = "https://image.tmdb.org/t/p/original" + ep.still_path
                                        e.animeMetadata.episodes[epNum].image = imageUrl
                                        e.animeMetadata.episodes[epNum].hasImage = true
                                        console.log("[TMDb Provider] ✅ Replaced episode " + epNum)
                                        totalReplaced++
                                    }
                                }
                            }

                            console.log("[TMDb Provider] ✅ Done: Replaced " + totalReplaced + " episodes total")
                            e.next()
                        })
                    })
                    .catch(function(err) {
                        console.error("[TMDb Provider] Error fetching seasons: " + err)
                        e.next()
                    })
            })
            .catch(function(err) {
                console.error("[TMDb Provider] Search error: " + err)
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
