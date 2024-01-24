const SignupForm = (state, actions) =>
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
            console.log("##", state);
            event.preventDefault();
            const email = state.auth.user.email;
            const password = event.target[2].value; // Use event.target[2] to access the third input field
            await actions.fetchAndSetSignInMethods({ email }, actions);

            console.log(
              "SignupForm onsubmit: Email:",
              email,
              "Password:",
              password
            );

            const result = await actions.signup({ email, password });
            console.log("SignupForm result from signup action:", result);

            if (!result.success) {
              // Handle failure
              actions.setSignupMessage(result.message);
              console.log(
                "SignupForm handling failure:",
                result.message,
                state.auth
              );
            } else {
              // Handle success (e.g., redirect or update UI)
              console.log("SignupForm handling success");
              actions.setSignupMessage("");
            }
          },
        },
        [
          // Add a message at the top of the form
          hyperapp.h(
            "p",
            { class: "mb-3 signup-thankyou-message" },
            "Thank you for considering signing up with us! We value your privacy and won't spam you."
          ),
          hyperapp.h("input", {
            type: "email",
            class: "form-control mb-3",
            name: "email",
            value: state.auth.user.email,
            readonly: true,
          }),
          state.signupMessage &&
            hyperapp.h(
              "p",
              { class: "mb-3 text-danger password-message" },
              state.signupMessage
            ),
          hyperapp.h("input", {
            type: "password",
            class: "form-control mb-3",
            name: "password",
            placeholder: "Password",
            required: true,
          }),
          hyperapp.h(
            "button",
            { type: "submit", class: "btn btn-primary" },
            "Create Account"
          ),
        ]
      ),
    ]
  );

export default SignupForm;
