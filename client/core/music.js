class Music {
  constructor(context) {
    const tracks = [...Music.tracks];
    {
      const rng = new Uint32Array(tracks.length);
      window.crypto.getRandomValues(rng);
      const { length } = tracks;
      for (let i = length - 1; i >= 0; i -= 1) {
        const random = rng[i] % length;
        const temp = tracks[i];
        tracks[i] = tracks[random];
        tracks[random] = temp;
      }
    }

    const analyser = context.createAnalyser();
    analyser.fftSize = 8192;
    {
      const tuning = 440;
      const equalTemperament = (note) => (
        (2 ** ((note - 69) / 12)) * tuning
      );
      analyser.octaves = [...Array(9)].map((v, i) => (
        Math.round(
          (
            equalTemperament(24 + i * 12) * analyser.fftSize
          ) / context.sampleRate
        )
      ));
    }
    analyser.bins = new Float32Array(analyser.octaves.length - 1);
    analyser.buffer = new Uint8Array(analyser.frequencyBinCount);
    analyser.last = new Float32Array(analyser.octaves.length - 1);
    analyser.smoothing = 0.8;
    this.analyser = analyser;

    const player = document.createElement('audio');
    player.crossOrigin = 'anonymous';
    player.ontimeupdate = this.onTimeUpdate.bind(this);
    player.onended = this.next.bind(this);

    const source = context.createMediaElementSource(player);
    source.connect(analyser);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.5, context.currentTime);
    analyser.connect(gain);
    gain.connect(context.destination);

    this.isRunning = context.state === 'running';
    this.player = player;
    this.track = Math.floor(Math.random() * tracks.length);
    this.tracks = tracks;
    this.setupUI();
    this.play();
  }

  getOctaves() {
    const { analyser } = this;
    const {
      bins,
      buffer,
      last,
      octaves,
      smoothing,
    } = analyser;
    analyser.getByteFrequencyData(buffer);
    for (let i = 0, l = octaves.length - 1; i < l; i += 1) {
      const from = octaves[i];
      const to = octaves[i + 1];
      const count = to - from;
      let sum = 0;
      for (let j = from; j < to; j += 1) {
        sum += (buffer[j] / 0xFF) ** 2;
      }
      const sample = Math.max(Math.sqrt(sum / count), last[i] * smoothing);
      bins[i] = sample;
      last[i] = sample;
    }
    return bins;
  }

  setupUI() {
    // This is maybe nuts.. but I'm feeling nostalgic this days.
    const ui = document.createElement('div');
    ui.className = 'music';
    if (!this.isRunning) {
      ui.style.display = 'none';
    }
    const image = document.createElement('img');
    image.className = 'image';
    ui.appendChild(image);
    const wrapper = document.createElement('div');
    wrapper.className = 'wrapper';
    const artist = document.createElement('a');
    artist.className = 'artist';
    artist.rel = 'noopener noreferrer';
    artist.target = '_blank';
    wrapper.appendChild(artist);
    const title = document.createElement('div');
    title.className = 'title';
    wrapper.appendChild(title);
    const playheadWrapper = document.createElement('div');
    playheadWrapper.className = 'playhead';
    const playhead = document.createElement('div');
    playheadWrapper.appendChild(playhead);
    wrapper.appendChild(playheadWrapper);
    const controls = document.createElement('div');
    controls.className = 'controls';
    const toggle = document.createElement('button');
    toggle.innerText = '▶';
    toggle.addEventListener('click', this.togglePlayback.bind(this));
    controls.appendChild(toggle);
    const next = document.createElement('button');
    next.innerText = '>>';
    next.addEventListener('click', this.next.bind(this));
    controls.appendChild(next);
    const time = document.createElement('div');
    time.className = 'time';
    controls.appendChild(time);
    wrapper.appendChild(controls);
    ui.appendChild(wrapper);
    document.body.appendChild(ui);
    this.ui = {
      artist,
      image,
      title,
      playhead,
      toggle,
      next,
      time,
      wrapper: ui,
    };
  }

  play() {
    const {
      isRunning,
      player,
      track,
      tracks,
      ui,
    } = this;
    const clientId = 'client_id=eb5fcff9e107aab508431b4c3c416415';
    const id = tracks[track];
    fetch(`https://api.soundcloud.com/tracks/${id}?format=json&${clientId}`)
      .then((res) => {
        if (res.status !== 200) {
          throw new Error(`Couldn't fetch track: ${id}`);
        }
        return res.json();
      })
      .then((track) => {
        const userOnTitle = `${track.user.username} - `;
        if (track.title.indexOf(userOnTitle) === 0) {
          track.title = track.title.substr(userOnTitle.length);
        }
        ui.artist.innerText = track.user.username;
        ui.artist.href = track.user.permalink_url;
        ui.image.src = track.artwork_url || track.waveform_url;
        ui.playhead.style.width = '0%';
        ui.time.innerText = '0:00';
        ui.title.innerText = track.title;
        player.src = `${track.stream_url}?${clientId}`;
        if (isRunning) {
          player.play();
          ui.toggle.innerText = '❚❚';
        }
      })
      .catch(() => (
        this.next()
      ));
  }

  next() {
    const { player, tracks } = this;
    if (!player.paused) {
      player.pause();
    }
    player.src = '';
    this.track = (this.track + 1) % tracks.length;
    this.play();
  }

  onTimeUpdate() {
    const { ui } = this;
    const { player } = this;
    const min = Math.floor(player.currentTime / 60);
    const sec = Math.floor(player.currentTime % 60);
    ui.playhead.style.width = `${(player.currentTime / player.duration) * 100}%`;
    ui.time.innerText = `${min}:${sec < 10 ? '0' : ''}${sec}`;
  }

  resume() {
    const { player, ui } = this;
    this.isRunning = true;
    player.play();
    ui.toggle.innerText = '❚❚';
    ui.wrapper.style.display = '';
  }

  togglePlayback() {
    const { player, ui } = this;
    ui.toggle.innerText = player.paused ? '❚❚' : '▶';
    if (player.paused) {
      player.play();
    } else {
      player.pause();
    }
  }
}

/* eslint-disable */
Music.tracks = [
  334831124,3654595,3654647,62965282,55529274,40801532,28921242,58102473,44049414,584470,348172961,348172759,118227213,58103033,58102746,29062473,73664676,217254339,26016069,143994169,34751566,22899851,19645145,14604316,14604145,9747273,290203217,290202627,290203029,290203125,230280393,230280565,230280839,290202890,230280665,230280740,174033188,238809205,219872323,85441920,85442027,85442324,85442658,295429557,31232642,118720768,66345578,64979755,9747680,3654444,174209343,374346584,374346578,374346566,374346536,374346518,374346506,374346440,272272960,82537981,272272962,331110005,253646536,297108748,95089740,264157290,3654394,51204969,28460870,93513660,107137565,200476847,241036508,345846433,13728685,235796705,74366070,293115267,226460783,132730188,267647225,331743020,348075711,328602395,232135696,13385987,303726380,
  319470292,312179497,300022056,212600702,336206149,319100206,299965683,308768675,202903037,220992150,221433894,223843476,155626389,155626391,306589305,304501298,305600086,300328640,283863336,283863306,260674048,117308221,78683752,340317786,277352612,226847547,220656015,224154466,240254433,249957904,260419888,250754945,235013168,336784751,277029337,229288316,343272434,343194325,334599482,343032721,343661072,343552665,344563095,285122161,1687603,286269026,340681124,265119655,345756307,351035779,350060806,352308515,353896778,353896991,353896595,355550264,360321368,337715872,272189608,43751468,65190792,200959753,133531982,183519916,185401372,42227482,376984973,372830927,376671563,376317227,342538038,338288083,338266624,265353084,159115092,122088683,85356706,69351024,18159187,28667337,169274681,221402560,402032439,401604759,416088969,424864200,424881921,426294102,430158741,441378576,440982825,438854664,451627668,285022424,416942091,289481139,236661381,289727425,302903905,284737661,275642447,291943120,284052253,228088399,209533328,90164812,43727131,175757015,
  304835585,302743925,330782018,300939526,459525066,296293091,379018106,261722294,282925668,384922289,373765862,415017399,306335557,380188898,297111389,277594175,247472456,253918910,259938928,280127344,340311729,231217657,278455437,277243857,269664911,270902712,272061364,246644393,261427242,286969134,340491361,292822898,120511758,308113300,310752288,325763708,246221763,318821121,311917735,310747443,518526270,
];
/* eslint-enable */

export default Music;
