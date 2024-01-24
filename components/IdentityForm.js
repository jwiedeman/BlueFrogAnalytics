// In IdentityForm.js
const IdentityForm = (state, actions) =>
  hyperapp.h(
    "div",
    {
      class: "container mt-4 d-flex justify-content-center",
      style: { maxWidth: "30%" },
    }, // Limit the width to 30%
    [
      hyperapp.h(
        "form",
        {
          class: "needs-validation",
          onsubmit: async (event) => {
            event.preventDefault();
            const email = event.target[0].value; // Use event.target[0] to access the first input field
            await actions.setUser({ email });

            try {
              // Call the combined action to fetch and set sign-in methods
              await actions.fetchAndSetSignInMethods({ email }, actions);

              // Remove navigation logic from here. It should be handled within the action.
            } catch (error) {
              console.error("Error fetching sign-in methods:", error);
              actions.setError(error);
            }
          },
        },
        [
          hyperapp.h("div", { class: "mb-3" }, [
            hyperapp.h(
              "label",
              { class: "form-label", for: "exampleInputEmail1" },
              "Email address"
            ),
            hyperapp.h("input", {
              type: "email",
              class: "form-control",
              id: "exampleInputEmail1",
              ariaDescribedby: "emailHelp",
              placeholder: "Email Address",
              required: true,
            }),
            hyperapp.h(
              "div",
              { id: "emailHelp", class: "form-text" },
              "We'll never share your email with anyone else."
            ),
          ]),
          hyperapp.h(
            "button",
            { type: "submit", class: "btn btn-primary" },
            "Continue"
          ),
        ]
      ),
    ]
  );

export default IdentityForm;
