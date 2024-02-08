// Access Hyperapp's functions from the global `hyperapp` object

// Import actions and state
import AuthActions from "./actions/AuthActions.js";
import Actions from "./actions/Actions.js";
import AuthState from "./state/AuthState.js";
import State from "./state/State.js";
// Import components
import HomeView from "./components/HomeView.js";
import ChangelogView from "./components/ChangelogView.js";
import ProjectsView from "./components/ProjectsView.js";
import ExperienceView from "./components/ExperienceView.js";
import BlogView from "./components/BlogView.js";
import BlogPost from "./components/BlogPost.js";
import ProjectItem from "./components/ProjectItem.js";
import Navbar from "./components/NavBar.js";
import LoginForm from "./components/LoginForm.js";
import ProfileView from "./components/ProfileView.js";
import Footer from "./components/Footer.js";

// Initialize the application based on the current hash
const initPage = window.location.hash.replace("#", "") || "home";


const view = (state, actions) =>
  hyperapp.h("div", { class: "d-flex flex-column vh-100" }, [
    Navbar(state, actions),
    hyperapp.h(
      "main",
      {
        class: `flex-grow-1 content-container ${
          state.currentPage !== "home" ? "" : ""
        }`,
      },
      [
        !state.auth.checked
          ? hyperapp.h("div", { class: "loading" }, "Loading...")
          : state.currentPage === "profile" && state.auth.authed
          ? ProfileView(state, actions) 
          : state.currentPage === "login" && !state.auth.authed
          ? LoginForm(state, actions)
          : state.currentPage === "signup" && !state.auth.authed
          ? LoginForm(state, actions)
          : state.currentPage === "changelog"
          ? ChangelogView(state, actions)
          : state.currentPage === "projects"
          ? ProjectsView(state, actions)
          : state.currentPage === "experience"
          ? ExperienceView(state, actions)
          : state.currentPage === "blog"
          ? BlogView(state, actions)
          : state.currentPage === "blogPost" // Check if the current page is set to a single post view
          ? BlogPost(state, actions)
          : state.currentPage === "project" // Check if the current page is set to a single post view
          ? ProjectItem(state, actions) // Render the BlogPost component
          : HomeView(state, actions),
      ]
    ),
    Footer(state, actions),
  ]);

// Initialize the Hyperapp application
const main = hyperapp.app(
  {
    // Merge AuthState, Actions.state, and the new State
    auth: AuthState,
    common: State,
    currentPage: initPage,
  
  },
  {
    // Combine AuthActions and Actions.actions
    ...AuthActions,
    ...Actions,

    navigate: (page ) => (state) => {

      return { ...state, currentPage: page };
    },
    
  },
  view,
  document.body
);

// Firebase authentication state change listener
firebase.auth().onAuthStateChanged((user) => {
  main.userChanged(user);
});


