import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import inquirer from 'inquirer';
import chalk from "chalk";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataFilePath = path.join(__dirname, 'consentPreferences.json');

// Define location-based consent options
const locationConsentOptions = {
    FL: 'Florida',
    GA: 'Georgia',
    CA: 'California',
    CO: 'Colorado',
    UT: 'Utah',
};

// Define data privacy options
const dataPrivacyOptions = {
    personalizedRecommendations: 'Allow data collection for personalized recommendations',
    dataSharingWithThirdParties: 'Allow data sharing with third parties',
};

const specialDataPrivacyOptions = {
    personalizedRecommendations: 'Allow data collection for personalized recommendations',
    personalizedRecommendationsEXTRA: 'Allow data collection for personalized recommendations',
    dataSharingWithThirdParties: 'Allow data sharing with third parties',
    dataSharingWithThirdPartiesEXTRA: 'Allow data sharing with third parties',
};

// Define consent options based on location
const consentOptionsByLocation = {
    FL: specialDataPrivacyOptions,
    GA: specialDataPrivacyOptions,
    CA: specialDataPrivacyOptions,
    CO: specialDataPrivacyOptions,
    UT: specialDataPrivacyOptions,
    // Default options for other states
    default: dataPrivacyOptions,
};

// Load existing consent preferences from the JSON file
function loadConsentPreferences() {
    try {
        const data = fs.readFileSync(dataFilePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        // If the file doesn't exist or has an error, return an empty object
        return {};
    }
}

// Save consent preferences to the JSON file
function saveConsentPreferences(consentPreferences) {
    fs.writeFileSync(dataFilePath, JSON.stringify(consentPreferences, null, 2), 'utf8');
}

// Define a data structure to store user consent preferences
const userConsentData = {};

// Function to get or create a user based on their name
function getUserByName(name) {
    const existingUser = Object.keys(userConsentData).find(userID => userConsentData[userID].name === name);
    if (existingUser) {
        return userConsentData[existingUser];
    } else {
        const userID = Math.random().toString(36).substr(2, 10);
        userConsentData[userID] = {
            name: name,
            consentPreferences: {},
        };
        return userConsentData[userID];
    }
}

// Function to view consent status for each option with color-coding
function viewConsentStatus(user) {
    console.log(`Consent Status for ${user.name}:`);
    for (const option in user.consentPreferences) {
        const status = user.consentPreferences[option] ? 'Given' : 'Not Given';
        const statusColor = user.consentPreferences[option] ? chalk.green : chalk.red;
        console.log(`${option}: ${statusColor(status)}`);
    }
}

// Function to manage consent for a user
async function manageConsent(user) {
    const consentPrompt = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: `Manage consent preferences for ${user.name} in ${user.location}:`,
            choices: ['View Consent Status', 'Give Consent', 'Revoke Consent', 'Exit'],
        },
    ]);

    switch (consentPrompt.action) {
        case 'View Consent Status':
            viewConsentStatus(user);
            break;
        case 'Give Consent':
            const giveConsentPrompt = await inquirer.prompt([
                {
                    type: 'checkbox',
                    name: 'consentOptions',
                    message: 'Select options to give consent:',
                    choices: Object.keys(dataPrivacyOptions).map(option => ({
                        name: dataPrivacyOptions[option],
                        value: option,
                    })),
                    validate: (input) => {
                        if (input.length === 0) {
                            return 'Please select at least one option to give consent.';
                        }
                        return true;
                    },
                },
            ]);
            giveConsentPrompt.consentOptions.forEach(option => {
                user.consentPreferences[option] = true;
            });
            console.log('Consent given for selected options.');
            break;
        case 'Revoke Consent':
            const revokeConsentPrompt = await inquirer.prompt([
                {
                    type: 'checkbox',
                    name: 'consentOptions',
                    message: 'Select options to revoke consent:',
                    choices: Object.keys(dataPrivacyOptions).map(option => ({
                        name: dataPrivacyOptions[option],
                        value: option,
                    })),
                    validate: (input) => {
                        if (input.length === 0) {
                            return 'Please select at least one option to revoke consent.';
                        }
                        return true;
                    },
                },
            ]);

            const confirmRevoke = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'confirmRevoke',
                    message: 'Are you sure you want to revoke consent for the selected options?',
                },
            ]);

            if (confirmRevoke.confirmRevoke) {
                revokeConsentPrompt.consentOptions.forEach(option => {
                    user.consentPreferences[option] = false;
                });
                console.log('Consent revoked for selected options.');
            } else {
                console.log('Consent revocation canceled.');
            }
            break;
        case 'Exit':
            // Save the updated consent preferences to the JSON file before exiting
            saveConsentPreferences(userConsentData);
            return;
    }

    // Recursively call the function for further actions
    manageConsent(user);
}

// Start the consent manager
(async () => {
    // Load existing consent preferences from the JSON file
    const loadedConsentPreferences = loadConsentPreferences();
    Object.assign(userConsentData, loadedConsentPreferences);

    const namePrompt = await inquirer.prompt([
        {
            type: 'input',
            name: 'name',
            message: 'Enter your name:',
            validate: (input) => {
                if (!input) {
                    return 'Please enter your name.';
                }
                return true;
            },
        },
    ]);

    const locationPrompt = await inquirer.prompt([
        {
            type: 'input',
            name: 'location',
            message: 'Enter your location (e.g., FL, GA, CA, CO, UT):',
            validate: (input) => {
                if (!input || !/^[A-Z]{2}$/.test(input)) {
                    return 'Please enter a valid two-letter state code (e.g., FL, GA, CA, CO, UT).';
                }
                return true;
            },
        },
    ]);

    const user = getUserByName(namePrompt.name);

    console.log(`Welcome, ${user.name}!`);

    manageConsent(user);
})();
