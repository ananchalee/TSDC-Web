import { Injectable, Inject } from '@angular/core';
import { WINDOW } from './windows.providers';

@Injectable()
export class GetipService {

    constructor(@Inject(WINDOW) private window: Window) {
    }

    getHostname() : string {
        return this.window.location.hostname;
    }
}