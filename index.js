const core = require('@actions/core');
const github = require('@actions/github');
const { graphql } = require('@octokit/graphql');

async function assignToProject(token, issueId, projectId) {
  await graphql(`
    mutation($project:ID!, $issue:ID!) {
      addProjectNextItem(input: {projectId: $project, contentId: $issue}) {
        projectNextItem {
          id
        }
      }
    }
  `, {
    project: projectId,
    issue, issueId,
    headers: {
      authorization: `token ${token}`,
    }
  });
}

async function run() {
  try {
    console.log(JSON.stringify(github.context.payload, null, 2));
    console.log(JSON.stringify(github.event, null, 2));
    const issueId = github.context.payload.issue.node_id;
    const label = github.context.payload.label.name;

    const token = core.getInput('token');

    const projectMapping = core.getInput('projects').split("\n");
    const match = projectMapping.find((project) => {
      return project.split("=")[0] === label;
    });

    if (match) {
      const projectId = parseInt(match.split("=")[1]);
      await assignToProject(token, issueId, projectId);
    } else {
      console.log(`No matching project found for label ${label}.`);
    }
  } catch (error) {
    console.error(error);
    core.setFailed(`The assign-to-project-action action failed with ${error}`);
  }
}

run();