import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

export class HandTracker {
  constructor(videoElement, onReady) {
    this.video = videoElement;
    this.handLandmarker = null;
    this.onReady = onReady;
    this.lastVideoTime = -1;
    this.results = undefined;
    this.init();
  }

  async init() {
    try {
      // 1. Load the ML WebAssembly files
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
      );
      
      // 2. Initialize the HandLandmarker model
      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      // 3. Start Webcam
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: "user" }
        });
        this.video.srcObject = stream;
        this.video.addEventListener("loadeddata", () => {
          this.video.play();
          this.onReady();
        });
      } else {
        throw new Error("getUserMedia not supported.");
      }
    } catch (err) {
      console.error("Initialization Failed:", err);
      alert("Error initializing webcam or tracking: " + err.message);
    }
  }

  detect() {
    // Process the video frame optimally using VIDEO mode
    const startTimeMs = performance.now();
    if (this.lastVideoTime !== this.video.currentTime && this.handLandmarker) {
      this.lastVideoTime = this.video.currentTime;
      this.results = this.handLandmarker.detectForVideo(this.video, startTimeMs);
    }
    return this.results;
  }
}
