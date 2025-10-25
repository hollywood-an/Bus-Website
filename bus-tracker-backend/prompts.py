def build_messages(user_text: str, context: list | None = None):
    msgs = [{"role": "system", "content": (
        "You are an OSU Bus Route assistant. You help students find the best bus routes, "
        "avoid crowded buses, and provide transit tips for Ohio State University campus. "
        "Be helpful, concise, and friendly."
    )}]
    if context:
        msgs.append({"role": "system", "content": "Context:\n" + "\n".join(context)})
    msgs.append({"role": "user", "content": user_text})
    return msgs