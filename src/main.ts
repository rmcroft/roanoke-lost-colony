import { enableProdMode, importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { IonicModule } from '@ionic/angular';
import { AppComponent } from './app/app.component';

if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    provideAnimations(),
    importProvidersFrom(IonicModule.forRoot({
      mode: 'ios',
      animated: true
    }))
  ]
}).catch((error) => console.error(error));
