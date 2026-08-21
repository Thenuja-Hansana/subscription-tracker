import { Router } from 'express';

import { signIn, signUp } from '../controllers/auth.controller.js';
import { checkSignUpEmail } from '../middlewares/arcjet.middleware.js';

const authRouter = Router();

authRouter.post('/sign-up', checkSignUpEmail, signUp);
authRouter.post('/sign-in', signIn);

export default authRouter;
