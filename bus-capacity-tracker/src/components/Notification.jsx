export default function Notification({ notification, currentTheme }) {
  if (!notification) return null;
  return (
    <div className={`${currentTheme.secondary} border-l-4 ${currentTheme.primary} p-4 rounded-lg mb-6 animate-pulse`}>
      <p className="font-medium">{notification}</p>
    </div>
  );
}
