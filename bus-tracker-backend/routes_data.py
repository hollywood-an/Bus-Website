LOCATIONS = [
    "Ohio Union",
    "RPAC",
    "Thompson",
    "Traditions at Scott",
    "The Stadium",
    "South Rec"
]

# Route information: {from: {to: {walk_time, bus_time, bus_routes}}}
ROUTE_DATA = {
    "Ohio Union": {
        "Thompson": {"walk": 9, "bus": None, "routes": []},
        "RPAC": {"walk": 15, "bus": 5, "routes": ["Campus Connector", "Campus Loop South"]},
        "Traditions at Scott": {"walk": 15, "bus": 4, "routes": ["Campus Connector", "Buckeye Express", "Campus Loop South"]},
        "The Stadium": {"walk": 18, "bus": 5, "routes": ["Campus Connector", "Buckeye Express", "Campus Loop South"]},
        "South Rec": {"walk": 8, "bus": 2, "routes": ["Campus Connector"]}
    },
    "RPAC": {
        "Ohio Union": {"walk": 15, "bus": 5, "routes": ["Campus Connector", "Campus Loop South"]},
        "Thompson": {"walk": 6, "bus": None, "routes": []},
        "Traditions at Scott": {"walk": 10, "bus": 8, "routes": ["Campus Connector", "Campus Loop South"]},
        "The Stadium": {"walk": 1, "bus": None, "routes": []},
        "South Rec": {"walk": 12, "bus": 4, "routes": ["Campus Connector", "Campus Loop South"]}
    },
    "Thompson": {
        "Ohio Union": {"walk": 9, "bus": None, "routes": []},
        "RPAC": {"walk": 6, "bus": None, "routes": []},
        "Traditions at Scott": {"walk": 8, "bus": None, "routes": []},
        "The Stadium": {"walk": 7, "bus": None, "routes": []},
        "South Rec": {"walk": 8, "bus": None, "routes": []}
    },
    "Traditions at Scott": {
        "Ohio Union": {"walk": 15, "bus": 3, "routes": ["Campus Connector"]},
        "RPAC": {"walk": 10, "bus": 11, "routes": ["Campus Connector"]},
        "Thompson": {"walk": 8, "bus": None, "routes": []},
        "The Stadium": {"walk": 8, "bus": 2, "routes": ["Buckeye Express", "Campus Connector", "Campus Loop South"]},
        "South Rec": {"walk": 15, "bus": 6, "routes": ["Campus Connector"]}
    },
    "The Stadium": {
        "Ohio Union": {"walk": 18, "bus": 6, "routes": ["Campus Connector"]},
        "RPAC": {"walk": 1, "bus": None, "routes": []},
        "Thompson": {"walk": 7, "bus": None, "routes": []},
        "Traditions at Scott": {"walk": 8, "bus": 2, "routes": ["Buckeye Express", "Campus Connector"]},
        "South Rec": {"walk": 17, "bus": 7, "routes": ["Campus Connector"]}
    },
    "South Rec": {
        "Ohio Union": {"walk": 8, "bus": 2, "routes": ["Campus Connector", "Campus Loop South"]},
        "RPAC": {"walk": 12, "bus": 4, "routes": ["Campus Connector"]},
        "Thompson": {"walk": 8, "bus": None, "routes": []},
        "Traditions at Scott": {"walk": 15, "bus": 4, "routes": ["Campus Connector", "Campus Loop South"]},
        "The Stadium": {"walk": 17, "bus": 8, "routes": ["Campus Connector"]}
    }
}

def get_route_info(from_loc, to_loc):
    """Get route information between two locations"""
    if from_loc not in ROUTE_DATA or to_loc not in ROUTE_DATA[from_loc]:
        return None
    
    route = ROUTE_DATA[from_loc][to_loc]
    walk_time = route["walk"]
    bus_time = route["bus"]
    bus_routes = route["routes"]
    
    if bus_time is None:
        return f"From {from_loc} to {to_loc}: {walk_time} minute walk. No bus route available."
    else:
        routes_str = ", ".join(bus_routes)
        return f"From {from_loc} to {to_loc}: {walk_time} minute walk OR {bus_time} minute bus ride on {routes_str}."

def format_all_routes():
    """Format all available routes for context"""
    routes = []
    for from_loc in ROUTE_DATA:
        for to_loc in ROUTE_DATA[from_loc]:
            routes.append(get_route_info(from_loc, to_loc))
    return "\n".join(routes)