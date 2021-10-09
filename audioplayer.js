class AudioControl {
    constructor(audioContainer) {
        this.audioContainer = audioContainer;
    }

    getAudio() {
        return this.audioContainer;
    }

    init() {
        //enable keyboard control , spacebar to play and pause
        var that = this;
        window.addEventListener('keydown', function (e) {
            if (e.keyCode === 32) {
                if (that.getAudio().paused) {
                    that.getAudio().play();
                } else {
                    that.getAudio().pause();
                }
            }
        }, false);
    }
}

class AudioPlayer {
    constructor(audioContainer) {
        this.audioContainer = audioContainer;
    }

    attachTo(audioContainer) {
        var that = this;
        audioContainer.onended = function () {
            window.dispatchEvent(new Event('audioFinished'));
        };
        audioContainer.onerror = function (e) {
            that.onPlayerError(e);
        };
        audioContainer.addEventListener('timeupdate', function (e) {
            that.onTimeUpdate(e, audioContainer.currentTime);
        });
        window.addEventListener('playAudio', function (e) {
            that.play(e.audio);
        });
        window.addEventListener('adjusttime', function (e) {
            that.playback(e.adjustToTime);
        });
        if (audioContainer) this.audioContainer = audioContainer
        return this;
    }
    withAudioContainer(audioContainer) {
        this.audioContainer = audioContainer;
        return this;
    }
    
    onPlayerError() {
        //the function just a placeholder and default implementation
        //which always overrides by actual method during initialization on runtime
    }
    onTimeUpdate() {
        //the function just a placeholder and default implementation
        //need to replace with actual method during initialization on runtime
    }
    getAudioContainer() {
        return this.audioContainer
    }
    play(audioUrl) {
        this.getAudioContainer().addEventListener('canplay', function () {
            var playPromise = this.play();
            var audio = this;
            if (playPromise !== undefined) {
                playPromise.then(()=> {
                    // Automatic playback started!
                    // Show playing UI.
                    audio.play()
                }).catch(error => {
                    // Auto-play was prevented
                    // Show paused UI.
                    console.log('auto play audio rejected', error);
                });
            }
        });
        this.getAudioContainer().src = audioUrl;
    }
    playback(adjustToTime) {
        this.getAudioContainer().pause()
        this.getAudioContainer().currentTime = adjustToTime
        this.getAudioContainer().play()
    }
    pause() {
        this.getAudioContainer().pause()
    }
}

class SubtitleManager {
    constructor(subtitleContainer) {
        this.subtitleContainer = subtitleContainer;
        this.lyric = null;
        this.subtitleParser = new SubtitleParser();
    }
    getSubtitleContainer() {
        return this.subtitleContainer;
    }
    init() {
        var that = this;
        window.addEventListener('playAudio', function (e) {
            that.loadLyric(e.lyric);
        });
    }
    reset() {
        //reset the position of the lyric container
        this.getSubtitleContainer().style.top = '130px';
        this.getSubtitleContainer().textContent = 'loading...';
        //empty the lyric
        this.setLyricText(null)
    }

    getLyricText() {
        return this.lyric
    }

    setLyricText(lyric) {
        this.lyric = lyric
    }

    createPlayerErrorHandler() {
        var that = this;
        return function (e) {
            that.getSubtitleContainer().textContent = 'failed to load the song! :('+e;
        }
    }

    createPlayerTimeUpdateHandler() {
        var that = this;
        return function (e, currentTime) {
            that.synchronizeLyric(e, currentTime);
        }
    }

    synchronizeLyric(e, currentTime) {
        if (!this.getLyricText()) return;
        for (var i = 0, l = this.getLyricText().length; i < l; i++) {
            var line = document.getElementById('line-' + i);
            if (line && line.className && line.className != '') line.className = '';
            if (currentTime >= this.getLyricText()[i].startTime - 0.50 && (
                i == this.getLyricText().length - 1 || currentTime < this.getLyricText()[i + 1].startTime - 0.50 /*preload the lyric by 0.50s*/
            )) {
                //scroll mode
                var prevLine = document.getElementById('line-' + (i > 0 ? i - 1 : i));
                if (prevLine) prevLine.className = '';
                //randomize the color of the current line of the lyric
                if (line) line.className = 'current-line-1';
                if (line) this.getSubtitleContainer().style.top = 130 - line.offsetTop + 'px';
            }
            
        }
    }

    appendLyric(lyric) {
        var lyricContainer = this.getSubtitleContainer(),
            fragment = document.createDocumentFragment();
        //clear the lyric container first
        lyricContainer.innerHTML = '';
        lyric.forEach(function (v, i) {
            var line = document.createElement('p');
            line.id = 'line-' + i;
            line.textContent = v.content;
            line.onclick = function () {
                var adjustTimeEvent = new Event('adjusttime');
                adjustTimeEvent.adjustToTime = v.startTime
                window.dispatchEvent(adjustTimeEvent)
            }
            fragment.appendChild(line);
        });
        lyricContainer.appendChild(fragment);
    }

    loadLyric(url) {
        var that = this,
            request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.responseType = 'text';
        //fix for the messy code problem for Chinese.  reference: http://xx.time8.org/php/20101218/ajax-xmlhttprequest.html
        //request['overrideMimeType'] && request.overrideMimeType("text/html;charset=gb2312");
        request.onload = function () {
            that.setLyricText(that.subtitleParser.parse(request.response));
            //display lyric to the page
            that.appendLyric(that.getLyricText());
        };
        request.onerror = request.onabort = function (e) {
            that.getSubtitleContainer().textContent = '!failed to load the lyric :('+e;
        };
        that.reset();
        request.send();
    }
}

class SubtitleParser {
    parse(text) {
        //get each line from the text
        if (text.trim().length === 0) return [];
        var lines = text.split('\n'),
            //this regex mathes the time [00.12.78]
            pattern = /\[\d{2}:\d{2}.\d{2}\]/g,
            result = [];
        // Get offset from lyrics
        var offset = this.getOffset(text);
        if (lines.length <= 0) return result;
        //exclude the description parts or empty parts of the lyric
        while (lines.length > 0 && !pattern.test(lines[0])) {
            lines = lines.slice(1);
        }
        
        //remove the last empty item
        lines[lines.length - 1].length === 0 && lines.pop();
        //display all content on the page
        lines.forEach(function (v, i) {
            var time = v.match(pattern),
                value = v.split(pattern),
                len = time.length;
            for (i = 0,  text = ''; i < len; i++) {
                text = time[i]
                var t = text.slice(1, -1).split(':');
                result.push(new SubtitleItem(parseInt(t[0], 10) * 60 + parseFloat(t[1]) + parseInt(offset) / 1000, value[i + 1]));
            }
        });
        //sort the result by time
        result.sort(function (a, b) {
            return a.startTime - b.startTime;
        });
        return result;
    }
    getOffset(text) {
        //Returns offset in miliseconds.
        var offset = 0;
        try {
            // Pattern matches [offset:1000]
            var offsetPattern = '/[offset:-?+?d+]/g',
                // Get only the first match.
                offset_line = text.match(offsetPattern)[0],
                // Get the second part of the offset.
                offset_str = offset_line.split(':')[1];
            // Convert it to Int.
            offset = parseInt(offset_str);
        } catch (err) {
            offset = 0;
        }
        return offset;
    }

}

class SubtitleItem {
    constructor(startTime, content) {
        this.startTime = startTime;
        this.content = content;
    }
}

class PlayList {
    constructor(playListContainer) {
        this.container = playListContainer;
        this.currentIndex = 0;
        this.playStrategy = 1; // play orderly
        this.allAudios = [];
    }
    setCurrentIndex(index) {
        this.currentIndex = index
    }
    getContainer() {
        return this.container;
    }
    getAllAudios() {
        return this.allAudios;
    }
    getCurrentAudio() {
        return this.getAllAudios()[this.currentIndex];
    }
    init() {
        var playList = this
        window.addEventListener('audioFinished', function () {
            playList.moveToNext();
        });
        window.addEventListener('playListReady', function () {
            playList.autoPlay();
        });
        this.handleClickEvent();
    }
    loadAudioList(contentUrl) {
        var playList = this
        //get all songs and add to the playlist
        var xhttp = new XMLHttpRequest();
        xhttp.open('GET', contentUrl, false);
        xhttp.onreadystatechange = function () {
            if (xhttp.status == 200 && xhttp.readyState == 4) {
                var data = JSON.parse(xhttp.responseText).data
                playList.allAudios = data;
                playList.refreshPlayList();
                var playListReadyEvent = new Event('playListReady');
                window.dispatchEvent(playListReadyEvent)
            }
        };
        xhttp.send();
    }
    setClass() {
        var allSongs = this.container.children[0].children;
        for (var i = allSongs.length - 1; i >= 0; i--) {
            if (allSongs[i].className) allSongs[i].className = '';
        }
        
        allSongs[this.currentIndex].className = 'current-song';
    }
    moveToNext() {
        if (this.playStrategy == 1) { // play orderly
            this.setCurrentIndex(this.currentIndex < this.getAllAudios().length ? this.currentIndex + 1 : 0);
        } else { // play orderly
            this.setCurrentIndex(Math.floor(Math.random() * this.getAllAudios().length));
        }
        this.play(this.getCurrentAudio())
    }
    play(audioDetail) {
        this.setClass();
        //set the song name to the hash of the url
        //window.location.hash = audioDetail.lrc_name;
        var playAudioEvent = new Event('playAudio');
        playAudioEvent.audioName = audioDetail.lrc_name;
        playAudioEvent.lyric = audioDetail.lyric;
        playAudioEvent.audio = audioDetail.audio;
        window.dispatchEvent(playAudioEvent)
    }
    refreshPlayList() {
        var playList = this,
            ol = this.container.getElementsByTagName('ol')[0],
            fragment = document.createDocumentFragment();
        playList.allAudios.forEach(function (v) {
            fragment.appendChild(playList.createPlayListItem(v));
        });
        ol.appendChild(fragment);
    }
    createPlayListItem(audioDetail) {
        var li = document.createElement('li'),
            a = document.createElement('a');
        a.href = 'javascript:void(0)';
        a.dataset.name = audioDetail.lrc_name;
        a.textContent = this.createTitle(audioDetail);
        li.appendChild(a);
        return li
    }
    createTitle(audioDetail) {
        return audioDetail.song_name + '-' + audioDetail.artist;
    }
    handleClickEvent() {
        //handle user click
        var playList = this
        this.getContainer().addEventListener('click', function (e) {
            if (e.target.nodeName.toLowerCase() !== 'a') {
                return;
            }
            
            var selectedIndex = playList.getSongIndex(e.target.dataset.name);
            playList.setCurrentIndex(selectedIndex);
            playList.setClass();
            playList.play(playList.getCurrentAudio())
        }, false);
    }
    autoPlay() {
        //get the hash from the url if there's any.
        //var songName = window.location.hash.substr(1);
        //then get the index of the song from all songs
        //var indexOfHashSong = this.getSongIndex(songName);
        this.setCurrentIndex(Math.floor(Math.random() * this.getAllAudios().length));
        this.play(this.getCurrentAudio())
    }
    getSongIndex(songName) {
        var index = 0;
        Array.prototype.forEach.call(this.getAllAudios(), function (v, i) {
            if (v.lrc_name == songName) {
                index = i;
                return false;
            }
        });
        return index;
    }
}

export {AudioPlayer, SubtitleManager, PlayList, SubtitleParser, AudioControl};