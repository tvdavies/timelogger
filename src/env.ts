import { z } from 'zod';
import * as dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  JIRA_PROTOCOL: z.string().default('https'),
  JIRA_HOST: z.string(),
  JIRA_USERNAME: z.string(),
  JIRA_PASSWORD: z.string(),
  JIRA_API_VERSION: z.string().default('2'),
  JIRA_STRICT_SSL: z.coerce.boolean().default(true),
  JIRA_TEAM: z.coerce.number(),
  START_DATE: z.string(),
  END_DATE: z.string(),
  HOURS_PER_DAY: z.coerce.number().default(5),
  HOURS_STANDARD_DEVIATION: z.coerce.number().default(0.2),
  HOURS_SCRUM_EVENTS: z.coerce.number().default(7),
  HOURS_BAU: z.coerce.number().default(5),
});

export const env = envSchema.parse(process.env);
