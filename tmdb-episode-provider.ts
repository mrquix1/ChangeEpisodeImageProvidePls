/// <reference path="./plugin.d.ts" />
/// <reference path="./system.d.ts" />
/// <reference path="./app.d.ts" />
/// <reference path="./core.d.ts" />

function init() {
    $app.onAnimeMetadata((e) => {
        console.log("[TMDb] onAnimeMetadata fired")
        $store.set("TMDB_ANIME_METADATA", { mediaId: e.mediaId, animeMetadata: e.animeMetadata })
        e.next()
    })
    
    $ui.register((ctx) => {
        console.log("[TMDb] UI registered")
        
        $store.watch("TMDB_ANIME_METADATA", (data) => {
            console.log("[TMDb] Fetching for mediaId:", data.mediaId)
            
            try {
                const findResp = ctx.fetch("https://api.themoviedb.org/3/find/" + data.mediaId + "?api_key=1a1c34ba2f8d63191cd5b163d74d1c52&external_source=anilist_id")
                
                if (!findResp?.tv_results?.[0]) {
                    console.log("[TMDb] No match")
                    return
                }
                
                const tmdbId = findResp.tv_results[0].id
                console.log("[TMDb] TMDb ID:", tmdbId)
                
                const showResp = ctx.fetch("https://api.themoviedb.org/3/tv/" + tmdbId + "?api_key=1a1c34ba2f8d63191cd5b163d74d1c52")
                
                if (!showResp?.seasons) return
                
                for (let s = 0; s < showResp.seasons.length; s++) {
                    const seasonNum = showResp.seasons[s].season_number
                    const seasonResp = ctx.fetch("https://api.themoviedb.org/3/tv/" + tmdbId + "/season/" + seasonNum + "?api_key=1a1c34ba2f8d63191cd5b163d74d1c52")
                    
                    if (!seasonResp?.episodes) continue
                    
                    for (let ep = 0; ep < seasonResp.episodes.length; ep++) {
                        const episode = seasonResp.episodes[ep]
                        if (data.animeMetadata.episodes["e" + episode.episode_number] && episode.still_path) {
                            data.animeMetadata.episodes["e" + episode.episode_number].image = "https://image.tmdb.org/t/p/original" + episode.still_path
                            console.log("[TMDb] REPLACED episode", episode.episode_number)
                        }
                    }
                }
                
                console.log("[TMDb] Done")
            } catch (err) {
                console.error("[TMDb] Error:", err)
            }
        })
    })
}
