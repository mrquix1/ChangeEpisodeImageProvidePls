/// <reference path="./plugin.d.ts" />
/// <reference path="./system.d.ts" />
/// <reference path="./app.d.ts" />
/// <reference path="./core.d.ts" />

function init() {
    $app.onAnimeEpisodeMetadata((e) => {
        if (!e.animeEpisodeMetadata?.image?.includes("thetvdb")) {
            e.next()
            return
        }
        
        console.log("[TMDb] Episode", e.episodeNumber)
        
        try {
            const apiKey = "1a1c34ba2f8d63191cd5b163d74d1c52"
            const baseUrl = "https://api.themoviedb.org/3"
            const imageUrl = "https://image.tmdb.org/t/p/original"
            
            const findUrl = baseUrl + "/find/" + e.mediaId + "?api_key=" + apiKey + "&external_source=anilist_id"
            const findResp = fetch(findUrl)
            
            if (!findResp?.tv_results?.[0]) {
                e.next()
                return
            }
            
            const tmdbId = findResp.tv_results[0].id
            
            // Try seasons 1-5
            for (let season = 1; season <= 5; season++) {
                const epUrl = baseUrl + "/tv/" + tmdbId + "/season/" + season + "/episode/" + e.episodeNumber + "?api_key=" + apiKey
                const epResp = fetch(epUrl)
                
                if (epResp?.still_path) {
                    e.animeEpisodeMetadata.image = imageUrl + epResp.still_path
                    e.animeEpisodeMetadata.hasImage = true
                    console.log("[TMDb] REPLACED")
                    break
                }
            }
        } catch (err) {
            console.error("[TMDb] Error:", err)
        }
        
        e.next()
    })
}
