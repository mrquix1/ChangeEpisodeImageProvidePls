/// <reference path="./plugin.d.ts" />
/// <reference path="./system.d.ts" />
/// <reference path="./app.d.ts" />
/// <reference path="./core.d.ts" />

function init() {
    $app.onAnimeEpisodeMetadata((e) => {
        if (!e.animeEpisodeMetadata?.image) {
            e.next()
            return
        }
        
        if (e.animeEpisodeMetadata.image.indexOf("thetvdb") === -1) {
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
            
            if (!findResp || !findResp.tv_results || findResp.tv_results.length === 0) {
                console.log("[TMDb] No TMDb match")
                e.next()
                return
            }
            
            const tmdbId = findResp.tv_results[0].id
            console.log("[TMDb] TMDb ID:", tmdbId)
            
            const epUrl = baseUrl + "/tv/" + tmdbId + "/season/3/episode/" + e.episodeNumber + "?api_key=" + apiKey
            const epResp = fetch(epUrl)
            
            if (epResp && epResp.still_path) {
                const newImage = imageUrl + epResp.still_path
                e.animeEpisodeMetadata.image = newImage
                e.animeEpisodeMetadata.hasImage = true
                console.log("[TMDb] REPLACED episode", e.episodeNumber)
            } else {
                console.log("[TMDb] No still_path for episode", e.episodeNumber)
            }
        } catch (err) {
            console.error("[TMDb] Error:", err)
        }
        
        e.next()
    })
}
