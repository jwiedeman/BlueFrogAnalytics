// BlogView.js
const BlogView = (state, actions) => {
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

  // Function to render a single blog post with image, title, description, and read more link
  const renderBlogPost = (post) => {
    return hyperapp.h("div", { class: "blog-post" }, [
      post.image && hyperapp.h("div", { class: "blog-post-image" }, [
        hyperapp.h("img", { src: post.image, alt: post.title }),
      ]),
      hyperapp.h("div", { class: "blog-post-content" }, [
        hyperapp.h("h2", { class: "blog-post-title" }, post.title),
        hyperapp.h("p", { class: "blog-post-description" }, post.date),
        hyperapp.h("p", { class: "blog-post-description" }, post.content),
        hyperapp.h(
          "a",
          { class: "read-more-link", href: post.link },
          "Read More"
        ),
      ]),
    ]);
  };

  // Render the latest blog view
  return hyperapp.h("div", { class: "container blog-view my-4" }, [
    hyperapp.h("div", { class: "row" }, [
      // Hero-style article on the left
      hyperapp.h("div", { class: "col-md-6 mb-4" }, [
        renderBlogPost(state.common.blogData[0]), // Display the first article as the hero
      ]),
      // Latest articles on the right
      hyperapp.h("div", { class: "col-md-6" }, [
        state.common.blogData
          .slice(1) // Exclude the first article
          .map((post, index) =>
            hyperapp.h("div", { class: "mb-4", key: index }, [
              renderBlogPost(post), // Render each blog post
            ])
          ),
        // Pagination here if needed
      ]),
    ]),
  ]);
};

export default BlogView;
