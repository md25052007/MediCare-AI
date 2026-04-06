import os
import json
import csv
from tqdm import tqdm

DATA_FOLDER = "./datasetkaggle"
OUTPUT_CSV = "patient_structured_data.csv"

def parse_only_for_csv(file_path):
    with open(file_path, 'r') as f:
        bundle = json.load(f)
    attrs = {"patient_id": "unknown", "gender": "unknown", "birth_date": "unknown"}
    for entry in bundle.get('entry', []):
        res = entry.get('resource', {})
        if res.get('resourceType') == 'Patient':
            attrs["patient_id"] = res.get('id', 'unknown')
            attrs["gender"] = res.get('gender', 'unknown')
            attrs["birth_date"] = res.get('birthDate', 'unknown')
            break
    return attrs

# Fast processing loop (No Vectors/Embeddings)
json_files = [os.path.join(r, f) for r, d, fs in os.walk(DATA_FOLDER) for f in fs if f.endswith(".json")]
csv_rows = []

print("Extracting CSV data quickly...")
for file_path in tqdm(json_files):
    try:
        csv_rows.append(parse_only_for_csv(file_path))
    except:
        continue

# Save to CSV
if csv_rows:
    with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=csv_rows[0].keys())
        writer.writeheader()
        writer.writerows(csv_rows)
    print(f"✅ CSV SUCCESS: {os.path.abspath(OUTPUT_CSV)}")