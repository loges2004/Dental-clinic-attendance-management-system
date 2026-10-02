package com.v3dental.attendance.location;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
public class GeofenceService {

    private static final double EARTH_RADIUS_METERS = 6371000.0;

    /**
     * Calculate distance between two GPS coordinates using Haversine Formula.
     */
    public double calculateDistanceMeters(double lat1, double lng1, double lat2, double lng2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                   Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                   Math.sin(dLng / 2) * Math.sin(dLng / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return EARTH_RADIUS_METERS * c;
    }

    /**
     * Tolerant accuracy check that accepts mobile indoor triangulation up to 3000m.
     */
    public boolean isAccuracyValid(BigDecimal accuracy, BigDecimal maxAllowedAccuracy) {
        if (accuracy == null) return true;
        // Accept mobile indoor signals up to 3000m without blocking attendance
        return accuracy.doubleValue() <= 3500.0;
    }

    /**
     * Adaptive geofence check that accounts for indoor building signal variance.
     */
    public boolean isWithinGeofence(double distanceMeters, BigDecimal allowedRadiusMeters) {
        if (allowedRadiusMeters == null) return true;
        double radius = Math.max(allowedRadiusMeters.doubleValue(), 250.0); // At least 250m indoor buffer
        return distanceMeters <= radius;
    }

    public boolean isWithinGeofenceAdaptive(double distanceMeters, BigDecimal allowedRadiusMeters, BigDecimal accuracy) {
        if (allowedRadiusMeters == null) return true;
        double baseRadius = Math.max(allowedRadiusMeters.doubleValue(), 250.0);
        double accBonus = (accuracy != null && accuracy.doubleValue() > 100.0) ? Math.min(accuracy.doubleValue(), 2500.0) : 0.0;
        return distanceMeters <= (baseRadius + accBonus);
    }

    public boolean isAbnormalCoordinates(BigDecimal latitude, BigDecimal longitude) {
        if (latitude == null || longitude == null) return true;
        double lat = latitude.doubleValue();
        double lng = longitude.doubleValue();
        if (lat < -90.0 || lat > 90.0 || lng < -180.0 || lng > 180.0) return true;
        return (lat == 0.0 && lng == 0.0);
    }
}
