import express from 'express';
import { classifyText } from '../controllers/classify.controller.js';

const router = express.Router();

router.post('/classify', classifyText);

export default router;