import { useEffect, useRef } from 'react';

export default function Starfield() {
  const starfield = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!starfield.current) return;

    const createStars = () => {
      const starCount = 100; // Adjust this number for more or fewer stars

      for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.className = 'star';

        // Random position
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 100}%`;

        // Random animation duration between 1 and 3 seconds
        star.style.animationDuration = `${1 + Math.random() * 2}s`;

        // Random delay to start the animation
        star.style.animationDelay = `${Math.random() * 3}s`;

        starfield.current?.appendChild(star);
      }
    };

    const clearStars = () => {
      if (starfield.current) {
        starfield.current.innerHTML = '';
      }
    };

    clearStars();
    createStars();

    return () => clearStars();
  }, []);

  return <div ref={starfield} className="starfield" />;
}