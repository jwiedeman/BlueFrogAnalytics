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
const updatePointer = (state, { x, y }) => ({
  ...state,
  pointer: { x, y }
});

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
    pointer: {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    },
    showCoords: false,
  mousePosition: { x: 0, y: 0 },
  screenSize: {
    width: window.innerWidth,
    height: window.innerHeight
  }
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

new cursoreffects.trailingCursor({particles: 7, rate: 0.2, baseImageSrc: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAATCAYAAACk9eypAAAAAXNSR0IArs4c6QAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAhGVYSWZNTQAqAAAACAAFARIAAwAAAAEAAQAAARoABQAAAAEAAABKARsABQAAAAEAAABSASgAAwAAAAEAAgAAh2kABAAAAAEAAABaAAAAAAAAAEgAAAABAAAASAAAAAEAA6ABAAMAAAABAAEAAKACAAQAAAABAAAADKADAAQAAAABAAAAEwAAAAAChpcNAAAACXBIWXMAAAsTAAALEwEAmpwYAAABWWlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNS40LjAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp0aWZmPSJodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyI+CiAgICAgICAgIDx0aWZmOk9yaWVudGF0aW9uPjE8L3RpZmY6T3JpZW50YXRpb24+CiAgICAgIDwvcmRmOkRlc2NyaXB0aW9uPgogICA8L3JkZjpSREY+CjwveDp4bXBtZXRhPgpMwidZAAABqElEQVQoFY3SPUvDQBgH8BREpRHExYiDgmLFl6WC+AYmWeyLg4i7buJX8DMpOujgyxGvUYeCgzhUQUSKKLUS0+ZyptXh8Z5Ti621ekPyJHl+uftfomhaf9Ei5JyxXKfynyEA6EYcLHpwyflT958GAQ7DTABNHd8EbtDbEH2BD5QEQmi2mM8P/Iq+A0SzszEg+3sPjDnDdVEtQKQbMUidHD3xVzf6A9UDEmEm+8h9KTqTVUjT+vB53aHrCbAPiceYq1dQI1Aqv4EhMll0jzv+Y0yiRgCnLRSYyDQHVoqUXe4uKL9l+L7GXC4vkMhE6eW/AOJs9k583ORDUyXMZ8F5SVHVVnllmPNKSFagAJ5DofaqGXw/gHBYg51dIldkmknY3tguv3jOtHR4+MqAzaraJXbEhqHhcQlwGSOi5pytVQHZLN5s0WNe8HPrLYlFsO20RPHkImxsbmHdLJFI76th7Z4SeuF53hTeFLvhRCJRCTKZKxgdnRDbW+iozFJbBMw14/ElwGYc0egMBMFzT21f5Rog33Z7dX02GBm7WV5ZfT5Nn5bE3zuCDe9UxdTpNvK+5AAAAABJRU5ErkJggg=="});
