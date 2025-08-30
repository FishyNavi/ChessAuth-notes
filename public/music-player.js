const musicPlayer = (() => {
  let audioElements = [];
  let isPlaying = false;
  let currentSongIndex = 0;
  let playlist = [];

  const loadSongs = async () => {
    try {
      const response = await fetch('/api/music');
      if (!response.ok) throw new Error('Failed to fetch music playlist');
      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) throw new Error('Playlist is empty or invalid');
      playlist = data;
      audioElements = playlist.map(url => {
        const audio = new Audio(url);
        audio.addEventListener('ended', () => musicPlayer.next());
        return audio;
      });
      document.dispatchEvent(new CustomEvent('music-player-state', { detail: { isPlaying, isLoaded: true } }));
      const musicPlayerElement = document.querySelector('music-player');
      if (musicPlayerElement) musicPlayerElement.updateSongTitle();
    } catch (error) {
      console.error("Error loading songs:", error);
      document.dispatchEvent(new CustomEvent('music-player-error', { detail: { message: error.message } }));
    }
  };

  const playCurrentSong = () => {
    if (audioElements.length === 0) return;
    audioElements.forEach((audio, idx) => {
      if (idx !== currentSongIndex) {
        audio.pause();
      } else {
        audio.currentTime = 0;
      }
    });
    audioElements[currentSongIndex].play().then(() => {
      isPlaying = true;
      document.dispatchEvent(new CustomEvent('music-player-state', { detail: { isPlaying: true, isLoaded: true } }));
    }).catch(error => console.error("Error playing audio:", error));
  };

  const pauseCurrentSong = () => {
    if (audioElements[currentSongIndex]) {
      audioElements[currentSongIndex].pause();
      isPlaying = false;
      document.dispatchEvent(new CustomEvent('music-player-state', { detail: { isPlaying: false, isLoaded: true } }));
    }
  };

  return {
    loadSongs,
    play: () => playCurrentSong(),
    pause: () => pauseCurrentSong(),
    next: () => {
      pauseCurrentSong();
      currentSongIndex = (currentSongIndex + 1) % playlist.length;
      isPlaying = true;
      playCurrentSong();
      const musicPlayerElement = document.querySelector('music-player');
      if (musicPlayerElement) musicPlayerElement.updateSongTitle();
    },
    previous: () => {
      pauseCurrentSong();
      currentSongIndex = (currentSongIndex - 1 + playlist.length) % playlist.length;
      isPlaying = true;
      playCurrentSong();
      const musicPlayerElement = document.querySelector('music-player');
      if (musicPlayerElement) musicPlayerElement.updateSongTitle();
    },
    setVolume: (volume) => audioElements.forEach(audio => { audio.volume = volume; }),
    getPlaylist: () => playlist,
    getCurrentSongIndex: () => currentSongIndex,
    isPlaying: () => isPlaying
  };
})();

class MusicPlayer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: fixed !important;
          bottom: 20px;
          right: 20px;
          width: 300px;
          max-width: 95vw;
          min-width: 180px;
          font-family: Arial, sans-serif;
          z-index: 1000;
          display: block;
        }
        .player-container {
          background-color: #f0f0f0;
          border: 1px solid #ccc;
          border-radius: 12px;
          padding: 10px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          width: 100%;
          min-width: 180px;
          max-width: 300px;
          box-sizing: border-box;
        }
        .song-title {
          flex-grow: 1;
          font-size: 14px;
          font-weight: bold;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-align: center;
          padding: 10px 0;
          max-width: 90vw;
          min-width: 0;
          box-sizing: border-box;
          display: block;
        }
        .controls {
          display: flex;
          gap: 10px;
          width: 100%;
          justify-content: center;
          flex-wrap: wrap;
        }
        .button-group {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
        }
        button {
          background: #e0e0e0;
          border: none;
          border-radius: 8px;
          width: 50px;
          height: 50px;
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
          transition: background-color 0.2s;
          padding: 5px;
          margin: 0;
        }
        button:hover {
          background-color: #d0d0d0;
        }
        button:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }
        svg {
          width: 24px;
          height: 24px;
          color: #333;
        }
        .label {
          font-size: 10px;
          text-transform: uppercase;
          font-weight: bold;
          color: #555;
        }
        @media (max-width: 600px) {
          :host { width: 95vw !important; right: 2vw !important; bottom: 10px !important;}
          .player-container { height: auto; padding: 6px;}
          .song-title { font-size: 12px; padding: 5px 0;}
        }
      </style>
      <div class="player-container">
        <div class="song-title" id="song-title"></div>
        <div class="controls">
          <div class="button-group">
            <button id="prev-btn" aria-label="Previous">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path fill-rule="evenodd" d="M11.53 15.22a.75.75 0 01-1.06 0l-4.5-4.5a.75.75 0 010-1.06l4.5-4.5a.75.75 0 011.06 1.06L7.81 10.5H16.5a.75.75 0 010 1.5h-8.44l3.72 3.72a.75.75 0 010 1.06z" clip-rule="evenodd"/>
              </svg>
            </button>
            <span class="label">Prev</span>
          </div>
          <div class="button-group">
            <button id="play-pause-btn" aria-label="Play/Pause">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path id="play-path" d="M8 5v14l11-7z"/>
                <path id="pause-path" style="display:none;" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            </button>
            <span class="label">Play/Pause</span>
          </div>
          <div class="button-group">
            <button id="next-btn" aria-label="Next">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path fill-rule="evenodd" d="M12.47 8.78a.75.75 0 011.06 0l4.5 4.5a.75.75 0 010 1.06l-4.5 4.5a.75.75 0 01-1.06-1.06L15.19 14.25H6.75a.75.75 0 010-1.5h8.44l-3.72-3.72a.75.75 0 010-1.06z" clip-rule="evenodd"/>
              </svg>
            </button>
            <span class="label">Next</span>
          </div>
        </div>
      </div>
    `;
    this.isPlaying = false;
    this.playPath = this.shadowRoot.getElementById('play-path');
    this.pausePath = this.shadowRoot.getElementById('pause-path');
    this.songTitleElement = this.shadowRoot.getElementById('song-title');
    this.updateIcon();

    musicPlayer.loadSongs();

    this.shadowRoot.getElementById('play-pause-btn').addEventListener('click', () => {
      if (musicPlayer.isPlaying()) {
        musicPlayer.pause();
      } else {
        musicPlayer.play();
      }
      this.updateIcon();
    });

    this.shadowRoot.getElementById('next-btn').addEventListener('click', () => {
      musicPlayer.next();
      this.updateIcon();
    });

    this.shadowRoot.getElementById('prev-btn').addEventListener('click', () => {
      musicPlayer.previous();
      this.updateIcon();
    });

    document.addEventListener('music-player-state', (e) => {
      this.isPlaying = e.detail.isPlaying;
      this.updateIcon();
    });
  }

  updateIcon() {
    if (musicPlayer.isPlaying()) {
      this.playPath.style.display = 'none';
      this.pausePath.style.display = 'block';
    } else {
      this.playPath.style.display = 'block';
      this.pausePath.style.display = 'none';
    }
  }

  updateSongTitle() {
    const playlist = musicPlayer.getPlaylist();
    if (playlist && playlist.length > 0) {
      const currentUrl = playlist[musicPlayer.getCurrentSongIndex()];
      const filename = currentUrl.split('/').pop();
      this.songTitleElement.textContent = decodeURIComponent(filename.replace(/\.(mp3|wav|ogg|m4a)$/i, ''));
    } else {
      this.songTitleElement.textContent = "No music loaded";
    }
  }
}

customElements.define('music-player', MusicPlayer);
