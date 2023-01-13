import dotenv from 'dotenv';
import {App} from './server';

// load .env variables
dotenv.config();

// init server
const app = new App();
app.initServer();
