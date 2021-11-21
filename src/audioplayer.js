const $ = require('jquery');

var mkPlayer = {
    volume: 0.6,        // Default sound volume(between 0~1)
    version: 'v2.41',    // mkPlayer version(testing purpose)
    debug: true   // Enable debug mode log (true/false)
}

// Global variables
var rem = [];

class DataSaver {

    constructor() {

    }
    // save data to local storage
    savedata(key, data) {
        // onstruct key for storage, prefix for avoid conflict with other libarary which use local storage
        key = 'mkPlayer2_' + key;
        data = JSON.stringify(data);
        // before saving, check if the browser support local storage
        if (window.localStorage) {
            localStorage.setItem(key, data);
        }
    }
    // read infor from local storage by key 
    readdata(key) {
        if (!window.localStorage) return '';
        key = 'mkPlayer2_' + key;
        return JSON.parse(localStorage.getItem(key));
    }
}

rem.dataSaver = new DataSaver();

class AudioControl {
    constructor(audioContainer) {
        this.audioContainer = audioContainer;
    }

    getAudio() {
        return this.audioContainer;
    }

    listen() {
        // Enable keyboard control , spacebar to play and pause
        var that = this;
        // play or pause handling
        $(".btn-play").on("click", function () {
            window.dispatchEvent(new Event('player-pause'));
        });
        // set play mode orderly or randomly etc.
        $(".btn-order").on("click", function () {
            that.orderChange();
        });
        // play previous song or sound
        $(".btn-prev").on("click", function () {
            window.dispatchEvent(new Event('audioFinished'));
        });

        // play next sond or sound
        $(".btn-next").on("click", function () {
            window.dispatchEvent(new Event('audioFinished'));
        });

        window.addEventListener('keydown', function (e) {
            if (e.keyCode === 32) {
                if (that.getAudio().paused) {
                    that.getAudio().play();
                } else {
                    that.getAudio().pause();
                }
            }
        }, false);

        window.addEventListener('player-pause', function (e) {
            if (that.getAudio().paused) {
                $(".btn-play").removeClass("btn-state-paused");     // unpause
                that.getAudio().play();
            } else {
                $(".btn-play").addClass("btn-state-paused");        // pause
                that.getAudio().pause();
            }
        }, false);
    }

    // playing order
    orderChange() {
        var orderDiv = $(".btn-order");
        orderDiv.removeClass();
        switch (rem.order) {
            case 1:     // Single tune circulation-> circulation listing 
                orderDiv.addClass("player-btn btn-order btn-order-list");
                orderDiv.attr("title", "Loop Playback");
                rem.order = 2;
                break;

            case 3:     // randomly play -> Single tune circulation
                orderDiv.addClass("player-btn btn-order btn-order-single");
                orderDiv.attr("title", "single cycle");
                rem.order = 1;
                break;

            // case 2:
            default:    // circulation listing -> randomly play 
                orderDiv.addClass("player-btn btn-order btn-order-random");
                orderDiv.attr("title", "random");
                rem.order = 3;
        }
    }
}

class AudioPlayer {
    constructor(audioContainer) {
        this.audioContainer = audioContainer;
    }

    listen() {
        var audioContainer = this.audioContainer;
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

        window.addEventListener("adjusttimeByPercent", function (e) {
            var newTime = (that.audioContainer.duration * e.percent).toFixed(4);
            that.playback(newTime);
        });

        window.addEventListener("vb-adjusttime", function (e) {
            that.audioContainer.volume = e.adjustToTime;
        });

        if (audioContainer) this.audioContainer = audioContainer
        return this;
    }

    withAudioContainer(audioContainer) {
        this.audioContainer = audioContainer;
        return this;
    }

    onPlayerError(e) {
        var playErrorEvent = new Event("mb-play-error");
        window.dispatchEvent(playErrorEvent)
    }

    onTimeUpdate(e) {
        var progressUpdateEvent = new Event("mb-progress-update");
        progressUpdateEvent.percent = this.getProgress();
        progressUpdateEvent.currentTime = this.getCurrentTime();
        window.dispatchEvent(progressUpdateEvent)
    }

    getProgress() {
        return this.audioContainer.currentTime / this.audioContainer.duration;
    }

    getCurrentTime() {
        return this.audioContainer.currentTime;
    }

    getAudioContainer() {
        return this.audioContainer
    }

    play(audioUrl) {
        this.getAudioContainer().addEventListener('canplay', function () {
            var playPromise = this.play();
            var audio = this;
            if (playPromise !== undefined) {
                playPromise.then(() => {
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
        var that = this;
        window.addEventListener('playAudio', function (e) {
            that.loadLyric(e.lyric);
        });
        window.addEventListener('mb-progress-update', function (e) {
            that.synchronizeLyric(e.currentTime);
        });

        window.addEventListener('mb-play-error', function (e) {
            that.getSubtitleContainer().textContent = '!fail to load the audio :(';
        });
    }

    getSubtitleContainer() {
        return this.subtitleContainer;
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

    synchronizeLyric(currentTime) {
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
            that.getSubtitleContainer().textContent = '!failed to load the lyric :(' + e;
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
            for (i = 0, text = ''; i < len; i++) {
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
    //suggest not calling the constructor directly
    //recommend to call the factory method
    constructor(playListContainer) {
        this.container = playListContainer;
        this.currentIndex = 0;
        this.playStrategy = 1; // play orderly
        this.allAudios = [];
        var playList = this
        window.addEventListener('audioFinished', function () {
            playList.moveToNext();
        });
        window.addEventListener('playListReady', function () {
            playList.autoPlay();
        });
        this.handleClickEvent();
    }

    static new(playListContainer, playStrategy, createTitleFn) {
        let playList = new PlayList(playListContainer);
        if (playStrategy) {
            playList.playStrategy = playStrategy
        }
        if (createTitleFn) {
            playList.createTitle = createTitleFn
        }
        return playList;
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
        return audioDetail.song_name + ' - ' + audioDetail.artist;
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

// mk进度条插件
// 进度条框 id，初始量，回调函数
class ProgressBar {
    constructor(bar, percent, isLocked) {
        this.bar = bar;
        if (percent > 1 || percent < 0) {
            if (percent < 0)
                this.percent = 0; // 范围限定
            if (percent > 1)
                this.percent = 1;
        } else {
            this.percent = percent;
        }
        this.locked = isLocked;
        this.mdown = false;
        this.init();
    }
    // 进度条初始化
    init() {
        var mk = this;
        mk.mdown = false;
        this.barMove.bind(this);
        // 加载进度条html元素
        $(mk.bar).html('<div class="mkpgb-bar"></div><div class="mkpgb-cur"></div><div class="mkpgb-dot"></div>');
        // 获取偏移量
        mk.minLength = $(mk.bar).offset().left;
        mk.maxLength = $(mk.bar).width() + mk.minLength;
        // 窗口大小改变偏移量重置
        $(window).on('resize', function () {
            mk.minLength = $(mk.bar).offset().left;
            mk.maxLength = $(mk.bar).width() + mk.minLength;
        });
        // 监听小点的鼠标按下事件
        $(mk.bar + ' .mkpgb-dot').on('mousedown', function (e) {
            e.preventDefault(); // 取消原有事件的默认动作
        });
        // 监听进度条整体的鼠标按下事件
        $(mk.bar).on('mousedown', function (e) {
            if (!mk.locked)
                mk.mdown = true;
            mk.barMove(e);
        });
        // 监听鼠标移动事件，用于拖动
        $('html').on('mousemove', function (e) {
            mk.barMove(e);
        });
        // 监听鼠标弹起事件，用于释放拖动
        $('html').on('mouseup', function (e) {
            mk.mdown = false;
        });

        window.addEventListener('mb-progress-update', function (e) {
            mk.goto(e.percent);
        });

        window.addEventListener('adjusttimeByPercent', function (e) {
            mk.goto(e.percent);
        });

        window.addEventListener('playAudio', function (e) {
            mk.goto(0); // 进度条强制归零
            mk.lock(false); // 取消进度条锁定
        });

        mk.goto(mk.percent);

        return true;
    }
    barMove(e) {
        var mk = this;
        if (!mk.mdown)
            return;
        var percent = 0;
        if (e.clientX < mk.minLength) {
            percent = 0;
        } else if (e.clientX > mk.maxLength) {
            percent = 1;
        } else {
            percent = (e.clientX - mk.minLength) / (mk.maxLength - mk.minLength);
        }
        var adjustTimeEvent = new Event('adjusttimeByPercent');
        adjustTimeEvent.percent = percent;
        window.dispatchEvent(adjustTimeEvent);

        mk.goto(percent);
        return true;
    }
    // 跳转至某处
    goto(percent) {
        if (percent > 1)
            percent = 1;
        if (percent < 0)
            percent = 0;
        this.percent = percent;
        $(this.bar + ' .mkpgb-dot').css('left', (percent * 100) + '%');
        $(this.bar + ' .mkpgb-cur').css('width', (percent * 100) + '%');
        return true;
    }
    // 锁定进度条
    lock(islock) {
        if (islock) {
            this.locked = true;
            $(this.bar).addClass('mkpgb-locked');
        } else {
            this.locked = false;
            $(this.bar).removeClass('mkpgb-locked');
        }
        return true;
    }
}

// mk进度条插件
// 进度条框 id，初始量，回调函数
class VolumeBar {
    constructor(bar, isLocked) {
        this.bar = bar;
        // 初始化音量设定
        var tmp_vol = rem.dataSaver.readdata('volume');
        tmp_vol = (tmp_vol != null) ? tmp_vol : (rem.isMobile ? 1 : mkPlayer.volume);
        if (tmp_vol > 1 || tmp_vol < 0) {
            if (tmp_vol < 0)
                this.percent = 0; // 范围限定
            if (tmp_vol > 1)
                this.percent = 1;
        } else {
            this.percent = tmp_vol;
        }
        this.locked = isLocked;
        this.mdown = false;
        this.init();
        if (this.percent == 0)
            $('.btn-quiet').addClass('btn-state-quiet'); // 添加静音样式
    }
    // 进度条初始化
    init() {
        var mk = this;
        mk.mdown = false;
        this.barMove.bind(this);
        // 加载进度条html元素
        $(mk.bar).html('<div class="mkpgb-bar"></div><div class="mkpgb-cur"></div><div class="mkpgb-dot"></div>');
        // 获取偏移量
        mk.minLength = $(mk.bar).offset().left;
        mk.maxLength = $(mk.bar).width() + mk.minLength;
        // 窗口大小改变偏移量重置
        $(window).on('resize', function () {
            mk.minLength = $(mk.bar).offset().left;
            mk.maxLength = $(mk.bar).width() + mk.minLength;
        });
        // 监听小点的鼠标按下事件
        $(mk.bar + ' .mkpgb-dot').on('mousedown', function (e) {
            e.preventDefault(); // 取消原有事件的默认动作
        });
        // 监听进度条整体的鼠标按下事件
        $(mk.bar).on('mousedown', function (e) {
            if (!mk.locked)
                mk.mdown = true;
            mk.barMove(e);
        });
        // 监听鼠标移动事件，用于拖动
        $('html').on('mousemove', function (e) {
            mk.barMove(e);
        });
        // 监听鼠标弹起事件，用于释放拖动
        $('html').on('mouseup', function (e) {
            mk.mdown = false;
        });

        // 静音按钮点击事件
        $('.btn-quiet').on('click', function () {
            var oldVol; // 之前的音量值
            if ($(this).is('.btn-state-quiet')) {
                oldVol = $(this).data('volume');
                oldVol = oldVol ? oldVol : (rem.isMobile ? 1 : mkPlayer.volume); // 没找到记录的音量，则重置为默认音量
                $(this).removeClass('btn-state-quiet'); // 取消静音
            } else {
                oldVol = mk.percent;
                $(this).addClass('btn-state-quiet'); // 开启静音
                $(this).data('volume', oldVol); // 记录当前音量值
                oldVol = 0;
            }
            rem.dataSaver.savedata('volume', oldVol); // 存储音量信息
            mk.goto(oldVol); // 刷新音量显示
            var adjustTimeEvent = new Event('vb-adjusttime');
            adjustTimeEvent.adjustToTime = oldVol;
            window.dispatchEvent(adjustTimeEvent);
        });

        window.addEventListener('query-volume', function (e) {
            var volumeFeedbackEvent = new Event('feedback-current-volume');
            volumeFeedbackEvent.currentVolume = mk.percent;
            window.dispatchEvent(volumeFeedbackEvent);
        });

        window.addEventListener("vb-adjusttime", function (e) {
            mk.vBcallback(e.adjustToTime);
        });

        mk.goto(mk.percent);

        return true;
    }
    // 音量条变动回调函数
    // 参数：新的值
    vBcallback(newVal) {

        if ($(".btn-quiet").is('.btn-state-quiet')) {
            $(".btn-quiet").removeClass("btn-state-quiet"); // 取消静音
        }

        if (newVal === 0)
            $(".btn-quiet").addClass("btn-state-quiet");

        rem.dataSaver.savedata('volume', newVal); // 存储音量信息
    }
    barMove(e) {
        var mk = this;
        if (!mk.mdown)
            return;
        var percent = 0;
        if (e.clientX < mk.minLength) {
            percent = 0;
        } else if (e.clientX > mk.maxLength) {
            percent = 1;
        } else {
            percent = (e.clientX - mk.minLength) / (mk.maxLength - mk.minLength);
        }
        var adjustTimeEvent = new Event('vb-adjusttime');
        adjustTimeEvent.adjustToTime = percent;
        window.dispatchEvent(adjustTimeEvent);

        mk.goto(percent);
        return true;
    }
    // 跳转至某处
    goto(percent) {
        if (percent > 1)
            percent = 1;
        if (percent < 0)
            percent = 0;
        this.percent = percent;
        $(this.bar + ' .mkpgb-dot').css('left', (percent * 100) + '%');
        $(this.bar + ' .mkpgb-cur').css('width', (percent * 100) + '%');
        return true;
    }
    // 锁定进度条
    lock(islock) {
        if (islock) {
            this.locked = true;
            $(this.bar).addClass('mkpgb-locked');
        } else {
            this.locked = false;
            $(this.bar).removeClass('mkpgb-locked');
        }
        return true;
    }
}


export default { AudioPlayer, SubtitleManager, PlayList, SubtitleParser, AudioControl, ProgressBar, VolumeBar };