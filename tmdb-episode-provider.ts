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
                const findUrl = "https://api.themoviedb.org/3/find/" + data.mediaId + "?api_key=1a1c34ba2f8d63191cd5b163d74d1c52&external_source=anilist_id"
                console.log("[TMDb] URL:", findUrl.substring(0, 80))
                
                const findResp = ctx.fetch(findUrl)
                console.log("[TMDb] Response type:", typeof findResp)
                console.log("[TMDb] Response keys:", findResp ? Object.keys(findResp) : "null")
                console.log("[TMDb] tv_results:", findResp?.tv_results)
                
                if (!findResp?.tv_results?.[0]) {
                    console.log("[TMDb] No match - tv_results is:", findResp?.tv_results)
                    return
                }
                
                console.log("[TMDb] FOUND TMDb ID")
            } catch (err) {
                console.error("[TMDb] Error:", err)
            }
        })
    })
}
