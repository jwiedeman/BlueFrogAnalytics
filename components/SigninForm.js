const SigninForm = (state, actions) =>
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
          onsubmit: (event) => {
            event.preventDefault();
            console.log(state);
            const email = state.auth.user.email; // Assuming email is stored in state.user.email
            const password = event.target[0].value; // Use event.target[0] to access the first input field
            actions.signin({ email, password });
          },
        },
        [
          hyperapp.h(
            "div",
            { class: "mb-3 welcome-back-message" },
            "Thank you for returning, please sign in below."
          ),
          hyperapp.h("input", {
            type: "password",
            class: "form-control",
            placeholder: "Password",
            required: true,
          }),
          hyperapp.h(
            "button",
            { type: "submit", class: "btn btn-primary mt-3" },
            "Sign In"
          ),
        ]
      ),
    ]
  );

export default SigninForm;
