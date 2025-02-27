document.addEventListener('DOMContentLoaded', function() {
    // Get the login button element
    const loginBtn = document.querySelector('.login-btn');

    // Add a click event listener to the login button
    loginBtn.addEventListener('click', function() {
        // Redirect to login.html when the button is clicked
        window.location.href = 'login.html';
    });
});
