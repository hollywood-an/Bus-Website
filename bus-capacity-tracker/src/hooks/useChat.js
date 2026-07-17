import { useState } from 'react';
import { OSU_BUS_ROUTES } from '../data/routes';
import { OSU_LOCATIONS } from '../data/locations';
import { ROUTE_TIMES } from '../data/routeTimes';
import { BUS_STOPS } from '../data/busStops';
import { streamAgent } from '../lib/agentClient';

let msgSeq = 0; // uniquifies streamed-bubble ids within a session

// Streams the agent's reply from the proxy. As of Phase 1.6 the client no longer sends any app
// state: crowding/down context is read server-side from the report store, so the request carries
// only the conversation. `generateLocalFallback` remains the offline responder (uses static route
// data + the live aggregates passed in) for when the proxy is unreachable.
export function useChat({ getCapacityInfo, down, nameForCode, submitCapacityReport, submitBusDownReport, onUiDirective }) {
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState(null); // { action, args } proposed write awaiting confirm

  const confirmedDownNames = () => (down ?? []).filter((d) => d.confirmed).map((d) => nameForCode(d.route));

  // The agent proposes writes via a `confirm` directive; we surface a confirm card instead of writing.
  const handleAgentEvent = (evt) => {
    if (evt?.type === 'confirm') {
      setPendingConfirm({ action: evt.action, args: evt.args || {} });
    } else if (evt?.type === 'ui_directive') {
      if (evt.action === 'show_trip') {
        // Drop the trip map into the conversation, under the question that triggered it.
        setChatMessages((prev) => [...prev, { role: 'trip', trip: evt.args }]);
      } else {
        onUiDirective?.(evt); // focus the campus map / highlight stops (App switches that view)
      }
    }
  };

  const confirmPending = async () => {
    const p = pendingConfirm;
    if (!p) return;
    setPendingConfirm(null);
    try {
      if (p.action === 'submit_capacity_report') await submitCapacityReport(p.args.route, p.args.level);
      else await submitBusDownReport(p.args.route);
      const what = p.args.kind === 'capacity' ? `as "${p.args.label}"` : 'as down';
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Done. Reported ${p.args.name} ${what}. Thanks for keeping it fresh for everyone.` },
      ]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: "That didn't go through. Try again from the Report tab." },
      ]);
    }
  };

  const cancelPending = () => {
    if (!pendingConfirm) return;
    setPendingConfirm(null);
    setChatMessages((prev) => [...prev, { role: 'assistant', content: "No problem, I didn't submit anything." }]);
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || isAiThinking) return;

    const userMessage = chatInput.trim();
    const history = [...chatMessages, { role: 'user', content: userMessage }];
    setChatMessages(history);
    setChatInput('');
    setIsAiThinking(true);

    const messages = history
      .filter((m) => m.role === 'user' || m.role === 'assistant') // skip inline trip-map entries
      .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));

    // Each agent turn streams into its own bubble, addressed by id — never "the last message" — so
    // a trip map appended mid-stream is never overwritten by the next text delta. A map also closes
    // the current bubble: the text that follows starts fresh beneath it, Google-Maps style.
    let received = false;
    let bubbleId = null;
    let bubbleText = '';
    const onDelta = (chunk) => {
      received = true;
      if (bubbleId === null) {
        bubbleId = `stream-${Date.now()}-${msgSeq++}`;
        bubbleText = '';
      }
      bubbleText += chunk;
      const id = bubbleId;
      const content = bubbleText;
      setChatMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === id);
        if (idx === -1) return [...prev, { id, role: 'assistant', content }];
        const copy = prev.slice();
        copy[idx] = { ...copy[idx], content };
        return copy;
      });
    };
    const onEvent = (evt) => {
      if (evt?.type === 'ui_directive' && evt.action === 'show_trip') {
        bubbleId = null; // the map lands after this bubble; the next delta opens a new one
      }
      handleAgentEvent(evt);
    };

    try {
      await streamAgent({ messages, onDelta, onEvent });
      if (!received) {
        setChatMessages((prev) => [...prev, { role: 'assistant', content: generateLocalFallback(userMessage) }]);
      }
    } catch (error) {
      console.error('Agent error:', error?.message ?? error);
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `${generateLocalFallback(userMessage)}\n\n_(Live assistant unavailable right now; this is an offline answer.)_`,
        },
      ]);
    } finally {
      setIsAiThinking(false);
    }
  };

  const generateLocalFallback = (message) => {
    const lowerMessage = message.toLowerCase();
    const downBuses = confirmedDownNames();

    // "from X to Y" routing using static walk/bus times (works fully offline).
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
            response += routeInfo
              ? `   ${routeName} is currently ${routeInfo.level.label}\n`
              : `   No recent capacity reports\n`;
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
            response += `But the ${firstRoute} is crowded right now (${routeInfo.level.label}); consider a scooter or the next bus.`;
          } else if (routeInfo) {
            response += `The ${firstRoute} is ${routeInfo.level.label.toLowerCase()}, so it's a solid choice.`;
          } else {
            response += `Take the bus.`;
          }
        } else if (busTime) {
          response += `The time difference is small, so walking or a scooter is about as fast.`;
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
      return downBuses.length > 0
        ? `Currently reported down: ${downBuses.join(', ')}. Try an alternative route or check back later.`
        : `No buses are confirmed down right now; routes should be running normally.`;
    }

    if (lowerMessage.includes('least crowded') || lowerMessage.includes('empty') || lowerMessage.includes('comfortable')) {
      const withInfo = OSU_BUS_ROUTES.map((r) => ({ name: r, info: getCapacityInfo(r) })).filter((x) => x.info);
      if (withInfo.length > 0) {
        const least = withInfo.reduce((min, x) => (x.info.level.value < min.info.level.value ? x : min));
        return `The ${least.name} is the least crowded right now: ${least.info.level.label}. Good bet for a comfortable ride.`;
      }
      return `No recent capacity reports. Report a bus to help others out.`;
    }

    if (lowerMessage.includes('most crowded') || lowerMessage.includes('avoid') || lowerMessage.includes('full') || lowerMessage.includes('busy')) {
      const withInfo = OSU_BUS_ROUTES.map((r) => ({ name: r, info: getCapacityInfo(r) })).filter((x) => x.info);
      if (withInfo.length > 0) {
        const most = withInfo.reduce((max, x) => (x.info.level.value > max.info.level.value ? x : max));
        return `Avoid the ${most.name} for now: it's ${most.info.level.label}. Wait for the next one or try another route.`;
      }
      return `No recent capacity reports. Report a bus to help others out.`;
    }

    if (lowerMessage.includes('route') || lowerMessage.includes('where') || lowerMessage.includes('go to') || lowerMessage.includes('get to')) {
      const list = OSU_BUS_ROUTES.map((r) => {
        const info = getCapacityInfo(r);
        const isDown = downBuses.includes(r);
        return `${r}${info ? ` - ${info.level.label}` : ' - no reports'}${isDown ? ' (DOWN)' : ''}`;
      }).join('\n');
      return `Here are the OSU bus routes:\n\n${list}\n\n${downBuses.length > 0 ? `Note: ${downBuses.join(', ')} currently down.\n\n` : ''}Where are you trying to get?`;
    }

    if (lowerMessage.includes('help') || lowerMessage.includes('what can') || lowerMessage.includes('how')) {
      return `I can help with: least/most crowded buses, which buses are down, the best route between two campus spots, and travel-time comparisons. What do you need?`;
    }

    const mentioned = OSU_BUS_ROUTES.find((r) => lowerMessage.includes(r.toLowerCase()));
    if (mentioned) {
      if (downBuses.includes(mentioned)) {
        return `The ${mentioned} is reported down right now. Try an alternative route or check back later.`;
      }
      const info = getCapacityInfo(mentioned);
      if (info) {
        return `The ${mentioned} is currently ${info.level.label.toLowerCase()}. ${
          info.level.value <= 1
            ? 'Comfortable ride.'
            : info.level.value === 2
              ? 'Getting busy but manageable.'
              : info.level.value === 3
                ? 'Pretty crowded; you might wait for the next one.'
                : 'Very full; consider waiting or another route.'
        }`;
      }
      return `No recent capacity reports for the ${mentioned}. Report it to help others.`;
    }

    const overview = OSU_BUS_ROUTES.map((r) => {
      const info = getCapacityInfo(r);
      const isDown = downBuses.includes(r);
      return `${r}: ${isDown ? 'DOWN' : info ? info.level.label : 'no reports'}`;
    }).join('\n');
    const warning = downBuses.length > 0 ? `\n\nNote: ${downBuses.join(', ')} currently not running.` : '';
    return `Current bus status:\n\n${overview}\n\nI can find the best route, flag crowded buses, or check which are running. What do you need?${warning}`;
  };

  return { chatMessages, chatInput, setChatInput, isAiThinking, sendMessage, pendingConfirm, confirmPending, cancelPending };
}
