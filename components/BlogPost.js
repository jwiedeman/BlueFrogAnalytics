// Define a BlogPostView component
const BlogPostView = (state, actions) => {
    console.log(state)
    const post = state.common.blogData.find(p => p.id === state.common.currentPostId);
    if (!post) {
      return hyperapp.h("div", {}, "Post not found or loading...");
    }
  
    return hyperapp.h("div", { class: "container blog-post-detail-view mt-4" }, [
      hyperapp.h("div", { class: "row" }, [
        // Article content on the left
        hyperapp.h("div", { class: "col-md-8" }, [
          hyperapp.h("h1", { class: "display-4" }, post.title),
          hyperapp.h("p", { class: "text-muted" }, `Author: ${post.author || 'Unknown Author'}`),
          hyperapp.h("p", {}, `Tags: ${post.tags ? post.tags.join(', ') : 'No Tags'}`),
          hyperapp.h("p", {}, `Estimated read: ${post.readTime || 'Unknown'} mins`),
          hyperapp.h("p", {}, `Published on: ${post.date}`),
          hyperapp.h("div", { class: "blog-content" }, post.content),
        ]),
        // Image on the right
        post.image && hyperapp.h("div", { class: "col-md-4" }, [
          hyperapp.h("img", { src: post.image, class: "img-fluid", alt: post.title, style: { height: '40vh', objectFit: 'cover' } }),
        ]),
      ]),
      hyperapp.h("button", { class: "btn btn-primary mt-3", onclick: () => actions.navigate('blog') }, "Back to Blog"),
    ]);
  };
  
  export default BlogPostView;