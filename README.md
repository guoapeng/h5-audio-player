## description
- a javascript library or utility for creating audio player on web or server or mobile side

## Development

## usage

### Install dependencies
```bash
  npm install audioplayer
```

### example
```js
import './scss/style.scss';
import 'h5-audio-player/css/mkPlayer.css';
import ap from 'h5-audio-player';

window.onload = function () {
    var h5audio = document.createElement('audio');
    var audioPlayer = new ap.AudioPlayer(h5audio);
    new ap.SubtitleManager(document.getElementById('lyricContainer'));
    var playlist = ap.PlayList.new(document.getElementById('playlist'), 2);
    var audioControl = new ap.AudioControl(h5audio);
    audioControl.listen();
    audioPlayer.listen();
   
    new ap.ProgressBar('#music-progress', 0, true); // lock progress bar before starting playing
    new ap.VolumeBar('#volume-progress', false);
    playlist.loadAudioList('https://www.pengshu.net/lyrics/content/index.json');
}

```


