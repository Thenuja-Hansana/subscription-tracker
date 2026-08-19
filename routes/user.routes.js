import { Router } from 'express';

import { getMe } from '../controllers/user.controller.js';
import authorize from '../middlewares/auth.middleware.js';

const userRouter = Router();

userRouter.get('/me', authorize, getMe);

export default userRouter;
