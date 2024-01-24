// ChangelogView.js
const ChangelogView = (state, actions) => {
  const loadChangelogData = async () => {
    try {
      const response = await fetch("/data/changelog.json");
  console.log(response)
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
  
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Response is not JSON");
      }
  
      const data = await response.json();
      actions.setChangelogData(data); // Update state with fetched data
    } catch (error) {
      console.error("Error fetching changelog:", error);
    }
  };
  

  if (state.common.changelogData.length === 0) {
    loadChangelogData();
  }

  // Render the changelog view
  return hyperapp.h("div", { class: "container changelog-view my-4" }, [
    hyperapp.h("h1", { class: "text-center mb-4" }, "Changelog"),
    // Map over the changelog data in the state to create the view
    state.common.changelogData.map((entry) =>
      hyperapp.h("div", { class: "card mb-4" }, [
        hyperapp.h("div", { class: "card-header" }, [
          hyperapp.h("h3", { class: "mb-0" }, `Version ${entry.version}`),
          hyperapp.h("p", { class: "mb-0" }, entry.date),
        ]),
        hyperapp.h("div", { class: "card-body" }, [
          hyperapp.h("ul", { class: "list-group" }, [
            entry.changes.map((change, index) =>
              hyperapp.h("li", { class: "list-group-item" }, [
                hyperapp.h(
                  "span",
                  { class: "badge badge-primary" },
                  `Change ${index + 1}`
                ),
                change,
              ])
            ),
          ]),
        ]),
      ])
    ),
  ]);
};

export default ChangelogView;
