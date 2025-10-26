import React, { useState, useEffect } from 'react';
import { Bus, Users, TrendingUp, Award, Palette, MessageCircle, Send } from 'lucide-react';
import OSULogo from './OSU.png';

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

const OSU_LOCATIONS = [
  'Ohio Union',
  'RPAC',
  'Thompson',
  'Traditions at Scott',
  'The Stadium',
  'South Rec',
  'Hitchcock Hall',
  'Lincoln and Morrill Towers',
  'Traditions at Kennedy',
  'ARPS Parking'
];

const ROUTE_TIMES = {
  'Ohio Union': {
    'Thompson': { walk: 9, bus: null, routes: [] },
    'RPAC': { walk: 15, bus: 5, routes: ['Campus Connector', 'Campus Loop South'] },
    'Traditions at Scott': { walk: 15, bus: 4, routes: ['Campus Connector', 'Buckeye Express', 'Campus Loop South'] },
    'The Stadium': { walk: 18, bus: 5, routes: ['Campus Connector', 'Buckeye Express', 'Campus Loop South'] },
    'South Rec': { walk: 8, bus: 2, routes: ['Campus Connector'] },
    'Hitchcock Hall': { walk: 12, bus: 4, routes: ['Campus Connector', 'Campus Loop South'] },
    'Lincoln and Morrill Towers': { walk: 17, bus: 6, routes: ['Campus Loop South', 'Northwest Connector'] },
    'Traditions at Kennedy': { walk: 13, bus: 4, routes: ['Campus Connector'] },
    'ARPS Parking': { walk: 5, bus: 2, routes: ['Buckeye Express'] }
  },
  'RPAC': {
    'Ohio Union': { walk: 15, bus: 5, routes: ['Campus Connector', 'Campus Loop South'] },
    'Thompson': { walk: 6, bus: null, routes: [] },
    'Traditions at Scott': { walk: 10, bus: 8, routes: ['Campus Connector', 'Campus Loop South'] },
    'The Stadium': { walk: 1, bus: null, routes: [] },
    'South Rec': { walk: 12, bus: 4, routes: ['Campus Connector', 'Campus Loop South'] },
    'Hitchcock Hall': { walk: 8, bus: 5, routes: ['Campus Connector', 'Campus Loop South'] },
    'Lincoln and Morrill Towers': { walk: 9, bus: 5, routes: ['Campus Loop South'] },
    'Traditions at Kennedy': { walk: 11, bus: 7, routes: ['Campus Connector'] },
    'ARPS Parking': { walk: 11, bus: 4, routes: ['Campus Connector', 'Buckeye Express'] }
  },
  'Thompson': {
    'Ohio Union': { walk: 9, bus: null, routes: [] },
    'RPAC': { walk: 6, bus: null, routes: [] },
    'Traditions at Scott': { walk: 8, bus: null, routes: [] },
    'The Stadium': { walk: 7, bus: null, routes: [] },
    'South Rec': { walk: 8, bus: null, routes: [] },
    'Hitchcock Hall': { walk: 6, bus: null, routes: [] },
    'Lincoln and Morrill Towers': { walk: 11, bus: null, routes: [] },
    'Traditions at Kennedy': { walk: 8, bus: null, routes: [] },
    'ARPS Parking': { walk: 7, bus: null, routes: [] }
  },
  'Traditions at Scott': {
    'Ohio Union': { walk: 15, bus: 3, routes: ['Campus Connector'] },
    'RPAC': { walk: 10, bus: 11, routes: ['Campus Connector'] },
    'Thompson': { walk: 8, bus: null, routes: [] },
    'The Stadium': { walk: 8, bus: 2, routes: ['Buckeye Express', 'Campus Connector', 'Campus Loop South'] },
    'South Rec': { walk: 15, bus: 6, routes: ['Campus Connector'] },
    'Hitchcock Hall': { walk: 14, bus: 6, routes: ['Campus Connector', 'Campus Loop South'] },
    'Lincoln and Morrill Towers': { walk: 12, bus: 7, routes: ['Campus Connector', 'Campus Loop South'] },
    'Traditions at Kennedy': { walk: 10, bus: 5, routes: ['Campus Connector', 'Campus Loop South'] },
    'ARPS Parking': { walk: 9, bus: 4, routes: ['Campus Connector', 'Buckeye Express'] }
  },
  'The Stadium': {
    'Ohio Union': { walk: 18, bus: 6, routes: ['Campus Connector'] },
    'RPAC': { walk: 1, bus: null, routes: [] },
    'Thompson': { walk: 7, bus: null, routes: [] },
    'Traditions at Scott': { walk: 8, bus: 2, routes: ['Buckeye Express', 'Campus Connector'] },
    'South Rec': { walk: 17, bus: 7, routes: ['Campus Connector'] },
    'Hitchcock Hall': { walk: 10, bus: 4, routes: ['Campus Connector', 'Campus Loop South'] },
    'Lincoln and Morrill Towers': { walk: 13, bus: 5, routes: ['Campus Loop South', 'Northwest Connector'] },
    'Traditions at Kennedy': { walk: 9, bus: 3, routes: ['Campus Connector', 'Campus Loop South'] },
    'ARPS Parking': { walk: 8, bus: 3, routes: ['Buckeye Express', 'Campus Connector'] }
  },
  'South Rec': {
    'Ohio Union': { walk: 8, bus: 2, routes: ['Campus Connector', 'Campus Loop South'] },
    'RPAC': { walk: 12, bus: 4, routes: ['Campus Connector'] },
    'Thompson': { walk: 8, bus: null, routes: [] },
    'Traditions at Scott': { walk: 15, bus: 4, routes: ['Campus Connector', 'Campus Loop South'] },
    'The Stadium': { walk: 17, bus: 8, routes: ['Campus Connector'] },
    'Hitchcock Hall': { walk: 9, bus: 3, routes: ['Campus Connector'] },
    'Lincoln and Morrill Towers': { walk: 14, bus: 5, routes: ['Campus Loop South'] },
    'Traditions at Kennedy': { walk: 14, bus: 5, routes: ['Campus Connector'] },
    'ARPS Parking': { walk: 10, bus: 3, routes: ['Campus Connector'] }
  },
  'Hitchcock Hall': {
    'Ohio Union': { walk: 12, bus: 4, routes: ['Campus Connector', 'Campus Loop South'] },
    'RPAC': { walk: 8, bus: 5, routes: ['Campus Connector', 'Campus Loop South'] },
    'Thompson': { walk: 6, bus: null, routes: [] },
    'Traditions at Scott': { walk: 14, bus: 6, routes: ['Campus Connector', 'Campus Loop South'] },
    'The Stadium': { walk: 10, bus: 4, routes: ['Campus Connector', 'Campus Loop South'] },
    'South Rec': { walk: 9, bus: 3, routes: ['Campus Connector'] },
    'Lincoln and Morrill Towers': { walk: 12, bus: 5, routes: ['Campus Loop South', 'Northwest Connector'] },
    'Traditions at Kennedy': { walk: 13, bus: 5, routes: ['Campus Connector'] },
    'ARPS Parking': { walk: 6, bus: 2, routes: ['Buckeye Express'] }
  },
  'Lincoln and Morrill Towers': {
    'Ohio Union': { walk: 17, bus: 6, routes: ['Campus Loop South', 'Northwest Connector'] },
    'RPAC': { walk: 9, bus: 5, routes: ['Campus Loop South'] },
    'Thompson': { walk: 11, bus: null, routes: [] },
    'Traditions at Scott': { walk: 12, bus: 7, routes: ['Campus Connector', 'Campus Loop South'] },
    'The Stadium': { walk: 13, bus: 5, routes: ['Campus Connector', 'Campus Loop South'] },
    'South Rec': { walk: 14, bus: 5, routes: ['Campus Loop South'] },
    'Hitchcock Hall': { walk: 12, bus: 5, routes: ['Campus Connector', 'Campus Loop South'] },
    'Traditions at Kennedy': { walk: 14, bus: 5, routes: ['Campus Connector', 'Campus Loop South'] },
    'ARPS Parking': { walk: 9, bus: 4, routes: ['Campus Connector', 'Buckeye Express'] }
  },
  'Traditions at Kennedy': {
    'Ohio Union': { walk: 13, bus: 4, routes: ['Campus Connector'] },
    'RPAC': { walk: 11, bus: 8, routes: ['Campus Connector'] },
    'Thompson': { walk: 8, bus: null, routes: [] },
    'Traditions at Scott': { walk: 10, bus: 5, routes: ['Campus Connector', 'Campus Loop South'] },
    'The Stadium': { walk: 9, bus: 3, routes: ['Campus Connector', 'Campus Loop South'] },
    'South Rec': { walk: 14, bus: 5, routes: ['Campus Connector'] },
    'Hitchcock Hall': { walk: 13, bus: 5, routes: ['Campus Connector'] },
    'Lincoln and Morrill Towers': { walk: 14, bus: 5, routes: ['Campus Connector', 'Campus Loop South'] },
    'ARPS Parking': { walk: 9, bus: 4, routes: ['Campus Connector', 'Buckeye Express'] }
  },
  'ARPS Parking': {
    'Ohio Union': { walk: 5, bus: 2, routes: ['Buckeye Express'] },
    'RPAC': { walk: 11, bus: 4, routes: ['Campus Connector', 'Buckeye Express'] },
    'Thompson': { walk: 7, bus: null, routes: [] },
    'Traditions at Scott': { walk: 9, bus: 4, routes: ['Campus Connector', 'Buckeye Express'] },
    'The Stadium': { walk: 8, bus: 3, routes: ['Campus Connector', 'Buckeye Express'] },
    'South Rec': { walk: 10, bus: 3, routes: ['Campus Connector'] },
    'Hitchcock Hall': { walk: 6, bus: 2, routes: ['Buckeye Express'] },
    'Lincoln and Morrill Towers': { walk: 9, bus: 4, routes: ['Campus Connector', 'Buckeye Express'] },
    'Traditions at Kennedy': { walk: 9, bus: 4, routes: ['Campus Connector', 'Buckeye Express'] }
  }
};

const BUS_STOPS = {
  'BE': [
    { id: 'buckeye-lot', name: 'Buckeye Lot', lat: 40.015984456541254, lng: -83.03067334770944 },
    { id: 'midwest-eb', name: 'Midwest Campus (EB)', lat: 40.00426230287066, lng: -83.02654971319002 },
    { id: 'st-john-eb', name: 'St. John Arena (EB)', lat: 40.00430746596242, lng: -83.02075976110554 },
    { id: 'knowlton-eb', name: 'Knowlton Hall', lat: 40.00430746596242, lng: -83.02075976110554 },
    { id: 'fontana-eb', name: 'Fontana Lab', lat: 40.00430746596242, lng: -83.02075976110554 },
    { id: 'high-15th-sb', name: 'High Street and 15th Avenue', lat: 40.000201786712054, lng: -83.00821699905164 },
    { id: 'ohio-union-nb', name: 'Ohio Union (NB)', lat: 39.99787642786453, lng: -83.00957413134707 },
    { id: 'arps-nb', name: 'Arps Hall', lat: 40.0026566221389, lng: -83.01060661617856 },
    { id: 'blackburn-wb', name: 'Blackburn House', lat: 40.004000578942524, lng: -83.01246795397425 },
    { id: 'mason-wb', name: 'Mason Hall', lat: 40.00413611058114, lng: -83.01557464372723 },
    { id: 'st-john-wb', name: 'St. John Arena (WB)', lat: 40.00430746596242, lng: -83.02075976110554 },
    { id: 'midwest-wb', name: 'Midwest Campus (WB)', lat: 40.004583097995706, lng: -83.02642471879427 },
    { id: 'fred-irving-nb', name: 'Fred Taylor and Irving Schottenstein Drive', lat: 40.0123118324069, lng: -83.02853501647171 }
  ],
  'CC': [
    { id: 'mount-wb', name: 'Mount Hall', lat: 40.004583097995706, lng: -83.02642471879427 },
    { id: 'research-sb', name: 'Research Center', lat: 40.004583097995706, lng: -83.02642471879427 },
    { id: 'kinnear-eb', name: 'Kinnear Road Lot', lat: 40.004583097995706, lng: -83.02642471879427 },
    { id: 'blankenship-eb', name: 'Blankenship Hall', lat: 40.004583097995706, lng: -83.02642471879427 },
    { id: 'midwest-cc-eb', name: 'Midwest Campus (EB)', lat: 40.00426230287066, lng: -83.02654971319002 },
    { id: 'st-john-cc-eb', name: 'St. John Arena (EB)', lat: 40.00430746596242, lng: -83.02075976110554 },
    { id: 'knowlton-cc', name: 'Knowlton Hall', lat: 40.00430746596242, lng: -83.02075976110554 },
    { id: 'fontana-cc', name: 'Fontana Lab', lat: 40.00430746596242, lng: -83.02075976110554 },
    { id: 'stillman-sb', name: 'Stillman Hall', lat: 40.00430746596242, lng: -83.02075976110554 },
    { id: 'ohio-union-cc-sb', name: 'Ohio Union (SB)', lat: 39.99787642786453, lng: -83.00957413134707 },
    { id: 'siebert-wb', name: 'Siebert Hall', lat: 40.004000578942524, lng: -83.01246795397425 },
    { id: 'mack-nb', name: 'Mack Hall', lat: 40.00413611058114, lng: -83.01557464372723 },
    { id: 'herrick-cc-nb', name: 'Herrick Drive Transit Hub', lat: 39.99774148447387, lng: -83.01815680243905 },
    { id: '11th-worth-eb', name: '11th and Worthington', lat: 39.99539858909753, lng: -83.01227574081258 },
    { id: 'ohio-union-cc-nb', name: 'Ohio Union (NB)', lat: 39.99787642786453, lng: -83.00957413134707 },
    { id: 'arps-cc-nb', name: 'Arps Hall', lat: 40.0026566221389, lng: -83.01060661617856 },
    { id: 'blackburn-cc-wb', name: 'Blackburn House', lat: 40.004000578942524, lng: -83.01246795397425 },
    { id: 'mason-cc-wb', name: 'Mason Hall', lat: 40.00413611058114, lng: -83.01557464372723 },
    { id: 'st-john-cc-wb', name: 'St. John Arena (WB)', lat: 40.00430746596242, lng: -83.02075976110554 },
    { id: 'midwest-cc-wb', name: 'Midwest Campus (WB)', lat: 40.004583097995706, lng: -83.02642471879427 }
  ],
  'CLS': [
    { id: 'buckeye-lot-cls', name: 'Buckeye Lot', lat: 40.015984456541254, lng: -83.03067334770944 },
    { id: 'midwest-cls-eb', name: 'Midwest Campus (EB)', lat: 40.00426230287066, lng: -83.02654971319002 },
    { id: 'mid-towers-sb', name: 'Mid Towers', lat: 39.99916021399597, lng: -83.02248913723811 },
    { id: 'herrick-cls', name: 'Herrick Drive Transit Hub', lat: 39.99774148447387, lng: -83.01815680243905 },
    { id: '11th-worth-cls', name: '11th and Worthington', lat: 39.99539858909753, lng: -83.01227574081258 },
    { id: 'ohio-union-cls-nb', name: 'Ohio Union (NB)', lat: 39.99787642786453, lng: -83.00957413134707 },
    { id: 'arps-cls-nb', name: 'Arps Hall', lat: 40.0026566221389, lng: -83.01060661617856 },
    { id: 'blackburn-cls-wb', name: 'Blackburn House', lat: 40.004000578942524, lng: -83.01246795397425 },
    { id: 'mason-cls-wb', name: 'Mason Hall', lat: 40.00413611058114, lng: -83.01557464372723 },
    { id: 'st-john-cls-wb', name: 'St. John Arena (WB)', lat: 40.00430746596242, lng: -83.02075976110554 },
    { id: 'midwest-cls-wb', name: 'Midwest Campus (WB)', lat: 40.004583097995706, lng: -83.02642471879427 },
    { id: 'fred-cls', name: 'Fred Taylor and Irving Schottenstein Drive', lat: 40.0123118324069, lng: -83.02853501647171 }
  ],
  'ER': [
    { id: 'high-15th-er', name: 'High Street and 15th Avenue', lat: 40.000201786712054, lng: -83.00821699905164 },
    { id: '11th-high-er-eb', name: '11th and High Street (EB)', lat: 39.99467610621515, lng: -83.00591751709443 },
    { id: 'indianola-er-eb', name: 'Indianola Avenue (EB)', lat: 39.994509043010105, lng: -83.0024785032367 },
    { id: 'chittenden-er-nb', name: 'Chittenden Avenue (NB)', lat: 39.995164451135345, lng: -82.99895881628204 },
    { id: '15th-er-nb', name: '15th Avenue (NB)', lat: 39.99943676147927, lng: -82.99868058383355 },
    { id: '18th-er-nb', name: '18th Avenue (NB)', lat: 40.00214933530174, lng: -82.99845678015481 },
    { id: 'alden-er-nb', name: 'Alden Avenue (NB)', lat: 40.00931010845986, lng: -82.99798686555131 },
    { id: 'maynard-er-nb', name: 'Maynard Avenue (NB)', lat: 40.011188719797644, lng: -82.99786602430231 },
    { id: 'tompkins-er-sb', name: 'Tompkins Street (SB)', lat: 40.013953984162185, lng: -83.00024875909497 },
    { id: 'maynard-er-sb', name: 'Maynard Avenue (SB)', lat: 40.010914658113464, lng: -83.00043914129039 },
    { id: 'alden-er-sb', name: 'Alden Avenue (SB)', lat: 40.00807455346316, lng: -83.0006431246959 },
    { id: 'lane-er-sb', name: 'Lane Avenue (SB)', lat: 40.00547069648809, lng: -83.0008884673619 },
    { id: '18th-er-sb', name: '18th Avenue (SB)', lat: 40.00253486099292, lng: -83.00109205862918 },
    { id: '15th-er-sb', name: '15th Avenue (SB)', lat: 39.999458266048684, lng: -83.00124726182884 },
    { id: 'chittenden-er-sb', name: 'Chittenden Avenue (SB)', lat: 39.99523950552021, lng: -83.00155060039565 },
    { id: 'indianola-er-wb', name: 'Indianola Avenue (WB)', lat: 39.99468565902732, lng: -83.00327290013395 },
    { id: '11th-high-er-wb', name: '11th and High Street (WB)', lat: 39.99486150144462, lng: -83.00658113635403 },
    { id: 'ohio-union-er-nb', name: 'Ohio Union (NB)', lat: 39.997867639627025, lng: -83.00957033534729 },
    { id: 'arps-er-nb', name: 'Arps Hall', lat: 40.00270719525465, lng: -83.01062598534588 }
  ],
  'MC': [
    { id: 'carmack-2-sb', name: 'Carmack 2', lat: 40.00106, lng: -83.03705 },
    { id: 'carmack-3-nb', name: 'Carmack 3', lat: 40.00152, lng: -83.04028 },
    { id: 'carmack-5-west-nb', name: 'Carmack 5 (West - NB)', lat: 40.00297, lng: -83.04257 },
    { id: 'carmack-5-west-sb', name: 'Carmack 5 (West - SB)', lat: 40.00290, lng: -83.04095 },
    { id: 'herrick-mc', name: 'Herrick Drive Transit Hub', lat: 39.99774148447387, lng: -83.01815680243905 }
  ],
  'NWC': [
    { id: 'stores-receiving', name: 'Stores & Receiving', lat: 40.0085, lng: -83.0370 },
    { id: 'service-annex', name: 'Service Annex', lat: 40.0080, lng: -83.0360 },
    { id: 'mount-nwc', name: 'Mount Hall', lat: 40.0050, lng: -83.0340 },
    { id: 'fisher-commons', name: 'Fisher Commons', lat: 40.0045, lng: -83.0240 }
  ]
};

const ROUTE_COLORS = {
  'BE': '#ef4444', // red
  'CC': '#10b981', // green
  'CLS': '#ec4899', // pink
  'ER': '#3b82f6', // blue
  'MC': '#f59e0b', // orange
  'NWC': '#8b5cf6', // purple
  'all': '#64748b' // gray
};

const ROUTE_NAMES = {
  'BE': 'Buckeye Express',
  'CC': 'Campus Connector',
  'CLS': 'Campus Loop South',
  'ER': 'East Residential',
  'MC': 'Medical Center',
  'NWC': 'Northwest Connector'
};
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
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [selectedBusRoute, setSelectedBusRoute] = useState('all');
  const [selectedStop, setSelectedStop] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);

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

  useEffect(() => {
    if (view === 'map' && !mapLoaded) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyAtk-86kGC9SAx6ZiWFVvR5uHytffOR_Hs&libraries=directions,geometry`;
      script.async = true;
      script.defer = true;
      script.onload = () => setMapLoaded(true);
      document.head.appendChild(script);
    }
  }, [view, mapLoaded]);

  useEffect(() => {
    if (mapLoaded && view === 'map' && window.google) {
      initMap();
    }
  }, [mapLoaded, view, selectedBusRoute]);

  const initMap = () => {
    const mapElement = document.getElementById('google-map');
    if (!mapElement || !window.google) return;

    const map = new window.google.maps.Map(mapElement, {
      center: { lat: 40.0006, lng: -83.0150 },
      zoom: 15,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
    });

    const stops = selectedBusRoute === 'all' 
      ? Object.entries(BUS_STOPS).flatMap(([route, stops]) => 
          stops.map(stop => ({ ...stop, route }))
        )
      : (BUS_STOPS[selectedBusRoute] || []).map(stop => ({ ...stop, route: selectedBusRoute }));

    const markers = [];
    const infoWindow = new window.google.maps.InfoWindow();

    stops.forEach((stop) => {
      const marker = new window.google.maps.Marker({
        position: { lat: stop.lat, lng: stop.lng },
        map: map,
        title: stop.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: ROUTE_COLORS[stop.route] || ROUTE_COLORS['all'],
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      marker.addListener('click', () => {
        const routes = Object.entries(BUS_STOPS)
          .filter(([, stops]) => stops.find(s => s.id === stop.id))
          .map(([route]) => route);

        const content = `
          <div style="padding: 10px;">
            <h3 style="margin: 0 0 10px 0; font-weight: bold; font-size: 16px;">${stop.name}</h3>
            <p style="margin: 5px 0; font-size: 14px;"><strong>Coordinates:</strong> ${stop.lat.toFixed(4)}, ${stop.lng.toFixed(4)}</p>
            <p style="margin: 5px 0; font-size: 14px;"><strong>Routes:</strong></p>
            <div style="display: flex; gap: 5px; flex-wrap: wrap; margin-top: 5px;">
              ${routes.map(route => `
                <span style="
                  background-color: ${ROUTE_COLORS[route]};
                  color: white;
                  padding: 4px 10px;
                  border-radius: 12px;
                  font-size: 12px;
                  font-weight: bold;
                ">${route}</span>
              `).join('')}
            </div>
            <a href="https://www.google.com/maps/search/?api=1&query=${stop.lat},${stop.lng}" 
               target="_blank" 
               style="display: inline-block; margin-top: 10px; color: #1a73e8; text-decoration: none; font-size: 14px;">
              Open in Google Maps →
            </a>
          </div>
        `;
        
        infoWindow.setContent(content);
        infoWindow.open(map, marker);
        setSelectedStop(stop);
      });

      markers.push(marker);
    });

    // Draw polylines for all routes or selected route using Directions API for street routing
    const directionsService = new window.google.maps.DirectionsService();
    const drawRouteWithDirections = (routeStops, color, opacity, weight) => {
      if (routeStops.length < 2) return;

      // Split into segments of max 25 waypoints (API limit is 25 waypoints + origin + destination = 27)
      const segmentSize = 23;
      
      for (let i = 0; i < routeStops.length - 1; i += segmentSize) {
        const segmentEnd = Math.min(i + segmentSize + 1, routeStops.length);
        const segmentStops = routeStops.slice(i, segmentEnd);

        if (segmentStops.length < 2) continue;

        const origin = { lat: segmentStops[0].lat, lng: segmentStops[0].lng };
        const destination = { lat: segmentStops[segmentStops.length - 1].lat, lng: segmentStops[segmentStops.length - 1].lng };
        const waypoints = segmentStops.slice(1, -1).map(stop => ({
          location: { lat: stop.lat, lng: stop.lng },
          stopover: true
        }));

        directionsService.route({
          origin: origin,
          destination: destination,
          waypoints: waypoints,
          travelMode: 'DRIVING',
          optimizeWaypoints: false,
        }, (result, status) => {
          if (status === 'OK') {
            result.routes[0].legs.forEach((leg) => {
              const routePath = new window.google.maps.Polyline({
                path: leg.steps.reduce((path, step) => {
                  return path.concat(window.google.maps.geometry.encoding.decodePath(step.polyline.points));
                }, []),
                geodesic: false,
                strokeColor: color,
                strokeOpacity: opacity,
                strokeWeight: weight,
                map: map,
              });
            });
          } else {
            // Fallback to straight line if directions API fails
            const routePath = new window.google.maps.Polyline({
              path: segmentStops.map(stop => ({ lat: stop.lat, lng: stop.lng })),
              geodesic: true,
              strokeColor: color,
              strokeOpacity: opacity,
              strokeWeight: weight,
              map: map,
            });
          }
        });
      }
    };

    if (selectedBusRoute === 'all') {
      // Draw polylines for each route following streets
      Object.entries(BUS_STOPS).forEach(([route, routeStops]) => {
        if (routeStops.length > 1) {
          drawRouteWithDirections(routeStops, ROUTE_COLORS[route], 0.7, 3);
        }
      });
    } else if (BUS_STOPS[selectedBusRoute] && BUS_STOPS[selectedBusRoute].length > 1) {
      // Draw polyline for selected route with enhanced styling
      drawRouteWithDirections(BUS_STOPS[selectedBusRoute], ROUTE_COLORS[selectedBusRoute], 0.85, 5);
    }
  };

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

      // REPLACE 'YOUR_OPENAI_API_KEY_HERE' with your actual OpenAI API key
      const OPENAI_API_KEY = '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';

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
              <img src={OSULogo} width="40" height="40" alt="OSU Logo" />
              <div>
                <h1 className="text-2xl font-bold">OSU Commute Page</h1>
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
            onClick={() => setView('map')}
            className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
              view === 'map'
                ? `${currentTheme.primary} text-white shadow-lg`
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            🗺️ Campus Map
          </button>
          <button
            onClick={() => setView('planner')}
            className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
              view === 'planner'
                ? `${currentTheme.primary} text-white shadow-lg`
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Route Planner
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

        {view === 'map' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">Interactive Campus Map</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Filter by Route</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedBusRoute('all')}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    selectedBusRoute === 'all' ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  All Routes
                </button>
                {Object.keys(BUS_STOPS).map(route => (
                  <button
                    key={route}
                    onClick={() => setSelectedBusRoute(route)}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all`}
                    style={{
                      backgroundColor: selectedBusRoute === route ? ROUTE_COLORS[route] : '#e5e7eb',
                      color: selectedBusRoute === route ? 'white' : '#374151'
                    }}
                  >
                    {route}
                  </button>
                ))}
              </div>
            </div>

            <div 
              id="google-map" 
              className="rounded-lg overflow-hidden border-2 border-gray-300 relative" 
              style={{ height: '600px', width: '100%' }}
            >
              {!mapLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-600">Loading map...</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <h3 className="font-bold mb-2">Map Features:</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>🔵 Click any bus stop marker for details</li>
                <li>🎨 Color-coded markers by route</li>
                <li>📍 Route lines show bus paths (when route is selected)</li>
                <li>🗺️ Click "Open in Google Maps" to get directions</li>
                <li>🔍 Use map controls to zoom and pan</li>
              </ul>
            </div>

            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(ROUTE_COLORS).filter(([key]) => key !== 'all').map(([route, color]) => (
                <div key={route} className="flex items-center gap-2 text-sm">
                  <div 
                    className="w-4 h-4 rounded-full border-2 border-white shadow"
                    style={{ backgroundColor: color }}
                  ></div>
                  <span className="font-semibold">{ROUTE_NAMES[route] || route}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'planner' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <TrendingUp size={24} />
              Route Planner
            </h2>
            <p className="text-gray-600 mb-6">Compare walking vs. bus times between campus locations</p>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2">From</label>
                <select
                  value={fromLocation}
                  onChange={(e) => setFromLocation(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Select starting location...</option>
                  {OSU_LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">To</label>
                <select
                  value={toLocation}
                  onChange={(e) => setToLocation(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Select destination...</option>
                  {OSU_LOCATIONS.filter(loc => loc !== fromLocation).map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
            </div>

            {fromLocation && toLocation && ROUTE_TIMES[fromLocation]?.[toLocation] && (
              <div className="space-y-4">
                {(() => {
                  const route = ROUTE_TIMES[fromLocation][toLocation];
                  const walkTime = route.walk;
                  const busTime = route.bus;
                  const scooterTime = Math.round(walkTime / 5);
                  const timeSaved = busTime ? walkTime - busTime : 0;
                  
                  // Calculate Spin and Veo prices
                  const spinPrice = Math.max(3.50, scooterTime * 0.39);
                  const veoPrice = 1.00 + (scooterTime * 0.39);
                  
                  return (
                    <>
                      <div className="grid grid-cols-3 gap-4">
                        <div className={`p-6 rounded-lg border-2 ${!busTime || (busTime >= walkTime && scooterTime >= walkTime) ? 'border-green-500 bg-green-50' : 'border-gray-300'}`}>
                          <div className="text-center">
                            <div className="text-4xl mb-2">🚶</div>
                            <div className="text-2xl font-bold text-gray-900">{walkTime} min</div>
                            <div className="text-sm text-gray-600 mt-1">Walking</div>
                            <div className="text-sm text-gray-500 mt-1">Free</div>
                            {(!busTime || (busTime >= walkTime && scooterTime >= walkTime)) && (
                              <div className="mt-2 text-xs font-semibold text-green-700">Best Option</div>
                            )}
                          </div>
                        </div>
                        
                        <div className={`p-6 rounded-lg border-2 ${busTime ? (timeSaved > 0 && scooterTime >= busTime ? 'border-green-500 bg-green-50' : 'border-orange-500 bg-orange-50') : 'border-gray-300 bg-gray-50'}`}>
                          <div className="text-center">
                            <div className="text-4xl mb-2">🚌</div>
                            {busTime ? (
                              <>
                                <div className="text-2xl font-bold text-gray-900">{busTime} min</div>
                                <div className="text-sm text-gray-600 mt-1">Bus</div>
                                {timeSaved > 0 && scooterTime >= busTime && (
                                  <div className="mt-2">
                                    <div className="text-xs font-semibold text-green-700">Best Option</div>
                                    <div className="text-xs text-green-600">Save {timeSaved} min</div>
                                  </div>
                                )}
                                {timeSaved < 0 && (
                                  <div className="mt-2 text-xs text-orange-600">
                                    {Math.abs(timeSaved)} min slower
                                  </div>
                                )}
                              </>
                            ) : (
                              <>
                                <div className="text-lg font-medium text-gray-500">N/A</div>
                                <div className="text-xs text-gray-500 mt-1">No bus available</div>
                              </>
                            )}
                          </div>
                        </div>

                        <div className={`p-6 rounded-lg border-2 ${scooterTime < walkTime && (!busTime || scooterTime < busTime) ? 'border-green-500 bg-green-50' : 'border-purple-500 bg-purple-50'}`}>
                          <div className="text-center">
                            <div className="text-4xl mb-2">🛴</div>
                            <div className="text-2xl font-bold text-gray-900">{scooterTime} min</div>
                            <div className="text-sm text-gray-600 mt-1">Spin/Veo</div>
                            {scooterTime < walkTime && (!busTime || scooterTime < busTime) && (
                              <div className="mt-2">
                                <div className="text-xs font-semibold text-green-700">Fastest Option</div>
                                <div className="text-xs text-green-600">Save {walkTime - scooterTime} min</div>
                              </div>
                            )}
                            <div className="mt-3 space-y-2 text-xs bg-white bg-opacity-70 p-2 rounded">
                              <div className="border-b pb-2">
                                <div className="font-semibold text-orange-600">Spin</div>
                                <div className="text-gray-700">${spinPrice.toFixed(2)}</div>
                                <div className="text-gray-500 text-xs">($3.50 min + $0.39/min)</div>
                              </div>
                              <div>
                                <div className="font-semibold text-blue-600">Veo</div>
                                <div className="text-gray-700">${veoPrice.toFixed(2)}</div>
                                <div className="text-gray-500 text-xs">($1.00 unlock + $0.39/min)</div>
                              </div>
                            </div>
                            <div className="flex gap-2 mt-3 justify-center">
                              <a 
                                href="https://www.spin.app/" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="bg-orange-500 text-white px-3 py-1 rounded text-xs font-semibold hover:bg-orange-600 transition-colors"
                              >
                                Open Spin
                              </a>
                              <a 
                                href="https://www.veoride.com/" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="bg-blue-500 text-white px-3 py-1 rounded text-xs font-semibold hover:bg-blue-600 transition-colors"
                              >
                                Open Veo
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {busTime && route.routes.length > 0 && (
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                          <h3 className="font-semibold text-blue-900 mb-2">Available Bus Routes:</h3>
                          <div className="flex flex-wrap gap-2">
                            {route.routes.map((busRoute, idx) => (
                              <span key={idx} className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm">
                                {busRoute}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {!busTime && (
                        <div className="bg-gray-50 border-l-4 border-gray-400 p-4 rounded">
                          <p className="text-gray-700">
                            <strong>No bus available:</strong> Consider walking or using a Spin/Veo scooter for this trip!
                          </p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
            
            {fromLocation && toLocation && !ROUTE_TIMES[fromLocation]?.[toLocation] && (
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
                <p className="text-yellow-800">No route information available for this combination.</p>
              </div>
            )}
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