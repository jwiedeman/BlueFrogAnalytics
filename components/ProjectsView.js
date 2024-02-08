const ProjectCard = ({ project, actions }) => (
  hyperapp.h("div", { class: "col-md-4 mb-4" }, [
    hyperapp.h("div", { class: "card h-100 project-card" }, [
      hyperapp.h("img", {
        class: "card-img-top project-img",
        src: project.imageUrl,
        alt: project.title,
      }),
      hyperapp.h("div", { class: "card-body" }, [
        hyperapp.h("h5", { class: "card-title" }, project.title),
        hyperapp.h("p", { class: "card-text" }, project.description), // Render short description
        hyperapp.h("button", {
          class: "btn btn-outline-danger btn-block",
          onclick: () => {
            actions.selectProject(project.id);
            actions.navigate('project', project.id);
          }
        }, "Learn More")
      ]),

    ]),
  ])
);

const HeroProjectCard = ({ project, actions }) => (
  hyperapp.h("div", { class: "col-md-6 mb-4 vh-50" }, [
    hyperapp.h("div", { class: "card project-card h-100" }, [
      hyperapp.h("img", {
        class: "card-img-top project-img",
        src: project.imageUrl,
        alt: project.title,
      }),
      hyperapp.h("div", { class: "card-body" }, [
        hyperapp.h("h5", { class: "card-title" }, project.title),
        hyperapp.h("p", { class: "card-text" }, project.description), // Render short description
        hyperapp.h("button", {
          class: "btn btn-outline-danger btn-block",
          onclick: () => {
            actions.selectProject(project.id);
            actions.navigate('project', project.id);
          }
        }, "Learn More")
      ]),
    ]),
  ])
);

const ProjectsView = (state, actions) => {
  const loadProjectsData = async () => {
    try {
      const response = await fetch("/data/projects.json");
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const projects = await response.json();
      actions.setProjectsData(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  }

  if (state.common.projectData.length === 0) {
    loadProjectsData();
  }

  return hyperapp.h("div", { class: "container" }, [
    hyperapp.h("h1", { class: "my-4" }, "Projects"),
    hyperapp.h("div", { class: "row row-cols-1 row-cols-md-2 g-4" }, [
      HeroProjectCard({ project: state.common.projectData[0], actions }),
      HeroProjectCard({ project: state.common.projectData[1], actions })
    ]),
    hyperapp.h("div", { class: "row row-cols-1 row-cols-md-2 g-4" }, [
      HeroProjectCard({ project: state.common.projectData[2], actions }),
    ]),
    
  ]);
};

export default ProjectsView;
