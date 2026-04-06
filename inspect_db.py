import chromadb
import json

# ===============================
# 1. CONNECT TO YOUR DATABASE
# ===============================
DB_PATH = "./medical_db"
COLLECTION_NAME = "ehr_collection"

print("🔌 Connecting to ChromaDB...")
client = chromadb.PersistentClient(path=DB_PATH)
collection = client.get_collection(name=COLLECTION_NAME)

# ===============================
# 2. CHECK TOTAL COUNT
# ===============================
total_records = collection.count()
print(f"📊 Total records in database: {total_records}\n")

if total_records == 0:
    print("⚠️ The database is empty! Did you run the ingestion script?")
    exit()

# ===============================
# 3. PEEK AT THE DATA
# ===============================
# .peek() grabs the first few records in the database
print("--- 🔍 PEEKING AT 2 SAMPLE RECORDS ---")
sample = collection.peek(limit=2)

for i in range(len(sample['ids'])):
    print(f"🆔 ID: {sample['ids'][i]}")
    
    # Print the Metadata we cleaned up earlier
    print("🗂️ METADATA:")
    print(json.dumps(sample['metadatas'][i], indent=2))
    
    # Print the Text that the AI reads
    print(f"📄 DOCUMENT (The meaning): \n   {sample['documents'][i]}")
    
    # We won't print the actual numbers because printing 768 decimals will flood your terminal, 
    # but we can check the length to prove the AI embedded it correctly!
    print(f"🧠 EMBEDDING SIZE: {len(sample['embeddings'][i])} dimensions\n")
    print("-" * 40)