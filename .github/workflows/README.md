# GitHub Actions Workflows

This directory contains GitHub Actions workflows for automating CI/CD processes for the Sonora project.

## Available Workflows

### CI/CD Pipeline (`ci.yml`)

This workflow runs on every push to the main branch and on pull requests targeting the main branch. It performs the following tasks:

- Sets up Node.js 22 LTS
- Installs dependencies
- Runs TypeScript type checking
- Lints the code
- Runs tests (if a test script is defined in package.json)
- Builds the Expo web version (if web configuration is available)

### Deploy to Expo (`deploy.yml`)

This workflow runs on pushes to the main branch and can also be triggered manually. It performs the following tasks:

- Sets up Node.js 22 LTS
- Sets up Expo CLI
- Installs dependencies
- Verifies TypeScript
- Publishes the app to Expo
- Creates a GitHub Release

## Required Secrets

To use these workflows, you need to configure the following secrets in your GitHub repository:

- `EXPO_TOKEN`: Your Expo access token
- `EXPO_USERNAME`: Your Expo username
- `EXPO_PASSWORD`: Your Expo password

## Setting Up Secrets

1. Go to your GitHub repository
2. Click on "Settings"
3. Click on "Secrets and variables" > "Actions"
4. Click on "New repository secret"
5. Add each of the required secrets

## Node.js Version

These workflows use Node.js 22 LTS as specified in the project requirements.

## Customization

You can customize these workflows by editing the YAML files. For example, you might want to:

- Add additional testing steps
- Configure deployment to different environments
- Add code coverage reporting
- Set up notifications

Refer to the [GitHub Actions documentation](https://docs.github.com/en/actions) for more information on customizing workflows.