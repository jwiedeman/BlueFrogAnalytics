const AuthActions = {
  // Action to handle user sign-out
  signout: () => async (state, actions) => {
    try {
      await firebase.auth().signOut();
      console.log("Signing out...");
      actions.resetIdentity(); // Reset identity after sign out
      actions.navigateToHome(); // Navigate to home or another page
      // Reset other parts of the state as needed
    } catch (error) {
      console.error("Sign-out error:", error.message);
      actions.setError(error); // Handle errors
    }
  },

  // Action to update the user in the state
  setUser: (user) => (state) => {
    console.log("Setting user:", user);
    return {
      ...state,
      auth: {
        ...state.auth,
        user: { ...user },
      },
    };
  },

  // Action to handle authentication state changes
  userChanged: (user) => (state) => {
    console.log("User changed:", user);
    return {
      ...state,
      auth: {
        ...state.auth,
        user: user || {},
        authed: !!user,
        checked: true,
      },
    };
  },

  resetIdentity: () => (state) => {
    console.log("Resetting identity.");
    return {
      ...state,
      auth: {
        ...state.auth,
        user: {},
        error: {},
        fetchSignInMethodsComplete: false,
        hasIdentity: [],
        signupMessage: "",
      },
    };
  },

  deleteUserProfileWithConfirmation: () => async (state, actions) => {
    const confirmation = confirm(
      "Are you sure you want to delete your profile? All data and stats will be irrecoverable."
    );
    if (confirmation) {
      try {
        const user = firebase.auth().currentUser;
        if (user) {
          await user.delete();
          console.log("User profile deleted successfully.");
          actions.resetIdentity(); // Reset identity after deletion
          actions.navigateToHome(); // Navigate to home or another page
          // Reset other parts of the state as needed
        }
      } catch (error) {
        console.error("Error deleting user profile:", error);
        actions.setError(error); // Handle errors
      }
    }
  },

  signin:
    ({ email, password }) =>
    async (state, actions) => {
      console.log("Signin action called with state:", state);
      try {
        // Call Firebase signin method and handle response
        const userCredential = await firebase
          .auth()
          .signInWithEmailAndPassword(email, password);
        console.log("Signed in successfully:", userCredential.user);
        // ... additional logic after successful sign-in ...
      } catch (error) {
        console.error("Sign-in error:", error);
        actions.setError(error);
      }
    },

  // Add console log to setSignupMessage action
  setSignupMessage: (message) => (state, actions) => {
    console.log("setSignupMessage action called with state:", state);
    return { ...state, signupMessage: message };
  },

  // In your actions object
  signup:
    ({ email, password }) =>
    async (state, actions) => {
      try {
        if (password.length < 6) {
          // Return a result indicating failure and the message
          return {
            success: false,
            message: "Password must be 6 characters or longer.",
          };
        }

        // Proceed with signup logic...
        const userCredential = await firebase
          .auth()
          .createUserWithEmailAndPassword(email, password);
        console.log("Signed up successfully");
        // ... additional logic after successful sign-up ...

        // If successful, return a result indicating success
        return { success: true, message: "Signed up successfully" };
      } catch (error) {
        console.error("Sign-up error:", error.message);
        // Use actions to handle other errors and return a corresponding result
        actions.setError(error);
        return { success: false, message: error.message };
      }
    },

  // Action to update the hasIdentity property
  // Update the updateHasIdentity action to log the state
  updateHasIdentity: (hasIdentity) => (state, actions) => {
    console.log("updateHasIdentity action called with state:", state);
    return {
      ...state,
      hasIdentity: hasIdentity,
    };
  },

  navigateToProfile: () => (state, actions) => {
    console.log("Navigating to Profile page");
    return { currentPage: "profile" };
  },

  navigateToLogin: () => (state, actions) => {
    console.log("Navigating to Login page");
    return { currentPage: "login" };
  },

  navigateToHome: () => (state, actions) => {
    console.log("Navigating to Home page");
    return { currentPage: "home" };
  },

  navigateToSignup: () => (state, actions) => {
    console.log("Navigating to Signup page");
    return { currentPage: "signup" };
  },

  setError: (error) => (state, actions) => {
    console.error("Error:", error);
    return { error };
  },

  setSignInMethods: (signInMethods) => (state, actions) => {
    console.log("setSignInMethods action called with state:", state);
    return {
      auth: {
        ...state.auth,
        hasIdentity: signInMethods,
        fetchSignInMethodsComplete: true,
      },
    };
  },

  fetchAndSetSignInMethods:
    ({ email }) =>
    async (state, actions) => {
      try {
        const signInMethods = await firebase
          .auth()
          .fetchSignInMethodsForEmail(email);

        // Call another action using the provided actions parameter
        console.log("signInMethods", signInMethods);
        actions.setSignInMethods(signInMethods);

        // Additional implementation...
      } catch (error) {
        console.error("Error:", error);
        actions.setError(error); // Use actions parameter to call setError
      }
    },

  resetPassword:
    ({ email }) =>
    async (state, actions) => {
      const auth = getAuth();
      try {
        await sendPasswordResetEmail(auth, email);
        console.log("Password reset email sent successfully");
        // ... additional logic after password reset email sent ...
      } catch (error) {
        console.error("Reset password error:", error.message);
        actions.setError(error); // Use actions to call setError
      }
    },

  setEmail: (email) => (state, actions) => {
    console.log("setEmail action called with state:", state);
    return {
      ...state,
      user: {
        ...state.user,
        email: email,
      },
    };
  },

  // ...
};

export default AuthActions;
