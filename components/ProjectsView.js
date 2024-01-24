const ProjectCard = ({ project }) => (
  hyperapp.h("div", { class: "col-md-4 mb-4" }, [
    hyperapp.h("div", { class: "card h-100 project-card" }, [
      hyperapp.h("img", {
        class: "card-img-top",
        src: project.imageUrl,
        alt: project.title,
      }),
      hyperapp.h("div", { class: "card-body" }, [
        hyperapp.h("h5", { class: "card-title" }, project.title),
        hyperapp.h("p", { class: "card-text" }, project.shortDescription),
        hyperapp.h("button", {
          class: "btn btn-primary",
          onclick: () => window.location.href = project.url
        }, "Learn More")
      ]),
    ]),
  ])
);

const ProjectsView = (state, actions) => {
  // Sample data - replace with dynamic data as needed
  const projects = [
    {
      id: 1,
      title: "Project 1",
      shortDescription: "A brief overview of Project 1",
      imageUrl: "path-to-image.jpg",
      url: "http://example.com/project1"
    },
    // ... more projects
  ];

  return hyperapp.h("div", { class: "container" }, [
    hyperapp.h("h1", { class: "my-4" }, "Projects"),
    hyperapp.h("div", { class: "row" }, projects.map(project =>
      ProjectCard({ project })
    )),
    // Add pagination controls here if necessary
  ]);
};

export default ProjectsView;
