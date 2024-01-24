// Cell component
const Cell = ({ style }) => hyperapp.h("div", { class: "cell", style: style }, [
  hyperapp.h("div", { class: "inner" })
]);
// Function to update the body class based on the loaded state
const updateBodyClass = (loaded) => {
  console.log(loaded)
  if (loaded) {
    document.body.classList.add('loaded');
  } else {
    document.body.classList.remove('loaded');
  }
};

// HomeView component with oncreate lifecycle event to trigger draw action
const HomeView = (state, actions) => {
  const heroAnimatedBackground = hyperapp.h("div", { class: "hero-svg-background" }, [
    hyperapp.h("svg", { version: "1.1", xmlns: "http://www.w3.org/2000/svg", style: { width: "100%", height: "100%" } }, [
      hyperapp.h("defs", {}, [
        hyperapp.h("filter", { id: "wave2" }, [
          hyperapp.h("feTurbulence", { id: "turbulence", baseFrequency: "0.005 0.00", numOctaves: "3", result: "noise", seed: "13" }),
          hyperapp.h("feDisplacementMap", { id: "displacement", in: "SourceGraphic", in2: "noise", scale: "14" })
        ])
      ]),
      // ...additional SVG elements for the effect
    ]),
    // ...additional divs for the animated cells if needed
  ]);

  // Ensure that the cellElements are defined within the scope of the HomeView function
  const cellElements = Array.isArray(state.common.cells) ? state.common.cells.map(style => Cell({ style })) : [];
 // Immediately invoke the updateBodyClass function with the current state
 updateBodyClass(state.loaded);
console.log(state)
  return hyperapp.h("div", {
    class: "container home-view",
    oncreate: () => {
      actions.draw();
      updateBodyClass(state.common.loaded);
    },
    onupdate: () => {
      updateBodyClass(state.common.loaded);
    }
  }, [
    hyperapp.h("section", {
      class: "row hero py-5",
      style: { position: "relative", height: "30vh", overflow: "hidden" }
    }, [
      heroAnimatedBackground,
      // Define the wrap container with proper sizing and positioning
      hyperapp.h("div", {
        id: "wrap",
        style: {
          position: "absolute",
          top: "0",
          left: "0",
          width: "100%",
          height: "100%",
          display: "grid",
          gridTemplateColumns: "repeat(8, 1fr)",
          gridTemplateRows: "repeat(8, 1fr)",
          gridColumnGap: "0px",
          gridRowGap: "0px",
          transformStyle: "preserve-3d",
          backfaceVisibility: "hidden"
        }
      }, cellElements), // Render static cells
      // Content overlay with higher z-index to ensure it's above the cells
      hyperapp.h("div", {
        class: "col-md-12 hero-text-container text-center",
        style: { position: "absolute", zIndex: "2", width: "100%", top: "50%", transform: "translateY(-50%)" }
      }, [
        hyperapp.h("h1", { class: "hero-title" }, "Discover the Natural World with ShroomDex"),
        hyperapp.h("p", { class: "hero-description" }, "Explore a vast database of fungi species, contribute to citizen science, and climb the ranks on our Leaderboard."),
        hyperapp.h("div", { class: "hero-buttons mt-4" }, [
          state.auth.authed
            ? hyperapp.h("button", { class: "btn btn-primary", onclick: () => actions.navigate("leaderboard") }, "Leaderboard")
            : hyperapp.h("button", { class: "btn btn-primary", onclick: () => actions.navigate("login") }, "Sign Up Now"),
          hyperapp.h("button", { class: "btn btn-secondary ms-2", onclick: () => actions.navigate("detect") }, "Start Detecting")
        ])
      ])
    ]),
    // Additional content sections below the hero section
    hyperapp.h("section", { class: "features py-5" }, [
      hyperapp.h("h2", {}, "Be a Part of Our Growing Community"),
      hyperapp.h("p", {}, "Join enthusiasts and experts alike in documenting and identifying species. Every discovery enriches our collective understanding and helps you rise through the ranks.")
    ]),
    hyperapp.h("section", { class: "updates py-5" }, [
      hyperapp.h("h2", {}, "Stay Informed with Our Latest Updates"),
      hyperapp.h("p", {}, "Check out our Changelog for the latest features and enhancements. Our Blog is also a great resource for news, tutorials, and insights from the world of mycology.")
    ])
    // ... any other sections you want to include on the home page ...
  ]);
};

export default HomeView;
