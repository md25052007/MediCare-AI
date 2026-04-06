import os
import json
import chromadb
from tqdm import tqdm
from datetime import datetime, timedelta, timezone
from medical_encoder import MedicalBERT

# ===============================
# CONFIGAA
# ===============================
DATA_FOLDER = "./datasetkaggle"
DB_PATH = "./medical_db"
COLLECTION_NAME = "ehr_collection"
BATCH_SIZE = 500   # Adjust (500–1000 ideal)

SYNTHETIC_BASE_DATE = datetime(2010, 1, 1, tzinfo=timezone.utc)

# ===============================
# INIT
# ===============================
chroma_client = chromadb.PersistentClient(path=DB_PATH)
collection = chroma_client.get_or_create_collection(
    name=COLLECTION_NAME,
    metadata={"hnsw:space": "cosine"}
)

encoder = MedicalBERT()


# ===============================
# SAFE DATE PARSER
# ===============================
def parse_date(date_str):
    try:
        dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        else:
            dt = dt.astimezone(timezone.utc)
        return dt
    except:
        return None


# ===============================
# PARSE SINGLE FILE
# ===============================
def parse_fhir(file_path):

    with open(file_path, "r") as f:
        bundle = json.load(f)

    attrs = {
        "patient_id": "unknown",
        "birth_date": "unknown",
        "gender": "unknown",
        "diagnosis_list": [],
        "last_glucose_value": None,
        "last_bp_systolic_value": None,
        "last_weight_value": None
    }

    encounter_date = None
    latest_obs_date = None

    for entry in bundle.get("entry", []):
        resource = entry.get("resource", {})
        rtype = resource.get("resourceType")

        if rtype == "Patient":
            attrs["patient_id"] = resource.get("id", "unknown")
            attrs["birth_date"] = resource.get("birthDate", "unknown")
            attrs["gender"] = resource.get("gender", "unknown")

        elif rtype == "Encounter":
            encounter_date = parse_date(
                resource.get("period", {}).get("start", "")
            )

        elif rtype == "Condition":
            try:
                name = resource["code"]["coding"][0]["display"]
                attrs["diagnosis_list"].append(name)
            except:
                pass

        elif rtype == "Observation":

            obs_date = parse_date(resource.get("effectiveDateTime", ""))
            if obs_date:
                if not latest_obs_date or obs_date > latest_obs_date:
                    latest_obs_date = obs_date

            val = resource.get("valueQuantity", {}).get("value")
            code = resource.get("code", {}).get("coding", [{}])[0]
            display = code.get("display", "").lower()

            if val is None or not isinstance(val, (int, float)):
                continue

            if "glucose" in display:
                attrs["last_glucose_value"] = val
            if "systolic" in display or "blood pressure" in display:
                attrs["last_bp_systolic_value"] = val
            if "weight" in display:
                attrs["last_weight_value"] = val

    attrs["diagnosis_list"] = list(set(attrs["diagnosis_list"]))

    visit_date = encounter_date or latest_obs_date

    return attrs, visit_date


# ===============================
# MAIN PIPELINE
# ===============================
def process_and_store(root_folder):

    json_files = []
    for root, _, files in os.walk(root_folder):
        for file in files:
            if file.endswith(".json"):
                json_files.append(os.path.join(root, file))

    json_files.sort()
    print(f"Found {len(json_files)} files.")

    batch_ids = []
    batch_embeddings = []
    batch_documents = []
    batch_metadatas = []

    synthetic_counter = {}

    for file_path in tqdm(json_files):

        try:
            attrs, visit_date_obj = parse_fhir(file_path)

            if attrs["patient_id"] == "unknown":
                continue

            pid = attrs["patient_id"]

            # Synthetic date if missing
            if not visit_date_obj:
                if pid not in synthetic_counter:
                    synthetic_counter[pid] = 0
                visit_date_obj = SYNTHETIC_BASE_DATE + timedelta(
                    days=30 * synthetic_counter[pid]
                )
                synthetic_counter[pid] += 1

            visit_date = visit_date_obj.isoformat()

            diagnoses = attrs["diagnosis_list"]
            primary_diag = diagnoses[0] if diagnoses else None
            diag_count = len(diagnoses)

            glucose = attrs["last_glucose_value"]
            bp = attrs["last_bp_systolic_value"]
            weight = attrs["last_weight_value"]

            risk_flags = []
            if glucose and glucose > 126:
                risk_flags.append("diabetes")
            if bp and bp > 140:
                risk_flags.append("hypertension")
            if weight and weight > 100:
                risk_flags.append("obesity")

            # -------- Narrative --------
            narrative = []

            if attrs["birth_date"] != "unknown":
                narrative.append(f"Born on {attrs['birth_date']}")
            if attrs["gender"] != "unknown":
                narrative.append(f"Gender {attrs['gender']}")
            if glucose:
                narrative.append(f"Glucose level {glucose} mg/dL")
            if bp:
                narrative.append(f"Systolic BP {bp} mmHg")
            if weight:
                narrative.append(f"Weight {weight} kg")

            for d in diagnoses:
                narrative.append(f"Diagnosis: {d}")

            full_text = ". ".join(narrative)

            vector = encoder.get_embedding(full_text)
            visit_id = f"{pid}_{visit_date}"

            batch_ids.append(visit_id)
            batch_embeddings.append(vector)
            batch_documents.append(full_text)
            batch_metadatas.append({
                "patient_id": pid,
                "visit_date": visit_date,
                "birth_date": attrs["birth_date"],
                "gender": attrs["gender"],
                "last_glucose_value": glucose,
                "last_bp_systolic_value": bp,
                "last_weight_value": weight,
                "primary_diagnosis": primary_diag or "N/A",
                "diagnosis_count": diag_count,
                "risk_flags": ", ".join(risk_flags) if risk_flags else None,
                "last_updated": visit_date
            })

            # -------- Batch Insert --------
            if len(batch_ids) >= BATCH_SIZE:
                collection.upsert(
                    ids=batch_ids,
                    embeddings=batch_embeddings,
                    documents=batch_documents,
                    metadatas=batch_metadatas
                )
                batch_ids, batch_embeddings, batch_documents, batch_metadatas = [], [], [], []

        except Exception as e:
            print(f"Error: {file_path} → {e}")

    # Final flush
    if batch_ids:
        collection.upsert(
            ids=batch_ids,
            embeddings=batch_embeddings,
            documents=batch_documents,
            metadatas=batch_metadatas
        )

    print("Indexing complete.")
    print("Total records:", collection.count())


# ===============================
# RUN
# ===============================
process_and_store(DATA_FOLDER)