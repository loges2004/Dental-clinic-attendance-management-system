package com.v3dental.attendance.location;

import com.v3dental.attendance.branch.Branch;
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

    public boolean isAccuracyValid(BigDecimal accuracy, BigDecimal maxAllowedAccuracy) {
        if (accuracy == null || maxAllowedAccuracy == null) return false;
        return accuracy.compareTo(maxAllowedAccuracy) <= 0;
    }

    public boolean isWithinGeofence(double distanceMeters, BigDecimal allowedRadiusMeters) {
        if (allowedRadiusMeters == null) return false;
        return distanceMeters <= allowedRadiusMeters.doubleValue();
    }

    public boolean isAbnormalCoordinates(BigDecimal latitude, BigDecimal longitude) {
        if (latitude == null || longitude == null) return true;
        double lat = latitude.doubleValue();
        double lng = longitude.doubleValue();
        // Check invalid or impossible zero coordinates
        if (lat < -90.0 || lat > 90.0 || lng < -180.0 || lng > 180.0) return true;
        return (lat == 0.0 && lng == 0.0);
    }
}
