import os
import pickle
import numpy as np
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS so frontend on port 8080 can communicate with port 5000

# Load models and metadata
print("Loading models and metadata...")
base_dir = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(base_dir, "clf_model.pkl"), "rb") as f:
    clf_model = pickle.load(f)
with open(os.path.join(base_dir, "gbr_model.pkl"), "rb") as f:
    gbr_model = pickle.load(f)
with open(os.path.join(base_dir, "model_metadata.pkl"), "rb") as f:
    model_metadata = pickle.load(f)

feature_columns = model_metadata["feature_columns"]
station_id_counts = model_metadata["station_id_counts"]
amenities_nearby_counts = model_metadata["amenities_nearby_counts"]
categorical_cols = model_metadata["categorical_cols"]

from city_areas import AREA_COORDINATES

# Load raw dataset for station selection and search mapping
print("Loading dataset for station lookups...")
data_path = os.path.join(os.path.dirname(base_dir), "Dataset", "EV_Charging_80_20_Balanced.csv")
if not os.path.exists(data_path):
    data_path = os.path.join("Dataset", "EV_Charging_80_20_Balanced.csv")
if not os.path.exists(data_path):
    data_path = "EV_Charging_80_20_Balanced.csv"
raw_data = pd.read_csv(data_path)

# Extract stations with coordinates, names, and static properties
# Drop duplicates based on station_id to get distinct stations
unique_stations = raw_data.drop_duplicates(subset=["station_id"]).copy()
print(f"Loaded {len(unique_stations)} unique stations.")

def predict_wait_time(features_df):
    """Predicts wait time using the two-part classification/regression model."""
    # Step 1: Predict if there will be a wait
    is_wait = clf_model.predict(features_df)[0]
    if is_wait == 1:
        # Step 2: Predict actual wait time
        wait_time = gbr_model.predict(features_df)[0]
        return max(0, float(wait_time))
    return 0.0

def get_station_features(station_row):
    """Converts a raw dataset row into the exact feature format expected by the model."""
    # Create empty series with all zero features of float type to avoid strict assignment errors
    features = pd.Series(0.0, index=feature_columns, dtype=float)
    
    # Fill numerical values
    numerical_cols = [
        "power_output_kw", "ports_total", "ports_available", "ports_occupied",
        "ports_out_of_service", "utilization_rate", "avg_session_duration_mins",
        "current_price", "temperature_f", "precipitation_mm", "gas_price_per_gallon",
        "traffic_congestion_index", "is_weekend", "is_peak_hour", "hour_of_day",
        "day_of_week", "month"
    ]
    for col in numerical_cols:
        if col in station_row:
            # Handle possible nan or null values
            val = station_row[col]
            features[col] = float(val) if not pd.isna(val) else 0.0

    # OVERRIDE historical dataset time with LIVE system time for accurate predictions
    from datetime import datetime
    now = datetime.now()
    features["hour_of_day"] = float(now.hour)
    features["day_of_week"] = float(now.weekday()) # 0=Monday, 6=Sunday
    features["month"] = float(now.month)
    features["is_weekend"] = 1.0 if now.weekday() >= 5 else 0.0
    features["is_peak_hour"] = 1.0 if (7 <= now.hour <= 10 or 16 <= now.hour <= 19) else 0.0

    # Frequency encoding
    sid = station_row["station_id"]
    features["station_id_freq_encoded"] = station_id_counts.get(sid, 1)

    amenities = station_row["amenities_nearby"]
    features["amenities_nearby_freq_encoded"] = amenities_nearby_counts.get(amenities, 1)

    # One-hot encoding features
    for col in categorical_cols:
        val = station_row[col]
        if not pd.isna(val):
            dummy_col = f"{col}_{val}"
            if dummy_col in features.index:
                features[dummy_col] = 1

    # Convert to DataFrame
    return pd.DataFrame([features])

def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate the great circle distance between two points in kilometers."""
    R = 6371.0 # Earth radius in kilometers
    dlat = np.radians(lat2 - lat1)
    dlon = np.radians(lon2 - lon1)
    a = np.sin(dlat/2)**2 + np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) * np.sin(dlon/2)**2
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))
    return R * c

@app.route("/api/recommend", methods=["POST"])
def recommend():
    try:
        req_data = request.get_json()
        city = req_data.get("city")
        area = req_data.get("area")
        charger_type = req_data.get("charger_type")

        if not city or not charger_type:
            return jsonify({"error": "Missing city or charger_type"}), 400

        print(f"Request received for City: {city}, Area: {area}, Charger Type: {charger_type}")

        # Filter stations matching city and charger type
        # Match case-insensitively just in case
        matching_stations = unique_stations[
            (unique_stations["city"].str.lower() == city.lower()) &
            (unique_stations["charger_type"].str.lower() == charger_type.lower())
        ].copy()

        # If we have no matching stations, fall back to matching by city only
        if matching_stations.empty:
            matching_stations = unique_stations[
                unique_stations["city"].str.lower() == city.lower()
            ].copy()

        # If still empty, use all unique stations
        if matching_stations.empty:
            matching_stations = unique_stations.copy()

        # Determine the user's location based on the selected area
        user_lat, user_lon = None, None
        if city in AREA_COORDINATES and area in AREA_COORDINATES[city]:
            user_lat, user_lon = AREA_COORDINATES[city][area]
            print(f"Using predefined coordinates for {city} - {area}: {user_lat}, {user_lon}")
        else:
            # Fallback to mean coords of matching stations
            user_lat = matching_stations["latitude"].mean()
            user_lon = matching_stations["longitude"].mean()
            print(f"Using mean coordinates: {user_lat}, {user_lon}")

        stations_list = []
        for idx, row in matching_stations.iterrows():
            # Get features for the model
            features_df = get_station_features(row)
            # Predict wait time
            predicted_wait = predict_wait_time(features_df)
            
            # Calculate distance
            dist = haversine_distance(user_lat, user_lon, row["latitude"], row["longitude"])
            
            # Extract basic station fields
            ports_avail = int(row["ports_available"])
            ports_total = int(row["ports_total"])
            price = float(row["current_price"])
            
            # Calculate a recommendation score from 1.0 to 9.9
            # Use tuned weights so massive wait times don't push the score into negatives before clamping!
            score = 9.5 - (predicted_wait * 0.05) - (price * 2.0) - (dist * 0.1) + (ports_avail * 0.5)
            
            # If ports are 0, we still want to score them relative to each other 
            # in case they are the only options left, but we scale it down heavily.
            if ports_avail == 0:
                score = score * 0.4
                
            score = max(1.0, min(9.9, score))

            stations_list.append({
                "station_id": row["station_id"],
                "station_name": row["station_name"],
                "charger_type": row["charger_type"],
                "predicted_wait_min": predicted_wait,
                "distance_km": dist,
                "available_ports": ports_avail,
                "total_ports": ports_total,
                "cost_per_kwh": round(price, 2),
                "score": round(score, 1)
            })

        # Ensure wait time is strictly an integer with no decimals
        for s in stations_list:
            s["predicted_wait_min"] = int(round(s["predicted_wait_min"]))

        # Unique selection logic with tie-breaking
        used_station_ids = set()
        
        def get_best_station(candidates, sort_keys, reason_text):
            if not candidates:
                return None
            
            # Try to find an unused station with available ports > 0
            valid_pool = [c for c in candidates if c["station_id"] not in used_station_ids and c["available_ports"] > 0]
            
            # If all unused stations have 0 ports, fall back to any unused station
            if not valid_pool:
                valid_pool = [c for c in candidates if c["station_id"] not in used_station_ids]
                
            # If all stations are used, fall back to ANY station with > 0 ports
            if not valid_pool:
                valid_pool = [c for c in candidates if c["available_ports"] > 0]
                
            # Absolute last resort: just pick from whatever candidates exist
            pool = valid_pool if valid_pool else candidates
            
            # Sort by provided keys (we negate available_ports and score because higher is better)
            pool.sort(key=lambda x: tuple(x[k] * (1 if k != "score" and k != "available_ports" else -1) for k in sort_keys))
            winner = pool[0]
            
            # Mark as used
            used_station_ids.add(winner["station_id"])
            
            winner_copy = dict(winner)
            winner_copy["reason"] = reason_text
            return winner_copy

        # 1. Best Overall
        best_overall = get_best_station(
            stations_list, 
            sort_keys=["score", "predicted_wait_min", "distance_km"],
            reason_text="Selected because it has the highest combined score based on wait time, distance, cost, and availability."
        )

        # 2. Lowest Wait Time
        lowest_wait = get_best_station(
            stations_list,
            sort_keys=["predicted_wait_min", "distance_km", "cost_per_kwh"],
            reason_text="Selected because it has the lowest predicted waiting time among all matching stations."
        )

        # 3. Closest Station
        closest = get_best_station(
            stations_list,
            sort_keys=["distance_km", "predicted_wait_min", "cost_per_kwh"],
            reason_text="Selected because it is the closest charging station to the chosen area."
        )

        # 4. Lowest Cost
        lowest_cost = get_best_station(
            stations_list,
            sort_keys=["cost_per_kwh", "predicted_wait_min", "distance_km"],
            reason_text="Selected because it has the lowest charging cost per kWh."
        )

        result = {
            "best_overall": best_overall,
            "lowest_wait": lowest_wait,
            "closest": closest,
            "lowest_cost": lowest_cost
        }

        print("Recommendations prepared successfully:")
        print(f"  Best Overall: {best_overall['station_name']} (Wait: {best_overall['predicted_wait_min']}m, Score: {best_overall['score']})")
        print(f"  Lowest Wait: {lowest_wait['station_name']} (Wait: {lowest_wait['predicted_wait_min']}m)")
        print(f"  Closest: {closest['station_name']} (Distance: {closest['distance_km']}km)")
        print(f"  Lowest Cost: {lowest_cost['station_name']} (Cost: ${lowest_cost['cost_per_kwh']}/kWh)")

        return jsonify(result)

    except Exception as e:
        print(f"Error serving recommendation: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(port=5000, debug=True)
