import { __decorate } from "tslib";
import { Injectable, signal } from '@angular/core';
let RequestService = class RequestService {
    requests = signal([]);
    myRequests = this.requests.asReadonly();
    create(request) {
        const created = {
            ...request,
            id: Date.now(),
            status: 'PENDIENTE',
        };
        this.requests.update((requests) => [...requests, created]);
        return created;
    }
    updateStatus(requestId, status) {
        this.requests.update((requests) => requests.map((request) => String(request.id) === String(requestId) ? { ...request, status } : request));
    }
    replace(requests) {
        this.requests.set(requests);
    }
};
RequestService = __decorate([
    Injectable({ providedIn: 'root' })
], RequestService);
export { RequestService };
