import { useState } from 'react';
import { OSU_BUS_ROUTES } from '../data/routes';
import { OSU_LOCATIONS } from '../data/locations';
import { ROUTE_TIMES } from '../data/routeTimes';
import { BUS_STOPS } from '../data/busStops';
import { CAPACITY_LEVELS } from '../data/capacity';
import { streamAgent } from '../lib/agentClient';

// Owns the AI chat state and the message handler.
//
// Phase 1 change: the model call moved server-side. Instead of calling OpenAI directly from the
// browser (with the key in the bundle), this streams from the Hono proxy at /api/agent. The proxy
// owns the persona prompt and the Anthropic key; the client sends only the conversation plus a
// crowdsourced capacity `context` string (transitional — reports move server-side in Phase 1.6, and
// Phase 2 replaces this prompt-stuffing with real tools). The regex `generateLocalFallback` is kept
// as the offline responder when the proxy is unreachable.
export function useChat({ busReports, busDownReports, getCapacityInfo }) {
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Build the crowdsourced status the proxy injects into the system prompt (Phase 1 parity).
  const buildContext = () => {
    const capacity = OSU_BUS_ROUTES.map((routeName) => {
      const info = getCapacityInfo(routeName);
      return info
        ? `${routeName}: ${info.level.label} (${info.level.value}/4, ${info.reportCount} reports)`
        : `${routeName}: no recent reports`;
    });
    const issues = generateContext(busReports, busDownReports);
    return [...capacity, ...issues].join('\n');
  };

  const generateContext = (reports, downReports) => {
    const context = [];

    const downBuses = Object.keys(downReports).filter((route) => {
      const validReports = downReports[route].filter((r) => r.expiresAt > Date.now());
      return validReports.length > 0;
    });
    if (downBuses.length > 0) {
      context.push(`Buses currently reported down: ${downBuses.join(', ')}`);
    }

    const busInfo = Object.keys(reports)
      .map((busId) => {
        const info = getCapacityInfo(busId);
        return info ? `${busId}: ${info.level.label}` : null;
      })
      .filter(Boolean);
    if (busInfo.length > 0) {
      context.push(`Routes with reports: ${busInfo.join(', ')}`);
    }

    return context;
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || isAiThinking) return;

    const userMessage = chatInput.trim();
    const history = [...chatMessages, { role: 'user', content: userMessage }];
    setChatMessages(history);
    setChatInput('');
    setIsAiThinking(true);

    const messages = history.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));
    const context = buildContext();

    let started = false;
    const onDelta = (_chunk, accumulated) => {
      if (!started) {
        started = true;
        setChatMessages((prev) => [...prev, { role: 'assistant', content: accumulated }]);
      } else {
        setChatMessages((prev) => {
          const copy = prev.slice();
          copy[copy.length - 1] = { role: 'assistant', content: accumulated };
          return copy;
        });
      }
    };

    try {
      await streamAgent({ messages, context }, onDelta);
      if (!started) {
        // Connected but produced no text — fall back rather than show an empty bubble.
        setChatMessages((prev) => [...prev, { role: 'assistant', content: generateLocalFallback(userMessage) }]);
      }
    } catch (error) {
      console.error('Agent error:', error?.message ?? error);
      const fallback = generateLocalFallback(userMessage);
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `${fallback}\n\n_(Live assistant unavailable right now — this is an offline answer.)_`,
        },
      ]);
    } finally {
      setIsAiThinking(false);
    }
  };

  const generateLocalFallback = (message) => {
    const lowerMessage = message.toLowerCase();

    // Check for down buses first
    const downBuses = Object.keys(busDownReports).filter((route) => {
      const validReports = busDownReports[route].filter((r) => r.expiresAt > Date.now());
      return validReports.length > 0;
    });

    // Check for "from X to Y" routing queries
    const fromToMatch = lowerMessage.match(/(?:from|at)\s+([a-z\s]+?)\s+(?:to|→)\s+([a-z\s]+)/i);
    if (fromToMatch || lowerMessage.includes(' to ') || lowerMessage.includes('→')) {
      let fromLocation = null;
      let toLocation = null;

      for (const loc of OSU_LOCATIONS) {
        if (lowerMessage.includes(loc.toLowerCase())) {
          if (!fromLocation) fromLocation = loc;
          else if (!toLocation) toLocation = loc;
        }
      }

      if (fromLocation && toLocation && ROUTE_TIMES[fromLocation]?.[toLocation]) {
        const route = ROUTE_TIMES[fromLocation][toLocation];
        const walkTime = route.walk;
        const busTime = route.bus;
        const scooterTime = Math.ceil(walkTime / 5);

        const routeStopCounts = {
          'Buckeye Express': BUS_STOPS['BE']?.length || 13,
          'Campus Connector': BUS_STOPS['CC']?.length || 21,
          'Campus Loop South': BUS_STOPS['CLS']?.length || 12,
          'East Residential': BUS_STOPS['ER']?.length || 8,
          'Medical Center': BUS_STOPS['MC']?.length || 6,
          'Northwest Connector': BUS_STOPS['NWC']?.length || 8,
        };

        let response = `From ${fromLocation} to ${toLocation}:\n\n`;

        if (busTime) {
          route.routes.forEach((routeName, idx) => {
            const stopCount = routeStopCounts[routeName] || '?';
            response += `Bus ${idx > 0 ? 'Option ' + (idx + 1) : ''}: ${routeName} (${stopCount} stops) - ~${busTime} min\n`;
            const routeInfo = getCapacityInfo(routeName);
            if (routeInfo) {
              response += `   ${routeName} is currently ${routeInfo.level.label}\n`;
            } else {
              response += `   No recent capacity reports\n`;
            }
          });
          response += '\n';
        }

        response += `Walking: ${walkTime} minutes\n`;
        response += `Scooter (Veo/Spin): ~${scooterTime} minutes\n\n`;

        if (busTime && walkTime - busTime >= 5) {
          response += `The bus saves you ${walkTime - busTime} minutes. `;
          const firstRoute = route.routes[0];
          const routeInfo = getCapacityInfo(firstRoute);
          if (routeInfo && routeInfo.level.value >= 3) {
            response += `But the ${firstRoute} is crowded right now (${routeInfo.level.label}) — consider a scooter or the next bus.`;
          } else if (routeInfo) {
            response += `The ${firstRoute} is ${routeInfo.level.label.toLowerCase()}, so it's a solid choice.`;
          } else {
            response += `Take the bus.`;
          }
        } else if (busTime) {
          response += `The time difference is small — walking or a scooter is about as fast.`;
        } else {
          response += `No direct bus route. ${walkTime > 12 ? 'Grab a Veo/Spin scooter' : 'Just walk'} for this trip.`;
        }

        return response;
      } else if (fromLocation && toLocation) {
        return `I found ${fromLocation} and ${toLocation}, but I don't have route data for that pair. Try the Route Planner tab.`;
      } else if (lowerMessage.includes(' to ')) {
        return `I couldn't identify the locations. Try: "How do I get from Thompson to Ohio Union?"`;
      }
    }

    if (lowerMessage.includes('down') || lowerMessage.includes('not running') || lowerMessage.includes('broken')) {
      if (downBuses.length > 0) {
        return `Currently reported down: ${downBuses.join(', ')}. Try an alternative route or check back later.`;
      }
      return `No buses are reported down right now — routes should be running normally.`;
    }

    if (lowerMessage.includes('least crowded') || lowerMessage.includes('empty') || lowerMessage.includes('comfortable')) {
      const busesWithCapacity = OSU_BUS_ROUTES.map((route) => {
        const info = getCapacityInfo(route);
        return { name: route, capacity: info ? info.level.value : 999 };
      }).filter((b) => b.capacity !== 999);

      if (busesWithCapacity.length > 0) {
        const leastCrowded = busesWithCapacity.reduce((min, bus) => (bus.capacity < min.capacity ? bus : min));
        const level = CAPACITY_LEVELS[leastCrowded.capacity];
        return `The ${leastCrowded.name} is the least crowded right now — ${level.label}. Good bet for a comfortable ride.`;
      }
      return `No recent capacity reports. Report a bus to help others out.`;
    }

    if (lowerMessage.includes('most crowded') || lowerMessage.includes('avoid') || lowerMessage.includes('full') || lowerMessage.includes('busy')) {
      const busesWithCapacity = OSU_BUS_ROUTES.map((route) => {
        const info = getCapacityInfo(route);
        return { name: route, capacity: info ? info.level.value : -1 };
      }).filter((b) => b.capacity !== -1);

      if (busesWithCapacity.length > 0) {
        const mostCrowded = busesWithCapacity.reduce((max, bus) => (bus.capacity > max.capacity ? bus : max));
        const level = CAPACITY_LEVELS[mostCrowded.capacity];
        return `Avoid the ${mostCrowded.name} for now — it's ${level.label}. Wait for the next one or try another route.`;
      }
      return `No recent capacity reports. Report a bus to help others out.`;
    }

    if (lowerMessage.includes('route') || lowerMessage.includes('where') || lowerMessage.includes('go to') || lowerMessage.includes('get to')) {
      const routesList = OSU_BUS_ROUTES.map((route) => {
        const info = getCapacityInfo(route);
        const isDown = downBuses.includes(route);
        return `${route}${info ? ` - ${info.level.label}` : ' - no reports'}${isDown ? ' (DOWN)' : ''}`;
      }).join('\n');

      return `Here are the OSU bus routes:\n\n${routesList}\n\n${downBuses.length > 0 ? `Note: ${downBuses.join(', ')} currently down.\n\n` : ''}Where are you trying to get?`;
    }

    if (lowerMessage.includes('help') || lowerMessage.includes('what can') || lowerMessage.includes('how')) {
      return `I can help with: least/most crowded buses, which buses are down, best route between two campus spots, and travel-time comparisons. What do you need?`;
    }

    const mentionedBus = OSU_BUS_ROUTES.find((route) => lowerMessage.includes(route.toLowerCase()));
    if (mentionedBus) {
      const isDown = downBuses.includes(mentionedBus);
      if (isDown) {
        return `The ${mentionedBus} is reported down right now. Try an alternative route or check back later.`;
      }
      const info = getCapacityInfo(mentionedBus);
      if (info) {
        const level = info.level;
        return `The ${mentionedBus} is currently ${level.label.toLowerCase()}. ${
          info.level.value <= 1
            ? 'Comfortable ride.'
            : info.level.value === 2
              ? "Getting busy but manageable."
              : info.level.value === 3
                ? 'Pretty crowded — you might wait for the next one.'
                : 'Very full — consider waiting or another route.'
        }`;
      }
      return `No recent capacity reports for the ${mentionedBus}. Report it to help others.`;
    }

    const busOverview = OSU_BUS_ROUTES.map((route) => {
      const info = getCapacityInfo(route);
      const isDown = downBuses.includes(route);
      return `${route}: ${isDown ? 'DOWN' : info ? info.level.label : 'no reports'}`;
    }).join('\n');

    let downWarning = '';
    if (downBuses.length > 0) {
      downWarning = `\n\nNote: ${downBuses.join(', ')} currently not running.`;
    }

    return `Current bus status:\n\n${busOverview}\n\nI can find the best route, flag crowded buses, or check which are running. What do you need?${downWarning}`;
  };

  return { chatMessages, chatInput, setChatInput, isAiThinking, sendMessage };
}
