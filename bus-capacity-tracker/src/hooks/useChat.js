import { useState } from 'react';
import { OSU_BUS_ROUTES } from '../data/routes';
import { OSU_LOCATIONS } from '../data/locations';
import { ROUTE_TIMES } from '../data/routeTimes';
import { BUS_STOPS } from '../data/busStops';
import { CAPACITY_LEVELS } from '../data/capacity';

// Owns the AI chat state and the message handler. Logic is preserved verbatim from the
// original App.jsx (Phase 0): it stuffs all current state into a system prompt and calls
// OpenAI directly from the browser, with a regex-based local fallback.
//
// KNOWN ISSUES (addressed in later phases): the OpenAI key ships in the client bundle
// (Phase 1 moves the call behind a Claude proxy) and the model takes no actions / fetches
// nothing on demand (Phase 2 makes it a tool-using agent).
export function useChat({ busReports, busDownReports, getCapacityInfo }) {
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);

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

  const generateLocalFallback = (message) => {
    const lowerMessage = message.toLowerCase();

    // Check for down buses first
    const downBuses = Object.keys(busDownReports).filter(route => {
      const validReports = busDownReports[route].filter(r => r.expiresAt > Date.now());
      return validReports.length > 0;
    });

    // Check for "from X to Y" routing queries
    const fromToMatch = lowerMessage.match(/(?:from|at)\s+([a-z\s]+?)\s+(?:to|→)\s+([a-z\s]+)/i);
    if (fromToMatch || lowerMessage.includes(' to ') || lowerMessage.includes('→')) {
      // Try to find location names in the message
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
        const scooterTime = Math.ceil(walkTime / 5); // Scooters ~5x faster than walking

        // Map route names to their codes for stop count
        const routeStopCounts = {
          'Buckeye Express': BUS_STOPS['BE']?.length || 13,
          'Campus Connector': BUS_STOPS['CC']?.length || 21,
          'Campus Loop South': BUS_STOPS['CLS']?.length || 12,
          'East Residential': BUS_STOPS['ER']?.length || 8,
          'Medical Center': BUS_STOPS['MC']?.length || 6,
          'Northwest Connector': BUS_STOPS['NWC']?.length || 8
        };

        let response = `From ${fromLocation} to ${toLocation}:\n\n`;

        if (busTime) {
          // Show all route options with stop counts
          route.routes.forEach((routeName, idx) => {
            const stopCount = routeStopCounts[routeName] || '?';
            response += `🚌 Bus ${idx > 0 ? 'Option ' + (idx + 1) : ''}: ${routeName} (${stopCount} stops) - ~${busTime} min\n`;

            // Check capacity of this route
            const routeInfo = getCapacityInfo(routeName);
            if (routeInfo) {
              response += `   📊 ${routeName} is currently ${routeInfo.level.label} ${routeInfo.level.icon}\n`;
            } else {
              response += `   📊 No recent capacity reports\n`;
            }
          });
          response += '\n';
        }

        response += `🚶 Walking: ${walkTime} minutes\n`;
        response += `🛴 Veo/Spin: ~${scooterTime} minutes\n\n`;

        // Add recommendation
        if (busTime && walkTime - busTime >= 5) {
          response += `💡 The bus saves you ${walkTime - busTime} minutes! `;
          const firstRoute = route.routes[0];
          const routeInfo = getCapacityInfo(firstRoute);
          if (routeInfo && routeInfo.level.value >= 3) {
            response += `But the ${firstRoute} is pretty crowded right now (${routeInfo.level.label} ${routeInfo.level.icon}). Consider a scooter or waiting for the next bus! 😊`;
          } else if (routeInfo) {
            response += `The ${firstRoute} is ${routeInfo.level.label.toLowerCase()} ${routeInfo.level.icon}, so it's a good choice! 🚌✨`;
          } else {
            response += `I'd recommend taking the bus! 🚌✨`;
          }
        } else if (busTime) {
          response += `💡 The time difference is small. Walking or a scooter might be just as fast! 🚶🛴`;
        } else {
          response += `💡 No direct bus route available. I'd suggest ${walkTime > 12 ? 'grabbing a Veo/Spin scooter 🛴' : 'walking 🚶'} for this trip!`;
        }

        return response + '\n\n🔑 Note: Add your OpenAI API key for AI-powered recommendations!';
      } else if (fromLocation && toLocation) {
        return `I found ${fromLocation} and ${toLocation}, but I don't have route data for that combination. Try the Route Planner tab! 🗺️`;
      } else if (lowerMessage.includes(' to ')) {
        return `I couldn't identify the locations. Try asking like: "How do I get from Thompson to Ohio Union?" 📍`;
      }
    }

    if (lowerMessage.includes('down') || lowerMessage.includes('not running') || lowerMessage.includes('broken')) {
      if (downBuses.length > 0) {
        return `⚠️ Currently down: ${downBuses.join(', ')}. Try alternative routes or check back later!\n\n💡 Note: Add your OpenAI API key for full AI features!`;
      } else {
        return `Good news! 🎉 No buses are reported down right now. All routes should be running normally!\n\n💡 Note: Add your OpenAI API key for full AI features!`;
      }
    }

    // Find least crowded bus
    if (lowerMessage.includes('least crowded') || lowerMessage.includes('empty') || lowerMessage.includes('comfortable')) {
      const busesWithCapacity = OSU_BUS_ROUTES.map(route => {
        const info = getCapacityInfo(route);
        return { name: route, capacity: info ? info.level.value : 999 };
      }).filter(b => b.capacity !== 999);

      if (busesWithCapacity.length > 0) {
        const leastCrowded = busesWithCapacity.reduce((min, bus) =>
          bus.capacity < min.capacity ? bus : min
        );
        const level = CAPACITY_LEVELS[leastCrowded.capacity];
        return `Hey! 🚌 The ${leastCrowded.name} is currently the least crowded with a "${level.label}" status ${level.icon}. Perfect for a comfortable ride!\n\n💡 Note: ChatGPT integration is in demo mode. Add your OpenAI API key in the code for full AI features!`;
      }
      return `I don't have recent capacity reports right now. Try reporting bus capacity to help others! 📊`;
    }

    // Find most crowded bus
    if (lowerMessage.includes('most crowded') || lowerMessage.includes('avoid') || lowerMessage.includes('full') || lowerMessage.includes('busy')) {
      const busesWithCapacity = OSU_BUS_ROUTES.map(route => {
        const info = getCapacityInfo(route);
        return { name: route, capacity: info ? info.level.value : -1 };
      }).filter(b => b.capacity !== -1);

      if (busesWithCapacity.length > 0) {
        const mostCrowded = busesWithCapacity.reduce((max, bus) =>
          bus.capacity > max.capacity ? bus : max
        );
        const level = CAPACITY_LEVELS[mostCrowded.capacity];
        return `⚠️ I'd suggest avoiding the ${mostCrowded.name} right now - it's "${level.label}" ${level.icon}. Maybe wait for the next one or try a different route!\n\n💡 Note: Add your OpenAI API key for smarter AI recommendations!`;
      }
      return `I don't have recent capacity reports right now. Try reporting bus capacity to help others! 📊`;
    }

    // Route recommendations
    if (lowerMessage.includes('route') || lowerMessage.includes('where') || lowerMessage.includes('go to') || lowerMessage.includes('get to')) {
      const routesList = OSU_BUS_ROUTES.map((route) => {
        const info = getCapacityInfo(route);
        const isDown = downBuses.includes(route);
        return `🚌 ${route}${info ? ` - ${info.level.label} ${info.level.icon}` : ' - No reports'}${isDown ? ' ⚠️ DOWN' : ''}`;
      }).join('\n');

      return `Sure! Here are all the available OSU bus routes:\n\n${routesList}\n\n${downBuses.length > 0 ? `⚠️ Note: ${downBuses.join(', ')} currently down\n\n` : ''}Which location are you trying to reach? 📍`;
    }

    // General help
    if (lowerMessage.includes('help') || lowerMessage.includes('what can') || lowerMessage.includes('how')) {
      return `Hey there! 👋 I'm your OSU bus assistant. I can help you with:\n\n✨ Finding the least crowded buses\n🚫 Buses to avoid (too crowded)\n⚠️ Checking which buses are down\n🗺️ Best routes between locations\n⏱️ Travel time estimates\n\nWhat would you like to know?\n\n💡 Tip: Add your OpenAI API key (line ~650 in code) for advanced AI features!`;
    }

    // Specific bus inquiry
    const mentionedBus = OSU_BUS_ROUTES.find(route => lowerMessage.includes(route.toLowerCase()));
    if (mentionedBus) {
      const isDown = downBuses.includes(mentionedBus);

      if (isDown) {
        return `⚠️ The ${mentionedBus} is currently reported as down/not running. Try an alternative route or check back later!`;
      }

      const info = getCapacityInfo(mentionedBus);
      if (info) {
        const level = info.level;
        return `The ${mentionedBus} is currently ${level.label.toLowerCase()} ${level.icon}. ${
          info.level.value <= 1 ? "Great choice for a comfortable ride! 😊" :
          info.level.value === 2 ? "It's getting busy but still manageable! 👍" :
          info.level.value === 3 ? "Pretty crowded - you might want to wait for the next one! 😬" :
          "Very full right now! I'd recommend waiting or trying another route. 😰"
        }`;
      }
      return `I don't have recent capacity reports for the ${mentionedBus}. Report capacity to help others! 📊`;
    }

    // Default response - give bus overview
    const busOverview = OSU_BUS_ROUTES.map(route => {
      const info = getCapacityInfo(route);
      const isDown = downBuses.includes(route);
      return `🚌 ${route}: ${isDown ? '⚠️ DOWN' : info ? `${info.level.label} ${info.level.icon}` : 'No reports'}`;
    }).join('\n');

    let downWarning = '';
    if (downBuses.length > 0) {
      downWarning = `\n\n⚠️ Note: ${downBuses.join(', ')} currently not running`;
    }

    return `Hey! Here's the current bus status:\n\n${busOverview}\n\nI can help you:\n• Find the best route\n• Avoid crowded buses\n• Check which buses are running\n\nWhat would you like to know? 😊${downWarning}\n\n💡 Tip: Add your OpenAI API key for AI-powered recommendations!`;
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || isAiThinking) return;

    const userMessage = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatInput('');
    setIsAiThinking(true);

    try {
      // Prepare context about current bus data from busReports
      const busCapacityInfo = OSU_BUS_ROUTES.map(routeName => {
        const info = getCapacityInfo(routeName);
        if (info) {
          return `${routeName}: ${info.level.label} (${info.level.value}/4)`;
        }
        return `${routeName}: No recent reports`;
      }).join('\n');

      const contextData = generateContext(busReports, busDownReports);
      const contextString = contextData.length > 0 ? contextData.join('\n') : 'No current issues reported';

      // Create a comprehensive routing guide from ROUTE_TIMES
      const createRoutingGuide = () => {
        let guide = '';
        Object.entries(ROUTE_TIMES).forEach(([from, destinations]) => {
          Object.entries(destinations).forEach(([to, info]) => {
            if (info.bus) {
              guide += `${from} → ${to}: Walk ${info.walk}min OR Bus ${info.bus}min on ${info.routes.join(' or ')}\n`;
            }
          });
        });
        return guide;
      };

      // Create route stop count reference
      const routeStopCounts = {
        'Buckeye Express': BUS_STOPS['BE']?.length || 13,
        'Campus Connector': BUS_STOPS['CC']?.length || 21,
        'Campus Loop South': BUS_STOPS['CLS']?.length || 12,
        'East Residential': BUS_STOPS['ER']?.length || 8,
        'Medical Center': BUS_STOPS['MC']?.length || 6,
        'Northwest Connector': BUS_STOPS['NWC']?.length || 8
      };

      const systemPrompt = `You are an intelligent OSU Campus Bus Assistant chatbot. Your job is to help Ohio State University students navigate the campus bus system efficiently.

⚠️ CRITICAL: The "CURRENT BUS STATUS" section below contains REAL-TIME data. ALWAYS use the capacity information provided in THIS MESSAGE, NOT from previous messages in the conversation. Capacity levels change constantly as students report updates.

CURRENT BUS STATUS (REAL-TIME - USE THIS DATA):
${busCapacityInfo}

${contextString}

AVAILABLE BUS ROUTES:
${OSU_BUS_ROUTES.join(', ')}

BUS ROUTE STOP COUNTS:
${Object.entries(routeStopCounts).map(([route, count]) => `${route}: ${count} stops`).join('\n')}

KEY CAMPUS LOCATIONS:
${OSU_LOCATIONS.join(', ')}

ROUTE INFORMATION (Walking vs Bus times):
${createRoutingGuide()}

YOUR CAPABILITIES:
1. Recommend least crowded buses for comfortable rides
2. Warn about overcrowded buses to avoid
3. Alert about any buses that are down/not running
4. Provide DETAILED route information between locations including:
   - Specific bus route to take
   - Estimated bus travel time
   - Walking time comparison
   - Veo/Spin scooter estimate (usually 1.5-2x faster than walking)
   - Bus stop names when possible
5. Provide helpful campus navigation tips
6. Consider current capacity when making recommendations

CRITICAL ROUTING INSTRUCTIONS:
When a user asks how to get from Location A to Location B, you MUST provide:
1. 🚌 Bus option: "Take the [Route Name] ([X] stops), approximately [Y] minutes"
2. 📊 Capacity status: ALWAYS check the "CURRENT BUS STATUS" section above and use the LATEST capacity level for the route - "[Route Name] is currently [capacity level] [emoji]"
3. 🚶 Walking option: "[Z] minute walk"
4. 🛴 Scooter option: "Veo/Spin scooter: ~[W] minutes (about 1/5 of walking time, so 5x faster)"
5. 💡 Recommendation based on the CURRENT (not previous) bus capacity and time difference
6. If multiple bus routes available, mention all options with their stop counts

⚠️ IMPORTANT: If a user asks the same routing question multiple times, ALWAYS re-check the current capacity status from the "CURRENT BUS STATUS" section. Capacity changes frequently, so your answer should reflect the LATEST data, not what you said before.

Example response format:
"Hey there! To get from Jones Tower to Morrill Towers, here are your options:

🚌 Bus: Campus Loop South (12 stops) - ~5 minutes
📊 Campus Loop South is currently [CHECK CURRENT STATUS ABOVE] - [comment on crowding]
🚶 Walking: 12 minutes
🛴 Veo/Spin: ~2-3 minutes

[Make recommendation based on CURRENT capacity, not previous response]"

PERSONALITY:
- Friendly and conversational like talking to a fellow student
- Use emojis strategically (🚌 🚶 🛴 🎒 ✨ 😊 ⚠️ 💡)
- Be specific with numbers and times
- Be encouraging and helpful
- Reference specific capacity levels when relevant
- If buses are down, mention it prominently

RESPONSE STYLE:
- Start with a direct, detailed answer
- Always compare multiple transportation options with specific times
- Add helpful context or tips
- Use casual campus language ("Hey!", "Sounds good!", etc.)
- For crowded buses: suggest waiting or trying alternative routes (scooter/walking)
- For down buses: clearly warn students and suggest alternatives
- Keep responses concise but informative (4-6 sentences for routing)

Always prioritize student safety, comfort, and time efficiency.`;

      const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini', // Fast and cost-effective, or use 'gpt-4' for best quality
          messages: [
            { role: 'system', content: systemPrompt },
            ...chatMessages.slice(-5).map(msg => ({ // Only include last 5 messages to reduce context
              role: msg.role === 'assistant' ? 'assistant' : 'user',
              content: msg.content
            })),
            {
              role: 'user',
              content: `${userMessage}\n\n[Note: Current timestamp is ${Date.now()}. Please check the CURRENT BUS STATUS section in your system prompt for the latest real-time capacity data before answering.]`
            }
          ],
          max_tokens: 300,
          temperature: 0.8,
          presence_penalty: 0.6,
          frequency_penalty: 0.3
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `API Error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;

      setChatMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
    } catch (error) {
      console.error('ChatGPT API Error:', error);

      // Show specific error message to help debug
      let errorMessage = 'API Error: ';
      if (error.message.includes('401')) {
        errorMessage += '❌ Invalid API key. Please check your OpenAI API key.';
      } else if (error.message.includes('429')) {
        errorMessage += '❌ Rate limit or no credits. Add billing to your OpenAI account.';
      } else if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
        errorMessage += '🚫 CORS Error. OpenAI requires billing to be set up for browser requests. Add a payment method at platform.openai.com/settings/organization/billing';
      } else {
        errorMessage += error.message;
      }

      // Fallback to local AI with error info
      const fallbackResponse = `${errorMessage}\n\n---\n\n${generateLocalFallback(userMessage)}`;
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: fallbackResponse
      }]);
    } finally {
      setIsAiThinking(false);
    }
  };

  return { chatMessages, chatInput, setChatInput, isAiThinking, sendMessage };
}
