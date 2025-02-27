document.addEventListener('DOMContentLoaded', () => {
    const saveButton = document.querySelector('.save-button');

    if (saveButton) {
        saveButton.addEventListener('click', async () => {
            const name = document.getElementById('name').value.trim();
            const skills = document.getElementById('skills').value.trim();
            const languages = document.getElementById('languages').value.trim();
            const domain = document.getElementById('domain').value.trim();
            const experience = document.getElementById('recruitment').value.trim();

            // Clear previous error messages
            clearErrorMessages();

            let isValid = true;

            if (!name) {
                isValid = false;
                displayErrorMessage('name', 'Applicant Name is required.');
            }
            if (name && !skills) {
                isValid = false;
                displayErrorMessage('skills', 'Applicant Skills are required.');
            }
            if (skills && !languages) {
                isValid = false;
                displayErrorMessage('languages', 'Programming Languages Known are required.');
            }
            if (languages && !domain) {
                isValid = false;
                displayErrorMessage('domain', 'Fields of expertise are required.');
            }
            if (domain && !experience) {
                isValid = false;
                displayErrorMessage('recruitment', 'Experience is required.');
            }

            // If any field is invalid, prevent further processing
            if (!isValid) {
                return;
            }

            const data = { name, skills, languages, domain, experience };

            try {
                const response = await fetch('/saveApplicant', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data),
                });

                if (response.ok) {
                    alert('Applicant saved successfully');
                    document.getElementById('applicant-form').reset();
                } else {
                    alert('Error saving applicant');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error saving applicant');
            }
        });
    }

    // Function to clear error messages
    function clearErrorMessages() {
        const errorElements = document.querySelectorAll('.error-message');
        errorElements.forEach(element => element.textContent = '');
    }

    // Function to display error message
    function displayErrorMessage(fieldId, message) {
        const errorContainer = document.getElementById(`${fieldId}-error`);
        errorContainer.textContent = message;
    }

    const applicantListContainer = document.getElementById('applicant-list');

    if (applicantListContainer) {
        fetch('/getskills')
            .then(response => response.json())
            .then(skills => {
                if (skills.length > 0) {
                    skills.forEach(applicant => {
                        displayApplicantDetails(applicant);
                    });
                } else {
                    applicantListContainer.innerHTML = '<p>No skills found.</p>';
                }
            })
            .catch(error => {
                console.error('Error:', error);
                applicantListContainer.innerHTML = '<p>Error retrieving skills.</p>';
            });
    }

    function displayApplicantDetails(applicant) {
        const applicantDetails = document.createElement('div');
        applicantDetails.classList.add('applicant-details');
        applicantDetails.innerHTML = `
            <h3>${applicant.name}</h3>
            <p><strong>Skills:</strong> ${applicant.skills}</p>
            <p><strong>Languages:</strong> ${applicant.languages}</p>
            <p><strong>Domain:</strong> ${applicant.domain}</p>
            <p><strong>Experience:</strong> ${applicant.experience} years</p>
        `;
        applicantListContainer.appendChild(applicantDetails);
    }
});
