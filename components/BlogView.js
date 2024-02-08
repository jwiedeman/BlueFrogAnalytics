
const BlogView = (state, actions) => {
// Function to initialize the carousel
const initCarousel = () => {
  var myCarouselElement = document.querySelector('#carouselExampleCaptions');
  if (myCarouselElement) {
    var carousel = new bootstrap.Carousel(myCarouselElement, {
      interval: 7500,
      ride: 'carousel',
      wrap: true,
    });
    return true; // Indicate success
  }
  return false; // Element not found
};

// Repeatedly check for the element and initialize the carousel
const intervalId = setInterval(() => {
  const isInitialized = initCarousel();
  if (isInitialized) {
    console.log('Runner running')
    clearInterval(intervalId); // Stop checking once the carousel is initialized
  }
}, 100); // Check every 100 milliseconds

  const loadBlogData = async () => {
    try {
      const response = await fetch("/data/blog.json");
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const data = await response.json();
      actions.setBlogData(data); // Update state with fetched data
    } catch (error) {
      console.error("Error fetching blog:", error);
    }
  };

  if (state.common.blogData.length === 0) {
    loadBlogData();
  }
  // Inside BlogView, modify the click handler
  const renderFeaturedPostTitle = (post) => {
    return hyperapp.h("a", { 
      href: "javascript:void(0);", // Prevent default link behavior
      class: "d-block mb-2 featured-post-title",
      onclick: () => {
        actions.selectPost(post.id); // Set the currentPostId
        actions.navigate('blogPost'); // Navigate to the BlogPost view
      }
    }, post.title);
  };

  // Carousel for hero articles
  const renderHeroCarousel = () => {
    // Ensure carousel initialization logic remains unchanged
  
    // Modify the carousel items to include an onclick event
    return hyperapp.h("div", { id: "carouselExampleCaptions", class: "carousel slide mb-5", "data-bs-ride": "carousel" }, [
      // Carousel indicators remain unchanged
  
      // Dynamically generating carousel items with onclick event
      hyperapp.h("div", { class: "carousel-inner" }, 
        state.common.blogData.map((post, index) => 
          hyperapp.h("div", { 
            class: `carousel-item ${index === 0 ? "active" : ""}`,
            onclick: () => {
              actions.selectPost(post.id); // Set the currentPostId
              actions.navigate('blogPost'); // Navigate to the BlogPost view
            }
          }, [
            post.image && hyperapp.h("img", { src: post.image, class: "d-block w-100", alt: post.title }),
            hyperapp.h("div", { class: "carousel-caption d-none d-md-block" }, [
              hyperapp.h("h5", {}, post.title)
            ])
          ])
        )
      ),
  
      // Previous and Next buttons with event.stopPropagation
      hyperapp.h("button", { 
        class: "carousel-control-prev", 
        type: "button", 
        "data-bs-target": "#carouselExampleCaptions", 
        "data-bs-slide": "prev",
        onclick: (event) => event.stopPropagation() // Prevent triggering article navigation
      }, [
        hyperapp.h("span", { class: "carousel-control-prev-icon", "aria-hidden": "true" }),
        hyperapp.h("span", { class: "visually-hidden" }, "Previous"),
      ]),
      hyperapp.h("button", { 
        class: "carousel-control-next", 
        type: "button", 
        "data-bs-target": "#carouselExampleCaptions", 
        "data-bs-slide": "next",
        onclick: (event) => event.stopPropagation() // Prevent triggering article navigation
      }, [
        hyperapp.h("span", { class: "carousel-control-next-icon", "aria-hidden": "true" }),
        hyperapp.h("span", { class: "visually-hidden" }, "Next"),
      ])
    ]);
  };

  // Render the blog view with the updated layout
  return hyperapp.h("div", { class: "container blog-view my-4" }, [
    // Welcome message
    hyperapp.h("div", { class: "row mb-4" }, [
      hyperapp.h("div", { class: "col-12" }, [
        hyperapp.h("h1", {}, "Welcome to My Blog"),
        // Additional welcome message content can be added here
      ]),
    ]),
    // Hero carousel and featured posts section
    hyperapp.h("div", { class: "row" }, [
      // Hero carousel at two-thirds width
      hyperapp.h("div", { class: "col-md-9" }, [renderHeroCarousel()]),
      // Featured posts as clickable titles in one-third column to the right
      hyperapp.h("div", { class: "col-md-3" }, [
        hyperapp.h("h2", {}, "Featured Posts"),
        state.common.blogData.slice(1, 6).map(post => renderFeaturedPostTitle(post)),
      ]),
    ]),
    // Latest posts section in a grid layout below
    hyperapp.h("div", { class: "row mt-4" }, [
      hyperapp.h("h2", { class: "col-12 mb-3" }, "Latest Posts"),
      state.common.blogData.slice(6).map((post, index) =>
        hyperapp.h("div", { class: "col-md-4 mb-3" }, [
          post.image && hyperapp.h("img", { src: post.image, class: "img-fluid", alt: post.title }),
          hyperapp.h("div", { class: "mt-2" }, [
            hyperapp.h("h3", { class: "h5" }, post.title),
            hyperapp.h("p", {}, post.date),
            hyperapp.h("p", {}, post.content),
            hyperapp.h("a", { href: post.link }, "Read More"),
          ]),
        ])
      ),
    ]),
  ]);
};

export default BlogView;
