/// <reference path="./plugin.d.ts" />
/// <reference path="./system.d.ts" />
/// <reference path="./app.d.ts" />
/// <reference path="./core.d.ts" />

function init() {
    $app.onAnimeMetadata((e) => {
        console.log("[TMDb] onAnimeMetadata fired")
        
        if (!e.animeMetadata?.episodes) {
            e.next()
            return
        }
        
        try {
            const findResp = fetch("https://api.themoviedb.org/3/find/" + e.mediaId + "?api_key=1a1c34ba2f8d63191cd5b163d74d1c52&external_source=anilist_id")
            
            if (!findResp?.tv_results?.[0]) {
                e.next()
                return
            }
            
            const tmdbId = findResp.tv_results[0].id
            console.log("[TMDb] TMDb ID:", tmdbId)
            
            const showResp = fetch("https://api.themoviedb.org/3/tv/" + tmdbId + "?api_key=1a1c34ba2f8d63191cd5b163d74d1c52")
            
            if (!showResp?.seasons) {
                e.next()
                return
            }
            
            for (let s = 0; s < showResp.seasons.length; s++) {
                const seasonNum = showResp.seasons[s].season_number
                const seasonResp = fetch("https://api.themoviedb.org/3/tv/" + tmdbId + "/season/" + seasonNum + "?api_key=1a1c34ba2f8d63191cd5b163d74d1c52")
                
                if (!seasonResp?.episodes) continue
                
                for (let ep = 0; ep < seasonResp.episodes.length; ep++) {
                    const episode = seasonResp.episodes[ep]
                    if (e.animeMetadata.episodes["e" + episode.episode_number] && episode.still_path) {
                        e.animeMetadata.episodes["e" + episode.episode_number].image = "https://image.tmdb.org/t/p/original" + episode.still_path
                        console.log("[TMDb] REPLACED episode", episode.episode_number)
                    }
                }
            }
        } catch (err) {
            console.error("[TMDb] Error:", err)
        }
        
        e.next()
    })
}
