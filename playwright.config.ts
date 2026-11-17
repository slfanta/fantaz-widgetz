import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests',use:{baseURL:'http://127.0.0.1:5188',viewport:{width:360,height:240}},webServer:{command:'npm run dev',url:'http://127.0.0.1:5188',reuseExistingServer:!process.env.CI},reporter:'list'});
