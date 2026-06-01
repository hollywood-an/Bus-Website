import { Award } from 'lucide-react';

export default function RewardOverlay({ showReward }) {
  if (!showReward) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
      <div className="bg-white rounded-full p-8 shadow-2xl animate-bounce">
        <Award size={64} className="text-yellow-500" />
      </div>
    </div>
  );
}
