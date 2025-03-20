import { useEffect, useRef, useState } from 'react';

const MatrixBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number, y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions to window size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Track mouse movement
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
      
      // Create a "splash" effect at mouse position
      if (Math.random() > 0.5) {
        for (let i = 0; i < 10; i++) {
          drops.push({
            x: e.clientX / fontSize + Math.random() * 10 - 5,
            y: 0,
            speed: 1.2 + Math.random() * 1.5,
            char: charArray[Math.floor(Math.random() * charArray.length)]
          });
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Matrix characters - using a mix of katakana and latin
    const chars = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const charArray = chars.split('');

    // Set columns based on font size
    const fontSize = 16;
    const columns = Math.floor(canvas.width / fontSize) + 1;
    
    // Define drop object with position, speed and character
    interface Drop {
      x: number;
      y: number;
      speed: number;
      char: string;
    }
    
    // Track the Y position of each column drop
    const drops: Drop[] = [];
    for (let i = 0; i < columns; i++) {
      drops.push({
        x: i,
        y: Math.random() * -100, // Start above canvas for staggered effect
        speed: 0.5 + Math.random() * 0.5,
        char: charArray[Math.floor(Math.random() * charArray.length)]
      });
    }

    // Drawing the matrix effect
    const draw = () => {
      // Semi-transparent black for trails
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Different greens based on position and randomness
      const baseGreen = '#0F0';
      const brightGreen = '#5F5';
      const dimGreen = '#090';

      // For each drop
      for (let i = 0; i < drops.length; i++) {
        const drop = drops[i];
        
        // Select a color based on proximity to mouse
        if (mousePosition) {
          const distToMouse = Math.hypot(
            (drop.x * fontSize) - mousePosition.x,
            (drop.y * fontSize) - mousePosition.y
          );
          
          if (distToMouse < 100) {
            ctx.fillStyle = brightGreen; // Brighter green near mouse
            ctx.font = `bold ${fontSize + 2}px monospace`; // Slightly larger font
          } else if (distToMouse < 200) {
            ctx.fillStyle = baseGreen;
            ctx.font = `${fontSize}px monospace`;
          } else {
            ctx.fillStyle = dimGreen; // Dimmer green far from mouse
            ctx.font = `${fontSize - 1}px monospace`; // Slightly smaller font
          }
        } else {
          ctx.fillStyle = baseGreen;
          ctx.font = `${fontSize}px monospace`;
        }
        
        // Randomize character occasionally
        if (Math.random() > 0.95) {
          drop.char = charArray[Math.floor(Math.random() * charArray.length)];
        }
        
        // Draw the character
        ctx.fillText(drop.char, drop.x * fontSize, drop.y * fontSize);
        
        // Move drops down by their speed
        drop.y += drop.speed;
        
        // Reset drops back to top when they reach bottom
        if (drop.y * fontSize > canvas.height && Math.random() > 0.975) {
          drop.y = 0;
          drop.x = Math.floor(Math.random() * columns);
          drop.speed = 0.5 + Math.random() * 0.5;
        }
      }
      
      // Add occasional new drops
      if (drops.length < columns * 1.5 && Math.random() > 0.98) {
        drops.push({
          x: Math.floor(Math.random() * columns),
          y: 0,
          speed: 0.5 + Math.random() * 0.5,
          char: charArray[Math.floor(Math.random() * charArray.length)]
        });
      }
      
      // Remove excess drops
      if (drops.length > columns * 3) {
        drops.splice(0, drops.length - columns * 3);
      }
    };

    // Animation frame
    let animationFrameId: number;
    const animate = () => {
      draw();
      animationFrameId = requestAnimationFrame(animate);
    };
    
    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="matrix-background"
      style={{ pointerEvents: 'none' }}
    />
  );
};

export default MatrixBackground; 