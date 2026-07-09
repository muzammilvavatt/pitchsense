import streamlit as st
from datetime import datetime
from utils import (
    get_upcoming_matches,
    get_machine_insight,
    submit_prediction,
    get_recent_predictions,
    get_leaderboard,
    upvote_prediction
)

def show_alias_setup():
    """Render the landing page for user alias setup."""
    st.title("⚽ Football Pundit")
    st.subheader("Join the Ultimate Football Debate")
    
    with st.container():
        st.write("Enter your Pundit Alias to start predicting and climbing the leaderboard.")
        with st.form("alias_form"):
            alias = st.text_input("Pundit Alias", max_chars=50, placeholder="e.g., TacticalGenius99")
            submitted = st.form_submit_button("Start Punditry")
            
            if submitted:
                if alias.strip():
                    st.session_state["alias"] = alias.strip()
                    st.rerun()
                else:
                    st.error("Please enter a valid alias to continue.")

def show_ai_vs_human(match_id: str):
    """Render the two-column AI vs Human tactical analysis."""
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("### 🤖 Machine Insight")
        insight = get_machine_insight(match_id)
        if insight:
            st.info(insight)
        else:
            st.write("No AI tactical insights available for this fixture.")
            
    with col2:
        st.markdown("### 🗣️ Analyst Justification")
        st.write("Provide your tactical reasoning in the prediction form below.")

def show_match_hub():
    """Render the Match Hub displaying upcoming matches and prediction forms."""
    st.header("🏟️ Match Hub")
    matches = get_upcoming_matches()
    
    if not matches:
        st.info("No upcoming matches found. Check back soon!")
        return
        
    for match in matches:
        with st.container(border=True):
            st.subheader(f"{match['home_team']} vs {match['away_team']}")
            
            try:
                kickoff_dt = datetime.fromisoformat(match['kickoff'].replace("Z", "+00:00"))
                st.caption(f"Kickoff: {kickoff_dt.strftime('%B %d, %Y - %H:%M')}")
            except ValueError:
                st.caption(f"Kickoff: {match['kickoff']}")
                
            show_ai_vs_human(match['id'])
            
            with st.expander("📝 Make Your Prediction"):
                with st.form(f"form_{match['id']}"):
                    pred_winner = st.selectbox("Predicted Winner", [match['home_team'], match['away_team'], "Draw"])
                    score_pred = st.text_input("Score Prediction (e.g., 2-1)", max_chars=10)
                    justification = st.text_area("Tactical Justification", placeholder="Why do you think this will happen?")
                    
                    if st.form_submit_button("Submit Prediction"):
                        if score_pred.strip() and justification.strip():
                            if submit_prediction(
                                st.session_state["alias"], 
                                match['id'], 
                                pred_winner, 
                                score_pred, 
                                justification
                            ):
                                st.success("Prediction submitted successfully!")
                                st.cache_data.clear() # Refresh feeds
                        else:
                            st.error("Please provide both a score prediction and a justification.")
            st.divider()

@st.fragment
def show_live_debate_feed():
    """Render the live debate feed using fragments for quick localized updates."""
    st.header("🔥 Live Debate Feed")
    predictions = get_recent_predictions()
    
    if not predictions:
        st.info("No predictions yet. Head to the Match Hub to be the first!")
        return
        
    for p in predictions:
        match_data = p.get("matches", {})
        home = match_data.get("home_team", "Unknown")
        away = match_data.get("away_team", "Unknown")
        
        with st.container(border=True):
            st.markdown(f"**{p['alias']}** predicts **{p['prediction']}** ({p['score_prediction']}) for *{home} vs {away}*")
            st.write(f"_{p['justification']}_")
            
            col1, col2 = st.columns([1, 6])
            with col1:
                if st.button(f"👍 {p.get('likes', 0)}", key=f"like_{p['id']}"):
                    if upvote_prediction(p['id']):
                        st.cache_data.clear()
                        st.rerun(scope="fragment")

@st.fragment
def show_leaderboard():
    """Render the dynamic leaderboard ranking using fragments."""
    st.header("🏆 Top Pundits Leaderboard")
    leaderboard = get_leaderboard()
    
    if not leaderboard:
        st.info("The leaderboard is currently empty.")
        return
        
    for index, row in enumerate(leaderboard):
        with st.container(border=True):
            col1, col2, col3, col4 = st.columns([1, 3, 2, 2])
            col1.metric("Rank", f"#{index + 1}")
            col2.metric("Alias", row["alias"])
            col3.metric("Correct Picks", row.get("correct_predictions", 0))
            col4.metric(
                "Total Score", 
                row.get("total_score", 0), 
                delta=f"{row.get('total_likes', 0)} Likes", 
                delta_color="off"
            )

def run_app():
    """Main application configuration and router."""
    st.set_page_config(
        page_title="Football Pundit",
        page_icon="⚽",
        layout="wide"
    )
    
    # Modern dark minimal styling
    st.markdown("""
        <style>
        .stApp {
            background-color: #0e1117;
            color: #fafafa;
        }
        div[data-testid="stMetricValue"] {
            font-size: 1.8rem;
        }
        .stButton button {
            border-radius: 6px;
            font-weight: bold;
        }
        </style>
    """, unsafe_allow_html=True)
    
    if "alias" not in st.session_state:
        show_alias_setup()
    else:
        with st.sidebar:
            st.title("⚽ Football Pundit")
            st.write(f"Logged in as: **{st.session_state['alias']}**")
            st.divider()
            page = st.radio("Navigation", ["Match Hub", "Live Debate", "Leaderboard"])
            st.divider()
            if st.button("Change Alias"):
                del st.session_state["alias"]
                st.rerun()
                
        if page == "Match Hub":
            show_match_hub()
        elif page == "Live Debate":
            show_live_debate_feed()
        elif page == "Leaderboard":
            show_leaderboard()
