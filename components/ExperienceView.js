
const ExperienceView = (state, actions) => {
  function adjustBrandScrollAnimation(brandScroll) {
    console.log('adjustBrandScrollAnimation');
    let totalWidth = 0;

    // Use the provided element to find its children .brand-card elements
    const brandCards = brandScroll.querySelectorAll('.brand-card');
    brandCards.forEach(function(card) {
        totalWidth += card.offsetWidth + parseInt(window.getComputedStyle(card).marginRight, 10); // Use base 10 for parsing
    });

    // Calculate an appropriate animation duration based on the total width and desired speed
    const animationDuration = totalWidth / 300; // Adjust the divisor to control speed

    // Set the animation duration and iteration count on the provided element
    brandScroll.style.animation = `scroll ${animationDuration}s linear infinite`;

    // Add an event listener for the animationiteration event
    brandScroll.addEventListener('animationiteration', () => {
        // Reset the animation back to the beginning when it completes
        brandScroll.style.animation = 'none';
        setTimeout(() => {
            brandScroll.style.animation = `scroll ${animationDuration}s linear infinite`;
        }, 0);
    });
}



  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
  const loadData = async (endpoint, action) => {
    try {
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Response is not JSON");
      }

      const data = await response.json();
      action(data); // Update state with fetched data
    } catch (error) {
      console.error(`Error fetching data from ${endpoint}:`, error);
    }
  };
  if (state.common.brandsData.length === 0) {
    loadData("/data/brands.json", actions.setBrandsData);
  }
  if (state.common.skillsData.length === 0) {
    loadData("/data/skills.json", actions.setSkillsData);
  }

  if (state.common.experienceData.length === 0) {
    loadData("/data/experience.json", actions.setExperienceData);
  }

  return hyperapp.h("div", { class: "container experience-view my-4" }, [
    hyperapp.h("div", { class: "row mb-4" }, [
      hyperapp.h("h2", { class: "pb-5" }, "Experience"),
      hyperapp.h("div", { class: "col-md-6" }, [
        // Experience section rendered vertically
        ...state.common.experienceData.map((experience, index) =>
          hyperapp.h("div", { class: "mb-3" }, [
            hyperapp.h("div", { class: "card" }, [
              hyperapp.h("div", { class: "card-header" }, experience.title),
              hyperapp.h("div", { class: "card-body" }, [
                hyperapp.h("h5", { class: "card-title" }, experience.company),
                hyperapp.h("h6", { class: "card-subtitle mb-2 text-muted" }, `${experience.period} · ${experience.duration}`),
                hyperapp.h("p", { class: "card-text" }, [
                  ...experience.responsibilities.map(responsibility =>
                    hyperapp.h("li", null, responsibility)
                  ),
                ]),
              ]),
            ]),
          ])
        )
      ]),
      hyperapp.h("div", { class: "col-md-6 mt-5" }, [
        // About Me column
        hyperapp.h("div", { class: "content-box" }, [
          hyperapp.h("h2", { class: "font-helvetica-medium" }, "About Me"),
          hyperapp.h("p", null, "I'm Joshua Wiedeman, a dedicated self-starter and lifelong learner. My passion for learning fuels my drive to excel in every endeavor. I am results-driven, always striving to achieve my goals with unwavering determination."),
          hyperapp.h("p", null, "Adaptability is one of my core strengths. I embrace change and am quick to adjust to new challenges, making me well-prepared for any situation that comes my way."),
          hyperapp.h("p", null, "I thrive on challenges and see them as opportunities for growth. Whether it's a new project, a complex problem, or a chance to innovate, I'm always ready to take on the next challenge."),
          // You can add more elements or customize further as needed.
        ]),
      ]),
      
    ]),
     // Honors & Awards section
     hyperapp.h("div", { class: "row mb-4 mt-5" }, [
      hyperapp.h("div", { class: "col-12" }, [
        hyperapp.h("h2", { class: "pb-5" }, "Honors & Awards"),
        hyperapp.h("div", { class: "d-flex flex-row justify-content-around" }, [
          hyperapp.h("div", { class: "card award-card mx-2" }, [
            hyperapp.h("div", { class: "card-body" }, [
              hyperapp.h("h3", null, "CPE Q3 MVP"),
              hyperapp.h("p", null, "Issued by CPE (Consumer Products & Engineering) · Sep 2023"),
              hyperapp.h("p", null, "Associated with Fox Corporation"),
            ]),
          ]),
          hyperapp.h("div", { class: "card award-card mx-2" }, [
            hyperapp.h("div", { class: "card-body" }, [
              hyperapp.h("h3", null, "2021 Github Arctic Code Vault Contributor"),
              hyperapp.h("p", null, " (3x entries)"),
              hyperapp.h("p", null, "Issued by Github · Jul 2021"),
              hyperapp.h("p", null, "Associated with Logical Position"),
              hyperapp.h("p", null, "The GitHub Arctic Code Vault is a data repository preserved in the Arctic World Archive (AWA), a very-long-term archival facility 250 meters deep in the permafrost of an Arctic mountain."),
            ]),
          ]),
        ]),
      ]),
    ]),

// Brands I've Worked With section
hyperapp.h("div", { class: "row mb-4 mt-5" }, [
  hyperapp.h("div", { class: "col-12" }, [
    hyperapp.h("h2", { class: "pb-5" }, "Brands I've Worked With"),
    hyperapp.h("div", { class: "brand-scroll-container ", oncreate: element => {
      console.log("oncreate triggered");
      setTimeout(() => adjustBrandScrollAnimation(element), 500);
    }  }, [
      hyperapp.h("div", { class: "d-flex flex-nowrap brand-scroll "}, [
        ...shuffleArray(state.common.brandsData).map((brand, index) =>
          hyperapp.h("div", { class: "brand-card" }, [
            hyperapp.h("img", { src: brand.logo, alt: brand.name, class: "brand-logo" }),
          ])
        ),
      ]),
    ]),
  ]),
]),

    // Skills section
    
    hyperapp.h("div", { class: "row d-flex" },
    hyperapp.h("h2", { class: " mt-5 pb-5" }, "Skills"),
      state.common.skillsData.map((skillCategory, index) =>
        hyperapp.h("div", { class: "col-md-4 d-flex align-items-stretch mb-4" }, [
          hyperapp.h("div", { class: "card w-100" }, [
            hyperapp.h("div", { class: "card-header d-flex justify-content-center align-items-center", style: { minHeight: '100px' } }, [
              hyperapp.h("h3", { class: "mb-0" }, skillCategory.name),
            ]),
            hyperapp.h("div", { class: "card-body" }, [
              hyperapp.h("ul", { class: "list-group list-group-flush" }, [
                skillCategory.skills.map((skill, index) =>
                  hyperapp.h("li", { class: "list-group-item" }, [
                    hyperapp.h("span", { class: "skill-name" }, skill.name),
                    hyperapp.h("span", { class: "skill-level" }, ` - ${skill.level}`),
                  ])
                ),
              ]),
            ]),
          ]),
        ])
      )
    ),
  ]);
};

export default ExperienceView;
