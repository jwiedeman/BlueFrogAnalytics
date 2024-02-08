// Define a ProjectItemView component
const ProjectItemView = (state, actions) => {
  const project = state.common.projectData.find(p => p.id === state.common.currentProjectId);
  if (!project) {
      return hyperapp.h("div", {}, "Project not found or loading...");
  }

  return hyperapp.h("div", { class: "container project-item-detail-view mt-4" }, [
      hyperapp.h("div", { class: "row" }, [
          // Project information on the left
          hyperapp.h("div", { class: "col-md-8" }, [
              hyperapp.h("h1", { class: "display-4" }, project.title),
              hyperapp.h("p", { class: "lead" }, `Lead: ${project.lead || 'Unknown Lead'}`),
              hyperapp.h("p", {}, `Technologies: ${project.technologies ? project.technologies.join(', ') : 'No Technologies Listed'}`),
              hyperapp.h("p", {}, `Status: ${project.status || 'Unknown'}`),
              hyperapp.h("p", {}, `Started on: ${project.startedOn || 'Unknown'}`),
              hyperapp.h("p", {}, `Target Date: ${project.targetDate || 'Unknown'}`),
              hyperapp.h("div", { class: "roadmap" }, [
                  hyperapp.h("h3", {}, "Roadmap"),
                  hyperapp.h("ul", {}, project.roadmap.map(item => 
                      hyperapp.h("li", {}, `${item.item} - ${item.status} (${item.targetDate || 'No Target Date'})`)
                  ))
              ]),
              project.description && hyperapp.h("div", {}, [
                  hyperapp.h("h3", {}, "Description"),
                  hyperapp.h("p", {}, project.description)
              ]),
              project.goal && hyperapp.h("div", {}, [
                  hyperapp.h("h3", {}, "Goal"),
                  hyperapp.h("p", {}, project.goal)
              ]),
              project.contributing && hyperapp.h("div", {}, [
                  hyperapp.h("h3", {}, "Contributing"),
                  hyperapp.h("p", {}, project.contributing)
              ]),
              project.contact && hyperapp.h("div", {}, [
                  hyperapp.h("h3", {}, "Contact"),
                  hyperapp.h("p", {}, project.contact)
              ]),
              project.acknowledgments && hyperapp.h("div", {}, [
                  hyperapp.h("h3", {}, "Acknowledgments"),
                  hyperapp.h("p", {}, project.acknowledgments)
              ])
          ]),
          // Image or project visual on the right
          project.imageUrl && hyperapp.h("div", { class: "col-md-4" }, [
              hyperapp.h("img", { src: project.imageUrl, class: "img-fluid", alt: project.title, style: { height: '40vh', objectFit: 'cover' } }),
          ]),
      ]),
      hyperapp.h("button", { class: "btn btn-primary mt-3", onclick: () => actions.navigate('projects') }, "Back to Projects"),
  ]);
};

export default ProjectItemView;
