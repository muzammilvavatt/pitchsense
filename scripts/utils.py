import streamlit as st
from supabase import create_client, Client
from typing import List, Dict, Any, Optional

@st.cache_resource
def init_supabase() -> Optional[Client]:
    """Initialize the Supabase client once per session."""
    try:
        url = st.secrets["SUPABASE_URL"]
        key = st.secrets["SUPABASE_KEY"]
        return create_client(url, key)
    except Exception as e:
        st.error(f"Failed to initialize database connection: {e}")
        return None

@st.cache_data(ttl=60)
def get_upcoming_matches() -> List[Dict[str, Any]]:
    """Fetch upcoming matches that do not have a result yet."""
    supabase = init_supabase()
    if not supabase:
        return []
    try:
        response = supabase.table("matches").select("*").is_("result", "null").order("kickoff").execute()
        return response.data
    except Exception as e:
        st.error(f"Error fetching upcoming matches: {e}")
        return []

@st.cache_data(ttl=60)
def get_machine_insight(match_id: str) -> Optional[str]:
    """Fetch AI-generated tactical insights for a given match."""
    supabase = init_supabase()
    if not supabase:
        return None
    try:
        response = supabase.table("machine_insights").select("insight").eq("match_id", match_id).execute()
        if response.data:
            return response.data[0].get("insight")
        return None
    except Exception as e:
        st.error(f"Error fetching machine insights: {e}")
        return None

@st.cache_data(ttl=60)
def get_leaderboard() -> List[Dict[str, Any]]:
    """Fetch the dynamic leaderboard ranking from the SQL view."""
    supabase = init_supabase()
    if not supabase:
        return []
    try:
        response = supabase.table("leaderboard").select("*").execute()
        return response.data
    except Exception as e:
        st.error(f"Error fetching leaderboard: {e}")
        return []

@st.cache_data(ttl=10)
def get_recent_predictions() -> List[Dict[str, Any]]:
    """Fetch recent predictions for the live debate feed."""
    supabase = init_supabase()
    if not supabase:
        return []
    try:
        response = supabase.table("predictions").select(
            "id, alias, prediction, score_prediction, justification, likes, created_at, matches(home_team, away_team)"
        ).order("created_at", desc=True).limit(50).execute()
        return response.data
    except Exception as e:
        st.error(f"Error fetching live predictions: {e}")
        return []

def submit_prediction(alias: str, match_id: str, prediction: str, score: str, justification: str) -> bool:
    """Submit a pundit prediction to the database."""
    supabase = init_supabase()
    if not supabase:
        return False
    try:
        data = {
            "alias": alias,
            "match_id": match_id,
            "prediction": prediction,
            "score_prediction": score,
            "justification": justification
        }
        supabase.table("predictions").insert(data).execute()
        return True
    except Exception as e:
        st.error(f"Error submitting prediction: {e}")
        return False

def upvote_prediction(prediction_id: str) -> bool:
    """Increment the likes counter for a specific prediction."""
    supabase = init_supabase()
    if not supabase:
        return False
    try:
        # Fetch current likes and increment
        response = supabase.table("predictions").select("likes").eq("id", prediction_id).execute()
        if response.data:
            current_likes = response.data[0].get("likes", 0)
            supabase.table("predictions").update({"likes": current_likes + 1}).eq("id", prediction_id).execute()
            return True
        return False
    except Exception as e:
        st.error(f"Error processing upvote: {e}")
        return False
