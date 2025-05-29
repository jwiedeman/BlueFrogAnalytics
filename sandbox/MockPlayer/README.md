# MockPlayer.js

Industry-standard mock video player in pure JavaScript.

## Overview
`MockPlayer.js` simulates a video player with segments (content, ads, interstitials), custom player settings, and an analytics simulation timeline. It exposes a full event API similar to HTML5 video elements and supports automated playback and user interactions for testing.

## Features
- Playlist segments (content, ads, interstitials) with custom durations
- Player settings: autoplay, controls, loop, volume, muted, playbackRate
- Analytics simulation: schedule actions (play, pause, seek, custom events) over time
- Event emitter API: play, pause, timeupdate, seeking, seeked, segmentstart, segmentend, ended, and more
- Automatic attachment to elements with class `mock-player` or attribute `data-mock-player`
- Built-in event logging for tracked events
- Status display: current segment type/ID and separate playheads for session, content, and ad
- UI toggles: mute/unmute and Picture-in-Picture (PiP) simulation

## Installation
Include the script in your HTML:
```html
<script src="mock-player.js"></script>
```

## Usage
1. Add an element to host the player (the onscreen controls include Play/Pause, Seek slider, Mute/Unmute, and PiP toggles; below the player you'll see the live status and metrics panels):
   ```html
   <div class="mock-player"
        data-plan-url="contentplan.json"
        data-settings-url="settings.json"
        data-analytics-url="analytics.json">
   </div>
   ```
2. Define your JSON config files:
   
   - **contentplan.json**
     Defines the playback timeline in terms of segments and simulated interactions.
     
     Schema:
     ```jsonc
     {
       "segments": [
         {
           "type": "content" | "ad" | "interstitial", // segment type
           "id": "string",            // unique segment identifier
           "duration": number          // milliseconds (values <1000 are auto-converted from seconds)
         },
         ...
       ],
       "interactions": [
         {
           "time": number,             // ms since playback start
           "action": "play"|"pause"|"seek"|"bufferstart"|"bufferend"|..., // method or event name
           "args": { ... }             // optional parameters for actions (e.g. { "time": <ms> } for seek)
         },
         ...
       ]
     }
     ```
     Available segment types:
     - content: regular program
     - ad: advertising spot
     - interstitial: break or splash screen
     
     Supported interaction actions:
     - play, pause
     - seek (args: { "time": <ms> })
     - bufferstart, bufferend
     - togglePlay, toggleMute, togglePip, toggleFullscreen
     - rateChange (args: { "rate": number })
     - qualityChange (args: { "quality": string })
     - captionToggle (args: { "language": string })
     - networkChange (args: { "condition": string })
     - triggerError (args: { "error": any })
     - adbreakStart, adstart, adend, adskip, adclick, adbreakEnd
     - heartbeat, quartile (args: { "milestone": number })
     - drmEvent (args: { "type": string, "details": any })
     - playlistItemChange (args: { "itemId": string })
     - playlistCompleted
     - custom events: any string not matching a method is emitted via the Event API
     
     Example 30-minute content plan:
     ```json
     {
       "segments": [
         { "type": "content",      "id": "show1",       "duration": 900000 },
         { "type": "interstitial", "id": "intermission","duration": 10000  },
         { "type": "ad",           "id": "ad1",         "duration": 30000  },
         { "type": "ad",           "id": "ad2",         "duration": 30000  },
         { "type": "content",      "id": "show2",       "duration": 900000 }
       ],
       "interactions": [
         { "time": 900000, "action": "bufferstart" },
         { "time": 905000, "action": "bufferend" },
         { "time": 930000, "action": "pause" },
         { "time": 932000, "action": "play" }
       ]
     }
     ```

   - **settings.json**
     Controls playback behavior and UI options.
     ```json
     {
       "autoplay": boolean,      // start playing automatically
       "controls": boolean,      // show on-screen buttons
       "loop": boolean,          // loop after end
       "volume": number,         // 0.0–1.0 initial volume
       "muted": boolean,         // start muted
       "playbackRate": number    // e.g. 1, 1.5, 2
     }
     ```

   - **analytics.json** (optional)
     Lists which events to capture in the analytics log.
     ```json
     {
       "track": [
         "play", "pause", "timeupdate", "segmentstart", "segmentend", "ended",
         "bufferstart", "bufferend", "adstart", "adend"
       ]
     }
     ```
3. Access the player instance and subscribe to events (optional):
   ```js
   const container = document.querySelector('.mock-player');
   const player = container.mockPlayer;
   player.on('play', () => console.log('Playback started'));
   player.on('segmentstart', e => console.log('New segment:', e.data.segment));
   player.on('bufferstart', () => console.log('Buffering started'));
   player.on('bufferend', () => console.log('Buffering ended'));
   // Metrics (auto-updating under the player): Session Time, Content Play Time, Ad Play Time, Buffer Time, Pause Time
   // Retrieve analytics log after session
   const log = player.getAnalyticsLog();
   console.log(log);
   ```

## API
- `new MockPlayer(element, playlistObj, settingsObj, analyticsObj)` - Manual instantiation
- `player.play()`, `player.pause()`, `player.seek(time)`, `player.togglePlay()`
- `player.on(eventName, callback)` / `player.off(eventName, callback)`
- `player.getAnalyticsLog()` returns an array of tracked events

## License
MIT