import { useEffect, useRef, useState } from 'react';

interface MatrixCursorProps {
  enabled?: boolean;
}

const MatrixCursor = ({ enabled = true }: MatrixCursorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number, y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const streamRef = useRef<Array<{
    x: number;
    y: number;
    speed: number;
    chars: string[];
    length: number;
    headPos: number;
    active: boolean;
  }>>([]);
  const lastSpawnTimeRef = useRef(0);
  const frameCountRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Set canvas dimensions to window size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Matrix characters - using a mix of katakana and latin
    const chars = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const charArray = chars.split('');
    const fontSize = 16;
    const maxStreams = 100; // Limit to prevent performance issues
    
    // Track mouse events
    const handleMouseDown = (e: MouseEvent) => {
      setIsDragging(true);
      setMousePosition({ x: e.clientX, y: e.clientY });
      createStreamsAtPosition(e.clientX, e.clientY, 5);
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      const now = performance.now();
      setMousePosition({ x: e.clientX, y: e.clientY });
      
      if (isDragging) {
        // Limit creation rate to prevent too many streams
        if (now - lastSpawnTimeRef.current > 50) { // Spawn every 50ms while dragging
          createStreamsAtPosition(e.clientX, e.clientY, 2);
          lastSpawnTimeRef.current = now;
        }
      }
    };
    
    const handleMouseUp = () => {
      if (isDragging && mousePosition) {
        createStreamsAtPosition(mousePosition.x, mousePosition.y, 5);
      }
      setIsDragging(false);
    };
    
    // Create matrix streams at given position
    const createStreamsAtPosition = (x: number, y: number, count: number) => {
      // If we have too many active streams, don't create more
      const activeStreams = streamRef.current.filter(s => s.active).length;
      if (activeStreams >= maxStreams) {
        // Replace some old streams instead of adding new ones
        const oldestStreams = streamRef.current
          .filter(s => s.active)
          .sort((a, b) => a.headPos - b.headPos)
          .slice(0, count);
          
        oldestStreams.forEach(stream => {
          stream.x = x + (Math.random() * 60 - 30);
          stream.y = 0;
          stream.headPos = 0;
          stream.length = 10 + Math.floor(Math.random() * 20);
          stream.speed = 1 + Math.random() * 2;
          stream.chars = Array(stream.length).fill('').map(() => 
            charArray[Math.floor(Math.random() * charArray.length)]
          );
        });
        return;
      }
      
      // Create new streams
      for (let i = 0; i < count; i++) {
        const stream = {
          x: x + (Math.random() * 60 - 30),
          y: 0,
          speed: 1 + Math.random() * 2,
          chars: Array(10 + Math.floor(Math.random() * 20)).fill('').map(() => 
            charArray[Math.floor(Math.random() * charArray.length)]
          ),
          length: 10 + Math.floor(Math.random() * 20),
          headPos: 0,
          active: true
        };
        
        streamRef.current.push(stream);
      }
      
      // Limit total streams
      if (streamRef.current.length > maxStreams * 1.5) {
        streamRef.current = streamRef.current.slice(-maxStreams);
      }
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    // Drawing the matrix cursor effect
    const draw = () => {
      // Clear canvas completely (no semi-transparent overlay that dims content)
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw each stream
      for (let i = 0; i < streamRef.current.length; i++) {
        const stream = streamRef.current[i];
        if (!stream.active) continue;

        // Draw each character in the stream
        for (let j = 0; j < stream.chars.length; j++) {
          // Calculate position in the stream (head to tail)
          const charPos = stream.headPos - j;
          
          // Only draw if the character is within the view (has entered screen and not gone off bottom)
          if (charPos >= 0 && charPos * fontSize < canvas.height) {
            // Determine character brightness based on position
            if (j === 0) {
              // Leading character (head) is brightest
              ctx.fillStyle = 'rgba(244, 180, 62, 1)';
              ctx.shadowColor = 'rgba(244, 180, 62, 0.8)';
              ctx.shadowBlur = 5;
              ctx.font = `bold ${fontSize}px monospace`;
            } else if (j < 5) {
              // First few characters are bright
              ctx.fillStyle = 'rgba(244, 180, 62, 0.9)';
              ctx.shadowColor = 'rgba(244, 180, 62, 0.4)';
              ctx.shadowBlur = 3;
              ctx.font = `${fontSize}px monospace`;
            } else {
              // Trailing characters get dimmer
              const alpha = Math.max(0.1, 1 - (j / stream.length));
              ctx.fillStyle = `rgba(244, 180, 62, ${alpha})`;
              ctx.shadowColor = 'transparent';
              ctx.shadowBlur = 0;
              ctx.font = `${fontSize - 1}px monospace`;
            }
            
            // Randomly change some characters in the middle of the stream for the "morphing" effect
            if (j > 0 && j < stream.length - 2 && Math.random() > 0.96) {
              stream.chars[j] = charArray[Math.floor(Math.random() * charArray.length)];
            }
            
            // Draw the character
            ctx.fillText(stream.chars[j], stream.x, charPos * fontSize);
          }
        }
        
        // Move the stream down
        if (frameCountRef.current % 2 === 0) {  // Only update every other frame to slow down
          stream.headPos += stream.speed / 2;
        }
        
        // Deactivate stream when it goes off screen
        if ((stream.headPos - stream.length) * fontSize > canvas.height) {
          stream.active = false;
        }
      }
      
      // Count frames for animation timing
      frameCountRef.current = (frameCountRef.current + 1) % 1000;
      
      // Clean up inactive streams occasionally
      if (frameCountRef.current % 100 === 0) {
        streamRef.current = streamRef.current.filter(s => s.active);
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
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      cancelAnimationFrame(animationFrameId);
    };
  }, [enabled, isDragging]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="matrix-cursor"
      style={{ pointerEvents: 'none' }}
    />
  );
};

export default MatrixCursor; 