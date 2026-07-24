/// <reference path="./plugin.d.ts" />
/// <reference path="./system.d.ts" />
/// <reference path="./app.d.ts" />
/// <reference path="./core.d.ts" />

const TMDB_API_KEY = "1a1c34ba2f8d63191cd5b163d74d1c52"
const TMDB_BASE_URL = "https://api.themoviedb.org/3"
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/original"

function init() {
    $ui.register((ctx) => {
        console.log("[TMDb] Initialized - listening for navigation")
        
        ctx.screen.onNavigate((e) => {
            // CHECK 1: Are we on an entry page?
            if (e.pathname === "/entry") {
                // CHECK 2: Get the mediaId from URL
                const mediaId = Number(e.searchParams.id)
                console.log("[TMDb] Entry page detected, mediaId:", mediaId)
                
                // Get the anime entry
                ctx.anime.getAnimeEntry(mediaId).then((result) => {
                    const media = result.media
                    console.log("[TMDb] Got anime entry")
                    
                    // CHECK 3: Does it have a banner image?
                    if (media && media.bannerImage) {
                        console.log("[TMDb] Current banner:", media.bannerImage.substring(0, 60))
                        
                        // Get TMDb image
                        const tmdbImage = getTmdbImage(mediaId)
                        if (tmdbImage) {
                            console.log("[TMDb] Replacing with TMDb image")
                            media.bannerImage = tmdbImage
                            
                            // Force UI refresh
                            try {
                                $app.invalidateClientQuery(["GetAnimeEntry", "GetAnimeCollection"])
                                console.log("[TMDb] Query invalidated - UI should update")
                            } catch (err) {
                                console.error("[TMDb] Invalidation error:", err)
                            }
                        }
                    } else {
                        console.log("[TMDb] No banner image found")
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
                const imageUrl = TMDB_IMAGE_BASE_URL + show.backdrop_path
                console.log("[TMDb] Got TMDb image URL")
                return imageUrl
            }
        }
        
        console.log("[TMDb] No TMDb results found")
        return null
    } catch (error) {
        console.error("[TMDb] Fetch error:", error)
        return null
    }
}
