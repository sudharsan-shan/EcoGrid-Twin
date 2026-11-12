import { useEffect } from 'react';
import { useSimStore } from '../store/simStore';

export function useKeyboardShortcuts() {
  const isPlaying = useSimStore((s) => s.state.playing);
  const setPlaying = useSimStore((s) => s.setPlaying);
  const stepIndex = useSimStore((s) => s.state.stepIndex);
  const scrubTo = useSimStore((s) => s.scrubTo);
  const resetCamera = useSimStore((s) => s.resetCamera);
  const selectItem = useSimStore((s) => s.selectItem);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          setPlaying(!isPlaying);
          break;

        case 'ArrowRight':
          e.preventDefault();
          scrubTo((stepIndex + 1) % 96);
          break;

        case 'ArrowLeft':
          e.preventDefault();
          scrubTo((stepIndex + 95) % 96);
          break;

        case 'KeyR':
          e.preventDefault();
          resetCamera();
          break;

        case 'Escape':
          e.preventDefault();
          selectItem(null);
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, setPlaying, stepIndex, scrubTo, resetCamera, selectItem]);
}
