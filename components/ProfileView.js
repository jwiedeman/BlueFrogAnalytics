const ProfileView = (state, actions) => {
  const user = state.auth.user; // Assuming user information is stored in state.auth.user

  // Function to delete the user profile with confirmation
  const deleteUserProfileWithConfirmation = () => {
    // Show a confirmation alert before deleting the profile
    const confirmDelete = window.confirm(
      "Are you sure you want to delete your profile? This action cannot be undone."
    );

    if (confirmDelete) {
      actions.auth.deleteUserProfile();
    }
  };

  return hyperapp.h("div", { class: "container profile-view my-5" }, [
    hyperapp.h("h2", { class: "text-center mb-4" }, "Profile"),
    hyperapp.h("div", { class: "card mb-3" }, [
      hyperapp.h("div", { class: "card-body" }, [
        hyperapp.h(
          "h5",
          { class: "card-title" },
          `Welcome, ${user.displayName || user.email}`
        ),
        hyperapp.h("p", { class: "card-text" }, `User ID: ${user.uid}`),
      ]),
    ]),
    // Buttons Section
    hyperapp.h(
      "div",
      { class: "d-flex flex-column flex-md-row justify-content-center gap-3" },
      [
        hyperapp.h(
          "button",
          {
            class: "btn btn-primary",
            onclick: () => actions.editProfile(),
          },
          "Edit Profile"
        ),
        hyperapp.h(
          "button",
          {
            class: "btn btn-danger",
            onclick: deleteUserProfileWithConfirmation,
          },
          "Delete Profile"
        ),
        hyperapp.h(
          "button",
          {
            class: "btn btn-secondary",
            onclick: actions.signout,
          },
          "Sign Out"
        ),
      ]
    ),
    // Warning Section for Delete Profile
    hyperapp.h("div", { class: "text-center mt-4" }, [
      hyperapp.h(
        "p",
        { class: "text-danger" },
        "Warning: Deleting your profile will result in permanent loss of your account and data."
      ),
    ]),
  ]);
};

export default ProfileView;
