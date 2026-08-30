import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export default function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShow(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!show) return null;

  return (
    <button
      onClick={scrollToTop}
      className="fixed right-6 bottom-20 bg-stone-900 text-white p-3.5 rounded-full shadow-xl hover:bg-stone-800 active:scale-95 transition-all duration-300 z-50 flex items-center justify-center cursor-pointer border border-stone-800"
      aria-label="回到顶部"
    >
      <ArrowUp size={20} />
    </button>
  );
}
