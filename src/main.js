import { HandTracker } from "./handTracker.js";
import { PhysicsEngine } from "./physics.js";

const video = document.getElementById("webcam");
const canvas = document.getElementById("output_canvas");
const ctx = canvas.getContext("2d");
const statusTxt = document.getElementById("status");

let width, height;
let physics;
let tracker;

// Interaction states
let isPinching = false;
let pinchPoint = { x: 0, y: 0 };
let grabbedPoint = null;

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;
}

window.addEventListener("resize", resize);

function initPhysics() {
  physics = new PhysicsEngine();
  
  // Create 7 vertical elastic strings spaced evenly
  const numStrings = 7;
  const spacing = window.innerWidth / (numStrings + 1);
  
  for(let i=1; i<=numStrings; i++) {
     // A string from top to bottom, with 30 segments for high flexibility
     physics.createString(spacing * i, 0, spacing * i, window.innerHeight, 30);
  }
}

function processInteraction(results) {
  isPinching = false;
  
  // Are hands tracked?
  if (results && results.landmarks && results.landmarks.length > 0) {
    // We can evaluate both hands, we just take the first detected hand for simplicity here
    // or iterate over them. We'll pick the first hand pinching.
    for (const landmarks of results.landmarks) {
      const thumb = landmarks[4];
      const index = landmarks[8];
      
      // Calculate canvas specific coordinates.
      // Handlandmarker output needs to match canvas space.
      // Note: Video & Canvas are CSS-flipped (scaleX(-1)), so coordinates are natively correct 
      // without manual inversion! 
      const tx = thumb.x * width;
      const ty = thumb.y * height;
      const ix = index.x * width;
      const iy = index.y * height;
      
      const pinchDist = Math.sqrt((tx - ix)**2 + (ty - iy)**2);
      
      // Threshold distance for "Pinch" (Roughly 40-50 pixels depending on screen size)
      if (pinchDist < 50) {
        isPinching = true;
        pinchPoint.x = (tx + ix) / 2;
        pinchPoint.y = (ty + iy) / 2;
        
        // Collision Detection: Try to grab nearest physics point
        if (!grabbedPoint) {
            let nearest = null;
            let minDist = 80; // Grab radius threshold
            for(let p of physics.points) {
                if(p.locked) continue;
                const d = Math.sqrt((p.x - pinchPoint.x)**2 + (p.y - pinchPoint.y)**2);
                if(d < minDist) {
                    minDist = d;
                    nearest = p;
                }
            }
            if (nearest) grabbedPoint = nearest;
        }
        break; // Stop after first pinching hand
      }
    }
  }
  
  // Apply grabbed interaction
  if (isPinching && grabbedPoint) {
      grabbedPoint.x = pinchPoint.x;
      grabbedPoint.y = pinchPoint.y;
      grabbedPoint.oldX = pinchPoint.x; // kills velocity on grab
      grabbedPoint.oldY = pinchPoint.y;
  } else {
      grabbedPoint = null; // Let go!
      isPinching = false;
  }
}

function render() {
  // Clear frame
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 1. Process Vision & Interaction
  const results = tracker.detect();
  processInteraction(results);
  
  // 2. Step Engine Constraints 
  physics.update(width, height);
  
  // 3. Draw Engine State
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  
  for (let c of physics.constraints) {
    ctx.beginPath();
    ctx.moveTo(c.p1.x, c.p1.y);
    ctx.lineTo(c.p2.x, c.p2.y);
    
    // Stretch tension effect (calculating how stretched it is)
    const dx = c.p2.x - c.p1.x;
    const dy = c.p2.y - c.p1.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const stretchRatio = dist / c.length; 
    
    // Smooth Neon Glow Aesthetic
    ctx.lineWidth = Math.max(1, 6 - (stretchRatio - 1) * 3); 
    
    // Turn string reddish when stretched hard
    if (stretchRatio > 1.2) {
      ctx.shadowColor = "#ff0066";
      ctx.strokeStyle = "rgba(255, 50, 100, 0.9)";
    } else {
      ctx.shadowColor = "#00ffcc";
      ctx.strokeStyle = "rgba(0, 255, 204, 0.8)";
    }
    
    ctx.shadowBlur = 15;
    ctx.stroke();
    ctx.shadowBlur = 0; // reset
  }

  // Visual Indicator for Pinching
  if (isPinching) {
      ctx.beginPath();
      ctx.arc(pinchPoint.x, pinchPoint.y, 8, 0, 2 * Math.PI);
      ctx.fillStyle = grabbedPoint ? "#ffffff" : "rgba(255, 0, 102, 0.8)";
      ctx.fill();
      ctx.shadowBlur = 20;
      ctx.shadowColor = ctx.fillStyle;
  }

  requestAnimationFrame(render);
}

function start() {
  resize();
  initPhysics();
  
  statusTxt.innerText = "Loading Hand Tracking Model...";
  
  tracker = new HandTracker(video, () => {
    statusTxt.innerText = "Active. Try Pinching!";
    statusTxt.style.color = "#00ffcc";
    render();
  });
}

// Boot up
start();
