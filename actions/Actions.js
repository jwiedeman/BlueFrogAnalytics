// Actions.js
const Actions = {
  setChangelogData: (data) => (state) => {
    console.debug("Setting changelog data:", data);
    return {
      ...state,
      common: {
        ...state.common,
        changelogData: data,
      },
    };
  },
  setExperienceData: (data) => (state) => {
    console.debug("Setting experience data:", data);
    return {
      ...state,
      common: {
        ...state.common,
        experienceData: data,
      },
    };
  },
  setBrandsData: (data) => (state) => {
    console.debug("Setting brand data:", data);
    return {
      ...state,
      common: {
        ...state.common,
        brandsData: data,
      },
    };
  },
  setSkillsData: (data) => (state) => {
    console.debug("Setting skills data:", data);
    return {
      ...state,
      common: {
        ...state.common,
        skillsData: data,
      },
    };
  },
  
  setCellStyles: (newCellStyles) => (state) => {
    console.log(state);
    return {
      ...state,
      common: {
        ...state.common,
        cells: newCellStyles, // Replace the entire array of cell styles
      },
    };
  },


  setLoaded: (loaded) => (state) => {
    console.debug("Setting loaded:", loaded);
    return {
      ...state,
      common: {
      ...state.common,
      loaded: loaded,
    },
    };
  },
  redraw: () => (state, actions) => {
    console.log(state)
    console.debug("Redrawing...");
    actions.setLoaded(false);
    actions.draw();
  },
  drawAndRefresh: () => (state, actions) => {
    console.debug("Drawing and refreshing...");
    actions.setLoaded(false);
    actions.draw();
    setTimeout(() => {
      actions.setLoaded(true);
      console.debug("Refreshed!");
    }, 50);
  },
  createCellStyle: () => {
    return {
      '--top': `${Math.random() * 100-10}%`, // Allow for slight overflow
      '--left': `${Math.random() * 100-10}%`, // Random left position within container
      '--width': `${(Math.floor(Math.random() * 5) + 2) * 25}vmin`, // Weighted random width
      '--height': `${(Math.floor(Math.random() * 5) + 2) * 25}vmin`, // Weighted random height
      '--rotate': `${Math.floor(Math.random() * 10) - 5}deg`, // Reduced rotation range to prevent slivers
      '--z': `${Math.floor(Math.random() * 250) - 125}px`, // Adjusted Z-axis translation
      '--zindex': `${Math.floor(Math.random() * 10) + 5}`, // Adjusted z-index
      '--clip': `polygon(${Math.floor(Math.random() * 50) + 5}% ${Math.floor(Math.random() * 50) + 25}%, ${Math.floor(Math.random() * 50) + 50}% ${Math.floor(Math.random() * 50) + 25}%, ${Math.floor(Math.random() * 50) + 50}% ${Math.floor(Math.random() * 50) + 75}%, ${Math.floor(Math.random() * 50) + 25}% ${Math.floor(Math.random() * 50) + 75}%)`, // Adjusted clip path to prevent slivers
      '--filter': `url(#wave${Math.floor(Math.random() * 4) + 1})`, // Random filter
      '--contrast': Math.floor(Math.random() * 4) + 1, // Random contrast
      '--background': `url(https://source.unsplash.com/random/${Math.floor(Math.random() * 100) + 1})`, // Random background image
    };
  },

  draw: () => (state, actions) => {
    const newCellStyles = Array.from({ length: 64 }, () => actions.createCellStyle());
    actions.setCellStyles(newCellStyles);
    setTimeout(() => {
      actions.setLoaded(true);
      console.debug("Cells drawn!");
    }, 10);
  },
  
  


  
  
  setSearchQuery: (query) => (state) => {
    console.log("setSearchQuery", query, state);
    return { ...state, common: { ...state.common, searchQuery: query } };
  },
  speciesView: {
    setLocalPage: (page) => ({ speciesView: { currentPage: page } }),
    getLocalPage: (state) => state.speciesView.currentPage || 1,
  },
  setCurrentPage: (page) => (state) => {
    return {
      ...state,
      common: {
        ...state.common,
        currentPage: page,
      },
    };
  },
  updateData: (dataKey) => (state) => {
    return { ...state }; // Update this action as needed
  },
  setBlogData: (data) => (state) => {
    console.debug("Setting blog data:", data);
    return {
      ...state,
      common: {
        ...state.common,
        blogData: data,
      },
    };
  },
  setSpeciesData: (data) => (state) => {
    console.log("Updating species data in state", data);
    return {
      ...state,
      common: {
        ...state.common,
        speciesData: data,
      },
    };
  },

  setSpeciesCurrentPage: (newPage) => (state) => {
    console.log("Setting species current page to:", newPage);
    return {
      common: {
        ...state.common,
        speciesCurrentPage: newPage,
      },
    };
  },

  // ... other non-auth actions ...
};

// Helper function to generate Unsplash image URL
function getRandomBackgroundUrl() {
  const randomImageNumber = Math.floor(Math.random() * 100) + 1;
  return `url(https://source.unsplash.com/random/${randomImageNumber})`;
}

// Helper function to generate random clip property
function getRandomClip() {
  return `polygon(${Math.floor(Math.random() * 50)}% ${Math.floor(Math.random() * 50)}%, ${Math.floor(Math.random() * 50) + 50}% ${Math.floor(Math.random() * 50)}%, ${Math.floor(Math.random() * 50) + 50}% ${Math.floor(Math.random() * 50) + 50}%, ${Math.floor(Math.random() * 50)}% ${Math.floor(Math.random() * 50) + 50}%)`;
}
export default Actions;
