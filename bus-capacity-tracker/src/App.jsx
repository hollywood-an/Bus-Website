import React, { useState, useEffect } from 'react';
import { Bus, Users, TrendingUp, Award, Palette, MessageCircle, Send } from 'lucide-react';

const CAPACITY_LEVELS = [
  { label: 'Empty', value: 0, color: 'bg-green-500', textColor: 'text-green-700', icon: '😊' },
  { label: 'Few Seats', value: 1, color: 'bg-blue-500', textColor: 'text-blue-700', icon: '🙂' },
  { label: 'Filling Up', value: 2, color: 'bg-yellow-500', textColor: 'text-yellow-700', icon: '😐' },
  { label: 'Crowded', value: 3, color: 'bg-orange-500', textColor: 'text-orange-700', icon: '😬' },
  { label: 'Very Full', value: 4, color: 'bg-red-500', textColor: 'text-red-700', icon: '😰' }
];

const OSU_BUS_ROUTES = [
  'Buckeye Express',
  'Campus Connector',
  'Campus Loop South',
  'East Residential',
  'Medical Center',
  'Northwest Connector',
  'Wexner Medical Center Shuttle'
];

const THEME_COLORS = [
  { name: 'Default Blue', points: 0, primary: 'bg-blue-600', secondary: 'bg-blue-100' },
  { name: 'Forest Green', points: 5, primary: 'bg-green-600', secondary: 'bg-green-100' },
  { name: 'Sunset Orange', points: 10, primary: 'bg-orange-600', secondary: 'bg-orange-100' },
  { name: 'Royal Purple', points: 15, primary: 'bg-purple-600', secondary: 'bg-purple-100' },
  { name: 'Hot Pink', points: 20, primary: 'bg-pink-600', secondary: 'bg-pink-100' },
  { name: 'Turquoise', points: 30, primary: 'bg-teal-600', secondary: 'bg-teal-100' },
  { name: 'Golden Hour', points: 40, primary: 'bg-amber-600', secondary: 'bg-amber-100' },
  { name: 'Midnight', points: 50, primary: 'bg-indigo-900', secondary: 'bg-indigo-100' }
];

export default function BusCapacityTracker() {
  const [busReports, setBusReports] = useState({});
  const [userPoints, setUserPoints] = useState(0);
  const [selectedTheme, setSelectedTheme] = useState(0);
  const [view, setView] = useState('check');
  const [checkBusId, setCheckBusId] = useState('');
  const [checkStop, setCheckStop] = useState('');
  const [reportBusId, setReportBusId] = useState('');
  const [reportCapacity, setReportCapacity] = useState(2);
  const [showReward, setShowReward] = useState(false);
  const [notification, setNotification] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [downBusRoute, setDownBusRoute] = useState('');
  const [busDownReports, setBusDownReports] = useState({});

  useEffect(() => {
    const loadData = async () => {
      try {
        const reportsResult = await window.storage.get('bus-reports');
        const pointsResult = await window.storage.get('user-points');
        const themeResult = await window.storage.get('selected-theme');
        const downReportsResult = await window.storage.get('bus-down-reports');
       
        if (reportsResult?.value) {
          setBusReports(JSON.parse(reportsResult.value));
        }
        if (pointsResult?.value) {
          setUserPoints(parseInt(pointsResult.value));
        }
        if (themeResult?.value) {
          setSelectedTheme(parseInt(themeResult.value));
        }
        if (downReportsResult?.value) {
          setBusDownReports(JSON.parse(downReportsResult.value));
        }
      } catch (error) {
        console.log('First time loading app');
      }
    };
    loadData();
  }, []);

  const saveData = async (reports, points, theme, downReports = busDownReports) => {
    try {
      await window.storage.set('bus-reports', JSON.stringify(reports));
      await window.storage.set('user-points', points.toString());
      await window.storage.set('selected-theme', theme.toString());
      await window.storage.set('bus-down-reports', JSON.stringify(downReports));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  const handleReport = async () => {
    if (!reportBusId.trim()) return;

    const timestamp = Date.now();
    const newReports = { ...busReports };
   
    if (!newReports[reportBusId]) {
      newReports[reportBusId] = [];
    }
   
    newReports[reportBusId].push({
      capacity: reportCapacity,
      timestamp,
      expiresAt: timestamp + (30 * 60 * 1000)
    });

    Object.keys(newReports).forEach(busId => {
      newReports[busId] = newReports[busId].filter(r => r.expiresAt > timestamp);
      if (newReports[busId].length === 0) {
        delete newReports[busId];
      }
    });

    const newPoints = userPoints + 1;
    setBusReports(newReports);
    setUserPoints(newPoints);
    await saveData(newReports, newPoints, selectedTheme);
   
    setReportBusId('');
    setReportCapacity(2);
    setShowReward(true);
    setNotification(`Report submitted! +1 point (Total: ${newPoints})`);
   
    setTimeout(() => {
      setShowReward(false);
      setNotification('');
    }, 3000);
  };

  const handleBusDownReport = async () => {
    if (!downBusRoute.trim()) return;

    const timestamp = Date.now();
    const newDownReports = { ...busDownReports };
    
    if (!newDownReports[downBusRoute]) {
      newDownReports[downBusRoute] = [];
    }
    
    newDownReports[downBusRoute].push({
      timestamp,
      expiresAt: timestamp + (60 * 60 * 1000)
    });

    Object.keys(newDownReports).forEach(route => {
      newDownReports[route] = newDownReports[route].filter(r => r.expiresAt > timestamp);
      if (newDownReports[route].length === 0) {
        delete newDownReports[route];
      }
    });

    const newPoints = userPoints + 2;
    setBusDownReports(newDownReports);
    setUserPoints(newPoints);
    await saveData(busReports, newPoints, selectedTheme, newDownReports);
    
    setDownBusRoute('');
    setShowReward(true);
    setNotification(`Bus down report submitted! +2 points (Total: ${newPoints}) 🚨`);
    
    setTimeout(() => {
      setShowReward(false);
      setNotification('');
    }, 3000);
  };

  const handleCheck = () => {
    if (!checkBusId.trim()) return;
   
    const reports = busReports[checkBusId] || [];
    const validReports = reports.filter(r => r.expiresAt > Date.now());
   
    if (validReports.length === 0) {
      setNotification(`No recent reports for ${checkBusId}`);
    } else {
      const avgCapacity = Math.round(
        validReports.reduce((sum, r) => sum + r.capacity, 0) / validReports.length
      );
      const level = CAPACITY_LEVELS[avgCapacity];
      setNotification(`${checkBusId}: ${level.label} ${level.icon} (${validReports.length} recent reports)`);
    }
   
    setTimeout(() => setNotification(''), 5000);
  };

  const getCapacityInfo = (busId) => {
    const reports = busReports[busId] || [];
    const validReports = reports.filter(r => r.expiresAt > Date.now());
   
    if (validReports.length === 0) return null;
   
    const avgCapacity = Math.round(
      validReports.reduce((sum, r) => sum + r.capacity, 0) / validReports.length
    );
   
    return {
      level: CAPACITY_LEVELS[avgCapacity],
      reportCount: validReports.length
    };
  };

  const handleThemeChange = async (index) => {
    setSelectedTheme(index);
    await saveData(busReports, userPoints, index);
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage = { role: 'user', content: chatInput };
    const newMessages = [...chatMessages, userMessage];
    const messageToSend = chatInput;
    
    setChatMessages(newMessages);
    setChatInput('');
    setIsAiThinking(true);

    try {
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageToSend,
          temperature: 0.7,
          context: generateContext(busReports, busDownReports)
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let buffer = '';

      const assistantMsg = { role: 'assistant', content: '' };
      setChatMessages([...newMessages, assistantMsg]);
      setIsAiThinking(false);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || '';
              if (content) {
                fullResponse += content;
                setChatMessages([...newMessages, { role: 'assistant', content: fullResponse }]);
              }
            } catch (e) {
              console.error('Parse error:', e, 'Data:', data);
            }
          }
        }
      }

    } catch (error) {
      console.error('Error:', error);
      setIsAiThinking(false);
      const errorMessage = `Sorry, I encountered an error: ${error.message}. Make sure the backend server is running on port 8000.`;
      setChatMessages([...newMessages, { role: 'assistant', content: errorMessage }]);
    }
  };

  const generateContext = (reports, downReports) => {
    const context = [];
    
    // Add down buses
    const downBuses = Object.keys(downReports).filter(route => {
      const validReports = downReports[route].filter(r => r.expiresAt > Date.now());
      return validReports.length > 0;
    });
    if (downBuses.length > 0) {
      context.push(`Buses currently down: ${downBuses.join(', ')}`);
    }

    // Add capacity info
    const busInfo = Object.keys(reports).map(busId => {
      const info = getCapacityInfo(busId);
      return info ? `${busId}: ${info.level.label}` : null;
    }).filter(Boolean);
    
    if (busInfo.length > 0) {
      context.push(`Current bus capacity levels: ${busInfo.join(', ')}`);
    }

    return context;
  };

  const currentTheme = THEME_COLORS[selectedTheme];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className={`${currentTheme.primary} text-white rounded-2xl shadow-lg p-6 mb-6`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bus size={32} />
              <div>
                <h1 className="text-2xl font-bold">OSU Bus Tracker</h1>
                <p className="text-sm opacity-90">Crowdsourced capacity reports</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white bg-opacity-20 rounded-lg px-4 py-2">
              <Award size={24} />
              <span className="text-xl font-bold">{userPoints}</span>
            </div>
          </div>
        </div>

        {notification && (
          <div className={`${currentTheme.secondary} border-l-4 ${currentTheme.primary} p-4 rounded-lg mb-6 animate-pulse`}>
            <p className="font-medium">{notification}</p>
          </div>
        )}

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setView('check')}
            className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
              view === 'check'
                ? `${currentTheme.primary} text-white shadow-lg`
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Check Bus Status
          </button>
          <button
            onClick={() => setView('report')}
            className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
              view === 'report'
                ? `${currentTheme.primary} text-white shadow-lg`
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Report
          </button>
          <button
            onClick={() => setView('ai')}
            className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
              view === 'ai'
                ? `${currentTheme.primary} text-white shadow-lg`
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <MessageCircle className="inline mr-2" size={20} />
            Best Route AI
          </button>
          <button
            onClick={() => setView('rewards')}
            className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
              view === 'rewards'
                ? `${currentTheme.primary} text-white shadow-lg`
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Palette className="inline mr-2" size={20} />
            Themes
          </button>
        </div>

        {view === 'check' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <TrendingUp size={24} />
              Check Bus Capacity
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Bus Route</label>
                <select
                  value={checkBusId}
                  onChange={(e) => setCheckBusId(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Select a bus route...</option>
                  {OSU_BUS_ROUTES.map((route) => (
                    <option key={route} value={route}>{route}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Your Stop (optional)</label>
                <input
                  type="text"
                  value={checkStop}
                  onChange={(e) => setCheckStop(e.target.value)}
                  placeholder="e.g., Main St, Station 5"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>
              <button
                onClick={handleCheck}
                className={`w-full ${currentTheme.primary} text-white py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity`}
              >
                Check Status
              </button>
            </div>

            <div className="mt-6">
              <h3 className="font-semibold mb-3">Recent Reports</h3>
              <div className="space-y-2">
                {Object.keys(busReports).length === 0 && Object.keys(busDownReports).length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No reports yet. Be the first to report!</p>
                ) : (
                  <>
                    {Object.keys(busDownReports).map(route => {
                      const validReports = busDownReports[route].filter(r => r.expiresAt > Date.now());
                      if (validReports.length === 0) return null;
                      return (
                        <div key={`down-${route}`} className="bg-red-50 border-l-4 border-red-500 p-3 rounded">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold">{route}</span>
                            <span className="text-red-700 font-medium flex items-center gap-2">
                              🚨 Bus Down
                              <span className="text-xs text-gray-600">({validReports.length} report{validReports.length !== 1 ? 's' : ''})</span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {Object.keys(busReports).map(busId => {
                      const info = getCapacityInfo(busId);
                      if (!info) return null;
                      return (
                        <div key={busId} className={`${info.level.color} bg-opacity-10 border-l-4 ${info.level.color} p-3 rounded`}>
                          <div className="flex justify-between items-center">
                            <span className="font-semibold">{busId}</span>
                            <span className={`${info.level.textColor} font-medium flex items-center gap-2`}>
                              {info.level.icon} {info.level.label}
                              <span className="text-xs text-gray-600">({info.reportCount} reports)</span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {view === 'report' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-red-600">
                <Bus size={24} />
                Report Bus Down
              </h2>
              <p className="text-sm text-gray-600 mb-4">Let others know if a bus route is not running</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Bus Route</label>
                  <select
                    value={downBusRoute}
                    onChange={(e) => setDownBusRoute(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:outline-none"
                  >
                    <option value="">Select a bus route...</option>
                    {OSU_BUS_ROUTES.map((route) => (
                      <option key={route} value={route}>{route}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleBusDownReport}
                  className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
                >
                  Report Bus Down 🚨 (Earn 2 Points!)
                </button>
              </div>

              {Object.keys(busDownReports).length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h3 className="font-semibold text-sm text-red-600 mb-2">⚠️ Currently Down:</h3>
                  <div className="space-y-2">
                    {Object.keys(busDownReports).map(route => {
                      const validReports = busDownReports[route].filter(r => r.expiresAt > Date.now());
                      if (validReports.length === 0) return null;
                      return (
                        <div key={route} className="bg-red-50 border-l-4 border-red-500 p-2 rounded text-sm">
                          <span className="font-semibold">{route}</span>
                          <span className="text-gray-600 ml-2">({validReports.length} report{validReports.length !== 1 ? 's' : ''})</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Users size={24} />
                Report Current Capacity
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Bus Route</label>
                  <select
                    value={reportBusId}
                    onChange={(e) => setReportBusId(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Select a bus route...</option>
                    {OSU_BUS_ROUTES.map((route) => (
                      <option key={route} value={route}>{route}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">How full is the bus?</label>
                  <div className="space-y-2">
                    {CAPACITY_LEVELS.map((level, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setReportCapacity(idx)}
                        className={`w-full p-4 rounded-lg border-2 transition-all ${
                          reportCapacity === idx
                            ? `${level.color} border-transparent text-white`
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{level.label}</span>
                          <span className="text-2xl">{level.icon}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleReport}
                  className={`w-full ${currentTheme.primary} text-white py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity`}
                >
                  Submit Report & Earn Point! 🎉
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'ai' && (
          <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col h-[600px]">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <MessageCircle size={24} />
              Best Route AI Assistant
            </h2>
            <p className="text-sm text-gray-600 mb-4">Ask me about the best bus routes, capacity info, or travel tips!</p>
            
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
                        ? `${currentTheme.primary} text-white` 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      <p className="whitespace-pre-line">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
              {isAiThinking && (
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

            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask about bus routes..."
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                disabled={isAiThinking}
              />
              <button
                onClick={handleSendMessage}
                disabled={!chatInput.trim() || isAiThinking}
                className={`${currentTheme.primary} text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        )}

        {view === 'rewards' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Palette size={24} />
              Unlock Theme Colors
            </h2>
            <p className="text-gray-600 mb-6">Earn points by reporting bus capacity to unlock new theme colors!</p>
            <div className="grid gap-4">
              {THEME_COLORS.map((theme, idx) => {
                const unlocked = userPoints >= theme.points;
                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      unlocked ? 'cursor-pointer hover:shadow-md' : 'opacity-50'
                    } ${selectedTheme === idx ? 'border-blue-500 shadow-md' : 'border-gray-200'}`}
                    onClick={() => unlocked && handleThemeChange(idx)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full ${theme.primary}`}></div>
                        <div>
                          <p className="font-semibold">{theme.name}</p>
                          <p className="text-sm text-gray-600">
                            {unlocked ? '✓ Unlocked' : `${theme.points} points needed`}
                          </p>
                        </div>
                      </div>
                      {selectedTheme === idx && (
                        <span className="text-blue-600 font-semibold">Active</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {showReward && (
          <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
            <div className="bg-white rounded-full p-8 shadow-2xl animate-bounce">
              <Award size={64} className="text-yellow-500" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}