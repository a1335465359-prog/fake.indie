
import React, { useEffect, useRef } from 'react';
import { BackgroundMode } from '../types';

interface AuroraBackgroundProps {
  mode: BackgroundMode;
}

const AuroraBackground: React.FC<AuroraBackgroundProps> = ({ mode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false }); // Optimize for no transparency on base canvas
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;
    
    const setSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setSize();
    window.addEventListener('resize', setSize);

    // --- Helpers ---
    // Pre-calculate star positions once
    const starCount = 200;
    const staticStars = Array.from({ length: starCount }).map(() => ({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 1.5 + 0.5,
      blinkOffset: Math.random() * 10
    }));

    const drawStarField = (w: number, h: number, opacityMultiplier: number = 1) => {
        ctx.fillStyle = '#fff';
        for (let i = 0; i < starCount; i++) {
            const s = staticStars[i];
            const blink = Math.sin(time * 2 + s.blinkOffset) * 0.5 + 0.5;
            ctx.globalAlpha = blink * opacityMultiplier;
            ctx.beginPath();
            ctx.arc(s.x * w, s.y * h, s.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;
    };

    // --- Renderers ---

    // 1. Cyberpunk Synthwave (Sun + Grid + Stars)
    const drawGrid = () => {
      const w = canvas.width;
      const h = canvas.height;
      const horizon = h * 0.55; 
      
      // 1. Sky Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, horizon);
      skyGrad.addColorStop(0, '#020005');
      skyGrad.addColorStop(1, '#240029');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, horizon);

      // 2. Stars
      drawStarField(w, horizon, 0.8);

      // 3. Retro Sun
      const sunSize = Math.min(w, h) * 0.25;
      const sunX = w / 2;
      const sunY = horizon - sunSize * 0.2;

      const sunGrad = ctx.createLinearGradient(sunX, sunY - sunSize, sunX, sunY + sunSize);
      sunGrad.addColorStop(0, '#ffff00'); 
      sunGrad.addColorStop(0.5, '#ff0080'); 
      sunGrad.addColorStop(1, '#9900ff'); 

      ctx.save();
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunSize, 0, Math.PI * 2);
      ctx.fillStyle = sunGrad;
      
      // Sun Glow
      ctx.shadowBlur = 40;
      ctx.shadowColor = '#ff0080';
      ctx.fill();
      ctx.shadowBlur = 0;

      // Sun Scanlines
      ctx.fillStyle = '#240029'; // Match horizon
      for (let i = 0; i < 15; i++) {
          const height = sunSize * 0.02 + (i * i) * 0.15;
          const y = sunY + sunSize * 0.1 + (i * 10) + (i*i)*0.5;
          if (y > sunY + sunSize) break;
          ctx.fillRect(sunX - sunSize, y, sunSize * 2, height);
      }
      ctx.restore();


      // 4. Ground (Background)
      const groundGrad = ctx.createLinearGradient(0, horizon, 0, h);
      groundGrad.addColorStop(0, '#12001f');
      groundGrad.addColorStop(1, '#000000');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, horizon, w, h - horizon);

      // 5. Grid Lines (3D Projection)
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, horizon, w, h - horizon);
      ctx.clip(); // Only draw grid below horizon

      ctx.strokeStyle = 'rgba(0, 243, 255, 0.4)'; // Cyberpunk Cyan
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 4;
      ctx.shadowColor = 'rgba(0, 243, 255, 0.8)';

      const FOV = 300; 
      const camHeight = 150; 
      const gridSize = 100;
      const speed = 100; // units per second
      
      // Movement offset
      const zOffset = (time * speed) % gridSize;

      ctx.beginPath();

      // -- Horizontal Lines (Z-Depth) --
      // We draw lines from z = Near to z = Far
      // Equation: screenY = horizon + (camHeight / z) * FOV
      const zNear = 10;
      const zFar = 2000;
      
      for(let z = zNear - zOffset; z < zFar; z += gridSize) {
          if (z < 1) continue; // Behind camera

          const scale = FOV / z;
          const screenY = horizon + camHeight * scale;

          if (screenY > h) continue; // Below screen
          if (screenY < horizon) continue; 

          // Fade out near horizon
          const alpha = Math.min(1, (screenY - horizon) / 100);
          ctx.globalAlpha = alpha;

          ctx.moveTo(0, screenY);
          ctx.lineTo(w, screenY);
      }
      ctx.globalAlpha = 1.0;

      ctx.stroke();
      ctx.restore();
    };

    // 2. Ocean Waves
    const drawWaves = () => {
      const w = canvas.width;
      const h = canvas.height;
      
      ctx.fillStyle = '#001e36';
      ctx.fillRect(0, 0, w, h);

      const waveCount = 5;
      for (let i = 0; i < waveCount; i++) {
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 10) {
          const y = Math.sin(x * 0.003 + time * (0.5 + i * 0.1) + i) * 50 + (h * 0.6) + (i * 40);
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fillStyle = `rgba(0, 229, 255, ${0.05 + i * 0.02})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(0, 229, 255, ${0.1 + i * 0.05})`;
        ctx.stroke();
      }
    };

    // 3. Realistic Stars & Nebula
    const stars: {x: number, y: number, size: number, opacity: number, speed: number, color: string}[] = [];
    const colors = ['#ffffff', '#ffe9c4', '#d4fbff'];
    
    // Initializer check for stars
    if (stars.length === 0) {
        for(let i=0; i<300; i++) {
            stars.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                size: Math.random() * 1.5 + 0.5,
                opacity: Math.random(),
                speed: Math.random() * 0.05,
                color: colors[Math.floor(Math.random() * colors.length)]
            });
        }
    }

    const nebulaClouds: {x: number, y: number, radius: number, color: string, vx: number, vy: number}[] = [];
    if(nebulaClouds.length === 0) {
        nebulaClouds.push({x: window.innerWidth * 0.2, y: window.innerHeight * 0.3, radius: 400, color: 'rgba(76, 29, 149, 0.15)', vx: 0.1, vy: 0.1});
        nebulaClouds.push({x: window.innerWidth * 0.8, y: window.innerHeight * 0.7, radius: 500, color: 'rgba(30, 58, 138, 0.15)', vx: -0.1, vy: -0.05});
        nebulaClouds.push({x: window.innerWidth * 0.5, y: window.innerHeight * 0.5, radius: 300, color: 'rgba(219, 39, 119, 0.1)', vx: 0.05, vy: -0.1});
    }

    const drawStars = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, w, h);

      // Draw Nebula
      nebulaClouds.forEach(cloud => {
          cloud.x += cloud.vx;
          cloud.y += cloud.vy;
          if(cloud.x < 0 || cloud.x > w) cloud.vx *= -1;
          if(cloud.y < 0 || cloud.y > h) cloud.vy *= -1;

          const g = ctx.createRadialGradient(cloud.x, cloud.y, 0, cloud.x, cloud.y, cloud.radius);
          g.addColorStop(0, cloud.color);
          g.addColorStop(1, 'transparent');
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, w, h);
      });

      // Draw Stars
      stars.forEach(star => {
          ctx.fillStyle = star.color;
          ctx.globalAlpha = star.opacity;
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
          ctx.fill();

          star.opacity += (Math.random() - 0.5) * 0.05;
          if (star.opacity < 0.2) star.opacity = 0.2;
          if (star.opacity > 1) star.opacity = 1;
          
          star.y -= star.speed;
          if (star.y < 0) star.y = h;
      });
      ctx.globalAlpha = 1.0;
    };

    // 4. Blobs
    class Blob {
        x: number; y: number; vx: number; vy: number; radius: number; color: string;
        constructor(w: number, h: number, color: string) {
            this.x = Math.random() * w;
            this.y = Math.random() * h;
            this.vx = (Math.random() - 0.5) * 0.5;
            this.vy = (Math.random() - 0.5) * 0.5;
            this.radius = 200 + Math.random() * 200;
            this.color = color;
        }
        update(w: number, h: number) {
            this.x += this.vx;
            this.y += this.vy;
            if (this.x < -100 || this.x > w + 100) this.vx *= -1;
            if (this.y < -100 || this.y > h + 100) this.vy *= -1;
        }
        draw(ctx: CanvasRenderingContext2D) {
            ctx.beginPath();
            const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
            g.addColorStop(0, this.color);
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    let blobs: Blob[] = [];
    const initBlobs = () => {
        const colors = mode === 'blobs'
            ? ['rgba(0, 122, 255, 0.2)', 'rgba(88, 86, 214, 0.2)', 'rgba(90, 200, 250, 0.2)'] 
            : ['rgba(0, 255, 157, 0.2)', 'rgba(189, 0, 255, 0.2)', 'rgba(0, 184, 255, 0.2)'];
        blobs = [];
        for(let i=0; i<3; i++) {
            blobs.push(new Blob(window.innerWidth, window.innerHeight, colors[i]));
        }
    }
    if(blobs.length === 0) initBlobs();

    const drawBlobs = () => {
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0,0,w,h);
        ctx.globalCompositeOperation = mode === 'blobs' ? 'multiply' : 'screen';
        blobs.forEach(b => {
            b.update(w, h);
            b.draw(ctx);
        });
        ctx.globalCompositeOperation = 'source-over';
    }
    
    // 5. Matrix Code Rain
    const matrixDrops: number[] = [];
    const matrixChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$@#%&";
    
    const drawMatrix = () => {
        const w = canvas.width;
        const h = canvas.height;
        const fontSize = 16;
        const cols = Math.floor(w / fontSize);
        
        if (matrixDrops.length !== cols) {
            matrixDrops.length = 0;
            for(let i=0; i<cols; i++) matrixDrops.push(Math.random() * h);
        }

        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = '#0F0';
        ctx.font = `${fontSize}px monospace`;
        
        for(let i=0; i<matrixDrops.length; i++) {
            const text = matrixChars.charAt(Math.floor(Math.random() * matrixChars.length));
            const x = i * fontSize;
            const y = matrixDrops[i] * fontSize;
            
            ctx.fillText(text, x, y);
            
            if (y > h && Math.random() > 0.975) {
                matrixDrops[i] = 0;
            }
            matrixDrops[i]++;
        }
    };

    // 6. Neural Network
    const nodes: {x: number, y: number, vx: number, vy: number}[] = [];
    const initNodes = () => {
        if (nodes.length > 0) return;
        for (let i = 0; i < 80; i++) {
            nodes.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2
            });
        }
    };
    initNodes();

    const drawNeural = () => {
        const w = canvas.width;
        const h = canvas.height;
        ctx.fillStyle = '#0b0f19';
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = '#38bdf8';
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';

        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            node.x += node.vx;
            node.y += node.vy;

            if (node.x < 0 || node.x > w) node.vx *= -1;
            if (node.y < 0 || node.y > h) node.vy *= -1;

            ctx.beginPath();
            ctx.arc(node.x, node.y, 2, 0, Math.PI * 2);
            ctx.fill();

            for (let j = i + 1; j < nodes.length; j++) {
                const other = nodes[j];
                const dx = node.x - other.x;
                const dy = node.y - other.y;
                const dist = Math.sqrt(dx*dx + dy*dy);

                if (dist < 150) {
                    ctx.beginPath();
                    ctx.moveTo(node.x, node.y);
                    ctx.lineTo(other.x, other.y);
                    ctx.globalAlpha = 1 - (dist / 150);
                    ctx.stroke();
                    ctx.globalAlpha = 1;
                }
            }
        }
    };

    // 7. Vaporwave Grid (Replaces Sunset)
    const drawVaporwave = () => {
        const w = canvas.width;
        const h = canvas.height;
        const horizon = h * 0.6;
        
        // --- Sky ---
        // Smooth retro gradient: Deep Purple -> Pink -> Orange Glow at horizon
        const skyGrad = ctx.createLinearGradient(0, 0, 0, horizon);
        skyGrad.addColorStop(0, '#10002b'); // Deepest violet
        skyGrad.addColorStop(0.4, '#240046'); 
        skyGrad.addColorStop(0.8, '#5a189a');
        skyGrad.addColorStop(1, '#ff6d00'); // Orange Glow
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, horizon);

        // --- Ground ---
        // Dark grid background
        const groundGrad = ctx.createLinearGradient(0, horizon, 0, h);
        groundGrad.addColorStop(0, '#10002b');
        groundGrad.addColorStop(1, '#000000');
        ctx.fillStyle = groundGrad;
        ctx.fillRect(0, horizon, w, h - horizon);

        // --- Perspective Grid ---
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, horizon, w, h - horizon);
        ctx.clip(); // Only draw below horizon

        // Neon Pink/Purple Lines
        ctx.strokeStyle = 'rgba(224, 170, 255, 0.4)'; 
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#e0aaff';

        const FOV = 250; 
        const camHeight = 120; 
        const gridSize = 80;
        const speed = 80; 
        
        // Z Movement (towards viewer)
        const zOffset = (time * speed) % gridSize;

        ctx.beginPath();

        // Horizontal Lines (moving towards viewer)
        const zNear = 10;
        const zFar = 2000;
        
        for(let z = zNear - zOffset; z < zFar; z += gridSize) {
            if (z < 1) continue; 

            const scale = FOV / z;
            const screenY = horizon + camHeight * scale;

            if (screenY > h) continue; 
            if (screenY < horizon) continue; 

            // Fade out near horizon
            const alpha = Math.min(1, (screenY - horizon) / 50);
            ctx.globalAlpha = alpha;

            ctx.moveTo(0, screenY);
            ctx.lineTo(w, screenY);
        }
        ctx.stroke();

        // Vertical Lines (Perspective)
        ctx.beginPath();
        ctx.globalAlpha = 1.0;
        // Make lines diverge from center
        const centerX = w / 2;
        // Draw lines every X units in world space
        const worldWidth = 4000;
        const xStep = 150; 
        
        for(let x = -worldWidth; x <= worldWidth; x += xStep) {
             // Project start (horizon) and end (screen bottom)
             // Simple perspective projection: xScreen = (xWorld / z) * FOV + centerX
             // At horizon, z is infinity -> xScreen = centerX (Vanishing Point)
             
             // We just draw lines from Vanishing Point (centerX, horizon) 
             // to projected point at a near Z plane or bottom of screen.
             
             // To make it look correct with the scrolling horizontal lines, 
             // these static lines originating from vanishing point work well for "infinite" road
             
             // Calculate x at bottom of screen (z = camHeight / (h - horizon) * FOV ?)
             // Inverse projection: z = FOV * camHeight / (y - horizon)
             // at y = h:
             const zBottom = FOV * camHeight / (h - horizon);
             const scaleBottom = FOV / zBottom; // (h-horizon)/camHeight
             
             // xScreen = x * scale + centerX
             const xBottom = x * scaleBottom + centerX;
             
             // Optimization: Cull lines outside screen
             if (xBottom < -500 || xBottom > w + 500) continue;

             const alpha = Math.max(0, 1 - (Math.abs(x) / 3000)); // Fade edges
             ctx.globalAlpha = alpha * 0.5;

             ctx.moveTo(centerX, horizon);
             ctx.lineTo(xBottom, h);
        }

        ctx.stroke();
        ctx.restore();
    };

    // 8. Snow (Updated for better snow feeling)
    const snowflakes: {x: number, y: number, r: number, vx: number, vy: number, alpha: number}[] = [];
    const drawSnow = () => {
        const w = canvas.width;
        const h = canvas.height;
        
        // Init Snowflakes
        // Fewer particles but better quality
        if (snowflakes.length < 150) {
            snowflakes.push({
                x: Math.random() * w,
                y: Math.random() * h - h, // Start above
                r: Math.random() * 2.5 + 1, // Size variation
                vx: 0, 
                vy: Math.random() * 1.5 + 0.5, // Fall speed
                alpha: Math.random() * 0.6 + 0.4 // Opacity
            });
        }
        
        // Background: Dark Cold Blue
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, w, h);
        
        ctx.fillStyle = '#ffffff'; // Pure White
        
        for (let i = 0; i < snowflakes.length; i++) {
            const flake = snowflakes[i];
            
            // Movement
            // Add slight sine wave drift based on time and index to simulate wind turbulence
            const drift = Math.sin(time + i * 0.1) * 0.5;
            flake.x += flake.vx + drift;
            flake.y += flake.vy;
            
            // Loop
            if (flake.y > h) {
                flake.y = -10;
                flake.x = Math.random() * w;
            }
            if (flake.x > w) flake.x = 0;
            if (flake.x < 0) flake.x = w;
            
            // Draw
            ctx.globalAlpha = flake.alpha;
            ctx.beginPath();
            ctx.arc(flake.x, flake.y, flake.r, 0, Math.PI * 2);
            
            // Small glow for "fluffy" feel
            ctx.shadowBlur = 4;
            ctx.shadowColor = 'white';
            ctx.fill();
            ctx.shadowBlur = 0;
        }
        ctx.globalAlpha = 1.0;
    };

    // 9. Fire (Limbo Theme)
    const fireParticles: {x: number, y: number, vx: number, vy: number, life: number, maxLife: number, size: number, offset: number}[] = [];
    const drawFire = () => {
        const w = canvas.width;
        const h = canvas.height;
        
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#11001c';
        ctx.fillRect(0, 0, w, h);
        
        ctx.globalCompositeOperation = 'lighter'; 
        
        if (fireParticles.length < 200) {
            fireParticles.push({
                x: Math.random() * w,
                y: h + 20,
                vx: 0,
                vy: Math.random() * -2 - 1.5,
                life: 0,
                maxLife: 80 + Math.random() * 50,
                size: Math.random() * 20 + 10,
                offset: Math.random() * 100
            });
        }
        
        for (let i = 0; i < fireParticles.length; i++) {
            const p = fireParticles[i];
            p.life++;
            p.x += Math.sin(time * 5 + p.offset) * 0.5;
            p.y += p.vy;
            p.size *= 0.98; 
            
            if (p.life > p.maxLife || p.size < 0.5) {
                p.x = Math.random() * w;
                p.y = h + 20;
                p.life = 0;
                p.size = Math.random() * 20 + 10;
                p.vy = Math.random() * -2 - 1.5;
            }
            
            const lifeRatio = p.life / p.maxLife;
            const alpha = 1 - lifeRatio;
            
            const r = Math.floor(180 - lifeRatio * 100);
            const g = Math.floor(50 - lifeRatio * 50);
            const b = Math.floor(255 - lifeRatio * 50);
            
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.5})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
    };

    // 10. Sakura
    const petals: {x: number, y: number, w: number, h: number, angle: number, spin: number, vy: number, vx: number}[] = [];
    const drawSakura = () => {
        const w = canvas.width;
        const h = canvas.height;
        
        ctx.fillStyle = '#1a1012';
        ctx.fillRect(0, 0, w, h);
        
        if (petals.length < 60) {
            petals.push({
                x: Math.random() * w,
                y: -20,
                w: 10 + Math.random() * 10,
                h: 5 + Math.random() * 5,
                angle: Math.random() * Math.PI * 2,
                spin: (Math.random() - 0.5) * 0.05,
                vy: 1 + Math.random() * 2,
                vx: (Math.random() - 0.5) * 1
            });
        }
        
        ctx.fillStyle = 'rgba(255, 235, 240, 0.25)';
        
        for (let i = 0; i < petals.length; i++) {
            const p = petals[i];
            p.y += p.vy;
            p.x += p.vx + Math.sin(time + i) * 0.5;
            p.angle += p.spin;
            
            if (p.y > h) {
                p.y = -20;
                p.x = Math.random() * w;
            }
            
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);
            ctx.beginPath();
            ctx.ellipse(0, 0, p.w, p.h, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    };

    const animate = () => {
      time += 0.01;
      
      if (mode === 'grid') drawGrid();
      else if (mode === 'waves') drawWaves();
      else if (mode === 'stars') drawStars();
      else if (mode === 'matrix') drawMatrix();
      else if (mode === 'neural') drawNeural();
      else if (mode === 'sunset') drawVaporwave(); // Renamed visual function
      else if (mode === 'snow') drawSnow();
      else if (mode === 'fire') drawFire();
      else if (mode === 'sakura') drawSakura();
      else drawBlobs(); 

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', setSize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [mode]);

  return (
    <div className="fixed top-0 left-0 w-full h-full z-0 pointer-events-none transition-colors duration-500 bg-[var(--bg-color)]">
      <canvas ref={canvasRef} className="block w-full h-full opacity-100" />
    </div>
  );
};

export default AuroraBackground;
