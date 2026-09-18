"""
AccessPath-AI — campus wayfinding data + pathfinder.

IMPORTANT: The NODES and EDGES below are a SAMPLE layout representing a
typical engineering-college campus (main gate, blocks, library, canteen,
hostel, medical room). They are NOT a verified survey of Paavai
Engineering College. Before real use, an admin should walk the campus,
replace/extend NODES and EDGES with actual building names, distances (in
metres) and accessibility features (ramp / lift / level ground / steps),
via the /admin panel or by editing this file directly.
"""

import heapq

# node_id: (display name, category, accessible amenities present here)
NODES = {
    "main_gate":      {"name": "Main Gate", "category": "entrance", "notes": "Security desk can call an escort."},
    "admin_block":     {"name": "Administrative Block", "category": "block", "notes": "Ramp at east entrance; lift to all floors."},
    "cse_block":       {"name": "CSE Block", "category": "block", "notes": "Ramp at main entrance; lift to floors 1-4."},
    "ece_block":       {"name": "ECE Block", "category": "block", "notes": "Ramp at main entrance; ground floor only is step-free."},
    "mech_block":      {"name": "Mechanical Block", "category": "block", "notes": "Level, wide corridors; workshop floor is step-free."},
    "library":         {"name": "Central Library", "category": "block", "notes": "Ramp entrance; accessible reading desks near entrance; braille-ready material at help desk."},
    "canteen":         {"name": "Canteen", "category": "amenity", "notes": "Level access from main path."},
    "auditorium":      {"name": "Auditorium", "category": "block", "notes": "Ramp entrance; reserved accessible seating in front rows."},
    "hostel_boys":     {"name": "Boys Hostel", "category": "block", "notes": "Ramp at entrance; ground-floor accessible rooms available."},
    "hostel_girls":    {"name": "Girls Hostel", "category": "block", "notes": "Ramp at entrance; ground-floor accessible rooms available."},
    "medical_room":    {"name": "Medical Room", "category": "amenity", "notes": "Level access; first point of contact for medical needs."},
    "accessible_toilet_1": {"name": "Accessible Toilet — near CSE Block", "category": "toilet", "notes": "Wheelchair-accessible, grab rails fitted."},
    "accessible_toilet_2": {"name": "Accessible Toilet — near Library", "category": "toilet", "notes": "Wheelchair-accessible, grab rails fitted."},
    "bus_stop":        {"name": "Campus Bus Stop", "category": "transport", "notes": "Low-floor shuttle available on request; tell the driver you need boarding assistance."},
}

# (from, to, distance_metres, accessible, path_type)
EDGES = [
    ("main_gate", "admin_block", 80, True, "level paved path"),
    ("main_gate", "bus_stop", 30, True, "level paved path"),
    ("admin_block", "cse_block", 120, True, "level paved path with ramp at CSE entrance"),
    ("admin_block", "auditorium", 90, True, "level paved path"),
    ("cse_block", "ece_block", 60, True, "level paved path"),
    ("cse_block", "library", 100, True, "level paved path with ramp at library entrance"),
    ("cse_block", "accessible_toilet_1", 25, True, "level paved path"),
    ("ece_block", "mech_block", 140, False, "path includes a flight of stairs — use the cse_block/library route instead"),
    ("ece_block", "canteen", 70, True, "level paved path"),
    ("library", "accessible_toilet_2", 20, True, "level paved path"),
    ("library", "canteen", 110, True, "level paved path"),
    ("canteen", "hostel_boys", 200, True, "level paved path"),
    ("canteen", "hostel_girls", 220, True, "level paved path"),
    ("hostel_boys", "medical_room", 60, True, "level paved path"),
    ("hostel_girls", "medical_room", 80, True, "level paved path"),
    ("auditorium", "mech_block", 150, True, "level paved path"),
    ("mech_block", "medical_room", 180, True, "level paved path"),
]


def _build_graph(accessible_only=True):
    graph = {node_id: [] for node_id in NODES}
    for a, b, dist, accessible, path_type in EDGES:
        if accessible_only and not accessible:
            continue
        graph[a].append((b, dist, path_type))
        graph[b].append((a, dist, path_type))
    return graph


def find_route(start_id, end_id, accessible_only=True):
    """Dijkstra shortest path. Returns dict with steps + total distance, or None."""
    if start_id not in NODES or end_id not in NODES:
        return None

    graph = _build_graph(accessible_only=accessible_only)

    distances = {node_id: float("inf") for node_id in NODES}
    distances[start_id] = 0
    previous = {}
    visited = set()
    queue = [(0, start_id)]

    while queue:
        dist, current = heapq.heappop(queue)
        if current in visited:
            continue
        visited.add(current)

        if current == end_id:
            break

        for neighbor, weight, path_type in graph[current]:
            new_dist = dist + weight
            if new_dist < distances[neighbor]:
                distances[neighbor] = new_dist
                previous[neighbor] = (current, path_type, weight)
                heapq.heappush(queue, (new_dist, neighbor))

    if distances[end_id] == float("inf"):
        return None

    # Reconstruct path
    path = [end_id]
    node = end_id
    steps = []
    while node != start_id:
        prev_node, path_type, weight = previous[node]
        steps.append({
            "from": prev_node,
            "from_name": NODES[prev_node]["name"],
            "to": node,
            "to_name": NODES[node]["name"],
            "distance": weight,
            "path_type": path_type,
        })
        node = prev_node
        path.append(node)

    steps.reverse()
    path.reverse()

    return {
        "start": NODES[start_id]["name"],
        "end": NODES[end_id]["name"],
        "total_distance": distances[end_id],
        "steps": steps,
        "path_ids": path,
    }


def list_locations():
    return [
        {"id": node_id, "name": data["name"], "category": data["category"], "notes": data["notes"]}
        for node_id, data in sorted(NODES.items(), key=lambda kv: kv[1]["name"])
    ]
