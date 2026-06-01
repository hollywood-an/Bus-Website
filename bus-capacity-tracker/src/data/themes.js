// Gamification theme palette, unlocked by points. Extracted verbatim from App.jsx (Phase 0).
// NOTE: there is currently no UI to change the theme (handleThemeChange was never wired),
// so the app always renders THEME_COLORS[0] unless storage seeds another index.
export const THEME_COLORS = [
  { name: 'Scarlet', points: 0, primary: 'bg-[#BB0000]', secondary: 'bg-[#CFCFCF]', textColor: 'text-white' },
  { name: 'Gray', points: 5, primary: 'bg-[#666666]', secondary: 'bg-[#CFCFCF]', textColor: 'text-white' },
  { name: 'Carmen Gold', points: 10, primary: 'bg-[#EAAA00]', secondary: 'bg-[#CFCFCF]', textColor: 'text-black' },
  { name: 'Buckeye Leaf', points: 15, primary: 'bg-[#666633]', secondary: 'bg-[#CFCFCF]', textColor: 'text-white' },
  { name: 'Midnight Black', points: 20, primary: 'bg-[#000000]', secondary: 'bg-[#CFCFCF]', textColor: 'text-white' },
  { name: 'Scarlet & Gray', points: 30, primary: 'bg-gradient-to-r from-[#BB0000] to-[#666666]', secondary: 'bg-[#CFCFCF]', textColor: 'text-white' },
  { name: 'Carmen & Scarlet', points: 40, primary: 'bg-gradient-to-r from-[#EAAA00] to-[#BB0000]', secondary: 'bg-[#CFCFCF]', textColor: 'text-white' },
  { name: 'Buckeye Pride', points: 50, primary: 'bg-gradient-to-r from-[#BB0000] via-[#666666] to-[#EAAA00]', secondary: 'bg-[#CFCFCF]', textColor: 'text-white' }
];
