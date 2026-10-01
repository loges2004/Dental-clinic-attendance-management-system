# GPS & Attendance Engine Specification

## Haversine Distance Formula
$$d = 2r \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)}\right)$$
where $r = 6371000\text{ meters}$.

## Geofence Validation Steps
1. Capture client lat/lng & accuracy.
2. Read assigned branch latitude, longitude, `allowed_radius_meters`, `max_gps_accuracy_meters`.
3. If `accuracy > max_gps_accuracy_meters`, reject check-in with code `POOR_GPS_ACCURACY`.
4. Calculate Haversine distance $d$. If $d > \text{allowed\_radius\_meters}$, reject check-in with code `OUTSIDE_GEOFENCE`.
5. Attach server timestamp (`Asia/Kolkata` / UTC internally).
6. Calculate shift status (`PRESENT`, `LATE`, `EARLY_CHECKOUT`).
7. Save single attendance record per day per employee.
