import { jiraClient } from './jira_client.js';
import { env } from './env.js';

type Result = {
  issues: {
    key: string;
    fields: {
      customfield_10028: number;
    };
  }[];
};

const currentUser = await jiraClient.getCurrentUser();

const bauResult = (await jiraClient.searchJira(
  `
  summary ~ "Retrospective, other meetings and BAU"
  and status was "To Do" DURING(${env.START_DATE}, ${env.END_DATE})
  and "Team[Team]" = ${env.JIRA_TEAM}
  `,
)) as Result;

const scrumResult = (await jiraClient.searchJira(
  `
  summary ~ "EXCEPT RETRO"
  and status was "To Do" DURING(${env.START_DATE}, ${env.END_DATE})
  and "Team[Team]" = ${env.JIRA_TEAM}
  `,
)) as Result;

const result = (await jiraClient.searchJira(
  `
  assignee was currentuser() DURING(${env.START_DATE}, ${env.END_DATE})
  and (resolution = Unresolved or resolutiondate >= ${env.START_DATE})
  and sprint is not EMPTY
  and "Story Points[Number]" > 0
  `,
  {
    fields: ['customfield_10028'],
    maxResults: -1,
  },
)) as Result;

// Work out the number of days in the range
const startDate = new Date(env.START_DATE);
const endDate = new Date(env.END_DATE);
const dayBeforeEndDate = new Date(endDate);
dayBeforeEndDate.setDate(dayBeforeEndDate.getDate() - 1);
const days = (endDate.getTime() - startDate.getTime()) / 1000 / 60 / 60 / 24;
// Work out how many working days there are in the range
const workingDays = Math.ceil((days * 5) / 7);
// Work out the number of hours to assign
const hours = workingDays * 5;
// Work out the standard deviation
const standardDeviation = hours * 0.2;
// Work out the minimum number of hours to assign
const minHours = hours - standardDeviation;
// Work out the maximum number of hours to assign
const maxHours = hours + standardDeviation;
// Generate a random number between the min and max hours
const randomHours = Math.floor(
  Math.random() * (maxHours - minHours) + minHours,
);
// Deduct hours for scrum events and BAU
const remainingHours =
  randomHours -
  env.HOURS_SCRUM_EVENTS * scrumResult.issues.length -
  env.HOURS_BAU * bauResult.issues.length;

console.log(`Start date: ${env.START_DATE}`);
console.log(`End date: ${env.END_DATE}`);
console.log(`Days: ${days}`);
console.log(`Working days: ${workingDays}`);
console.log(`Hours to assign: ${randomHours}`);

const issues = result.issues.map((issue) => ({
  key: issue.key,
  storyPoints: issue.fields.customfield_10028,
}));

const totalStoryPoints = issues.reduce(
  (total, issue) => total + issue.storyPoints,
  0,
);

console.log(`Total story points: ${totalStoryPoints}`);
console.log(`Total issues: ${issues.length}`);
console.log(`Average story points: ${totalStoryPoints / issues.length}`);
console.log(`Hours per story point: ${remainingHours / totalStoryPoints}`);

const issuesWithHours = [
  ...scrumResult.issues.map((issue) => ({
    key: issue.key,
    hours: 7,
  })),
  ...bauResult.issues.map((issue) => ({
    key: issue.key,
    hours: 5,
  })),
  ...issues.map((issue) => ({
    key: issue.key,
    hours: Math.ceil(issue.storyPoints * (remainingHours / totalStoryPoints)),
  })),
];

// Now we need to assign the hours to the issues
for (const issue of issuesWithHours) {
  // Get the number of hours already assigned
  const { worklogs } = await jiraClient.getIssueWorklogs(issue.key);
  const currentUserWorklogs = worklogs.filter(
    (worklog: any) => worklog.author.accountId === currentUser.accountId,
  );

  console.log(`Worklogs for ${issue.key}: ${worklogs.length}`);
  console.log(currentUserWorklogs);
  const hoursLogged = currentUserWorklogs.reduce(
    (total: number, worklog: any) => total + worklog.timeSpentSeconds / 60 / 60,
    0,
  );

  // If the hours logged is less than the hours to assign, assign the hours
  if (hoursLogged < issue.hours) {
    const hoursToAssign = issue.hours - hoursLogged;
    console.log(`Assigning ${hoursToAssign} hours to ${issue.key}`);

    console.log({
      timeSpentSeconds: hoursToAssign * 60 * 60,
      started: dayBeforeEndDate.toISOString(),
    });

    await jiraClient.addWorklog(issue.key, {
      timeSpentSeconds: hoursToAssign * 60 * 60,
      started: dayBeforeEndDate
        .toISOString()
        .split('T')[0]
        ?.concat('T12:00:00.000+0000'),
    });
  }
}

process.exit(0);
