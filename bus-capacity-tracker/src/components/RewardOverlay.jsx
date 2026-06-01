import { Check } from 'lucide-react';

// A brief scarlet confirmation after a successful report (replaces the bouncing trophy).
export default function RewardOverlay({ showReward }) {
  if (!showReward) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center">
      <div className="animate-pop grid h-20 w-20 place-items-center rounded-full bg-scarlet text-white shadow-float">
        <Check size={40} strokeWidth={3} />
      </div>
    </div>
  );
}
