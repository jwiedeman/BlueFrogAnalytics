const ProjectsView = (state, actions) => {
  const pageSize = 16;

  // Function to load and randomize species data
  async function loadSpeciesData() {
    console.log("Attempting to fetch species data");
    try {
      const response = await fetch("/data/projects.json");
      console.log("Fetch response received", response);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      let data = await response.json();
      console.log("Fetched species data", data);
      // Randomize the order of species data
      data = data.sort(() => 0.5 - Math.random());
      await actions.setSpeciesData(data);
      console.log("Species data set in state", state.common);
    } catch (error) {
      console.error("Error fetching species data:", error);
    }
  }

  // Function to filter species based on search query
  const filterSpecies = (speciesData, query) => {
    if (!query) return speciesData;
    return speciesData.filter((species) =>
      Object.values(species).some((value) =>
        value.toString().toLowerCase().includes(query.toLowerCase())
      )
    );
  };

  // Get filtered species data based on search query
  const filteredSpeciesData = filterSpecies(
    state.common.speciesData,
    state.common.searchQuery
  );

  // Calculate pagination for filtered data
  const totalPages = Math.ceil(filteredSpeciesData.length / pageSize);
  let currentPage = state.common.speciesCurrentPage || 1;
  if (state.common.searchQuery && currentPage !== 1) {
    currentPage = 1;
    actions.setSpeciesCurrentPage(1);
  }
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredSpeciesData.length);

  // Called when the component mounts or updates
  if (state.common.speciesData.length === 0) {
    loadSpeciesData();
  }

  // Update pagination handlers
  const handlePreviousClick = () => {
    const newPage = Math.max(1, currentPage - 1);
    actions.setSpeciesCurrentPage(newPage);
  };

  const handleNextClick = () => {
    const newPage = Math.min(totalPages, currentPage + 1);
    actions.setSpeciesCurrentPage(newPage);
  };

  return hyperapp.h("div", { class: "container species-view" }, [
    hyperapp.h("h1", { class: "mt-3" }, "Species"),
    hyperapp.h("div", { class: "row mb-3" }, [
      hyperapp.h("div", { class: "col-auto" }, [
        hyperapp.h(
          "button",
          {
            class: "btn btn-outline-secondary",
            type: "button",
            onclick: loadSpeciesData,
          },
          "Shuffle"
        ),
        hyperapp.h("small", { class: "text-muted ms-2" }, "(Shuffles results)"),
      ]),
      hyperapp.h("div", { class: "col" }, [
        hyperapp.h("input", {
          class: "form-control",
          type: "text",
          placeholder: "Search Species",
          oninput: (e) => {
            actions.setSearchQuery(e.target.value);
            actions.setSpeciesCurrentPage(1); // Reset to page 1 on search
          },
        }),
      ]),
    ]),
    hyperapp.h("div", { class: "row g-1" }, [
      filteredSpeciesData.slice(startIndex, endIndex).map((species) =>
        hyperapp.h("div", { class: "col-md-3 mb-1" }, [
          hyperapp.h("div", { class: "card h-100" }, [
            hyperapp.h("img", {
              class: "card-img-top species-image",
              src: species.imageUrl || "placeholder-image-url.jpg",
              alt: species.commonName,
            }),
            hyperapp.h("div", { class: "card-body d-flex flex-column" }, [
              hyperapp.h("h5", { class: "card-title" }, species.commonName),
              hyperapp.h(
                "p",
                { class: "card-text flex-grow-1" },
                `Scientific Name: ${species.scientificName}`
              ),
            ]),
          ]),
        ])
      ),
    ]),
    hyperapp.h("nav", { "aria-label": "Species pagination" }, [
      hyperapp.h("ul", { class: "pagination" }, [
        hyperapp.h(
          "li",
          { class: `page-item ${currentPage === 1 ? "disabled" : ""}` },
          [
            hyperapp.h(
              "a",
              { class: "page-link", href: "#", onclick: handlePreviousClick },
              "Previous"
            ),
          ]
        ),
        hyperapp.h(
          "li",
          {
            class: `page-item ${currentPage === totalPages ? "disabled" : ""}`,
          },
          [
            hyperapp.h(
              "a",
              { class: "page-link", href: "#", onclick: handleNextClick },
              "Next"
            ),
          ]
        ),
      ]),
    ]),
  ]);
};

export default ProjectsView;
