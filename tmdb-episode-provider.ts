/// <reference path="./plugin.d.ts" />
/// <reference path="./system.d.ts" />
/// <reference path="./app.d.ts" />
/// <reference path="./core.d.ts" />

const TMDB_API_KEY = "1a1c34ba2f8d63191cd5b163d74d1c52"
const TMDB_BASE_URL = "https://api.themoviedb.org/3"
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/original"

function init() {
    $ui.register((ctx) => {
        console.log("[TMDb] UI registered - hooking into navigation")
        
        ctx.screen.onNavigate((e) => {
            console.log("[TMDb] Navigation triggered:", e.pathname)
            
            if (e.pathname === "/entry") {
                const mediaId = Number(e.searchParams.id)
                console.log("[TMDb] Entry page for media:", mediaId)
                
                ctx.anime.getAnimeEntry(mediaId).then((result) => {
                    const media = result.media
                    console.log("[TMDb] Got media, banner:", media?.bannerImage?.substring(0, 50))
                    
                    if (media && media.bannerImage && media.bannerImage.includes("thetvdb")) {
                        console.log("[TMDb] Found TheTVDB, fetching TMDb...")
                        const newImage = getTmdbImage(mediaId)
                        if (newImage) {
                            media.bannerImage = newImage
                            console.log("[TMDb] REPLACED banner!")
                        }
                    }
                }).catch((err) => {
                    console.error("[TMDb] Error getting anime entry:", err)
                })
            }
        })
    })
}

function getTmdbImage(anilistId) {
    try {
        const url = TMDB_BASE_URL + "/find/" + anilistId + "?api_key=" + TMDB_API_KEY + "&external_source=anilist_id"
        const response = fetch(url)
        
        if (response && response.tv_results && response.tv_results.length > 0) {
            const show = response.tv_results[0]
            if (show.backdrop_path) {
                return TMDB_IMAGE_BASE_URL + show.backdrop_path
            }
        }
    } catch (error) {
        console.error("[TMDb] Fetch error:", error)
    }
    
    return null
}
