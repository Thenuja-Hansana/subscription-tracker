import { Router } from 'express';

import { dailyCheck } from '../controllers/workflow.controller.js';

const workflowRouter = Router();

// No sign in here: this route is called by Upstash, not by a user.
// Upstash signs every request and the workflow rejects requests without a valid signature.
workflowRouter.use('/daily-check', dailyCheck);

export default workflowRouter;
