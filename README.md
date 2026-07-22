# TMDb Episode Provider for Seanime

Automatically replaces low-quality TheTVDB episode images with higher quality versions from TMDb.

## Comparison

**Before (TheTVDB):**
```
https://artworks.thetvdb.com/banners/episodes/305074/6633242.jpg
```

**After (TMDb):**
```
https://image.tmdb.org/t/p/original/gXLFmnOo3JkuehX8eRRRk5thpAa.jpg
```

## Installation

1. **Get a free TMDb API key:**
   - Visit https://www.themoviedb.org/settings/api
   - Sign up (free account)
   - Copy your API key

2. **Add the extension to Seanime:**
   - Open Seanime
   - Go to Extensions → Add Extension
   - Paste this URL:
   ```
   https://raw.githubusercontent.com/mrquix1/ChangeEpisodeImageProvidePls/main/tmdb-episode-provider.json
   ```

3. **Configure the API key:**
   - After installation, you'll need to edit the plugin file
   - Replace `YOUR_TMDB_API_KEY_HERE` in the code with your actual API key
   - Or wait for the UI settings feature to be added

4. **Reload the extension** and grant permissions when prompted

## How it works

- Hooks into Seanime's anime details request
- Automatically finds matching TMDb episodes
- Replaces image URLs from TheTVDB with TMDb equivalents
- Caches results to avoid repeated API calls

## Requirements

- Free TMDb API key from https://www.themoviedb.org/settings/api
- Seanime with plugin support

## Issues

If an anime isn't found or images don't show up:
- Make sure your API key is correct
- Check that the anime exists on both TheTVDB and TMDb
- Episode numbers must match between the two services

## License

MIT
