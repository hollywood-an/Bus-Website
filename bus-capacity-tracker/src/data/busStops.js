// Hand-maintained bus stop coordinates per route. Extracted verbatim from App.jsx (Phase 0).
// SCAFFOLDING: many lat/lng values are duplicated/approximate. Slated for replacement by the
// live OSU CABS feed's real stops in Phase 1.5 (see fixtures/route-*.json). Don't invest here.
export const BUS_STOPS = {
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
