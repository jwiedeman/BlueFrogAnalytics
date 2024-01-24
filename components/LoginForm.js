import IdentityForm from "./IdentityForm.js";
import SigninForm from "./SigninForm.js"; // Import your SigninForm component
import SignupForm from "./SignupForm.js"; // Import your SignupForm component

const LoginForm = (state, actions) => {
  let formComponent;
  console.log("LoginForm -- ", state);

  if (!state.auth.fetchSignInMethodsComplete) {
    // Show the IdentityForm if the fetchSignInMethods operation is not complete
    formComponent = IdentityForm(state, actions);
  } else if (state.auth.hasIdentity.length > 0) {
    // Show the SigninForm if the user has an existing account
    formComponent = SigninForm(state, actions);
  } else {
    // Show the SignupForm if the user doesn't have an existing account
    formComponent = SignupForm(state, actions);
  }

  // Wrap the form component in a div with the class "login-container" to center it
  return hyperapp.h("div", { class: "login-container" }, [formComponent]);
};

export default LoginForm;
