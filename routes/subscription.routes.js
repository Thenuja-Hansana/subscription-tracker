import { Router } from 'express';

import {
    createSubscription,
    deleteSubscription,
    getSubscription,
    getSubscriptions,
    getSummary,
    updateSubscription,
} from '../controllers/subscription.controller.js';
import authorize from '../middlewares/auth.middleware.js';

const subscriptionRouter = Router();

// Every subscription route needs a signed-in user
subscriptionRouter.use(authorize);

subscriptionRouter.post('/', createSubscription);
subscriptionRouter.get('/', getSubscriptions);

// Must come before '/:id', otherwise the word "summary" would be treated as an id
subscriptionRouter.get('/summary', getSummary);

subscriptionRouter.get('/:id', getSubscription);
subscriptionRouter.patch('/:id', updateSubscription);
subscriptionRouter.delete('/:id', deleteSubscription);

export default subscriptionRouter;
