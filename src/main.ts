import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideBrowserGlobalErrorListeners } from '@angular/core';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [provideBrowserGlobalErrorListeners()],
}).catch((err) => console.error(err));