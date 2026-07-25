function init() {
    $app.onAnimeMetadataRequested((e) => {
        console.log("[TMDb] Hook fired")
        
        try {
            const mappings = e.animeMetadata.getMappings()
            console.log("[TMDb] Mappings from method:", JSON.stringify(mappings))
        } catch (err) {
            console.error("[TMDb] Error calling getMappings:", err)
        }
        
        e.next()
    })
}
