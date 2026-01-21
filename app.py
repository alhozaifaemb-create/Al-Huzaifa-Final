import streamlit as st
import pandas as pd
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, firestore

# --- 1. FIREBASE CONNECTION (CACHED FOR SPEED) ---
# Ye '@st.cache_resource' line sabse zaroori hai. 
# Ye connection ko memory mein rakhta hai taaki app fast chale.
@st.cache_resource
def init_firebase():
    if not firebase_admin._apps:
        try:
            cred = credentials.Certificate("firebase_key.json") 
            return firebase_admin.initialize_app(cred)
        except Exception as e:
            return None
    return firebase_admin.get_app()

# Initialize Connection
app = init_firebase()

if app:
    db = firestore.client()
else:
    st.error("⚠️ Firebase connect nahi ho paya. Key check karein.")
    st.stop()

# --- 2. CONFIGURATION & THEME ---
st.set_page_config(page_title="AL HUZAIFA CLOUD", layout="wide")

# Theme Styling
st.markdown("""
    <style>
    .main-title { color: #1E8449; font-weight: bold; font-size: 35px; text-align: center; margin-bottom: 0px;}
    .stButton>button { background-color: #1E8449; color: white; width: 100%; border-radius: 5px; }
    div[data-testid="stMetricValue"] { color: #1E8449; }
    </style>
    """, unsafe_allow_html=True)

# Session State Setup
if "logged_in" not in st.session_state: st.session_state.logged_in = False
if "email" not in st.session_state: st.session_state.email = ""
if "temp_items" not in st.session_state: st.session_state.temp_items = [{"name":"", "rate":0.0}]

# --- 3. LOGIN SCREEN ---
if not st.session_state.logged_in:
    st.markdown("<br><h2 style='text-align:center; color:#1E8449;'>🔐 AL HUZAIFA LOGIN</h2>", unsafe_allow_html=True)
    c1, c2, c3 = st.columns([1,2,1])
    with c2:
        email_input = st.text_input("Email ID")
        if st.button("Login"):
            if email_input:
                st.session_state.email = email_input.lower().strip()
                st.session_state.logged_in = True
                st.rerun()
    st.stop()

# --- 4. MAIN DASHBOARD ---
st.markdown('<p class="main-title">AL HUZAIFA DIGITAL</p>', unsafe_allow_html=True)
st.caption(f"Logged in as: {st.session_state.email}")

tabs = st.tabs(["🏠 Dashboard", "📝 New Bill", "📜 History", "💳 Workers", "📦 Samples"])

# === TAB 1: DASHBOARD ===
with tabs[0]:
    st.subheader("📊 Business Overview")
    if st.button("🔄 Refresh Data"):
        st.rerun()
    
    # Load Data safely
    try:
        docs = db.collection('orders').where('email', '==', st.session_state.email).stream()
        orders_list = [doc.to_dict() for doc in docs]
        
        if orders_list:
            total_sales = sum(o.get('total', 0) for o in orders_list)
            cols = st.columns(3)
            cols[0].metric("Total Revenue", f"AED {total_sales:,.2f}")
            cols[1].metric("Total Orders", len(orders_list))
        else:
            st.info("Abhi koi data nahi hai. 'New Bill' banayein.")
    except Exception as e:
        st.error(f"Error loading data: {e}")

# === TAB 2: NEW BILL ===
with tabs[1]:
    st.subheader("📝 Create Bill")
    c1, c2 = st.columns(2)
    cust_name = c1.text_input("Customer Name")
    mobile = c2.text_input("Mobile No")

    # Item Entry Loop
    for i, item in enumerate(st.session_state.temp_items):
        ic1, ic2 = st.columns([3, 1])
        item['name'] = ic1.text_input(f"Item {i+1}", key=f"n{i}", value=item['name'])
        item['rate'] = ic2.number_input(f"Rate", key=f"r{i}", min_value=0.0, step=10.0, value=item['rate'])

    # Add Button
    if st.button("➕ Add Item"):
        st.session_state.temp_items.append({"name":"", "rate":0.0})
        st.rerun()

    # Total Calculation
    total = sum(i['rate'] for i in st.session_state.temp_items)
    st.markdown(f"### Total: <span style='color:#1E8449'>AED {total:,.2f}</span>", unsafe_allow_html=True)

    # Save Button
    if st.button("💾 SAVE BILL"):
        if cust_name and total > 0:
            new_order = {
                "email": st.session_state.email,
                "customer": cust_name,
                "mobile": mobile,
                "items": st.session_state.temp_items,
                "total": total,
                "date": str(datetime.now())[:19] # Simple date format
            }
            try:
                db.collection('orders').add(new_order)
                st.success("✅ Bill Saved Successfully!")
                st.session_state.temp_items = [{"name":"", "rate":0.0}] # Reset
                # Auto-refresh nahi karenge taaki success message dikhe
            except Exception as e:
                st.error(f"Saving Error: {e}")
        else:
            st.warning("Customer Name aur Items fill karein.")

# === TAB 3: HISTORY ===
with tabs[2]:
    st.subheader("📜 Bill History")
    if st.button("Load History"):
        docs = db.collection('orders').where('email', '==', st.session_state.email).order_by('date', direction=firestore.Query.DESCENDING).stream()
        data = [d.to_dict() for d in docs]
        if data:
            st.dataframe(pd.DataFrame(data)[['date', 'customer', 'total', 'mobile']], use_container_width=True)
        else:
            st.write("No history found.")

# === TAB 4: WORKERS ===
with tabs[3]:
    st.subheader("💳 Workers")
    w_name = st.text_input("Worker Name")
    if st.button("Add Worker"):
        if w_name:
            db.collection('workers').add({"email": st.session_state.email, "name": w_name})
            st.success("Worker Added")
            
# === TAB 5: SAMPLES ===
with tabs[4]:
    st.subheader("📦 Samples")
    st.info("Sample photo upload coming soon.")
    st.camera_input("Camera")