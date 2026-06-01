import { useState, useEffect } from 'react';
import { CAPACITY_LEVELS } from '../data/capacity';

// Owns the crowdsourced report state (capacity + bus-down), gamification points/theme, and
// the transient notification/reward UI. Behavior is preserved verbatim from the original
// App.jsx handlers; only the surrounding structure changed (Phase 0).
//
// View-local form inputs (which route/level the user picked) live in the view components and
// are passed in as arguments here, so the data logic stays free of UI form state.
export function useReports() {
  const [busReports, setBusReports] = useState({});
  const [busDownReports, setBusDownReports] = useState({});
  const [userPoints, setUserPoints] = useState(0);
  const [selectedTheme, setSelectedTheme] = useState(0);
  const [notification, setNotification] = useState('');
  const [showReward, setShowReward] = useState(false);

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
      } catch {
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

  const submitCapacityReport = async (reportBusId, reportCapacity) => {
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

    setShowReward(true);
    setNotification(`Report submitted! +1 point (Total: ${newPoints})`);

    setTimeout(() => {
      setShowReward(false);
      setNotification('');
    }, 3000);
  };

  const submitBusDownReport = async (downBusRoute) => {
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

    setShowReward(true);
    setNotification(`Bus down report submitted! +2 points (Total: ${newPoints}) 🚨`);

    setTimeout(() => {
      setShowReward(false);
      setNotification('');
    }, 3000);
  };

  const checkStatus = (checkBusId) => {
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

  // Preserved from the original (currently no UI calls it — there is no theme picker).
  const changeTheme = async (index) => {
    setSelectedTheme(index);
    await saveData(busReports, userPoints, index);
  };

  return {
    busReports,
    busDownReports,
    userPoints,
    selectedTheme,
    notification,
    showReward,
    getCapacityInfo,
    submitCapacityReport,
    submitBusDownReport,
    checkStatus,
    changeTheme
  };
}
