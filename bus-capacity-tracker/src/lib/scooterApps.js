// Where "grab a scooter" actually sends you. Veo and Spin run the shared fleets around campus; when the
// planner or assistant lands on the scooter mode, these are the two apps that unlock one.
//
// Link choice, deliberately boring: on a phone we open the provider's App Store / Play Store page — if
// the app is installed the store shows "Open" (one tap in), if not the rider can install it, so it's
// never a dead end. Custom URL schemes (veo://, spin://) are undocumented and fail ugly when the app is
// missing, so we don't attempt them. On desktop, the provider websites.
// Logos: veo-logo.png is Veo's own published wordmark (veoride.com); spin-logo.png is the Spin logomark
// from Wikimedia Commons ("SpinLogomark-Orange.png", CC BY-SA 4.0). Brand colors are faithful vivid
// approximations of each company's signature color (neither publishes official hex values).
import veoLogo from '../assets/veo-logo.png';
import spinLogo from '../assets/spin-logo.png';

const PROVIDERS = [
  {
    name: 'Veo',
    logo: veoLogo,
    color: '#00C2B3', // Veo teal
    web: 'https://www.veoride.com/',
    ios: 'https://apps.apple.com/us/app/veo/id1279820696',
    android: 'https://play.google.com/store/apps/details?id=com.pgt.veoride',
  },
  {
    name: 'Spin',
    logo: spinLogo,
    color: '#FF5436', // Spin orange
    web: 'https://www.spin.app/',
    ios: 'https://apps.apple.com/us/app/spin-electric-scooters/id1241808993',
    android: 'https://play.google.com/store/apps/details?id=pm.spin',
  },
];

function platform() {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'android';
  // iPadOS reports as "MacIntel" but is the only Mac with a multi-touch screen.
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
  return 'web';
}

// Resolved at call time (not module load) so DevTools device emulation behaves during dev.
export function scooterLinks() {
  const p = platform();
  return PROVIDERS.map(({ name, logo, color, ...urls }) => ({ name, logo, color, href: urls[p] ?? urls.web }));
}
