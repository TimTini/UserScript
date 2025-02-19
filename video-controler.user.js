// ==UserScript==
// @name         Enhanced Video Control with Key Hold
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Advanced video control script with smooth speed adjustment and better error handling
// @author       You
// @match        *://*/*
// @icon         none
// @grant        none
// ==/UserScript==

(function () {
    "use strict";

    // Configuration
    const CONFIG = {
        SPEED_MULTIPLIER: 16, // Maximum speed when holding key
        REWIND_SECONDS: 5, // Seconds to rewind
        QUICK_PRESS_THRESHOLD: 200, // Milliseconds to consider a quick press
        RESET_DELAY: 500, // Milliseconds to wait before resetting after quick press
        DEBUG: false, // Enable/disable console logging
    };

    // State management
    const state = {
        timePress: 0,
        timeRelease: 0,
        currentVideo: null,
        speedUpTimeout: null,
        isSpeedingUp: false,
        lastPlayedVideo: null, // Add this line to track the last played video
    };

    // Utility functions
    const logger = {
        log: (...args) => CONFIG.DEBUG && console.log("[Video Control]:", ...args),
        error: (...args) => CONFIG.DEBUG && console.error("[Video Control]:", ...args),
    };

    function findPlayingVideo() {
        const videos = Array.from(document.getElementsByTagName("video"));
        return videos.find((video) => !video.paused && !video.ended);
    }

    function getLatestPlayingVideo() {
        setInterval(() => {
            const playingVideo = findPlayingVideo();
            if (playingVideo) {
                state.lastPlayedVideo = playingVideo;
            }
        }, 1000);
    }

    function getPlayingOrLastPlayedVideo() {
        const playingVideo = findPlayingVideo();
        return playingVideo || state.lastPlayedVideo;
    }

    function handleSpeedChange(video, speed) {
        try {
            video.playbackRate = speed;
            video.loop = false;
            logger.log(`Playback rate set to: ${speed}x`);
        } catch (error) {
            logger.error("Error changing playback speed:", error);
        }
    }

    // Core functionality
    function speedUpVideo() {
        if (state.isSpeedingUp) return;

        const video = getPlayingOrLastPlayedVideo();
        if (!video) {
            logger.log("No playing video found");
            return;
        }

        state.currentVideo = video;
        state.isSpeedingUp = true;
        handleSpeedChange(video, CONFIG.SPEED_MULTIPLIER);
    }

    function resetPlaybackRate() {
        clearTimeout(state.speedUpTimeout);

        if (state.currentVideo) {
            handleSpeedChange(state.currentVideo, 1);
        }

        // Reset state
        state.speedUpTimeout = null;
        state.currentVideo = null;
        state.timePress = 0;
        state.timeRelease = 0;
        state.isSpeedingUp = false;
    }

    function rewindVideo() {
        const video = getPlayingOrLastPlayedVideo();
        if (!video) return;

        try {
            video.currentTime = Math.max(0, video.currentTime - CONFIG.REWIND_SECONDS);
            logger.log(`Rewound video by ${CONFIG.REWIND_SECONDS} seconds`);
        } catch (error) {
            logger.error("Error rewinding video:", error);
        }
    }

    // Event handlers
    function handleKeyDown(event) {
        if (event.repeat) return; // Prevent multiple triggers when key is held

        switch (event.code) {
            case "ArrowRight":
            case "Period":
                state.timePress = Date.now();
                if (state.currentVideo?.paused) {
                    resetPlaybackRate();
                } else {
                    speedUpVideo();
                }
                break;

            case "ArrowLeft":
            case "Comma":
                rewindVideo();
                break;
        }
    }

    function handleKeyUp(event) {
        switch (event.code) {
            case "ArrowRight":
            case "Period":
                state.timeRelease = Date.now();
                const holdDuration = state.timeRelease - state.timePress;

                if (holdDuration < CONFIG.QUICK_PRESS_THRESHOLD) {
                    state.speedUpTimeout = setTimeout(resetPlaybackRate, CONFIG.RESET_DELAY - holdDuration);
                } else {
                    resetPlaybackRate();
                }
                break;
        }
    }

    // Initialize
    function initialize() {
        document.addEventListener("keydown", handleKeyDown);
        document.addEventListener("keyup", handleKeyUp);
        getLatestPlayingVideo();
        logger.log("Video Control script initialized");
    }

    // Cleanup
    function cleanup() {
        document.removeEventListener("keydown", handleKeyDown);
        document.removeEventListener("keyup", handleKeyUp);
        resetPlaybackRate();
    }

    // Start the script
    initialize();

    // Cleanup on page unload
    window.addEventListener("unload", cleanup);
})();
