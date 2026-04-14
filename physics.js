export class Point {
  constructor(x, y, locked = false) {
    this.x = x;
    this.y = y;
    this.oldX = x;
    this.oldY = y;
    this.locked = locked;
    this.mass = 1;
  }
}

export class Constraint {
  constructor(p1, p2, length, stiffness = 1) {
    this.p1 = p1;
    this.p2 = p2;
    this.length = length;
    this.stiffness = stiffness;
  }
}

export class PhysicsEngine {
  constructor() {
    this.points = [];
    this.constraints = [];
    this.gravity = 0.8;
    this.friction = 0.96;
    this.bounce = 0.8;
  }

  update(width, height) {
    // 1. Verlet Integration Point Updates
    for (let p of this.points) {
      if (p.locked) continue;

      let vx = (p.x - p.oldX) * this.friction;
      let vy = (p.y - p.oldY) * this.friction;

      p.oldX = p.x;
      p.oldY = p.y;

      p.x += vx;
      p.y += vy;
      p.y += this.gravity; // Apply gravity down

      // Bounds collision
      if (p.x >= width) {
        p.x = width;
        p.oldX = p.x + vx * this.bounce;
      } else if (p.x <= 0) {
        p.x = 0;
        p.oldX = p.x + vx * this.bounce;
      }

      if (p.y >= height) {
        p.y = height;
        p.oldY = p.y + vy * this.bounce;
      } else if (p.y <= 0) {
        p.y = 0;
        p.oldY = p.y + vy * this.bounce;
      }
    }

    // 2. Solve Constraints (Multiple passes yields higher rigidity)
    const iterations = 5;
    for (let i = 0; i < iterations; i++) {
      for (let c of this.constraints) {
        let dx = c.p2.x - c.p1.x;
        let dy = c.p2.y - c.p1.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        
        // Anti-collapse protection (avoid division by zero)
        if (dist === 0) dist = 0.001;

        let diff = (c.length - dist) / dist;

        let offsetX = dx * diff * 0.5 * c.stiffness;
        let offsetY = dy * diff * 0.5 * c.stiffness;

        if (!c.p1.locked) {
          c.p1.x -= offsetX;
          c.p1.y -= offsetY;
        }
        if (!c.p2.locked) {
          c.p2.x += offsetX;
          c.p2.y += offsetY;
        }
      }
    }
  }

  createString(startX, startY, endX, endY, segments) {
    const stringPoints = [];
    const dx = (endX - startX) / segments;
    const dy = (endY - startY) / segments;
    const segmentLength = Math.sqrt(dx * dx + dy * dy);

    for (let i = 0; i <= segments; i++) {
      const locked = (i === 0 || i === segments); // Anchor top and bottom
      const p = new Point(startX + dx * i, startY + dy * i, locked);
      this.points.push(p);
      stringPoints.push(p);

      if (i > 0) {
        // High stiffness makes it feel like an elastic band
        this.constraints.push(new Constraint(stringPoints[i - 1], stringPoints[i], segmentLength, 0.95));
      }
    }
    return stringPoints;
  }
}
