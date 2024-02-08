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
 updateBodyClass(state.common.loaded);
console.log(state)
  return hyperapp.h("div", {
    class: "container home-view",
    oncreate: () => {
      actions.draw();
      updateBodyClass(state.common.loaded);
    },
    onupdate: () => {
      updateBodyClass(state.common.loaded);
      if (Array.isArray(state.common.cells) && state.common.cells.length === 0) {
        actions.draw();
      }
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
    hyperapp.h("h1", { class: "hero-title mb-4", style: { position: "relative" } }, [
      hyperapp.h("span", { style: { backgroundColor: "rgba(0,0,0,0.95)", color: "white", padding: "0.5rem" } }, "Hello there, I'm Joshua Wiedeman")
    ]),
    hyperapp.h("div", { style: { padding: "0.5rem" } }, [ // Wrap subtext in a div without background
      hyperapp.h("p", { class: "hero-description", style: { backgroundColor: "rgba(0,0,0,0.95)", color: "white", padding: "0.5rem", display: "inline" } }, "I design, develop and deliver solutions")
    ]),
    hyperapp.h("div", { class: "hero-buttons mt-4 text-center" }, [
      state.auth.authed
        ? hyperapp.h("button", { class: "btn btn-primary", onclick: () => actions.navigate("leaderboard"), style: { backgroundColor: "rgba(0,0,0,0.95)" } }, "Leaderboard")
        : hyperapp.h("button", { class: "btn btn-primary", onclick: () => actions.navigate("login"), style: { backgroundColor: "rgba(0,0,0,0.95)" } }, "Sign Up Now"),
      hyperapp.h("button", { class: "btn btn-secondary ms-2", onclick: () => actions.navigate("projects"), style: { backgroundColor: "rgba(0,0,0,0.95)" } }, "Projects")
    ])
  ])
  
  
  
  
  
  
]),
    
    
    
    // Additional content sections below the hero section
    // Additional content sections below the hero section
// Additional content sections below the hero section
// Additional content sections below the hero section
hyperapp.h("section", { class: "features py-5" }, [
  hyperapp.h("h2", {}, "Explore My Projects"),
  hyperapp.h("p", {}, "Discover the projects I've worked on and the solutions I've crafted. Each project tells a unique story of challenges faced and problems solved."),
  hyperapp.h("button", { class: "btn btn-outline-danger btn-lg", onclick: () => actions.navigate("projects") }, "View Projects"),
]),
hyperapp.h("section", { class: "updates py-5" }, [
  hyperapp.h("h2", {}, "Stay Updated with My Blog"),
  hyperapp.h("p", {}, "Visit my Blog to stay updated on the latest trends, insights, and tips in the field. From tutorials to industry news, my Blog is a valuable resource for enthusiasts and professionals alike."),
  hyperapp.h("button", { class: "btn btn-outline-danger btn-lg", onclick: () => actions.navigate("blog") }, "Read Blog"),
]),
hyperapp.h("section", { class: "experience py-5" }, [
  hyperapp.h("h2", {}, "Ready to Work Together?"),
  hyperapp.h("p", {}, "Explore my professional experience and skills. From web development to project management, I bring expertise and dedication to every project. Let's collaborate and bring your ideas to life!"),
  hyperapp.h("p", {}, "Check out my Experience section to learn more about my background and accomplishments."),
  hyperapp.h("button", { class: "btn btn-outline-danger btn-lg", onclick: () => actions.navigate("experience") }, "View Experience"),
]),



    // ... any other sections you want to include on the home page ...
  ]);
};

export default HomeView;
