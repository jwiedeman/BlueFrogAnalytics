;(function (global) {
  class EventEmitter {
    constructor() {
      this.listeners = {};
      // debug flag inherited from settings
      this.settings = { debug: false };
    }
    on(event, listener) {
      if (!this.listeners[event]) this.listeners[event] = [];
      this.listeners[event].push(listener);
    }
    off(event, listener) {
      if (!this.listeners[event]) return;
      this.listeners[event] = this.listeners[event].filter(l => l !== listener);
    }
    emit(event, detail) {
      if (!this.listeners[event]) return;
      this.listeners[event].forEach(listener => listener(detail));
      if (this.listeners['*']) {
        this.listeners['*'].forEach(l => l({ event, detail }));
      }
      if (this.settings.debug) {
        console.log(`[Event Emitted]: ${event}`, detail);
      }
    }
  }

  class MockPlayer extends EventEmitter {
    constructor(element, playlist = {}, settings = {}, analytics = {}) {
      super();
      this.element = typeof element === 'string' ? document.querySelector(element) : element;
      this.playlist = Object.assign({}, MockPlayer.defaultPlaylist, playlist);
      // initialize player settings (includes debug flag)
      this.settings = Object.assign({}, MockPlayer.defaultSettings, settings);
      this.analyticsConfig = Object.assign({}, MockPlayer.defaultAnalytics, analytics);
      // clone playlist segments and normalize durations (assume <1000 units are seconds)
      this.segments = (this.playlist.segments || []).slice().map(seg => {
        const dur = seg.duration || 0;
        // convert to milliseconds if duration looks like seconds
        const durationMs = dur > 0 && dur < 1000 ? dur * 1000 : dur;
        return Object.assign({}, seg, { duration: durationMs });
      });
      this.trackEvents = this.analyticsConfig.track || [];
      this.pendingInteractions = (this.playlist.interactions || []).slice().sort((a, b) => a.time - b.time);
      this.metrics = {
        sessionStartTime: null,
        sessionEndTime: null,
        totalBufferTime: 0,
        totalPauseTime: 0,
        contentPlayTime: 0,
        adPlayTime: 0,
        totalSeekCount: 0,
        totalSeekTime: 0,
        totalErrorCount: 0,
        totalQualitySwitches: 0,
        qualityHistory: [],
        captionToggles: 0,
        fullscreenToggles: 0,
        pipToggles: 0,
        volumeChanges: 0
      };
      this.pauseStartTime = null;
      this.bufferStartTime = null;
      this.currentSegmentIndex = 0;
      this.currentTime = 0;
      this.duration = this.segments.reduce((sum, seg) => sum + (seg.duration || 0), 0);
      this.volume = this.settings.volume;
      this.muted = this.settings.muted;
      this.pip = this.settings.pip;
      this.playbackRate = this.settings.playbackRate;
      this.autoplay = this.settings.autoplay;
      this.controls = this.settings.controls;
      this.loop = this.settings.loop;
      this.playing = false;
      this.startTime = null;
      this.tickInterval = null;
      this.eventLog = [];

      this.setupElement();
      this.emitEvent('loadedmetadata');
      this.setupMetricsDisplay();
      this.setupPlanInteractions();
      if (this.autoplay) this.play();
    }

    setupElement() {
      this.element.classList.add('mock-player-initialized');
      if (this.muted) this.element.classList.add('mock-player-muted');
      if (this.pip) this.element.classList.add('mock-player-pip');
      if (this.controls) this.createControls();
    }

    createControls() {
      const controls = document.createElement('div');
      controls.classList.add('mock-player-controls');
      
      // Play/Pause
      const playBtn = document.createElement('button');
      playBtn.textContent = 'Play';
      playBtn.addEventListener('click', () => this.play());
      controls.appendChild(playBtn);
      
      const pauseBtn = document.createElement('button');
      pauseBtn.textContent = 'Pause';
      pauseBtn.addEventListener('click', () => this.pause());
      controls.appendChild(pauseBtn);

      // Seek
      const seekInput = document.createElement('input');
      seekInput.type = 'range';
      seekInput.min = 0;
      seekInput.max = this.duration;
      seekInput.value = this.currentTime;
      seekInput.addEventListener('input', e => this.seek(parseFloat(e.target.value)));
      controls.appendChild(seekInput);
      this.seekInput = seekInput;

      // Mute
      const muteBtn = document.createElement('button');
      muteBtn.textContent = this.muted ? 'Unmute' : 'Mute';
      muteBtn.addEventListener('click', () => {
        this.toggleMute();
        muteBtn.textContent = this.muted ? 'Unmute' : 'Mute';
      });
      controls.appendChild(muteBtn);

      // PiP
      const pipBtn = document.createElement('button');
      pipBtn.textContent = this.pip ? 'Exit PiP' : 'Enter PiP';
      pipBtn.addEventListener('click', () => {
        this.togglePip();
        pipBtn.textContent = this.pip ? 'Exit PiP' : 'Enter PiP';
      });
      controls.appendChild(pipBtn);

      // Fullscreen
      const fsBtn = document.createElement('button');
      fsBtn.textContent = 'Fullscreen';
      fsBtn.addEventListener('click', () => this.toggleFullscreen());
      controls.appendChild(fsBtn);

      this.element.appendChild(controls);
    }

    emitEvent(name, data = {}) {
      const detail = { currentTime: this.currentTime, data };
      if (this.trackEvents.includes(name)) {
        this.eventLog.push({ event: name, timestamp: Date.now(), currentTime: this.currentTime, data });
      }
      super.emit(name, detail);
    }

    play() {
      const now = performance.now();
      if (this.metrics.sessionStartTime === null) {
        this.metrics.sessionStartTime = now;
      }
      if (this.pauseStartTime !== null) {
        this.metrics.totalPauseTime += now - this.pauseStartTime;
        this.pauseStartTime = null;
      }
      if (this.playing) return;
      this.playing = true;
      this.startTime = now - this.currentTime / this.playbackRate;
      this.emitEvent('play');
      if (this.bufferStartTime === null) this.startTick();
    }

    pause() {
      if (!this.playing) return;
      const now = performance.now();
      if (this.pauseStartTime === null) this.pauseStartTime = now;
      this.updateCurrentTime();
      this.playing = false;
      this.emitEvent('pause');
      this.clearTick();
    }
    // convenience method to toggle between play and pause
    togglePlay() {
      if (this.playing) this.pause();
      else this.play();
    }

    toggleMute() {
      this.muted = !this.muted;
      this.metrics.volumeChanges++;
      this.element.classList.toggle('mock-player-muted', this.muted);
      this.emitEvent('volumechange', { muted: this.muted, volume: this.volume });
    }

    togglePip() {
      this.pip = !this.pip;
      this.metrics.pipToggles++;
      this.element.classList.toggle('mock-player-pip', this.pip);
      this.emitEvent(this.pip ? 'enterpictureinpicture' : 'leavepictureinpicture');
    }

    toggleFullscreen() {
      this.metrics.fullscreenToggles++;
      this.fullscreen = !this.fullscreen;
      this.emitEvent(this.fullscreen ? 'enterfullscreen' : 'exitfullscreen');
    }

    seek(time) {
      const t = Math.min(Math.max(time, 0), this.duration);
      this.currentTime = t;
      this.startTime = performance.now() - this.currentTime / this.playbackRate;
      this.metrics.totalSeekCount++;
      this.emitEvent('seeking');
      this.emitEvent('seeked');
      this.emitEvent('timeupdate');
      if (this.seekInput) this.seekInput.value = this.currentTime;
    }

    rateChange(newRate) {
      this.playbackRate = newRate;
      this.emitEvent('ratechange', { rate: newRate });
    }

    triggerError(error) {
      this.metrics.totalErrorCount++;
      this.emitEvent('error', { error });
    }

    qualityChange(quality) {
      this.metrics.totalQualitySwitches++;
      this.metrics.qualityHistory.push({ quality, time: this.currentTime });
      this.emitEvent('qualitychange', { quality });
    }

    bufferstart() {
      if (this.bufferStartTime !== null) return;
      this.bufferStartTime = performance.now();
      this.emitEvent('bufferstart');
      this.clearTick();
    }

    bufferend() {
      if (this.bufferStartTime === null) return;
      const now = performance.now();
      this.metrics.totalBufferTime += now - this.bufferStartTime;
      this.bufferStartTime = null;
      this.emitEvent('bufferend');
      if (this.playing) this.startTick();
    }

    startTick() {
      this.clearTick();
      // tick every 10ms for high-precision playback timing
      this.tickInterval = setInterval(() => this.tick(), 10);
    }

    clearTick() {
      if (this.tickInterval) clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    updateCurrentTime() {
      this.currentTime = (performance.now() - this.startTime) * this.playbackRate;
      this.currentTime = Math.min(this.currentTime, this.duration);
      this.updateSegmentIndex();
    }

    updateSegmentIndex() {
      this.currentSegmentIndex = this.getSegmentIndexForTime(this.currentTime);
    }

    getSegmentIndexForTime(time) {
      let acc = 0;
      for (let i = 0; i < this.segments.length; i++) {
        const d = this.segments[i].duration || 0;
        if (time < acc + d) return i;
        acc += d;
      }
      return Math.max(0, this.segments.length - 1);
    }

    tick() {
      const prevTime = this.currentTime;
      const prevIndex = this.currentSegmentIndex;
      this.updateCurrentTime();
      const delta = this.currentTime - prevTime;
      const prevSeg = this.segments[prevIndex] || {};
      if (prevSeg.type === 'content') this.metrics.contentPlayTime += delta;
      if (prevSeg.type === 'ad') this.metrics.adPlayTime += delta;
      this.emitEvent('timeupdate');
      if (this.seekInput) this.seekInput.value = this.currentTime;
      const newIndex = this.getSegmentIndexForTime(this.currentTime);
      if (newIndex !== prevIndex) {
        this.emitEvent('segmentend', { segment: prevSeg });
        this.currentSegmentIndex = newIndex;
        this.emitEvent('segmentstart', { segment: this.segments[newIndex] });
      }
      if (this.currentTime >= this.duration) {
        this.emitEvent('ended');
        this.metrics.sessionEndTime = performance.now();
        this.clearTick();
        if (this.loop) {
          this.seek(0);
          this.play();
        }
      }
    }

    setupMetricsDisplay() {
      this.statusContainer = document.createElement('div');
      this.statusContainer.classList.add('mock-player-status');
      this.statusLabels = {};
      [['type','Now Playing'],['id','Segment ID'],['session','Session Playhead'],['content','Content Playhead'],['ad','Ad Playhead']]
        .forEach(([key,label]) => {
          const line = document.createElement('div');
          line.textContent = `${label}: `;
          const span = document.createElement('span');
          span.classList.add(`mock-player-status-${key}`);
          line.append(span);
          this.statusLabels[key] = span;
          this.statusContainer.append(line);
        });
      this.element.append(this.statusContainer);

      this.metricsContainer = document.createElement('div');
      this.metricsContainer.classList.add('mock-player-metrics');
      this.metricsLabels = {};
      [['session','Session Time'],['content','Content Play Time'],['ad','Ad Play Time'],['buffer','Buffer Time'],['pause','Pause Time']]
        .forEach(([key,label]) => {
          const line = document.createElement('div');
          line.textContent = `${label}: `;
          const span = document.createElement('span');
          span.classList.add(`mock-player-metric-${key}`);
          line.append(span);
          this.metricsLabels[key] = span;
          this.metricsContainer.append(line);
        });
      this.element.append(this.metricsContainer);

      this.metricsInterval = setInterval(() => this.updateMetricsDisplay(), 10);
    }

    updateMetricsDisplay() {
      const now = performance.now();
      let sessionTime = 0;
      if (this.metrics.sessionStartTime !== null) {
        const end = this.metrics.sessionEndTime || now;
        sessionTime = (end - this.metrics.sessionStartTime) / 1000;
      }
      const toSecs = ms => (ms/1000).toFixed(2)+'s';
      this.metricsLabels.session.textContent = toSecs(this.metrics.sessionStartTime!==null?( (this.metrics.sessionEndTime||now)-this.metrics.sessionStartTime):0);
      this.metricsLabels.content.textContent = toSecs(this.metrics.contentPlayTime);
      this.metricsLabels.ad.textContent = toSecs(this.metrics.adPlayTime);
      this.metricsLabels.buffer.textContent = toSecs(this.metrics.totalBufferTime);
      this.metricsLabels.pause.textContent = toSecs(this.metrics.totalPauseTime);
      this.updateStatusDisplay();
    }

    updateStatusDisplay() {
      const seg = this.segments[this.currentSegmentIndex] || {};
      this.statusLabels.type.textContent = seg.type || '';
      this.statusLabels.id.textContent = seg.id || '';
      this.statusLabels.session.textContent = this.metricsLabels.session.textContent;
      this.statusLabels.content.textContent = this.metricsLabels.content.textContent;
      this.statusLabels.ad.textContent = this.metricsLabels.ad.textContent;
    }

    setupPlanInteractions() {
      this.pendingInteractions.forEach(sim => {
        setTimeout(() => {
          const action = sim.action;
          const args = sim.args || {};
          if (typeof this[action] === 'function') {
            this[action](args.time || args);
          } else {
            this.emitEvent(action, args);
          }
        }, sim.time);
      });
    }

    // Ad & milestone events
    adbreakStart(adbreakId, ads) {
      this.emitEvent('adbreakstart',{ adbreakId, ads });
      ads.forEach(ad=> this.emitEvent('adstart',ad));
    }
    adstart(ad) { this.emitEvent('adstart',ad); }
    adend(ad) { this.emitEvent('adend',ad); }
    adskip(ad) { this.emitEvent('adskip',ad); }
    adclick(ad) { this.emitEvent('adclick',ad); }
    adbreakEnd(adbreakId){ this.emitEvent('adbreakend',{ adbreakId }); }

    heartbeat() { this.emitEvent('heartbeat', { time: this.currentTime }); }
    quartile(m){ this.emitEvent('quartile',{ milestone:m }); }

    captionToggle(lang='en'){ this.metrics.captionToggles++; this.emitEvent('captiontoggle',{ language:lang }); }
    networkChange(cond){ this.emitEvent('networkchange',{ condition:cond }); }
    drmEvent(type,details){ this.emitEvent(type,details); }
    playlistItemChange(id){ this.emitEvent('playlistitemchange',{ itemId:id }); }
    playlistCompleted(){ this.emitEvent('playlistcompleted'); }
    // duplicate rateChange alias removed to avoid recursion

    getAnalyticsLog(){ return this.eventLog.slice(); }
  }

  MockPlayer.defaultSettings = { autoplay:false, controls:false, loop:false, volume:1, muted:false, playbackRate:1, pip:false, debug:false };
  MockPlayer.defaultPlaylist = { segments:[], interactions:[] };
  MockPlayer.defaultAnalytics = { simulate:[], track:[] };

  function initMockPlayers(){
    document.querySelectorAll('[data-mock-player], .mock-player').forEach(el=>{
      let planPromise, settingsPromise, analyticsPromise;

      // Load playlist (content plan)
      if (el.dataset.planUrl) {
        planPromise = fetch(el.dataset.planUrl).then(res => res.json());
      } else if (el.dataset.playlist) {
        planPromise = Promise.resolve(JSON.parse(el.dataset.playlist));
      } else {
        planPromise = Promise.resolve(MockPlayer.defaultPlaylist);
      }

      // Load settings
      if (el.dataset.settingsUrl) {
        settingsPromise = fetch(el.dataset.settingsUrl).then(res => res.json());
      } else if (el.dataset.settings) {
        settingsPromise = Promise.resolve(JSON.parse(el.dataset.settings));
      } else {
        settingsPromise = Promise.resolve(MockPlayer.defaultSettings);
      }

      // Load analytics config
      if (el.dataset.analyticsUrl) {
        analyticsPromise = fetch(el.dataset.analyticsUrl).then(res => res.json());
      } else if (el.dataset.analytics) {
        analyticsPromise = Promise.resolve(JSON.parse(el.dataset.analytics));
      } else {
        analyticsPromise = Promise.resolve(MockPlayer.defaultAnalytics);
      }

      // Initialize player once all configs are loaded
      Promise.all([planPromise, settingsPromise, analyticsPromise])
        .then(([p, s, a]) => {
          const player = new MockPlayer(el, p, s, a);
          el.mockPlayer = player;
        })
        .catch(err => {
          console.error('Failed to initialize MockPlayer for element', el, err);
        });
    });
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',initMockPlayers);
  } else initMockPlayers();

  global.MockPlayer = MockPlayer;
})(typeof window!=='undefined'?window:this);
