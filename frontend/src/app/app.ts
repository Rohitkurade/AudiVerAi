import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { DemoDataService } from './core/demo-data.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html'
})
export class App {
  readonly demo = inject(DemoDataService);
  readonly menuOpen = signal(false);

  closeMenu(): void {
    this.menuOpen.set(false);
  }
}
