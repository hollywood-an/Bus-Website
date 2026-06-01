import { Award } from 'lucide-react';
import OSULogo from '../OSU.png';

export default function Header({ currentTheme, userPoints }) {
  return (
    <div className={`${currentTheme.primary} ${currentTheme.textColor} rounded-2xl shadow-lg p-6 mb-6`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={OSULogo} width="40" height="40" alt="OSU Logo" />
          <div>
            <h1 className="text-2xl font-bold text-gray-200">OSU Commute Page</h1>
            <p className="text-sm text-gray-200 opacity-90">Crowdsourced capacity reports</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white bg-opacity-20 rounded-lg px-4 py-2">
          <Award size={24} />
          <span className="text-xl font-bold">{userPoints}</span>
        </div>
      </div>
    </div>
  );
}
