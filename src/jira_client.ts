import JiraApi from "jira-client";
import { env } from "./env.js";

export const jiraClient = new JiraApi({
  protocol: env.JIRA_PROTOCOL,
  host: env.JIRA_HOST,
  username: env.JIRA_USERNAME,
  password: env.JIRA_PASSWORD,
  apiVersion: env.JIRA_API_VERSION,
  strictSSL: env.JIRA_STRICT_SSL,
});
