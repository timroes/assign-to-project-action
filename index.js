const core = require('@actions/core');
const github = require('@actions/github');
const { graphql } = require('@octokit/graphql');

async function getProjectId(token, org, projectNumber) {
  const { data } = graphql(`
    query($org: String!, $number: Int!) {
      organization(login: $org) {
        projectNext(number: $number) {
          id
        }
      }
    }`,
  {
    org: org,
    number: projectNumber,
    headers: {
      authorization: `token ${token}`,
    }
  });
  return data.organization.projectNext.id;
}

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
    issue: issueId,
    headers: {
      authorization: `token ${token}`,
    }
  });
}

async function run() {
  try {
    const issueId = github.context.payload.issue.node_id;
    const label = github.context.payload.label.name;

    const token = core.getInput('token');

    const projectMapping = core.getInput('projects').split("\n");
    const match = projectMapping.find((project) => {
      return project.split("=")[0] === label;
    });

    if (match) {
      const projectNumber = parseInt(match.split("=")[1]);
      const owner = github.context.payload.repository.owner.login;
      const projectId = await getProjectId(token, owner, projectNumber);
      console.log(`Assigning issue ${issueId} to project: ${projectId} (${owner}#${projectNumber})`);
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