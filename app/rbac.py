# app/rbac.py

def create_filter(user_role: str, authenticated_user_id: str, target_patient_id: str = None):
    """
    Role-Based Access Control (RBAC) Logic.
    Generates a ChromaDB 'where' filter or an error message.
    
    Args:
        user_role: The role of the person logged in ('doctor' or 'patient').
        authenticated_user_id: The ID of the person currently logged in.
        target_patient_id: The ID of the record they are trying to see.
    """
    
    # 1. Patient Logic: Zero Trust
    # A patient is restricted to their own ID, period.
    if user_role == "patient":
        if authenticated_user_id != target_patient_id:
            return "❌ Unauthorized: Patients can only access their own medical records."
        
        return {"patient_id": authenticated_user_id}
        
    # 2. Doctor Logic: Professional Access
    # Doctors can view any specific patient record requested.
    elif user_role == "doctor":
        if target_patient_id:
            return {"patient_id": target_patient_id}
        else:
            # If no specific patient is targeted, a doctor can search the whole collection
            return {} 
            
    # 3. Guardrail for undefined roles
    else:
        return "❌ Unauthorized: Access Denied. Role not recognized."