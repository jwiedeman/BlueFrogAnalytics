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
import Navbar from "./components/NavBar.js";
import LoginForm from "./components/LoginForm.js";
import ProfileView from "./components/ProfileView.js";
import Footer from "./components/Footer.js";
// Import the required Firebase functions

const view = (state, actions) =>
  hyperapp.h("div", { class: "d-flex flex-column vh-100" }, [
    // Make sure the root element is a flex container
    Navbar(state, actions),
    hyperapp.h(
      "main", // Use 'main' for semantic purposes and to contain the page content
      {
        class: `flex-grow-1 content-container ${
          state.currentPage !== "home" ? "mt-5" : ""
        }`, // Add 'flex-grow-1' to fill available space and 'content-container' for your custom styles
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
          : state.currentPage === "experience" // Add this condition for ExperienceView
          ? ExperienceView(state, actions)
          : state.currentPage === "blog"
          ? BlogView(state, actions)
          : HomeView(state, actions),
      ]
    ),
    Footer(), // This will now be correctly placed at the bottom
  ]);

// Initialize the Hyperapp application
const main = hyperapp.app(
  {
    // Merge AuthState, Actions.state, and the new State
    auth: AuthState,
    common: State,
    currentPage: "home",
  },
  {
    // Combine AuthActions and Actions.actions
    ...AuthActions,
    ...Actions,
    // Add navigation actions here
    navigate: (page) => () => {
      console.log("Navigating to page:", page);
      return { currentPage: page };
    },
  },
  view,
  document.body
);

// Firebase authentication state change listener
firebase.auth().onAuthStateChanged((user) => {
  main.userChanged(user);
});
