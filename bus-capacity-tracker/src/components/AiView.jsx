import { MessageCircle, Send } from 'lucide-react';
import TripMap from './TripMap';

export default function AiView({
  chatMessages,
  chatInput,
  setChatInput,
  isAiThinking,
  sendMessage,
  currentTheme,
  pendingConfirm,
  confirmPending,
  cancelPending,
  trip,
}) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col h-[600px]">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <MessageCircle size={24} />
        Best Route AI Assistant
      </h2>
      <p className="text-sm text-gray-600 mb-4">Ask me about the best bus routes, capacity info, or travel tips!</p>

      {trip && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-500 mb-1">
            Options — {trip.from?.name} → {trip.to?.name}
          </p>
          <TripMap geometry={trip} />
        </div>
      )}

      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {chatMessages.length === 0 ? (
          <div className="text-center text-gray-400 mt-12">
            <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
            <p>Start a conversation! Ask me anything about bus routes.</p>
            <div className="mt-6 text-sm text-left max-w-md mx-auto space-y-2">
              <p className="font-semibold text-gray-600">Try asking:</p>
              <ul className="list-disc list-inside text-gray-500 space-y-1">
                <li>"Which bus is least crowded right now?"</li>
                <li>"What buses should I avoid?"</li>
                <li>"What's the fastest route downtown?"</li>
              </ul>
            </div>
          </div>
        ) : (
          chatMessages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-lg ${
                msg.role === 'user'
                  ? `${currentTheme.primary} ${currentTheme.textColor}`
                  : 'bg-gray-100 text-gray-800'
              }`}>
                <p className="whitespace-pre-line">{msg.content}</p>
              </div>
            </div>
          ))
        )}
        {isAiThinking && chatMessages[chatMessages.length - 1]?.role !== 'assistant' && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-800 p-3 rounded-lg">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {pendingConfirm && (
        <div className="mb-3 border-2 border-amber-300 bg-amber-50 rounded-lg p-3">
          <p className="text-sm text-gray-800 mb-2">
            Submit this report? <strong>{pendingConfirm.args.name}</strong>{' '}
            {pendingConfirm.args.kind === 'capacity' ? `— ${pendingConfirm.args.label}` : '— reported down'}{' '}
            <span className="text-gray-500">(+{pendingConfirm.args.points} pts)</span>
          </p>
          <div className="flex gap-2">
            <button
              onClick={confirmPending}
              className="bg-green-600 text-white px-3 py-1.5 rounded text-sm font-semibold hover:bg-green-700"
            >
              Confirm &amp; submit
            </button>
            <button
              onClick={cancelPending}
              className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded text-sm font-semibold hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Ask about bus routes..."
          className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
          disabled={isAiThinking}
        />
        <button
          onClick={sendMessage}
          disabled={!chatInput.trim() || isAiThinking}
          className={`${currentTheme.primary} ${currentTheme.textColor} px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}
