const Navbar = (state, actions) =>
  hyperapp.h(
    "nav",
    {
      class: "navbar navbar-expand-lg navbar-light",
    },
    [
      hyperapp.h("div", { class: "container" }, [
        hyperapp.h(
          "a",
          {
            class: "navbar-brand fw-bold",
            href: "#",
            style: {
              color: 'black', // Logo color
              padding: '10px', // Padding around the logo
            },
          },
          "Joshua Wiedeman"
        ),
        hyperapp.h(
          "button",
          {
            class: "navbar-toggler",
            type: "button",
            "data-bs-toggle": "collapse",
            "data-bs-target": "#navbarNav",
            "aria-controls": "navbarNav",
            "aria-expanded": "false",
            "aria-label": "Toggle navigation",
          },
          [hyperapp.h("span", { class: "navbar-toggler-icon" })]
        ),
        hyperapp.h(
          "div",
          { class: "collapse navbar-collapse", id: "navbarNav" },
          [
            hyperapp.h("ul", { class: "navbar-nav me-auto mb-2 mb-lg-0" }, [
              hyperapp.h("li", { class: "nav-item" }, [
                hyperapp.h(
                  "a",
                  {
                    class: "nav-link",
                    href: "#",
                    onclick: () => actions.navigate("home"),
                  },
                  "Home"
                ),
              ]),
              hyperapp.h("li", { class: "nav-item" }, [
                hyperapp.h(
                  "a",
                  {
                    class: "nav-link",
                    href: "#",
                    onclick: () => actions.navigate("projects"),
                  },
                  "Projects"
                ),
              ]),
              // Add the "Experience" navigation link before "Blog"
              hyperapp.h("li", { class: "nav-item" }, [
                hyperapp.h(
                  "a",
                  {
                    class: "nav-link",
                    href: "#",
                    onclick: () => actions.navigate("experience"),
                  },
                  "Experience"
                ),
              ]),
              hyperapp.h("li", { class: "nav-item" }, [
                hyperapp.h(
                  "a",
                  {
                    class: "nav-link",
                    href: "#",
                    onclick: () => actions.navigate("blog"),
                  },
                  "Blog"
                ),
              ]),
              hyperapp.h("li", { class: "nav-item" }, [
                hyperapp.h(
                  "a",
                  {
                    class: "nav-link",
                    href: "#",
                    onclick: () => actions.navigate("changelog"),
                  },
                  "Changelog"
                ),
              ]),
            ]),
            // Profile and Logout
            state.auth.authed
              ? hyperapp.h("div", { class: "d-flex" }, [
                  hyperapp.h(
                    "a",
                    {
                      class: "nav-link",
                      href: "#",
                      onclick: () => actions.navigate("profile"),
                    },
                    "Profile"
                  ),
                  hyperapp.h(
                    "a",
                    {
                      class: "nav-link",
                      href: "#",
                      onclick: () => actions.signout(),
                    },
                    "Logout"
                  ),
                ])
              : hyperapp.h(
                  "a",
                  {
                    class: "nav-link",
                    href: "#",
                    onclick: () => actions.navigate("login"),
                  },
                  "Login"
                ),
                
          ]
        ),
      ]),
    ]
  );

export default Navbar;
