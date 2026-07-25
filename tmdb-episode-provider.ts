function init() {
    $app.onAnimeMetadataRequested((e) => {
        console.log("[TMDb] Full mappings:", JSON.stringify(e.animeMetadata.mappings))
        console.log("[TMDb] Full metadata keys:", Object.keys(e.animeMetadata))
        
        e.next()
    })
}
