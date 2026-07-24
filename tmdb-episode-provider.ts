/// <reference path="./plugin.d.ts" />
/// <reference path="./system.d.ts" />
/// <reference path="./app.d.ts" />
/// <reference path="./core.d.ts" />

const TMDB_API_KEY = "1a1c34ba2f8d63191cd5b163d74d1c52"
const TMDB_BASE_URL = "https://api.themoviedb.org/3"
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/original"

function init() {
    $ui.register((ctx) => {
        console.log("[TMDb] UI registered - DOM manipulation mode")
        
        ctx.screen.onNavigate((e) => {
            if (e.pathname === "/entry") {
                const mediaId = Number(e.searchParams.id)
                console.log("[TMDb] Navigated to entry:", mediaId)
                
                // Wait for DOM to be ready
                setTimeout(() => {
                    try {
                        // Find all episode images
                        const images = document.querySelectorAll('[data-episode-card-image="true"]')
                        console.log("[TMDb] Found", images.length, "episode images")
                        
                        images.forEach((img, idx) => {
                            const src = img.getAttribute('src')
                            console.log("[TMDb] Image", idx, "src:", src?.substring(0, 60))
                            
                            if (src && src.includes("thetvdb")) {
                                const tmdbImage = getTmdbImage(mediaId)
                                if (tmdbImage) {
                                    img.setAttribute('src', tmdbImage)
                                    console.log("[TMDb] REPLACED image", idx)
                                }
                            }
                        })
                    } catch (err) {
                        console.error("[TMDb] DOM error:", err)
                    }
                }, 500)
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
