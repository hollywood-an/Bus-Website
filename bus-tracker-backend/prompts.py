from routes_data import format_all_routes, get_route_info

def build_messages(user_text, context=None):
    # Include route data in system prompt
    route_info = format_all_routes()
    
    msgs = [{"role": "system", "content": (
        "You are an OSU Bus Route assistant. You help students find the best bus routes, "
        "avoid crowded buses, and provide transit tips for Ohio State University campus. "
        "Be helpful, concise, and friendly.\n\n"
        f"Available locations: Ohio Union, RPAC, Thompson, Traditions at Scott, The Stadium, South Rec.\n\n"
        "Route Information:\n" + route_info
    )}]
    
    if context:
        msgs.append({"role": "system", "content": "Current Status:\n" + "\n".join(context)})
    
    msgs.append({"role": "user", "content": user_text})
    return msgs