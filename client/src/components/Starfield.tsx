import { useEffect, useRef } from 'react';

export default function Starfield() {
  const starfield = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!starfield.current) return;

    const createStars = (layer: number) => {
      const starCount = layer === 1 ? 50 : layer === 2 ? 30 : 20;
      const layerElement = document.createElement('div');
      layerElement.className = `star-layer star-layer-${layer}`;

      for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.left = `${Math.random() * 100}%`;
        star.style.animationDelay = `${Math.random() * 10}s`;
        layerElement.appendChild(star);
      }

      return layerElement;
    };

    const clearStars = () => {
      if (starfield.current) {
        starfield.current.innerHTML = '';
      }
    };

    clearStars();
    [1, 2, 3].forEach(layer => {
      starfield.current?.appendChild(createStars(layer));
    });

    return () => clearStars();
  }, []);

  return <div ref={starfield} className="starfield" />;
}
